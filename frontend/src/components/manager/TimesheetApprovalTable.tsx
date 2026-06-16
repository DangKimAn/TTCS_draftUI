import React from 'react';
import { FixedSizeList as List } from 'react-window';
import { TimesheetRow } from './TableRows';

interface TimesheetApprovalTableProps {
  rows: any[];
  getEmployeeById: (id: string) => any | undefined;
  getDepartmentName: (id: string) => string;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onViewDetail: (id: string) => void;
  isTimesheetReviewable: (t: any) => boolean;
  isLoading: boolean;
  highlightId?: string | null;
  processingId?: string | null;
}

const TIMESHEET_GRID_COLUMNS =
  'minmax(72px,0.7fr) minmax(130px,1.35fr) minmax(112px,1fr) minmax(116px,0.95fr) minmax(54px,0.45fr) minmax(54px,0.45fr) minmax(68px,0.55fr) minmax(92px,0.75fr) minmax(108px,1fr) minmax(104px,0.75fr)';

const TimesheetRowItem = React.memo(({ index, data, style }: { index: number, data: any, style: React.CSSProperties }) => {
  const {
    rows,
    getEmployeeById,
    getDepartmentName,
    onApprove,
    onReject,
    onViewDetail,
    isTimesheetReviewable,
    highlightId,
    processingId,
  } = data;
  const timesheet = rows[index];
  const employee = getEmployeeById(timesheet.employeeId);
  const departmentName =
    timesheet.departmentName ||
    employee?.departmentName ||
    getDepartmentName(timesheet.departmentId);

  return (
    <TimesheetRow
      style={style}
      timesheet={timesheet}
      employee={employee}
      departmentName={departmentName}
      onApprove={onApprove}
      onReject={onReject}
      onViewDetail={onViewDetail}
      reviewable={isTimesheetReviewable(timesheet)}
      highlightId={highlightId}
      processingId={processingId}
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
  highlightId,
  processingId,
}) => {
  const rowHeight = 72;
  const listHeight = Math.min(rows.length * rowHeight, 500);

  return (
    <div className="p-6 rounded-[28px] bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="mb-6">
        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-1">Timesheets</span>
        <h2 className="text-xl font-bold text-slate-800 m-0">Danh sách bảng công</h2>
      </div>
      <div className="-mx-6">
        <div className="w-full max-w-full">
          <div
            className="grid bg-slate-50/50 border-y border-slate-100"
            style={{ gridTemplateColumns: TIMESHEET_GRID_COLUMNS }}
          >
            <div className="px-3 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Mã</div>
            <div className="px-3 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Nhân viên</div>
            <div className="px-3 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Phòng ban</div>
            <div className="px-3 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Ngày/Kỳ công</div>
            <div className="px-2 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">In</div>
            <div className="px-2 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Out</div>
            <div className="px-2 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Tổng</div>
            <div className="px-3 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Trạng thái</div>
            <div className="px-3 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Cảnh báo</div>
            <div className="px-3 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Hành động</div>
          </div>

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
                highlightId,
                processingId,
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
