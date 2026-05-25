import { useEffect, useMemo, useState } from 'react';
import { FiBarChart2, FiCheckCircle, FiClock, FiRefreshCw, FiFileText } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import CorrectionRequestModal from '../components/CorrectionRequestModal';
import SubmitTimesheetPanel from '../components/SubmitTimesheetPanel';
import TimesheetFilterBar from '../components/TimesheetFilterBar';
import TimesheetSummaryCard from '../components/TimesheetSummaryCard';
import TimesheetTable from '../components/TimesheetTable';
import { createCorrectionRequest } from '../services/correctionService';
import {
  canSubmitTimesheet,
  getMonthlyTimesheetPeriodData,
  submitTimesheet,
} from '../services/timesheetService';
import { getDateKey } from '../utils/dateUtils';
import { getAuthSession, getDashboardPathByRole } from '../utils/storage';
import './EmployeeDashboard.css';
import './WorkspacePages.css';
import '../styles/timesheet.css';

function getMonthYear(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    const now = new Date();
    return {
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      date: now,
    };
  }

  return {
    month: date.getMonth() + 1,
    year: date.getFullYear(),
    date,
  };
}

function getFeedbackClass(message: string) {
  return message.includes('da duoc') || message.includes('thanh cong') || message.includes('tai lai')
    ? 'is-success'
    : 'is-danger';
}

