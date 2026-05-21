import React from 'react';
import { FiCheck, FiXCircle, FiEye, FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';
import { formatDate } from '../../utils/dateUtils';
import { StatusBadge, WarningList } from './SharedComponents';

// Virtualized Row Components using DIV instead of TR for react-window compatibility

export const CorrectionRow = React.memo(({
  request,
  onApprove,
  onReject,
  style,
  processingId,
}: {
  request: any;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  style?: React.CSSProperties;
  processingId?: string | null;
}) => {
  const employee = request.employee || {};
  const isProcessing = processingId === request.id;
  const rowClass = isProcessing 
    ? 'flex items-center bg-slate-100 border-b border-slate-200 group opacity-70 pointer-events-none'
    : 'flex items-center hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 group';

  return (
    <div style={style} className={rowClass}>
      <div className="flex-1 px-4 py-4 min-w-[200px]">
        <div className="flex flex-col gap-0.5">
          <strong className="text-sm text-slate-800 font-bold truncate">{employee.username || employee.email || request.userEmail || '--'}</strong>
          <span className="text-[11px] text-slate-400 font-medium truncate">{employee.email || request.userEmail || '--'}</span>
        </div>
      </div>
      <div className="flex-1 px-4 py-4 whitespace-nowrap text-sm text-slate-600 font-medium min-w-[120px]">{formatDate(request.date)}</div>
      <div className="flex-1 px-4 py-4 whitespace-nowrap text-sm text-slate-600 font-medium min-w-[120px]">{request.requestedCheckIn || '--'}</div>
      <div className="flex-1 px-4 py-4 whitespace-nowrap text-sm text-slate-600 font-medium min-w-[120px]">{request.requestedCheckOut || '--'}</div>
      <div className="flex-[2] px-4 py-4 text-sm text-slate-600 leading-relaxed min-w-[200px] truncate" title={request.reason}>{request.reason}</div>
      <div className="flex-1 px-4 py-4 min-w-[180px]">
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onApprove(request.id)}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 font-bold text-xs border border-emerald-100 hover:bg-emerald-100 transition-all disabled:opacity-40"
          >
            {isProcessing ? <FiRefreshCw className="animate-spin" /> : <FiCheck />} Duyệt
          </button>
          <button
            onClick={() => onReject(request.id)}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 font-bold text-xs border border-rose-100 hover:bg-rose-100 transition-all disabled:opacity-40"
          >
            {isProcessing ? <FiRefreshCw className="animate-spin" /> : <FiXCircle />} Từ chối
          </button>
        </div>
      </div>
    </div>
  );
});

export const TimesheetRow = React.memo(({
  timesheet,
  employee,
  departmentName,
  onApprove,
  onReject,
  onViewDetail,
  reviewable,
  highlightId,
  style,
  processingId,
}: {
  timesheet: any;
  employee: any;
  departmentName: string;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onViewDetail: (id: string) => void;
  reviewable: boolean;
  highlightId?: string | null;
  processingId?: string | null;
  style?: React.CSSProperties;
}) => {
  const isHighlighted = highlightId === timesheet.id;
  const isProcessing = processingId === timesheet.id;
  
  let rowClass = `grid items-center transition-colors border-b border-slate-100 last:border-0 group `;
  if (isProcessing) {
    rowClass += 'bg-slate-100 opacity-70 pointer-events-none';
  } else if (isHighlighted) {
    rowClass += 'bg-slate-200';
  } else {
    rowClass += 'hover:bg-slate-50';
  }

  return (
    <div style={{ ...style, gridTemplateColumns: 'minmax(72px,0.7fr) minmax(130px,1.35fr) minmax(112px,1fr) minmax(116px,0.95fr) minmax(54px,0.45fr) minmax(54px,0.45fr) minmax(68px,0.55fr) minmax(92px,0.75fr) minmax(108px,1fr) minmax(104px,0.75fr)' }} className={rowClass}>
      <div className="min-w-0 px-3 py-4">
        <div className="flex flex-col gap-0.5">
          <strong className="text-sm text-slate-800 font-bold truncate">{timesheet.code}</strong>
          <span className="text-[11px] text-slate-400 font-medium truncate">{timesheet.locked ? 'Đã khóa' : 'Có thể xử lý'}</span>
        </div>
      </div>
      <div className="min-w-0 px-3 py-4">
        <div className="flex flex-col gap-0.5">
          <strong className="text-sm text-slate-800 font-bold truncate">{employee?.fullName || '--'}</strong>
          <span className="text-[11px] text-slate-400 font-medium truncate">{employee?.email || '--'}</span>
        </div>
      </div>
      <div className="min-w-0 px-3 py-4 text-sm text-slate-600 font-medium truncate" title={departmentName}>{departmentName}</div>
      <div className="min-w-0 px-3 py-4">
        <div className="flex flex-col gap-0.5">
          <strong className="text-sm text-slate-800 font-bold truncate">{formatDate(timesheet.workDate)}</strong>
          <span className="text-[11px] text-slate-400 font-medium truncate">{timesheet.periodLabel}</span>
        </div>
      </div>
      <div className="min-w-0 px-2 py-4 text-sm text-slate-600 font-medium whitespace-nowrap">{timesheet.checkIn || '--'}</div>
      <div className="min-w-0 px-2 py-4 text-sm text-slate-600 font-medium whitespace-nowrap">{timesheet.checkOut || '--'}</div>
      <div className="min-w-0 px-2 py-4 text-sm text-slate-800 font-black whitespace-nowrap">{(timesheet.totalHours || 0).toFixed(1)}h</div>
      <div className="min-w-0 px-3 py-4">
        <StatusBadge status={timesheet.status} />
      </div>
      <div className="min-w-0 px-3 py-4 overflow-hidden">
        <WarningList warnings={timesheet.warnings} />
      </div>
      <div className="min-w-0 px-3 py-4">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onViewDetail(timesheet.id)}
            className="p-2 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-all"
            title="Chi tiết"
          >
            <FiEye />
          </button>
          <button
            onClick={() => onApprove(timesheet.id)}
            disabled={!reviewable || isProcessing}
            className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 font-bold text-[10px] border border-emerald-100 hover:bg-emerald-100 disabled:opacity-40 transition-all"
          >
            {isProcessing ? <FiRefreshCw className="animate-spin" /> : <FiCheck />} Duyệt
          </button>
          <button
            onClick={() => onReject(timesheet.id)}
            disabled={!reviewable || isProcessing}
            className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-rose-50 text-rose-600 font-bold text-[10px] border border-rose-100 hover:bg-rose-100 disabled:opacity-40 transition-all"
          >
            {isProcessing ? <FiRefreshCw className="animate-spin" /> : <FiXCircle />} Từ chối
          </button>
        </div>
      </div>
    </div>
  );
});

