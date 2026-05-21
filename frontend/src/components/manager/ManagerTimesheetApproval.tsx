import React, { useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { FiRefreshCw } from 'react-icons/fi';
import TimesheetApprovalTable from './TimesheetApprovalTable';
import { ManagerFeedback } from './SharedComponents';
import { CorrectionRow } from './TableRows';


interface ManagerTimesheetApprovalProps {
  timesheets: any[];
  correctionRequests: any[];
  employees: any[];
  departments: any[];
  feedback: any;
  isLoading: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onApproveCorrection: (id: string) => void;
  onRejectCorrection: (id: string) => void;
  onViewDetail: (id: string) => void;
  highlightId?: string | null;
  processingId?: string | null;
  onReload: () => void;
}

const CorrectionRowItem = React.memo(({ index, data, style }: any) => {
  const { correctionRows, onApproveCorrection, onRejectCorrection, processingId } = data;
  return (
    <CorrectionRow
      style={style}
      request={correctionRows[index]}
      onApprove={onApproveCorrection}
      onReject={onRejectCorrection}
      processingId={processingId}
    />
  );
});

const compareDateDesc = (left?: string, right?: string) =>
  String(right || '').localeCompare(String(left || ''));

const ManagerTimesheetApproval: React.FC<ManagerTimesheetApprovalProps> = ({
  timesheets,
  correctionRequests,
  employees,
  departments,
  feedback,
  isLoading,
  onApprove,
  onReject,
  onApproveCorrection,
  onRejectCorrection,
  onViewDetail,
  highlightId,
  processingId,
  onReload,
}) => {
  const isTimesheetReviewable = (t: any) => ['Submitted', 'Pending'].includes(t.status);
  
  const rows = useMemo(() => {
    const sortPendingFirst = (a: any, b: any) => {
      if (a.status === 'Submitted' && b.status !== 'Submitted') return -1;
      if (a.status !== 'Submitted' && b.status === 'Submitted') return 1;
      return compareDateDesc(a.workDate, b.workDate);
    };
    return [...timesheets].filter(isTimesheetReviewable).sort(sortPendingFirst);
  }, [timesheets]);

  const correctionRows = useMemo(() => 
    [...correctionRequests].sort((a, b) => compareDateDesc(a.createdAt || a.date, b.createdAt || b.date))
  , [correctionRequests]);

  const getEmployeeById = (id: string) => employees.find((e) => e.id === id);
  const getDepartmentName = (id: string) => departments.find((d) => d.id === id)?.name || '--';

  const rowHeight = 72;
  const correctionListHeight = Math.min(correctionRows.length * rowHeight, 300);

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">UC-06</span>
        <h1 className="text-3xl font-black text-slate-800 m-0">Bảng công cần duyệt</h1>
        <p className="text-slate-500 m-0 text-sm max-w-3xl">Duyệt, từ chối và kiểm tra cảnh báo bảng công của nhân viên trực thuộc.</p>
      </div>

      <ManagerFeedback feedback={feedback} />

      <div className="flex justify-end">
        <button
          onClick={onReload}
          disabled={isLoading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-slate-600 font-bold border border-slate-200 hover:bg-slate-50 transition-all disabled:opacity-50"
        >
          <FiRefreshCw className={isLoading ? 'animate-spin' : ''} />
          {isLoading ? 'Đang tải...' : 'Tải lại dữ liệu'}
        </button>
      </div>

      <div className="flex flex-col gap-8">
        {/* Correction Requests Table */}
        <div className="p-6 rounded-[28px] bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="mb-6">
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-1">Correction</span>
            <h2 className="text-xl font-bold text-slate-800 m-0">Yêu cầu chỉnh sửa đang chờ</h2>
          </div>
          <div className="overflow-x-auto -mx-6">
            <div className="min-w-[900px]">
              {/* Header */}
              <div className="flex bg-slate-50/50 border-y border-slate-100">
                <div className="flex-1 px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider min-w-[200px]">Nhân viên</div>
                <div className="flex-1 px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider min-w-[120px]">Ngày</div>
                <div className="flex-1 px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider min-w-[120px]">Check-in đề xuất</div>
                <div className="flex-1 px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider min-w-[120px]">Check-out đề xuất</div>
                <div className="flex-[2] px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider min-w-[200px]">Lý do</div>
                <div className="flex-1 px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider min-w-[180px]">Hành động</div>
              </div>

              {/* Body */}
              {correctionRows.length > 0 ? (
                <List
                  height={correctionListHeight}
                  itemCount={correctionRows.length}
                  itemSize={rowHeight}
                  width="100%"
                  itemData={{
                    correctionRows,
                    onApproveCorrection,
                    onRejectCorrection,
                    processingId,
                  }}
                >
                  {CorrectionRowItem}
                </List>
              ) : (
                <div className="px-4 py-12 text-center text-slate-400 text-sm font-medium italic">
                  {isLoading ? 'Đang tải dữ liệu...' : 'Không có yêu cầu chỉnh sửa nào đang chờ.'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Timesheets Table */}
        <TimesheetApprovalTable
          rows={rows}
          getEmployeeById={getEmployeeById}
          getDepartmentName={getDepartmentName}
          onApprove={onApprove}
          onReject={onReject}
          onViewDetail={onViewDetail}
          isTimesheetReviewable={isTimesheetReviewable}
          highlightId={highlightId}
          processingId={processingId}
          isLoading={isLoading}
        />
      </div>
    </section>
  );
};

export default ManagerTimesheetApproval;
