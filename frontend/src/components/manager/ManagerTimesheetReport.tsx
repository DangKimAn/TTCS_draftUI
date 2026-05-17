import React, { useEffect, useMemo, useState } from 'react';
import { FiDownload, FiRefreshCw } from 'react-icons/fi';
import { FixedSizeList as List } from 'react-window';
import { getTimesheetReport } from '../../services/timesheetService';
import type { TimesheetReportData, TimesheetReportSummary } from '../../services/timesheetService';
import { exportTimesheetReportPdf } from '../../utils/reportPdf';
import { formatDate } from '../../utils/dateUtils';
import { ManagerFeedback, StatusBadge, WarningList } from './SharedComponents';

interface ManagerTimesheetReportProps {
  timesheets: any[];
  employees: any[];
  departments: any[];
  feedback: any;
  onFeedback: (type: string, message: string) => void;
}

const EMPTY_SUMMARY: TimesheetReportSummary = {
  totalRecords: 0,
  totalEmployees: 0,
  totalHours: 0,
  pending: 0,
  submitted: 0,
  approved: 0,
  rejected: 0,
  missingOut: 0,
  warningRecords: 0,
  byStatus: {},
};

const DEFAULT_REPORT_FILTERS = {
  ...getCurrentMonthRange(),
  employeeId: 'all',
  departmentId: 'all',
  status: 'all',
};

const ReportRowItem = React.memo(({ index, data, style }: any) => {
  const { previewRows, getDepartmentName } = data;
  const row = previewRows[index];

  return (
    <div style={style} className="flex items-center hover:bg-white transition-colors border-b border-slate-100 last:border-0">
      <div className="px-4 py-4 text-sm font-bold text-slate-800 min-w-[110px] truncate">{row.code}</div>
      <div className="flex-1 px-4 py-4 text-sm text-slate-600 font-medium min-w-[180px] truncate">{row.employeeName || row.employeeId || '--'}</div>
      <div className="flex-1 px-4 py-4 text-sm text-slate-600 font-medium min-w-[150px] truncate">{row.departmentName || getDepartmentName(row.departmentId)}</div>
      <div className="px-4 py-4 text-sm text-slate-600 font-medium whitespace-nowrap min-w-[120px]">{formatDate(row.workDate)}</div>
      <div className="px-4 py-4 text-sm text-slate-600 font-medium whitespace-nowrap min-w-[80px]">{row.checkIn || '--'}</div>
      <div className="px-4 py-4 text-sm text-slate-600 font-medium whitespace-nowrap min-w-[80px]">{row.checkOut || '--'}</div>
      <div className="px-4 py-4 text-sm font-black text-slate-800 whitespace-nowrap min-w-[90px]">{Number(row.totalHours || 0).toFixed(1)}h</div>
      <div className="px-4 py-4 min-w-[100px]">
        <StatusBadge status={row.status} />
      </div>
      <div className="flex-1 px-4 py-4 min-w-[150px]">
        <WarningList warnings={row.warnings as any} />
      </div>
    </div>
  );
});

