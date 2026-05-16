import React from 'react';
import { formatDate } from '../../utils/dateUtils';
import { StatusBadge, WarningList, InfoItem, ModalShell } from './SharedComponents';

interface ManagerDetailModalProps {
  detail: { type: string; id: string } | null;
  timesheets: any[];
  leaveRequests: any[];
  employees: any[];
  departments: any[];
  onClose: () => void;
}

const ManagerDetailModal: React.FC<ManagerDetailModalProps> = ({
  detail,
  timesheets,
  leaveRequests,
  employees,
  departments,
  onClose,
}) => {
  if (!detail) return null;

  const getEmployeeById = (id: string) => employees.find((e) => e.id === id);
  const getDepartmentName = (id: string) => departments.find((d) => d.id === id)?.name || '--';
  const formatHoursValue = (val: number) => (val || 0).toFixed(1) + 'h';
  const getStatusClass = (s: string) => s; // Using StatusBadge instead

  if (detail.type === 'timesheet') {
    const timesheet = timesheets.find((item) => item.id === detail.id);
    const employee = timesheet ? getEmployeeById(timesheet.employeeId) : null;

    if (!timesheet) return null;

    return (
      <ModalShell title={`Chi tiết bảng công ${timesheet.code}`} onClose={onClose}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoItem label="Nhân viên" value={employee?.fullName || '--'} />
          <InfoItem label="Email" value={employee?.email || '--'} />
          <InfoItem label="Phòng ban" value={getDepartmentName(timesheet.departmentId)} />
          <InfoItem label="Ngày/kỳ công" value={timesheet.periodLabel} />
          <InfoItem label="Check-in" value={timesheet.checkIn || '--'} />
          <InfoItem label="Check-out" value={timesheet.checkOut || '--'} />
          <InfoItem label="Tổng giờ làm" value={formatHoursValue(timesheet.totalHours)} />
          <InfoItem label="Khóa chỉnh sửa" value={timesheet.locked ? 'Đã khóa' : 'Chưa khóa'} />
        </div>
        <div className="mt-6 flex flex-col gap-4">
          <h3 className="text-lg font-bold text-slate-800 m-0">Trạng thái và cảnh báo</h3>
          <div className="flex items-center flex-wrap gap-3">
            <StatusBadge status={timesheet.status} />
            <WarningList warnings={timesheet.warnings} />
          </div>
          {timesheet.rejectionReason && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100">
              <p className="text-sm text-rose-700 m-0 font-medium">Lý do từ chối: {timesheet.rejectionReason}</p>
            </div>
          )}
        </div>
      </ModalShell>
    );
  }

  const request = leaveRequests.find((item) => item.id === detail.id);
  const employee = request ? getEmployeeById(request.employeeId) : null;

  if (!request) return null;

  return (
    <ModalShell title={`Chi tiết đơn nghỉ ${request.code}`} onClose={onClose}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InfoItem label="Nhân viên" value={employee?.fullName || '--'} />
        <InfoItem label="Loại nghỉ" value={request.type} />
        <InfoItem label="Ngày bắt đầu" value={formatDate(request.startDate)} />
        <InfoItem label="Ngày kết thúc" value={formatDate(request.endDate)} />
        <InfoItem label="Số ngày nghỉ" value={`${request.totalDays} ngày`} />
        <InfoItem label="Số dư phép hiện tại" value={`${employee?.leaveBalance ?? 0} ngày`} />
      </div>
      <div className="mt-6 flex flex-col gap-4">
        <h3 className="text-lg font-bold text-slate-800 m-0">Trạng thái và lý do</h3>
        <div className="flex items-center flex-wrap gap-3">
          <StatusBadge status={request.status} />
        </div>
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <p className="text-sm text-slate-600 m-0 leading-relaxed italic">"{request.reason || 'Khong co ly do'}"</p>
        </div>
        {request.rejectionReason && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100">
            <p className="text-sm text-rose-700 m-0 font-medium">Lý do từ chối: {request.rejectionReason}</p>
          </div>
        )}
      </div>
    </ModalShell>
  );
};

export default ManagerDetailModal;