function TimesheetWorkspacePage() {
  const navigate = useNavigate();
  const session = getAuthSession();
  const [periodType, setPeriodType] = useState('month');
  const [anchorDate, setAnchorDate] = useState(getDateKey());
  const [timesheetData, setTimesheetData] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!session?.token) {
      navigate('/login', { replace: true });
      return;
    }

    if (session.role !== 'employee') {
      navigate(getDashboardPathByRole(session.role), { replace: true });
    }
  }, [navigate, session?.role, session?.token]);

  const loadTimesheet = async ({ showSuccess = false } = {}) => {
    const userID = session?.userID || session?.id;
    const userEmail = session?.email || userID;

    if (!userID || !userEmail) {
      return;
    }

    const { month, year, date } = getMonthYear(anchorDate);

    setIsLoading(true);

    try {
      const nextData = await getMonthlyTimesheetPeriodData({
        userID,
        userEmail,
        month,
        year,
        periodType,
        anchorDate: date,
        createIfMissing: true,
      });

      setTimesheetData(nextData);

      if (showSuccess) {
        setFeedback('Du lieu bang cong da duoc tai lai tu API.');
      }
    } catch (error) {
      setFeedback(error?.message || 'Khong the tai du lieu bang cong tu API.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTimesheet();
  }, [session?.email, session?.id, session?.userID, periodType, anchorDate]);

  const submitState = useMemo(() => {
    if (!timesheetData) {
      return { allowed: false, reason: isLoading ? 'Dang tai bang cong...' : 'Chua co du lieu bang cong.' };
    }

    const periodCorrections = timesheetData.corrections.filter(
      (item) =>
        item.date >= timesheetData.period.startKey &&
        item.date <= timesheetData.period.endKey,
    );

    return canSubmitTimesheet(timesheetData.rows, periodCorrections, timesheetData.summary);
  }, [isLoading, timesheetData]);

  const handleOpenCorrection = (row = null) => {
    setSelectedRow(row || timesheetData?.rows[0] || null);
    setIsCorrectionOpen(true);
  };

  const handleCorrectionSubmit = async (formData) => {
    try {
      const attendanceRow =
        selectedRow ||
        timesheetData?.rows.find((row) => row.date === formData.date) ||
        null;

      if (!attendanceRow?.id) {
        setFeedback('Khong tim thay ban ghi cham cong de tao yeu cau.');
        return;
      }

      await createCorrectionRequest({
        userID: session.userID || session.id,
        monthlyTimesheetID: timesheetData.summary.id,
        userEmail: session.email,
        attendanceId: attendanceRow.id,
        date: formData.date,
        requestedCheckIn: formData.requestedCheckIn || null,
        requestedCheckOut: formData.requestedCheckOut || null,
        reason: formData.reason.trim(),
      });

      setIsCorrectionOpen(false);
      setSelectedRow(null);
      setFeedback('Yeu cau chinh sua da duoc gui.');
      void loadTimesheet();
    } catch (error) {
      setFeedback(
        error.code === 'CORRECTION_PENDING_EXISTS'
          ? 'Ngay nay da co yeu cau chinh sua cho duyet.'
          : error.message || 'Khong the tao yeu cau chinh sua. Vui long thu lai.',
      );
    }
  };

  const handleSubmitTimesheet = async () => {
    if (!timesheetData?.summary?.id) {
      return;
    }

    setIsSubmitting(true);

    try {
      await submitTimesheet(timesheetData.summary.id);
      setFeedback('Bang cong da duoc gui xac nhan va dang cho quan ly duyet.');
      await loadTimesheet();
    } catch (error) {
      setFeedback(error?.message || 'Khong the gui xac nhan bang cong. Vui long thu lai.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!timesheetData && isLoading) {
    return (
      <div className="dashboard-page timesheet-page">
        <section className="dashboard-panel timesheet-page__hero">
          <div>
            <span className="dashboard-panel__eyebrow">Timesheet Management</span>
            <h1>Dang tai bang cong tu API</h1>
            <p>He thong dang dong bo monthly timesheet va du lieu cham cong cua ban.</p>
          </div>
        </section>
      </div>
    );
  }

  if (!timesheetData) {
    return (
      <div className="dashboard-page timesheet-page">
        <section className="dashboard-panel timesheet-page__hero">
          <div>
            <span className="dashboard-panel__eyebrow">Timesheet Management</span>
            <h1>Chua tai duoc bang cong</h1>
            <p>{feedback || 'Vui long thu tai lai du lieu bang cong.'}</p>
          </div>
          <button
            type="button"
            className="dashboard-button dashboard-button--primary"
            onClick={() => void loadTimesheet({ showSuccess: true })}
          >
            <FiRefreshCw className={isLoading ? 'animate-spin' : ''} />
            Tai lai
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="dashboard-page timesheet-page">
      {isLoading && timesheetData && (
        <div className="global-loading-overlay">
          <FiRefreshCw className="animate-spin overlay-spinner-icon" />
          <p>Đang tải dữ liệu...</p>
        </div>
      )}
      
      <section className="dashboard-panel timesheet-page__hero">
        <div>
          <span className="dashboard-panel__eyebrow">Timesheet Management</span>
          <h1>Bang cong cua toi</h1>
          <p>Du lieu duoc tai truc tiep tu monthly timesheet API va attendance API cua backend.</p>
        </div>
        <div className="timesheet-page__hero-actions">
          <button
            type="button"
            className="dashboard-button dashboard-button--ghost"
            onClick={() => void loadTimesheet({ showSuccess: true })}
            disabled={isLoading}
          >
            <FiRefreshCw className={isLoading ? 'animate-spin' : ''} />
            {isLoading ? 'Dang tai...' : 'Tai lai'}
          </button>
          <div
            className={`dashboard-status-badge ${
              timesheetData.summary.status === 'Submitted'
                ? 'dashboard-status-badge--info'
                : timesheetData.summary.status === 'Approved'
                  ? 'dashboard-status-badge--success'
                  : timesheetData.summary.status === 'Rejected'
                    ? 'dashboard-status-badge--danger'
                    : 'dashboard-status-badge--neutral'
            }`}
          >
            {timesheetData.summary.status}
          </div>
        </div>
      </section>

      <section className="workspace-page__stats">
        <article className="dashboard-stat-card">
          <div className="dashboard-stat-card__icon">
            <FiFileText />
          </div>
          <span>Ngay da cham cong</span>
          <strong>{timesheetData.stats.totalDays}</strong>
          <p>So ban ghi attendance trong ky dang xem.</p>
        </article>
        <article className="dashboard-stat-card">
          <div className="dashboard-stat-card__icon">
            <FiClock />
          </div>
          <span>Can kiem tra</span>
          <strong>{timesheetData.stats.warningDays}</strong>
          <p>Late, Early Out, Missing Out hoac canh bao IP.</p>
        </article>
        <article className="dashboard-stat-card">
          <div className="dashboard-stat-card__icon">
            <FiCheckCircle />
          </div>
          <span>Ngay hop le</span>
          <strong>{timesheetData.stats.validDays}</strong>
          <p>Da co day du check-in/check-out va khong pending correction.</p>
        </article>
        <article className="dashboard-stat-card">
          <div className="dashboard-stat-card__icon">
            <FiBarChart2 />
          </div>
          <span>Trang thai</span>
          <strong>{timesheetData.summary.status}</strong>
          <p>{timesheetData.summary.periodLabel}</p>
        </article>
      </section>

      <section className="timesheet-summary-grid">
        <TimesheetSummaryCard
          label="Tong so ngay trong ky"
          value={timesheetData.stats.totalDays}
          note="Du lieu cham cong lay tu backend."
        />
        <TimesheetSummaryCard
          label="So ngay hop le"
          value={timesheetData.stats.validDays}
          note="Khong thieu du lieu va khong co correction pending."
          accent="success"
        />
        <TimesheetSummaryCard
          label="So ngay co canh bao"
          value={timesheetData.stats.warningDays}
          note="Late, Early Out, Missing Out hoac IP Warning."
          accent="warning"
        />
        <TimesheetSummaryCard
          label="Correction dang cho"
          value={timesheetData.stats.pendingCorrections}
          note="Can duoc quan ly duyet truoc khi submit."
          accent="danger"
        />
        <TimesheetSummaryCard
          label="Ma bang cong"
          value={String(timesheetData.summary.id).slice(0, 8)}
          note={timesheetData.period.label}
          accent="success"
        />
      </section>

      <TimesheetFilterBar
        periodType={periodType}
        anchorDate={anchorDate}
        periodLabel={timesheetData.period.label}
        onPeriodTypeChange={setPeriodType}
        onAnchorDateChange={setAnchorDate}
        onReload={() => void loadTimesheet({ showSuccess: true })}
        onOpenCorrection={() => handleOpenCorrection()}
      />

      {feedback ? (
        <div className={`submit-timesheet-panel__helper ${getFeedbackClass(feedback)}`}>
          {feedback}
        </div>
      ) : null}

      <div className="dashboard-content">
        <div className="dashboard-content__main">
          <TimesheetTable rows={timesheetData.rows} onRequestCorrection={handleOpenCorrection} />
        </div>

        <aside className="dashboard-content__side">
          <SubmitTimesheetPanel
            stats={timesheetData.stats}
            summaryStatus={timesheetData.summary.status}
            submitState={{
              allowed: submitState.allowed && !isSubmitting,
              reason: isSubmitting ? 'Dang gui bang cong...' : submitState.reason,
            }}
            onSubmit={handleSubmitTimesheet}
          />
        </aside>
      </div>

      <CorrectionRequestModal
        isOpen={isCorrectionOpen}
        selectedRow={selectedRow}
        onClose={() => {
          setIsCorrectionOpen(false);
          setSelectedRow(null);
        }}
        onSubmit={handleCorrectionSubmit}
        rows={timesheetData.rows}
      />
    </div>
  );
}

export default TimesheetWorkspacePage;
