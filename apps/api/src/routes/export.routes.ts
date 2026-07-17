import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { ApiError } from '../middleware/error.js';
import { buildExportDefinition, EXPORTABLE_REPORTS, type ExportableReport } from '../services/exportDefinitions.js';
import { buildWorkbook } from '../lib/excel.js';
import { buildReportHtml } from '../lib/pdfTemplate.js';
import { renderHtmlToPdf } from '../lib/pdf.js';
import { getAccessScope } from '../lib/accessScope.js';

export const exportRouter = Router();
exportRouter.use(requireAuth);

exportRouter.get(
  '/:report.:format',
  asyncHandler(async (req, res) => {
    const { report, format } = req.params;

    if (!EXPORTABLE_REPORTS.includes(report as ExportableReport)) {
      throw new ApiError(404, `Unknown report: ${report}`);
    }
    if (format !== 'xlsx' && format !== 'pdf') {
      throw new ApiError(422, `Unsupported export format: ${format}`);
    }

    const scope = await getAccessScope(req);
    const definition = await buildExportDefinition(
      report,
      req.query as Record<string, string | undefined>,
      req.user!.role,
      scope,
    );

    const filenameBase = `${report}-${new Date().toISOString().slice(0, 10)}`;

    if (format === 'xlsx') {
      const buffer = await buildWorkbook(definition.meta, definition.columns, definition.rows, definition.totals);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.xlsx"`);
      res.send(buffer);
    } else {
      const html = buildReportHtml(definition.meta, definition.columns, definition.rows, definition.totals);
      const pdfBuffer = await renderHtmlToPdf(html);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.pdf"`);
      res.send(pdfBuffer);
    }
  }),
);
