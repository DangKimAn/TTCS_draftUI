import React from 'react';
import { formatDate } from '../../utils/dateUtils';
import { StatusBadge, InfoItem } from './SharedComponents';

interface EmployeeDetailPanelProps {
  employee: any;
  departments: any[];
  timesheets: any[];
  leaveRequests: any[];
}

const EmployeeDetailPanel: React.FC<EmployeeDetailPanelProps> = ({
  employee,
  departments,
  timesheets,
  leaveRequests,
}) => {
  if (!employee) {
    return (
      <div className="p-12 text-center rounded-[28px] bg-slate-50 border border-slate-200 border-dashed">
        <p className="text-slate-400 text-sm font-medium italic m-0">Chưa chọn nhân viên để xem chi tiết.</p>
      </div>
    );
  }

  const getDepartmentName = (id: string) => departments.find((d) => d.id === id)?.name || '--';
  const getInitials = (name: string) => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="p-8 rounded-[32px] bg-white border border-slate-200 shadow-sm flex flex-col gap-8">
      <div className="flex items-center gap-6">
        <div className="w-20 h-20 flex items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-emerald-500 to-rose-500 text-white text-2xl font-black shadow-lg">
          {getInitials(employee.fullName)}
        </div>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-2xl font-black text-slate-800 m-0">{employee.fullName}</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 font-medium">{employee.title} | {getDepartmentName(employee.departmentId)}</span>
            <StatusBadge status={employee.status} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <InfoItem label="Email" value={employee.email} />
        <InfoItem label="Số điện thoại" value={employee.phone || '--'} />
        <InfoItem label="Số dư phép" value={`${employee.leaveBalance} ngày`} />
        <InfoItem label="Giờ tháng này" value={`${(employee.monthlyHours || 0).toFixed(1)}h`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-bold text-slate-800 m-0">Lịch sử chấm công gần đây</h3>
          <div className="flex flex-col divide-y divide-slate-100 bg-slate-50/50 rounded-2xl border border-slate-100 p-2">
            {timesheets.length > 0 ? (
              timesheets.map((t) => (
                <div key={t.id} className="p-3 flex items-center justify-between gap-4">
                  <div className="flex flex-col gap-0.5">
                    <strong className="text-sm text-slate-800 font-bold">{formatDate(t.workDate)}</strong>
                    <span className="text-[11px] text-slate-500">{t.checkIn || '--'} - {t.checkOut || '--'} | {(t.totalHours || 0).toFixed(1)}h</span>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs italic">Chưa có lịch sử chấm công gần đây.</div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-bold text-slate-800 m-0">Lịch sử đơn nghỉ gần đây</h3>
          <div className="flex flex-col divide-y divide-slate-100 bg-slate-50/50 rounded-2xl border border-slate-100 p-2">
            {leaveRequests.length > 0 ? (
              leaveRequests.map((r) => (
                <div key={r.id} className="p-3 flex items-center justify-between gap-4">
                  <div className="flex flex-col gap-0.5">
                    <strong className="text-sm text-slate-800 font-bold">{r.type}</strong>
                    <span className="text-[11px] text-slate-500">{formatDate(r.startDate)} - {formatDate(r.endDate)} | {r.totalDays} ngày</span>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs italic">Chưa có lịch sử đơn nghỉ phép gần đây.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDetailPanel;
