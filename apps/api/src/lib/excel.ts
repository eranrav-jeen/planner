import ExcelJS from 'exceljs';

export type ColumnFormat = 'currency' | 'hours' | 'percent' | 'date' | 'number' | 'text';

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
  format?: ColumnFormat;
}

export interface ExportMeta {
  title: string;
  generatedAt: Date;
  filters?: Record<string, string | undefined>;
}

const NUM_FORMATS: Partial<Record<ColumnFormat, string>> = {
  currency: '#,##0 "₪"',
  hours: '#,##0.0 "h"',
  percent: '0.0%',
  number: '#,##0',
  date: 'yyyy-mm-dd',
};

const HEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF232122' } };

export async function buildWorkbook(
  meta: ExportMeta,
  columns: ExportColumn[],
  rows: Record<string, unknown>[],
  totals?: Record<string, unknown>,
): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Jeen Planner';
  workbook.created = meta.generatedAt;

  const sheet = workbook.addWorksheet(meta.title.slice(0, 31) || 'Report');

  sheet.mergeCells(1, 1, 1, Math.max(columns.length, 1));
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = meta.title;
  titleCell.font = { size: 14, bold: true, color: { argb: 'FF232122' } };

  const filterText = meta.filters
    ? Object.entries(meta.filters)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join('  |  ')
    : '';
  sheet.mergeCells(2, 1, 2, Math.max(columns.length, 1));
  const metaCell = sheet.getCell(2, 1);
  metaCell.value = `Generated ${meta.generatedAt.toISOString().slice(0, 19).replace('T', ' ')} UTC${filterText ? '  |  ' + filterText : ''}`;
  metaCell.font = { size: 9, color: { argb: 'FF6B7280' } };

  const headerRowIndex = 4;
  const headerRow = sheet.getRow(headerRowIndex);
  columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = HEADER_FILL;
    cell.alignment = { vertical: 'middle' };
  });
  headerRow.commit();

  columns.forEach((col, i) => {
    sheet.getColumn(i + 1).width = col.width ?? 18;
  });

  for (const row of rows) {
    const dataRow = sheet.addRow(columns.map((c) => row[c.key] ?? null));
    columns.forEach((col, i) => {
      const cell = dataRow.getCell(i + 1);
      const fmt = col.format && NUM_FORMATS[col.format];
      if (fmt) cell.numFmt = fmt;
    });
  }

  if (totals) {
    const totalsRow = sheet.addRow(columns.map((c) => totals[c.key] ?? null));
    totalsRow.font = { bold: true };
    columns.forEach((col, i) => {
      const cell = totalsRow.getCell(i + 1);
      const fmt = col.format && NUM_FORMATS[col.format];
      if (fmt) cell.numFmt = fmt;
    });
  }

  sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: headerRowIndex }];

  return workbook.xlsx.writeBuffer();
}
