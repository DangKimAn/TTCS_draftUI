import React, { useMemo } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import { ManagerFeedback } from './SharedComponents';
import LeaveApprovalTable from './LeaveApprovalTable';

interface ManagerLeaveApprovalProps {
  leaveRequests: any[];
  employees: any[];
  departments: any[];
  feedback: any;
  isLoading: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRequestCheck: (id: string) => void;
  onViewDetail: (id: string) => void;
  highlightId?: string | null;
  processingId?: string | null;
  onReload: () => void;
}

const ManagerLeaveApproval: React.FC<ManagerLeaveApprovalProps> = ({
  leaveRequests,
  employees,
  departments,
  feedback,
  isLoading,
  onApprove,
  onReject,
  onRequestCheck,
  onViewDetail,
  highlightId,
  processingId,
  onReload,
}) => {
  const rows = useMemo(() => {
    const sortLeavePendingFirst = (a: any, b: any) => {
      if (a.status === 'Pending' && b.status !== 'Pending') return -1;
      if (a.status !== 'Pending' && b.status === 'Pending') return 1;
      return b.startDate.localeCompare(a.startDate);
    };

    return [...leaveRequests]
      .filter((request) => request.status === 'Pending')
      .sort(sortLeavePendingFirst);
  }, [leaveRequests]);

  const getEmployeeById = (id: string) => employees.find((e) => e.id === id);
  const getDepartmentName = (id: string) => departments.find((d) => d.id === id)?.name || '--';

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">UC-07</span>
        <h1 className="text-3xl font-black text-slate-800 m-0">Đơn nghỉ phép</h1>
        <p className="text-slate-500 m-0 text-sm max-w-3xl">Duyệt hoặc từ chối đơn nghỉ phép của nhân viên trực thuộc.</p>
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

      <LeaveApprovalTable
        rows={rows}
        getEmployeeById={getEmployeeById}
        getDepartmentName={getDepartmentName}
        onApprove={onApprove}
        onReject={onReject}
        onViewDetail={onViewDetail}
        onRequestCheck={onRequestCheck}
        highlightId={highlightId}
        processingId={processingId}
        isLoading={isLoading}
      />
    </section>
  );
};

export default ManagerLeaveApproval;
