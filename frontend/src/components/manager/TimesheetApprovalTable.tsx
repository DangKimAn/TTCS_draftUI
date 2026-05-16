import React from 'react';
import { FixedSizeList as List } from 'react-window';
import { TimesheetRow } from './TableRows';

interface TimesheetApprovalTableProps {
  rows: any[];
  getEmployeeById: (id: string) => any;
  getDepartmentName: (id: string) => string;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onViewDetail: (id: string) => void;
  isTimesheetReviewable: (t: any) => boolean;
  isLoading: boolean;
}

const TimesheetRowItem = React.memo(({ index, data, style }: any) => {
  const { rows, getEmployeeById, getDepartmentName, onApprove, onReject, onViewDetail, isTimesheetReviewable } = data;
  const timesheet = rows[index];
  return (
    <TimesheetRow
      style={style}
      timesheet={timesheet}
      employee={getEmployeeById(timesheet.employeeId)}
      departmentName={getDepartmentName(timesheet.departmentId)}
      onApprove={onApprove}
      onReject={onReject}
      onViewDetail={onViewDetail}
      reviewable={isTimesheetReviewable(timesheet)}
    />
  );
});

const TimesheetApprovalTable: React.FC<TimesheetApprovalTableProps> = ({
  rows,
  getEmployeeById,
  getDepartmentName,
  onApprove,
  onReject,
  onViewDetail,
  isTimesheetReviewable,
  isLoading,
}) => {
  const rowHeight = 72;
  const listHeight = Math.min(rows.length * rowHeight, 500);

  return (
    <div className="p-6 rounded-[28px] bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="mb-6">
        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-1">Timesheets</span>
        <h2 className="text-xl font-bold text-slate-800 m-0">Danh sách bảng công</h2>
      </div>
      <div className="overflow-x-auto -mx-6">
        <div className="min-w-[1200px]">
          {/* Header */}
          <div className="flex bg-slate-50/50 border-y border-slate-100">
            <div className="px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider min-w-[100px]">Mã</div>
            <div className="flex-1 px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider min-w-[180px]">Nhân viên</div>
            <div className="flex-1 px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider min-w-[140px]">Phòng ban</div>
            <div className="px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider min-w-[120px]">Ngày/Kỳ công</div>
            <div className="px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider min-w-[80px]">In</div>
            <div className="px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider min-w-[80px]">Out</div>
            <div className="px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider min-w-[80px]">Tổng giờ</div>
            <div className="px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider min-w-[100px]">Trạng thái</div>
            <div className="flex-1 px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider min-w-[120px]">Cảnh báo</div>
            <div className="px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider min-w-[160px]">Hành động</div>
          </div>

          {/* Body */}
          {rows.length > 0 ? (
            <List
              height={listHeight}
              itemCount={rows.length}
              itemSize={rowHeight}
              width="100%"
              itemData={{
                rows,
                getEmployeeById,
                getDepartmentName,
                onApprove,
                onReject,
                onViewDetail,
                isTimesheetReviewable,
              }}
            >
              {TimesheetRowItem}
            </List>
          ) : (
            <div className="px-4 py-12 text-center text-slate-400 text-sm font-medium italic">
              {isLoading ? 'Đang tải dữ liệu...' : 'Không có bảng công nào cần duyệt.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimesheetApprovalTable;
