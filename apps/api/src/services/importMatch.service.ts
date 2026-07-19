import { prisma } from '../lib/prisma.js';

export type AliasKind = 'employee' | 'project' | 'customer';

// Normalize a name for fuzzy matching: strip Hebrew niqqud, collapse whitespace,
// drop punctuation/quotes, lowercase. Makes "מגנזי דנה" match regardless of
// stray spaces or gershayim, and English names case-insensitively.
export function normalizeName(name: string): string {
  return name
    .normalize('NFKC')
    .replace(/[֑-ׇ]/g, '') // Hebrew niqqud/cantillation
    .replace(/["'`׳״.,()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export interface Matcher {
  employee: (source: string) => string | null;
  project: (source: string) => string | null;
  customer: (source: string) => string | null;
}

export async function buildMatcher(): Promise<Matcher> {
  const [employees, projects, customers, aliases] = await Promise.all([
    prisma.employee.findMany({ select: { id: true, firstName: true, lastName: true } }),
    prisma.project.findMany({ select: { id: true, name: true, code: true } }),
    prisma.customer.findMany({ select: { id: true, name: true } }),
    prisma.importAlias.findMany(),
  ]);

  const aliasMap = new Map<string, string>();
  for (const a of aliases) aliasMap.set(`${a.kind}:${normalizeName(a.sourceName)}`, a.targetId);

  const empByName = new Map<string, string>();
  for (const e of employees) {
    // Attendance files use "lastName firstName"; also index "firstName lastName".
    empByName.set(normalizeName(`${e.lastName} ${e.firstName}`), e.id);
    empByName.set(normalizeName(`${e.firstName} ${e.lastName}`), e.id);
  }

  const projByName = new Map<string, string>();
  for (const p of projects) {
    projByName.set(normalizeName(p.name), p.id);
    if (p.code) projByName.set(normalizeName(p.code), p.id);
  }

  const custByName = new Map<string, string>();
  for (const c of customers) custByName.set(normalizeName(c.name), c.id);

  const resolve = (kind: AliasKind, byName: Map<string, string>) => (source: string): string | null => {
    const norm = normalizeName(source);
    return aliasMap.get(`${kind}:${norm}`) ?? byName.get(norm) ?? null;
  };

  return {
    employee: resolve('employee', empByName),
    project: resolve('project', projByName),
    customer: resolve('customer', custByName),
  };
}

// Persist confirmed source-name -> record-id mappings so future uploads auto-match.
export async function saveAliases(
  entries: { kind: AliasKind; sourceName: string; targetId: string }[],
): Promise<void> {
  await Promise.all(
    entries
      .filter((e) => e.sourceName && e.targetId)
      .map((e) =>
        prisma.importAlias.upsert({
          where: { kind_sourceName: { kind: e.kind, sourceName: e.sourceName } },
          create: e,
          update: { targetId: e.targetId },
        }),
      ),
  );
}