export const LeaveRow = React.memo(({
  request,
  employee,
  departmentName,
  onApprove,
  onReject,
  onViewDetail,
  onRequestCheck,
  reviewable,
  insufficientBalance,
  highlightId,
  style,
  processingId,
}: {
  request: any;
  employee: any;
  departmentName: string;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onViewDetail: (id: string) => void;
  onRequestCheck: (id: string) => void;
  reviewable: boolean;
  insufficientBalance: boolean;
  highlightId?: string | null;
  processingId?: string | null;
  style?: React.CSSProperties;
}) => {
  const isHighlighted = highlightId === request.id;
  const isProcessing = processingId === request.id;
  
  let rowClass = `flex items-center transition-colors border-b border-slate-100 last:border-0 group `;
  if (isProcessing) {
    rowClass += 'bg-slate-100 opacity-70 pointer-events-none';
  } else if (isHighlighted) {
    rowClass += 'bg-slate-200';
  } else {
    rowClass += 'hover:bg-slate-50';
  }

  return (
    <div style={style} className={rowClass}>
      <div className="px-4 py-4 w-[110px] shrink-0">
        <strong className="text-sm text-slate-800 font-bold whitespace-normal break-words block leading-tight">{request.code}</strong>
      </div>
      <div className="flex-1 px-4 py-4 min-w-[180px]">
        <div className="flex flex-col gap-0.5">
          <strong className="text-sm text-slate-800 font-bold truncate">{employee?.fullName || '--'}</strong>
          <span className="text-[11px] text-slate-400 font-medium truncate">{departmentName}</span>
        </div>
      </div>
      <div className="flex-1 px-4 py-4 text-sm text-slate-600 font-medium min-w-[120px] truncate">{request.type}</div>
      <div className="px-4 py-4 min-w-[150px]">
        <div className="flex flex-col gap-0.5">
          <strong className="text-sm text-slate-800 font-bold truncate">{formatDate(request.startDate)}</strong>
          <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">đến {formatDate(request.endDate)}</span>
        </div>
      </div>
      <div className="px-4 py-4 text-sm text-slate-800 font-black whitespace-nowrap min-w-[90px]">{request.totalDays} ngày</div>
      <div className="flex-[2] px-4 py-4 text-sm text-slate-600 leading-relaxed min-w-[200px] truncate" title={request.reason}>{request.reason}</div>
      <div className="px-4 py-4 min-w-[120px]">
        <div className="flex flex-col gap-0.5">
          <strong className="text-sm text-slate-800 font-bold truncate">{employee?.leaveBalance ?? 0} ngày</strong>
          {request.isUnpaid ? (
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider italic">Không trừ phép</span>
          ) : insufficientBalance ? (
            <span className="text-[10px] text-rose-500 font-black uppercase tracking-wider italic">Không đủ số dư</span>
          ) : (
            <span className="text-[10px] text-emerald-500 font-black uppercase tracking-wider italic">Đủ điều kiện</span>
          )}
        </div>
      </div>
      <div className="px-4 py-4 min-w-[100px]">
        <StatusBadge status={request.status} />
      </div>
      <div className="px-4 py-4 min-w-[180px]">
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onViewDetail(request.id)}
            className="p-2 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-all"
            title="Chi tiết"
          >
            <FiEye />
          </button>
          <button
            onClick={() => onApprove(request.id)}
            disabled={!reviewable || insufficientBalance || isProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 font-bold text-xs border border-emerald-100 hover:bg-emerald-100 disabled:opacity-40 transition-all"
          >
            {isProcessing ? <FiRefreshCw className="animate-spin" /> : <FiCheck />} Duyệt
          </button>
          <button
            onClick={() => onReject(request.id)}
            disabled={!reviewable || isProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 font-bold text-xs border border-rose-100 hover:bg-rose-100 disabled:opacity-40 transition-all"
          >
            {isProcessing ? <FiRefreshCw className="animate-spin" /> : <FiXCircle />} Từ chối
          </button>
          {reviewable && insufficientBalance && (
            <button
              onClick={() => onRequestCheck(request.id)}
              className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 hover:bg-amber-100 transition-all"
              title="Yêu cầu kiểm tra lại"
            >
              <FiAlertTriangle />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
