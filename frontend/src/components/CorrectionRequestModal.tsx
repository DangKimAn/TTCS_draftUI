import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getDateKey } from '../utils/dateUtils';

type CorrectionFormErrors = {
  date?: string;
  requestedCheckOut?: string;
  reason?: string;
};

function CorrectionRequestModal({ isOpen, selectedRow, onClose, onSubmit, rows = [] }) {
  const [form, setForm] = useState({
    date: '',
    requestedCheckIn: '',
    requestedCheckOut: '',
    reason: '',
  });
  const [errors, setErrors] = useState<CorrectionFormErrors>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    if (!selectedRow) {
      setForm({
        date: '',
        requestedCheckIn: '',
        requestedCheckOut: '',
        reason: '',
      });
      setErrors({});
      setIsSubmitting(false);
      return;
    }

    setForm({
      date: selectedRow.date || '',
      requestedCheckIn: selectedRow.checkInTime && selectedRow.checkInTime !== '--' ? selectedRow.checkInTime : '',
      requestedCheckOut: selectedRow.checkOutTime && selectedRow.checkOutTime !== '--' ? selectedRow.checkOutTime : '',
      reason: '',
    });
    setErrors({});
    setIsSubmitting(false);
  }, [selectedRow]);

  if (!isOpen) {
    return null;
  }

  const validate = () => {
    const nextErrors: CorrectionFormErrors = {};

    if (!form.date) {
      nextErrors.date = 'Vui lòng chọn ngày.';
    } else {
      const today = getDateKey();
      if (form.date > today) {
        nextErrors.date = 'Không được chỉnh sửa ngày sau ngày hiện tại.';
      } else if (form.date === today) {
        const todayRow = rows.find((r) => r.date === today);
        const hasCheckedOutToday = todayRow && todayRow.checkOutTime && todayRow.checkOutTime !== '--';
        if (!hasCheckedOutToday) {
          nextErrors.date = 'Hôm nay chưa check-out, chỉ được chỉnh sửa ngày trước đó.';
        }
      }
    }

    if (!form.reason.trim()) {
      nextErrors.reason = 'Vui lòng nhập lý do chỉnh sửa.';
    }

    if (form.requestedCheckIn && form.requestedCheckOut && form.requestedCheckOut <= form.requestedCheckIn) {
      nextErrors.requestedCheckOut = 'Giờ Check-out phải lớn hơn Check-in.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate() || isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      await onSubmit(form);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="modal-backdrop">
      <div className="modal-card correction-modal">
        <div className="dashboard-panel__heading">
          <div>
            <span className="dashboard-panel__eyebrow">Yêu cầu chỉnh sửa</span>
            <h2>Tạo yêu cầu chỉnh sửa</h2>
            <p>Gửi lý do và giờ đúng để quản lý xét duyệt trước khi chốt công.</p>
          </div>
        </div>

        <form className="correction-form" onSubmit={handleSubmit}>
          <label>
            <span>Ngày cần chỉnh sửa</span>
            <input
              type="date"
              value={form.date}
              max={getDateKey()}
              onChange={(event) => {
                const newDate = event.target.value;
                const dateRow = rows.find((r) => r.date === newDate);
                setForm((prev) => ({
                  ...prev,
                  date: newDate,
                  requestedCheckIn: dateRow?.checkInTime && dateRow.checkInTime !== '--' ? dateRow.checkInTime : '',
                  requestedCheckOut: dateRow?.checkOutTime && dateRow.checkOutTime !== '--' ? dateRow.checkOutTime : '',
                }));
              }}
            />
            {errors.date ? <small>{errors.date}</small> : null}
          </label>

          <div className="correction-form__row">
            <label>
              <span>Giờ Check-in đúng</span>
              <input
                type="time"
                value={form.requestedCheckIn}
                disabled
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, requestedCheckIn: event.target.value }))
                }
              />
            </label>

            <label>
              <span>Giờ Check-out đúng</span>
              <input
                type="time"
                value={form.requestedCheckOut}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, requestedCheckOut: event.target.value }))
                }
              />
              {errors.requestedCheckOut ? <small>{errors.requestedCheckOut}</small> : null}
            </label>
          </div>

          <label>
            <span>Lý do chỉnh sửa</span>
            <textarea
              rows={4}
              value={form.reason}
              onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
              placeholder="Ví dụ: Quên Check-out vì họp khẩn với khách hàng."
            />
            {errors.reason ? <small>{errors.reason}</small> : null}
          </label>

          <div className="dashboard-panel__actions">
            <button type="submit" className="dashboard-button dashboard-button--primary" disabled={isSubmitting}>
              {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
            </button>
            <button type="button" className="dashboard-button dashboard-button--ghost" onClick={onClose} disabled={isSubmitting}>
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default CorrectionRequestModal;