function ManagerTimesheetReport({
  employees,
  departments,
  feedback,
  onFeedback,
}: ManagerTimesheetReportProps) {
  const [filters, setFilters] = useState(DEFAULT_REPORT_FILTERS);
  const [reportData, setReportData] = useState<TimesheetReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadReport() {
      setIsLoading(true);

      try {
        const report = await getTimesheetReport(filters);
        if (isMounted) {
          setReportData(report);
        }
      } catch (error: any) {
        if (isMounted) {
          setReportData({ filters, rows: [], summary: EMPTY_SUMMARY });
          onFeedback('danger', error?.message || 'Khong the tai bao cao timesheet tu API.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadReport();

    return () => {
      isMounted = false;
    };
  }, [filters.fromDate, filters.toDate, filters.employeeId, filters.departmentId, filters.status, reloadKey]);

  const previewRows = useMemo(
    () => [...(reportData?.rows || [])].sort((left, right) => String(right.workDate || '').localeCompare(String(left.workDate || ''))),
    [reportData?.rows],
  );
  const summary = reportData?.summary || EMPTY_SUMMARY;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleExportPdf = () => {
    if (previewRows.length === 0) {
      onFeedback('danger', 'Khong co du lieu de xuat PDF.');
      return;
    }

    try {
      exportTimesheetReportPdf({
        title: 'Bao cao timesheet',
        filters: reportData?.filters || filters,
        rows: previewRows,
        summary,
      });
      onFeedback('success', `Da mo ban PDF cho ${previewRows.length} dong timesheet.`);
    } catch (error: any) {
      onFeedback('danger', error?.message || 'Khong the xuat PDF.');
    }
  };

  const getDepartmentName = (id: string) => departments.find((department) => department.id === id)?.name || '--';
  const rowHeight = 64;
  const listHeight = Math.min(Math.max(previewRows.length, 1) * rowHeight, 600);

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">UC-09</span>
        <h1 className="text-3xl font-black text-slate-800 m-0">Bao cao timesheet</h1>
        <p className="text-slate-500 m-0 text-sm max-w-3xl">Du lieu duoc loc truc tiep tu API report theo ngay, nhan vien, phong ban va trang thai.</p>
      </div>

      <ManagerFeedback feedback={feedback} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Tong dong" value={summary.totalRecords} />
        <SummaryCard label="Nhan vien" value={summary.totalEmployees} />
        <SummaryCard label="Tong gio" value={`${Number(summary.totalHours || 0).toFixed(1)}h`} />
        <SummaryCard label="Canh bao" value={summary.warningRecords} />
      </div>

      <div className="p-8 rounded-[32px] bg-white border border-slate-200 shadow-sm flex flex-col gap-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <Field label="Tu ngay">
            <input type="date" name="fromDate" value={filters.fromDate} onChange={handleChange} className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all" />
          </Field>
          <Field label="Den ngay">
            <input type="date" name="toDate" value={filters.toDate} onChange={handleChange} className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all" />
          </Field>
          <Field label="Nhan vien">
            <select name="employeeId" value={filters.employeeId} onChange={handleChange} className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer">
              <option value="all">Tat ca nhan vien</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.fullName}</option>
              ))}
            </select>
          </Field>
          <Field label="Phong ban">
            <select name="departmentId" value={filters.departmentId} onChange={handleChange} className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer">
              <option value="all">Phong ban cua toi</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Trang thai">
            <select name="status" value={filters.status} onChange={handleChange} className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer">
              <option value="all">Tat ca trang thai</option>
              <option value="Pending">Pending</option>
              <option value="Submitted">Submitted</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </Field>
          <div className="flex items-end gap-3 lg:col-span-1 xl:col-span-3">
            <button type="button" onClick={() => setReloadKey((value) => value + 1)} disabled={isLoading} className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-50 text-slate-700 font-black border border-slate-200 hover:bg-slate-100 transition-all">
              <FiRefreshCw /> Tai lai
            </button>
            <button type="button" onClick={handleExportPdf} disabled={isLoading || previewRows.length === 0} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-black shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-60 transition-all">
              <FiDownload /> Xuat PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatusMetric label="Pending" value={summary.pending} />
          <StatusMetric label="Submitted" value={summary.submitted} />
          <StatusMetric label="Approved" value={summary.approved} />
          <StatusMetric label="Rejected" value={summary.rejected} />
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/30">
          <div className="overflow-x-auto">
            <div className="min-w-[1100px]">
              <div className="flex bg-slate-100/80 border-b border-slate-200">
                <div className="px-4 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider min-w-[110px]">Ma</div>
                <div className="flex-1 px-4 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider min-w-[180px]">Nhan vien</div>
                <div className="flex-1 px-4 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider min-w-[150px]">Phong ban</div>
                <div className="px-4 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider min-w-[120px]">Ngay</div>
                <div className="px-4 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider min-w-[80px]">In</div>
                <div className="px-4 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider min-w-[80px]">Out</div>
                <div className="px-4 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider min-w-[90px]">Tong gio</div>
                <div className="px-4 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider min-w-[100px]">Trang thai</div>
                <div className="flex-1 px-4 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider min-w-[150px]">Canh bao</div>
              </div>

              {previewRows.length > 0 ? (
                <List height={listHeight} itemCount={previewRows.length} itemSize={rowHeight} width="100%" itemData={{ previewRows, getDepartmentName }}>
                  {ReportRowItem}
                </List>
              ) : (
                <div className="px-4 py-12 text-center text-slate-400 text-sm font-medium italic">
                  {isLoading ? 'Dang tai bao cao timesheet...' : 'Khong co du lieu phu hop voi bo loc.'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{label}</span>
      {children}
    </label>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
      <span className="text-xs text-slate-400 uppercase font-black tracking-widest">{label}</span>
      <strong className="block mt-2 text-2xl text-slate-800">{value}</strong>
    </article>
  );
}

function StatusMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
      <span className="block text-[11px] uppercase tracking-widest text-slate-400 font-black">{label}</span>
      <strong className="text-slate-800">{value}</strong>
    </div>
  );
}

function getCurrentMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);

  return {
    fromDate: toDateInput(start),
    toDate: toDateInput(end),
  };
}

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default ManagerTimesheetReport;
