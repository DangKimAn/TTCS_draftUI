import React from 'react';
import { FiAlertTriangle, FiX } from 'react-icons/fi';

export const StatusBadge: React.FC<{ status: string; className?: string }> = ({ status, className = '' }) => {
  const getStatusClass = (s: string) => {
    switch (s) {
      case 'Approved':
      case 'Active':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Rejected':
      case 'Inactive':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'Cancelled':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'Pending':
      case 'Submitted':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusLabel = (s: string) => {
    switch (s) {
      case 'Approved':
        return 'Đã duyệt';
      case 'Rejected':
        return 'Từ chối';
      case 'Cancelled':
        return 'Đã hủy';
      case 'Pending':
        return 'Chờ duyệt';
      case 'Submitted':
        return 'Đã gửi';
      default:
        return s;
    }
  };

  return (
    <span className={`inline-flex items-center justify-center min-h-[26px] px-2.5 rounded-full text-[0.72rem] font-semibold border ${getStatusClass(status)} ${className}`}>
      {getStatusLabel(status)}
    </span>
  );
};

type WarningItem =
  | string
  | {
      code?: string;
      label?: string;
      message?: string;
      tone?: string;
    };

function getWarningText(warning: WarningItem): string {
  if (typeof warning === 'string') {
    return warning;
  }

  return warning.label || warning.message || warning.code || 'Canh bao';
}

export const WarningList: React.FC<{ warnings?: WarningItem[] }> = ({ warnings }) => {
  if (!warnings || warnings.length === 0) return <span className="text-slate-400">Khong co canh bao</span>;

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {warnings.map((warning, index) => {
        const warningText = getWarningText(warning);

        return (
          <span
            key={`${warningText}-${index}`}
            className="inline-flex items-center justify-center min-h-[26px] px-2.5 rounded-full text-[0.72rem] font-semibold border bg-amber-50 text-amber-700 border-amber-100"
            title={warningText}
          >
            {warningText}
          </span>
        );
      })}
    </div>
  );
};

export const InfoItem: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm flex flex-col gap-1 min-w-0">
    <span className="text-[0.75rem] text-slate-500 uppercase tracking-wider font-bold truncate" title={label}>{label}</span>
    <strong className="text-slate-800 text-[1rem] truncate" title={String(value)}>{value}</strong>
  </div>
);

export const ModalShell: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({
  title,
  onClose,
  children,
}) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
    <div className="w-full max-w-3xl max-h-[86vh] overflow-y-auto rounded-[28px] bg-white shadow-2xl border border-slate-200 p-7 relative">
      <div className="flex items-start justify-between gap-4 mb-5">
        <h2 className="m-0 text-xl font-bold text-slate-800">{title}</h2>
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <FiX size={20} />
        </button>
      </div>
      {children}
    </div>
  </div>
);

export const ManagerFeedback: React.FC<{ feedback: { type: string; message: string } | null }> = ({ feedback }) => {
  if (!feedback) return null;

  const isError = feedback.type === 'danger';
  const isSuccess = feedback.type === 'success';

  return (
    <div
      className={`mb-6 p-4 rounded-2xl border flex items-center gap-3 ${
        isError
          ? 'bg-rose-50 border-rose-100 text-rose-700'
          : isSuccess
          ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
          : 'bg-blue-50 border-blue-100 text-blue-700'
      }`}
    >
      <FiAlertTriangle className="flex-shrink-0" />
      <p className="m-0 text-sm font-medium">{feedback.message}</p>
    </div>
  );
};
