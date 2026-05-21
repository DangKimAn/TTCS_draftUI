import React from 'react';
import { FixedSizeList as List } from 'react-window';
import { LeaveRow } from './TableRows';

interface LeaveApprovalTableProps {
  rows: any[];
  getEmployeeById: (id: string) => any;
  getDepartmentName: (id: string) => string;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onViewDetail: (id: string) => void;
  onRequestCheck: (id: string) => void;
  isLoading: boolean;
  highlightId?: string | null;
  processingId?: string | null;
}

const LeaveRowItem = React.memo(({ index, data, style }: any) => {
  const { rows, getEmployeeById, getDepartmentName, onApprove, onReject, onViewDetail, onRequestCheck, highlightId, processingId } = data;
  const request = rows[index];
  const employee = getEmployeeById(request.employeeId);
  const balance = employee?.leaveBalance ?? 0;
  const insufficientBalance = !request.isUnpaid && balance < request.totalDays;

  return (
    <LeaveRow
      style={style}
      request={request}
      employee={employee}
      departmentName={getDepartmentName(employee?.departmentId)}
      onApprove={onApprove}
      onReject={onReject}
      onViewDetail={onViewDetail}
      onRequestCheck={onRequestCheck}
      reviewable={request.status === 'Pending'}
      insufficientBalance={insufficientBalance}
      highlightId={highlightId}
      processingId={processingId}
    />
  );
});

const LeaveApprovalTable: React.FC<LeaveApprovalTableProps> = ({
  rows,
  getEmployeeById,
  getDepartmentName,
  onApprove,
  onReject,
  onViewDetail,
  onRequestCheck,
  isLoading,
  highlightId,
  processingId,
}) => {
  const rowHeight = 72;
  const listHeight = Math.min(rows.length * rowHeight, 600);

  return (
    <div className="p-6 rounded-[28px] bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="mb-6">
        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-1">Leave Requests</span>
        <h2 className="text-xl font-bold text-slate-800 m-0">Danh sách đơn nghỉ chờ duyệt</h2>
      </div>
      <div className="overflow-x-auto -mx-6">
        <div className="min-w-[1200px]">
          {/* Header */}
          <div className="flex bg-slate-50/50 border-y border-slate-100">
            <div className="px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider w-[110px] shrink-0">Mã đơn</div>
            <div className="flex-1 px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider min-w-[180px]">Nhân viên</div>
            <div className="flex-1 px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider min-w-[120px]">Loại nghỉ</div>
            <div className="px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider min-w-[150px]">Thời gian</div>
            <div className="px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider min-w-[90px]">Số ngày</div>
            <div className="flex-[2] px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider min-w-[200px]">Lý do</div>
            <div className="px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider min-w-[120px]">Số dư phép</div>
            <div className="px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider min-w-[100px]">Trạng thái</div>
            <div className="px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider min-w-[180px]">Hành động</div>
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
                onRequestCheck,
                highlightId,
                processingId,
              }}
            >
              {LeaveRowItem}
            </List>
          ) : (
            <div className="px-4 py-12 text-center text-slate-400 text-sm font-medium italic">
              {isLoading ? 'Đang tải dữ liệu...' : 'Không có đơn nghỉ phép nào đang chờ.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaveApprovalTable;
