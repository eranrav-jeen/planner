import type { ColumnFormat, ExportColumn, ExportMeta } from './excel.js';

function formatCell(value: unknown, format?: ColumnFormat): string {
  if (value === null || value === undefined || value === '') return '—';
  switch (format) {
    case 'currency':
      return `₪${Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    case 'hours':
      return `${Number(value).toLocaleString('en-US', { maximumFractionDigits: 1 })}h`;
    case 'percent':
      return `${(Number(value) * 100).toFixed(1)}%`;
    case 'date':
      return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
    case 'number':
      return Number(value).toLocaleString('en-US');
    default:
      return String(value);
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

const LOGO_SVG = `<svg width="90" height="26" viewBox="0 0 150 42" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="2" width="17" height="17" rx="5" fill="#E7B6EB"/>
  <rect x="0" y="23" width="14" height="14" rx="5" fill="#F3AB56"/>
  <rect x="20" y="4" width="15" height="33" rx="6" fill="#E45B4E"/>
  <text x="46" y="21" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#232122">Jeen</text>
  <text x="46" y="34" font-family="Arial, sans-serif" font-size="10.5" font-weight="600" letter-spacing="0.5" fill="#6B7280">Solution OS</text>
</svg>`;

export function buildReportHtml(
  meta: ExportMeta,
  columns: ExportColumn[],
  rows: Record<string, unknown>[],
  totals?: Record<string, unknown>,
): string {
  const filterText = meta.filters
    ? Object.entries(meta.filters)
        .filter(([, v]) => v)
        .map(([k, v]) => `${escapeHtml(k)}: ${escapeHtml(String(v))}`)
        .join('&nbsp;&nbsp;|&nbsp;&nbsp;')
    : '';

  const headerCells = columns.map((c) => `<th>${escapeHtml(c.header)}</th>`).join('');

  const rowHtml = (row: Record<string, unknown>) =>
    `<tr>${columns
      .map(
        (c) =>
          `<td class="${c.format && c.format !== 'text' ? 'num' : ''}">${escapeHtml(formatCell(row[c.key], c.format))}</td>`,
      )
      .join('')}</tr>`;

  const bodyRows = rows.map(rowHtml).join('');
  const totalsRowHtml = totals
    ? `<tr class="totals">${columns
        .map(
          (c) =>
            `<td class="${c.format && c.format !== 'text' ? 'num' : ''}">${escapeHtml(formatCell(totals[c.key], c.format))}</td>`,
        )
        .join('')}</tr>`
    : '';

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #232122; margin: 0; padding: 0; }
  h1 { font-size: 18px; margin: 14px 0 2px; }
  .meta { font-size: 10px; color: #6B7280; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th { background: #232122; color: #fff; text-align: left; padding: 6px 8px; }
  td { padding: 5px 8px; border-bottom: 1px solid #E7E5E4; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  tr.totals td { font-weight: 700; border-top: 2px solid #232122; border-bottom: none; }
</style>
</head>
<body>
  ${LOGO_SVG}
  <h1>${escapeHtml(meta.title)}</h1>
  <div class="meta">Generated ${meta.generatedAt.toISOString().slice(0, 19).replace('T', ' ')} UTC${filterText ? '&nbsp;&nbsp;|&nbsp;&nbsp;' + filterText : ''}</div>
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${bodyRows}${totalsRowHtml}</tbody>
  </table>
</body>
</html>`;
}
