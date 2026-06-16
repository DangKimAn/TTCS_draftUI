import type { Timesheet } from '../types';
import type { TimesheetReportFilters, TimesheetReportSummary } from '../services/timesheetService';

interface ExportTimesheetReportPdfInput {
  title: string;
  filters: TimesheetReportFilters;
  rows: Timesheet[];
  summary: TimesheetReportSummary;
  filterNames?: {
    employeeName?: string;
    departmentName?: string;
  };
}

export function exportTimesheetReportPdf({
  title,
  filters,
  rows,
  summary,
  filterNames,
}: ExportTimesheetReportPdfInput): void {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.width = '0px';
  iframe.style.height = '0px';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    throw new Error('Cannot create print frame.');
  }

  doc.open();
  doc.write(buildTimesheetReportHtml({ title, filters, rows, summary, filterNames }));
  doc.close();

  if (iframe.contentWindow) {
    iframe.contentWindow.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }, 250);
  }
}

function buildTimesheetReportHtml({
  title,
  filters,
  rows,
  summary,
  filterNames,
}: ExportTimesheetReportPdfInput): string {
  const generatedAt = new Date().toLocaleString('vi-VN');

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: A4 landscape; margin: 14mm; }
    body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; }
    h1 { font-size: 22px; margin: 0 0 6px; }
    p { margin: 0; color: #475569; font-size: 12px; }
    .meta { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin: 16px 0; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 16px 0; }
    .box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; }
    .box span { display: block; color: #64748b; font-size: 11px; text-transform: uppercase; }
    .box strong { display: block; font-size: 16px; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #cbd5e1; padding: 7px; text-align: left; vertical-align: top; }
    th { background: #e2e8f0; color: #334155; text-transform: uppercase; font-size: 10px; }
    .right { text-align: right; }
    .muted { color: #64748b; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>Da tao luc ${escapeHtml(generatedAt)}</p>
  <section class="meta">
    <div class="box"><span>Tu ngay</span><strong>${escapeHtml(filters.fromDate || '--')}</strong></div>
    <div class="box"><span>Den ngay</span><strong>${escapeHtml(filters.toDate || '--')}</strong></div>
    <div class="box"><span>Nhan vien</span><strong>${escapeHtml(filterNames?.employeeName || (filters.employeeId === 'all' ? 'Tat ca nhan vien' : filters.employeeId) || 'Tat ca nhan vien')}</strong></div>
    <div class="box"><span>Phong ban</span><strong>${escapeHtml(filterNames?.departmentName || (filters.departmentId === 'all' ? 'Tat ca phong ban' : filters.departmentId) || 'Tat ca phong ban')}</strong></div>
    <div class="box"><span>Trang thai</span><strong>${escapeHtml(filters.status === 'all' ? 'Tat ca trang thai' : (filters.status || 'Tat ca trang thai'))}</strong></div>
  </section>
  <section class="summary">
    <div class="box"><span>Tong dong</span><strong>${summary.totalRecords}</strong></div>
    <div class="box"><span>Nhan vien</span><strong>${summary.totalEmployees}</strong></div>
    <div class="box"><span>Tong gio</span><strong>${formatHours(summary.totalHours)}</strong></div>
    <div class="box"><span>Canh bao</span><strong>${summary.warningRecords}</strong></div>
  </section>
  <table>
    <thead>
      <tr>
        <th>Ma</th>
        <th>Nhan vien</th>
        <th>Phong ban</th>
        <th>Ngay</th>
        <th>In</th>
        <th>Out</th>
        <th class="right">Tong gio</th>
        <th>Trang thai</th>
        <th>Canh bao</th>
      </tr>
    </thead>
    <tbody>
      ${rows.length ? rows.map(renderRow).join('') : '<tr><td colspan="9" class="muted">Khong co du lieu timesheet phu hop.</td></tr>'}
    </tbody>
  </table>
</body>
</html>`;
}

function renderRow(row: Timesheet): string {
  const warnings = getWarningLabels(row.warnings).join(', ') || '--';

  return `<tr>
    <td>${escapeHtml(row.code || row.id)}</td>
    <td>${escapeHtml(row.employeeName || row.employeeId || '--')}</td>
    <td>${escapeHtml((row as any).departmentName || row.departmentId || '--')}</td>
    <td>${escapeHtml(row.workDate || row.date || '--')}</td>
    <td>${escapeHtml(row.checkIn || '--')}</td>
    <td>${escapeHtml(row.checkOut || '--')}</td>
    <td class="right">${formatHours(row.totalHours || 0)}</td>
    <td>${escapeHtml(row.status || '--')}</td>
    <td>${escapeHtml(warnings)}</td>
  </tr>`;
}

function getWarningLabels(warnings: unknown): string[] {
  if (!Array.isArray(warnings)) {
    return [];
  }

  return warnings
    .map((warning) => {
      if (typeof warning === 'string') {
        return warning;
      }

      if (warning && typeof warning === 'object') {
        const value = warning as { label?: string; code?: string };
        return value.label || value.code || '';
      }

      return '';
    })
    .filter(Boolean);
}

function formatHours(value: number): string {
  return `${Number(value || 0).toFixed(1)}h`;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
