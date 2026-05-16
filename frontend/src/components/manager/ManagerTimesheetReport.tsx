import React, { useState, useMemo } from 'react';
import { FiDownload } from 'react-icons/fi';
import { FixedSizeList as List } from 'react-window';
import { ManagerFeedback, StatusBadge, WarningList } from './SharedComponents';
import { formatDate } from '../../utils/dateUtils';

interface ManagerTimesheetReportProps {
  timesheets: any[];
  employees: any[];
  departments: any[];
  feedback: any;
  onFeedback: (type: string, message: string) => void;
}

const DEFAULT_REPORT_FILTERS = {
  fromDate: '2026-05-01',
  toDate: '2026-05-31',
  employeeId: 'all',
  departmentId: 'all',
  status: 'all',
  exportFormat: 'Excel',
};

const ReportRowItem = React.memo(({ index, data, style }: any) => {
  const { previewRows, employees, getDepartmentName } = data;
  const t = previewRows[index];
  const employee = employees.find((e: any) => e.id === t.employeeId);

  return (
    <div style={style} className="flex items-center hover:bg-white transition-colors border-b border-slate-100 last:border-0">
      <div className="px-4 py-4 text-sm font-bold text-slate-800 min-w-[100px] truncate">{t.code}</div>
      <div className="flex-1 px-4 py-4 text-sm text-slate-600 font-medium min-w-[180px] truncate">{employee?.fullName || '--'}</div>
      <div className="flex-1 px-4 py-4 text-sm text-slate-600 font-medium min-w-[150px] truncate">{getDepartmentName(employee?.departmentId)}</div>
      <div className="px-4 py-4 text-sm text-slate-600 font-medium whitespace-nowrap min-w-[120px]">{formatDate(t.workDate)}</div>
      <div className="px-4 py-4 text-sm text-slate-600 font-medium whitespace-nowrap min-w-[80px]">{t.checkIn || '--'}</div>
      <div className="px-4 py-4 text-sm text-slate-600 font-medium whitespace-nowrap min-w-[80px]">{t.checkOut || '--'}</div>
      <div className="px-4 py-4 text-sm font-black text-slate-800 whitespace-nowrap min-w-[90px]">{(t.totalHours || 0).toFixed(1)}h</div>
      <div className="px-4 py-4 min-w-[100px]">
        <StatusBadge status={t.status} />
      </div>
      <div className="flex-1 px-4 py-4 min-w-[150px]">
        <WarningList warnings={t.warnings} />
      </div>
    </div>
  );
});

const ManagerTimesheetReport: React.FC<ManagerTimesheetReportProps> = ({
  timesheets,
  employees,
  departments,
  feedback,
  onFeedback,
}) => {
  const [filters, setFilters] = useState(DEFAULT_REPORT_FILTERS);

  const previewRows = useMemo(() => {
    return timesheets
      .filter((timesheet) => {
        const employee = employees.find((e) => e.id === timesheet.employeeId);
        const matchesDate =
          (!filters.fromDate || timesheet.workDate >= filters.fromDate) &&
          (!filters.toDate || timesheet.workDate <= filters.toDate);
        const matchesEmployee = filters.employeeId === 'all' || timesheet.employeeId === filters.employeeId;
        const matchesDepartment = filters.departmentId === 'all' || employee?.departmentId === filters.departmentId;
        const matchesStatus = filters.status === 'all' || timesheet.status === filters.status;

        return matchesDate && matchesEmployee && matchesDepartment && matchesStatus;
      })
      .sort((a, b) => b.workDate.localeCompare(a.workDate));
  }, [employees, filters, timesheets]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleExport = () => {
    if (previewRows.length === 0) {
      onFeedback('danger', 'Không có dữ liệu để xuất.');
      return;
    }
    onFeedback('success', `Đã xuất ${previewRows.length} dòng dữ liệu timesheet dạng ${filters.exportFormat}.`);
  };

  const getDepartmentName = (id: string) => departments.find((d) => d.id === id)?.name || '--';

  const rowHeight = 64;
  const listHeight = Math.min(previewRows.length * rowHeight, 600);

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">UC-09</span>
        <h1 className="text-3xl font-black text-slate-800 m-0">Báo cáo timesheet</h1>
        <p className="text-slate-500 m-0 text-sm max-w-3xl">Lọc và xuất dữ liệu timesheet trong phạm vi nhóm/phòng ban được quản lý.</p>
      </div>

      <ManagerFeedback feedback={feedback} />

      <div className="p-8 rounded-[32px] bg-white border border-slate-200 shadow-sm flex flex-col gap-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Từ ngày</label>
            <input
              type="date"
              name="fromDate"
              value={filters.fromDate}
              onChange={handleChange}
              className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Đến ngày</label>
            <input
              type="date"
              name="toDate"
              value={filters.toDate}
              onChange={handleChange}
              className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Nhân viên</label>
            <select
              name="employeeId"
              value={filters.employeeId}
              onChange={handleChange}
              className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer"
            >
              <option value="all">Tất cả nhân viên</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.fullName}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Phòng ban</label>
            <select
              name="departmentId"
              value={filters.departmentId}
              onChange={handleChange}
              className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer"
            >
              <option value="all">Tất cả phòng ban</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Trạng thái</label>
            <select
              name="status"
              value={filters.status}
              onChange={handleChange}
              className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="Pending">Pending</option>
              <option value="Submitted">Submitted</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Định dạng</label>
            <select
              name="exportFormat"
              value={filters.exportFormat}
              onChange={handleChange}
              className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer"
            >
              <option value="Excel">Excel/CSV</option>
              <option value="PDF">PDF</option>
            </select>
          </div>
          <div className="flex items-end lg:col-span-1 xl:col-span-2">
            <button
              onClick={handleExport}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-black shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
            >
              <FiDownload /> Xuất báo cáo
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/30">
          <div className="overflow-x-auto">
            <div className="min-w-[1100px]">
              {/* Header */}
              <div className="flex bg-slate-100/80 border-b border-slate-200">
                <div className="px-4 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider min-w-[100px]">Mã</div>
                <div className="flex-1 px-4 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider min-w-[180px]">Nhân viên</div>
                <div className="flex-1 px-4 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider min-w-[150px]">Phòng ban</div>
                <div className="px-4 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider min-w-[120px]">Ngày</div>
                <div className="px-4 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider min-w-[80px]">In</div>
                <div className="px-4 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider min-w-[80px]">Out</div>
                <div className="px-4 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider min-w-[90px]">Tổng giờ</div>
                <div className="px-4 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider min-w-[100px]">Trạng thái</div>
                <div className="flex-1 px-4 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider min-w-[150px]">Cảnh báo</div>
              </div>

              {/* Body */}
              {previewRows.length > 0 ? (
                <List
                  height={listHeight}
                  itemCount={previewRows.length}
                  itemSize={rowHeight}
                  width="100%"
                  itemData={{
                    previewRows,
                    employees,
                    getDepartmentName,
                  }}
                >
                  {ReportRowItem}
                </List>
              ) : (
                <div className="px-4 py-12 text-center text-slate-400 text-sm font-medium italic">Không có dữ liệu phù hợp với bộ lọc.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ManagerTimesheetReport;
