import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { ApiError } from '../middleware/error.js';
import { serializeDecimals } from '../lib/serialize.js';
import { parseMonthParam } from '../lib/month.js';
import { actualsUpload, decodeOriginalFilename } from '../lib/uploads.js';
import { parseActualsWorkbook, type ParsedLine } from '../services/actualsParse.service.js';
import { buildMatcher, saveAliases, type AliasKind } from '../services/importMatch.service.js';
import { recomputeActualHours, type AllocKey } from '../services/actualsRollup.service.js';
import { commitImportSchema, type CommitImportInput } from '../schemas/actualsImport.schema.js';

export const actualsRouter = Router();
// Importing customer actuals is an admin data operation. The resulting hours
// surface to everyone through the (already role-gated) reports & dashboard.
actualsRouter.use(requireAuth, requireRole('ADMIN'));

function distinct(names: (string | null)[]): string[] {
  return [...new Set(names.filter((n): n is string => !!n))].sort();
}

// Build the reconcile view for a stored batch: which source names matched, and to what.
async function buildPreview(batch: { sourceCustomerName: string | null; customerId: string | null; lines: unknown }) {
  const lines = batch.lines as ParsedLine[];
  const matcher = await buildMatcher();

  const employees = distinct(lines.map((l) => l.employee)).map((source) => ({
    source,
    matchedId: matcher.employee(source),
  }));
  const projects = distinct(lines.map((l) => l.project)).map((source) => ({
    source,
    matchedId: matcher.project(source),
  }));
  const customer = batch.sourceCustomerName
    ? { source: batch.sourceCustomerName, matchedId: batch.customerId ?? matcher.customer(batch.sourceCustomerName) }
    : null;

  return { employees, projects, customer, lines };
}

// POST /api/actuals/imports — upload + parse + auto-match, stored as pending_review.
actualsRouter.post(
  '/imports',
  actualsUpload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new ApiError(422, 'No file uploaded');
    const parsed = parseActualsWorkbook(req.file.buffer);
    const matcher = await buildMatcher();

    const batch = await prisma.timeImportBatch.create({
      data: {
        originalFileName: decodeOriginalFilename(req.file.originalname),
        sourceCustomerName: parsed.sourceCustomerName,
        customerId: parsed.sourceCustomerName ? matcher.customer(parsed.sourceCustomerName) : null,
        periodStart: parseMonthParam(parsed.periodStart),
        periodEnd: parseMonthParam(parsed.periodEnd),
        totalHours: parsed.totalHours,
        entryCount: parsed.lines.length,
        lines: parsed.lines as unknown as Prisma.InputJsonValue,
        uploadedById: req.user!.id,
      },
    });

    const preview = await buildPreview(batch);
    res.status(201).json({ data: { batch: serializeDecimals(batch), preview } });
  }),
);

// GET /api/actuals/imports — batch history.
actualsRouter.get(
  '/imports',
  asyncHandler(async (_req, res) => {
    const batches = await prisma.timeImportBatch.findMany({
      orderBy: { createdAt: 'desc' },
      include: { customer: { select: { name: true } } },
    });
    res.json({ data: serializeDecimals(batches) });
  }),
);

// GET /api/actuals/imports/:id — batch + reconcile preview.
actualsRouter.get(
  '/imports/:id',
  asyncHandler(async (req, res) => {
    const batch = await prisma.timeImportBatch.findUnique({
      where: { id: req.params.id },
      include: { customer: { select: { name: true } } },
    });
    if (!batch) throw new ApiError(404, 'Import not found');
    const preview = await buildPreview(batch);
    res.json({ data: { batch: serializeDecimals(batch), preview } });
  }),
);

