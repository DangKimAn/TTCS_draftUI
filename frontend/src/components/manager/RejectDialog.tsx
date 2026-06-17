import React from 'react';
import { FiX, FiCheck } from 'react-icons/fi';
import { ModalShell } from './SharedComponents';

interface RejectDialogProps {
  dialog: {
    type: string;
    id: string;
    reason: string;
    error: string;
  } | null;
  timesheets: any[];
  leaveRequests: any[];
  correctionRequests: any[];
  onChange: (reason: string) => void;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  isSubmitting?: boolean;
}

const RejectDialog: React.FC<RejectDialogProps> = ({
  dialog,
  timesheets,
  leaveRequests,
  correctionRequests,
  onChange,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  if (!dialog) return null;

  const getTargetLabel = () => {
    if (dialog.type === 'timesheet') {
      const item = timesheets.find((t) => t.id === dialog.id);
      return item ? `bảng công ${item.code}` : 'bảng công';
    }
    if (dialog.type === 'correction') {
      const item = correctionRequests.find((t) => t.id === dialog.id);
      return item ? `yêu cầu chỉnh sửa của ${item.employee?.fullName || 'nhân viên'}` : 'yêu cầu chỉnh sửa';
    }
    const item = leaveRequests.find((l) => l.id === dialog.id);
    return item ? `đơn nghỉ ${item.code}` : 'đơn nghỉ phép';
  };

  return (
    <ModalShell title={`Từ chối ${getTargetLabel()}`} onClose={onClose}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="reject-reason" className="text-sm font-bold text-slate-700">
            Lý do từ chối <span className="text-rose-500">*</span>
          </label>
          <textarea
            id="reject-reason"
            rows={4}
            className={`w-full p-4 rounded-2xl border bg-slate-50 text-slate-800 outline-none transition-all ${
              dialog.error ? 'border-rose-400 focus:ring-4 focus:ring-rose-500/10' : 'border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10'
            }`}
            placeholder="Vui lòng nhập lý do từ chối cụ thể để nhân viên nắm rõ..."
            value={dialog.reason}
            onChange={(e) => onChange(e.target.value)}
            autoFocus
            disabled={isSubmitting}
          />
          {dialog.error && <p className="text-xs font-medium text-rose-500">{dialog.error}</p>}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50 transition-all"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-600 shadow-lg shadow-rose-500/20 transition-all ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={onSubmit}
            disabled={isSubmitting}
          >
            <FiCheck />
            {isSubmitting ? 'Đang xử lý...' : 'Xác nhận từ chối'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
};

export default RejectDialog;