// POST /api/actuals/imports/:id/commit — apply mappings, replace the month, write actuals.
actualsRouter.post(
  '/imports/:id/commit',
  validateBody(commitImportSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as CommitImportInput;
    const batch = await prisma.timeImportBatch.findUnique({ where: { id: req.params.id } });
    if (!batch) throw new ApiError(404, 'Import not found');
    if (batch.status !== 'pending_review') throw new ApiError(409, 'This import was already processed. Delete it and re-upload to redo.');

    const lines = batch.lines as unknown as ParsedLine[];
    const matcher = await buildMatcher();

    // Resolve every distinct source name: explicit mapping wins, else auto-match.
    const resolveEmployee = (s: string) => body.employeeMappings[s] ?? matcher.employee(s);
    const resolveProject = (s: string) => body.projectMappings[s] ?? matcher.project(s);
    const customerId = body.customerId ?? batch.customerId ?? (batch.sourceCustomerName ? matcher.customer(batch.sourceCustomerName) : null);

    if (!customerId) throw new ApiError(422, 'Map the customer before committing.', { customer: 'Required' });

    const unresolvedEmployees = distinct(lines.map((l) => l.employee)).filter((s) => !resolveEmployee(s));
    const unresolvedProjects = distinct(lines.map((l) => l.project)).filter((s) => !resolveProject(s));
    if (unresolvedEmployees.length || unresolvedProjects.length) {
      throw new ApiError(422, 'Some names are still unmatched. Map every employee and project before committing.', {
        employees: unresolvedEmployees.join(', '),
        projects: unresolvedProjects.join(', '),
      });
    }

    // Guard: every resolved project must belong to the resolved customer, so a
    // mismatched mapping can't silently attach hours to the wrong customer.
    const projectIds = [...new Set(distinct(lines.map((l) => l.project)).map((s) => resolveProject(s)!))];
    const projectRows = await prisma.project.findMany({ where: { id: { in: projectIds } }, select: { id: true, customerId: true, name: true } });
    const foreign = projectRows.filter((p) => p.customerId !== customerId);
    if (foreign.length) {
      throw new ApiError(422, `These projects belong to a different customer: ${foreign.map((p) => p.name).join(', ')}`);
    }

    const months = [...new Set(lines.map((l) => l.month))].map((m) => parseMonthParam(m));
    const customerProjectIds = (
      await prisma.project.findMany({ where: { customerId }, select: { id: true } })
    ).map((p) => p.id);

    await prisma.$transaction(async (tx) => {
      const affected = new Map<string, AllocKey>();
      const addKey = (k: AllocKey) => affected.set(`${k.projectId}|${k.employeeId}|${k.month.toISOString().slice(0, 10)}`, k);

      // Replace-per-month: clear this customer's prior actuals for each month in
      // the file, capturing the alloc keys we'll need to recompute afterwards.
      for (const month of months) {
        const prior = await tx.timeEntryActual.findMany({
          where: { month, projectId: { in: customerProjectIds } },
          select: { projectId: true, employeeId: true, month: true },
        });
        prior.forEach((p) => addKey(p));
        await tx.timeEntryActual.deleteMany({ where: { month, projectId: { in: customerProjectIds } } });
      }

      // Insert this batch's aggregated actuals (sub-project detail preserved).
      for (const l of lines) {
        const projectId = resolveProject(l.project)!;
        const employeeId = resolveEmployee(l.employee)!;
        const month = parseMonthParam(l.month);
        await tx.timeEntryActual.create({
          data: { batchId: batch.id, projectId, employeeId, month, subProject: l.subProject, hours: l.hours },
        });
        addKey({ projectId, employeeId, month });
      }

      await recomputeActualHours([...affected.values()], tx);

      // Any earlier committed batch for this customer covering an overlapping
      // month has just had its rows replaced — mark it superseded so the history
      // doesn't show two "live" imports for the same period.
      await tx.timeImportBatch.updateMany({
        where: {
          id: { not: batch.id },
          customerId,
          status: 'committed',
          periodStart: { lte: batch.periodEnd },
          periodEnd: { gte: batch.periodStart },
        },
        data: { status: 'superseded' },
      });

      await tx.timeImportBatch.update({
        where: { id: batch.id },
        data: { status: 'committed', customerId, committedAt: new Date() },
      });
    });

    if (body.saveAliases) {
      const aliasEntries: { kind: AliasKind; sourceName: string; targetId: string }[] = [];
      for (const s of distinct(lines.map((l) => l.employee))) aliasEntries.push({ kind: 'employee', sourceName: s, targetId: resolveEmployee(s)! });
      for (const s of distinct(lines.map((l) => l.project))) aliasEntries.push({ kind: 'project', sourceName: s, targetId: resolveProject(s)! });
      if (batch.sourceCustomerName) aliasEntries.push({ kind: 'customer', sourceName: batch.sourceCustomerName, targetId: customerId });
      await saveAliases(aliasEntries);
    }

    const updated = await prisma.timeImportBatch.findUnique({
      where: { id: batch.id },
      include: { customer: { select: { name: true } } },
    });
    res.json({ data: serializeDecimals(updated) });
  }),
);

// DELETE /api/actuals/imports/:id — remove batch; recompute actuals if it was live.
actualsRouter.delete(
  '/imports/:id',
  asyncHandler(async (req, res) => {
    const batch = await prisma.timeImportBatch.findUnique({
      where: { id: req.params.id },
      include: { actuals: { select: { projectId: true, employeeId: true, month: true } } },
    });
    if (!batch) throw new ApiError(404, 'Import not found');

    await prisma.$transaction(async (tx) => {
      const keys = batch.actuals.map((a) => ({ projectId: a.projectId, employeeId: a.employeeId, month: a.month }));
      await tx.timeImportBatch.delete({ where: { id: batch.id } }); // cascades actuals
      await recomputeActualHours(keys, tx);
    });

    res.json({ data: { ok: true } });
  }),
);
