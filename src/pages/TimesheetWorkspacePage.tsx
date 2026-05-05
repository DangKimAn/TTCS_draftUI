import { useEffect, useMemo, useState } from 'react';
import { FiBarChart2, FiCheckCircle, FiClock, FiDownload, FiFileText } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import CorrectionRequestModal from '../components/CorrectionRequestModal';
import SubmitTimesheetPanel from '../components/SubmitTimesheetPanel';
import TimesheetApiTable from '../components/TimesheetApiTable';
import TimesheetFilterBar from '../components/TimesheetFilterBar';
import TimesheetForm from '../components/TimesheetForm';
import TimesheetSummaryCard from '../components/TimesheetSummaryCard';
import TimesheetTable from '../components/TimesheetTable';
import { createCorrectionRequest } from '../services/correctionService';
import { fetchEmployees, fetchTimesheets, createTimesheet } from '../services/timesheetApiService';
import {
  canSubmitTimesheet,
  getTimesheetByPeriod,
  submitTimesheet,
} from '../services/timesheetService';
import { getDateKey } from '../utils/dateUtils';
import { getAuthSession, getDashboardPathByRole } from '../utils/storage';
import './EmployeeDashboard.css';
import './WorkspacePages.css';
import '../styles/timesheet.css';

function TimesheetWorkspacePage() {
  const navigate = useNavigate();
  const session = getAuthSession();
  const [periodType, setPeriodType] = useState('week');
  const [anchorDate, setAnchorDate] = useState(getDateKey());
  const [timesheetData, setTimesheetData] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [apiTimesheets, setApiTimesheets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [apiSuccess, setApiSuccess] = useState('');

  useEffect(() => {
    if (!session?.token) {
      navigate('/login', { replace: true });
      return;
    }

    if (session.role !== 'employee') {
      navigate(getDashboardPathByRole(session.role), { replace: true });
    }
  }, [navigate, session?.role, session?.token]);

  const loadTimesheet = () => {
    if (!session?.email) {
      return;
    }

    const nextData = getTimesheetByPeriod(session.email, periodType, new Date(anchorDate));
    setTimesheetData(nextData);
  };

  const loadApiData = async ({ showSuccess = false } = {}) => {
    setIsApiLoading(true);
    setApiError('');

    try {
      const [employeesResponse, timesheetsResponse] = await Promise.all([
        fetchEmployees(),
        fetchTimesheets(),
      ]);

      setEmployees(employeesResponse.data || []);
      setApiTimesheets(timesheetsResponse.data || []);

      if (showSuccess) {
        setApiSuccess('Du lieu timesheet da duoc tai tu mock API.');
      }
    } catch (error) {
      setApiError(error.message || 'Khong the ket noi den mock API.');
    } finally {
      setIsApiLoading(false);
    }
  };

  useEffect(() => {
    loadTimesheet();
  }, [session?.email, periodType, anchorDate]);

  useEffect(() => {
    loadApiData();
  }, []);

  const submitState = useMemo(() => {
    if (!timesheetData) {
      return { allowed: false, reason: 'Dang tai bang cong...' };
    }

    const periodCorrections = timesheetData.corrections.filter(
      (item) =>
        item.date >= timesheetData.period.startKey &&
        item.date <= timesheetData.period.endKey,
    );

    return canSubmitTimesheet(timesheetData.rows, periodCorrections, timesheetData.summary);
  }, [timesheetData]);

  const apiSummary = useMemo(() => {
    const total = apiTimesheets.length;
    const lateCount = apiTimesheets.filter((item) => item.status === 'Late').length;
    const missingCount = apiTimesheets.filter((item) => item.status === 'Missing Check-out').length;
    const onTimeCount = apiTimesheets.filter((item) => item.status === 'On Time').length;

    return {
      total,
      lateCount,
      missingCount,
      onTimeCount,
    };
  }, [apiTimesheets]);

  const handleOpenCorrection = (row = null) => {
    setSelectedRow(row || timesheetData?.rows[0] || null);
    setIsCorrectionOpen(true);
  };

  const handleCorrectionSubmit = (formData) => {
    try {
      const attendanceRow =
        selectedRow ||
        timesheetData?.rows.find((row) => row.date === formData.date) ||
        null;

      if (!attendanceRow?.id) {
        setFeedback('Khong tim thay ban ghi cham cong de tao yeu cau.');
        return;
      }

      createCorrectionRequest({
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
      loadTimesheet();
    } catch (error) {
      setFeedback(
        error.code === 'CORRECTION_PENDING_EXISTS'
          ? 'Ngay nay da co yeu cau chinh sua cho duyet.'
          : 'Khong the tao yeu cau chinh sua. Vui long thu lai.',
      );
    }
  };

  const handleSubmitTimesheet = () => {
    if (!timesheetData) {
      return;
    }

    try {
      submitTimesheet(session.email, periodType, new Date(anchorDate));
      setFeedback('Bang cong da duoc gui xac nhan va dang cho quan ly duyet.');
      loadTimesheet();
    } catch (error) {
      setFeedback(
        error.code === 'TIMESHEET_SUBMIT_BLOCKED'
          ? error.message
          : 'Khong the gui xac nhan bang cong. Vui long thu lai.',
      );
    }
  };

  const handleCreateApiTimesheet = async (formData) => {
    setIsPosting(true);
    setApiError('');
    setApiSuccess('');

    try {
      const response = await createTimesheet(formData);
      setApiTimesheets((current) => [response.data, ...current]);
      setApiSuccess('Da gui fetch POST thanh cong va cap nhat danh sach ngay tren giao dien.');
      return true;
    } catch (error) {
      setApiError(error.message || 'Khong the them ban ghi moi.');
      return false;
    } finally {
      setIsPosting(false);
    }
  };

  if (!timesheetData) {
    return null;
  }

  return (
    <div className="dashboard-page timesheet-page">
      <section className="dashboard-panel timesheet-page__hero">
        <div>
          <span className="dashboard-panel__eyebrow">Timesheet Management</span>
          <h1>Trang Timesheet voi mock API GET va POST</h1>
          <p>
            Theo doi bang cong, tai du lieu mau tu API noi bo va them ban ghi moi bang
            fetch ngay trong project hien tai.
          </p>
        </div>
        <div className="timesheet-page__hero-actions">
          <button
            type="button"
            className="dashboard-button dashboard-button--ghost"
            onClick={() => loadApiData({ showSuccess: true })}
            disabled={isApiLoading}
          >
            <FiDownload />
            {isApiLoading ? 'Dang tai...' : 'Tai du lieu'}
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
          <span>Ban ghi tu API</span>
          <strong>{apiSummary.total}</strong>
          <p>Danh sach lay tu endpoint GET /api/timesheets.</p>
        </article>
        <article className="dashboard-stat-card">
          <div className="dashboard-stat-card__icon">
            <FiClock />
          </div>
          <span>Di muon / thieu checkout</span>
          <strong>{apiSummary.lateCount + apiSummary.missingCount}</strong>
          <p>Theo doi nhanh cac truong hop can luu y tren du lieu mock.</p>
        </article>
        <article className="dashboard-stat-card">
          <div className="dashboard-stat-card__icon">
            <FiCheckCircle />
          </div>
          <span>Cham cong dung gio</span>
          <strong>{apiSummary.onTimeCount}</strong>
          <p>So ban ghi co trang thai On Time tu API noi bo.</p>
        </article>
        <article className="dashboard-stat-card">
          <div className="dashboard-stat-card__icon">
            <FiBarChart2 />
          </div>
          <span>Nhan vien mau</span>
          <strong>{employees.length}</strong>
          <p>Danh sach lay tu endpoint GET /api/employees cho form them moi.</p>
        </article>
      </section>

      {(apiError || apiSuccess) ? (
        <div className={`submit-timesheet-panel__helper ${apiError ? 'is-danger' : 'is-success'}`}>
          {apiError || apiSuccess}
        </div>
      ) : null}

      <div className="dashboard-content">
        <div className="dashboard-content__main">
          <TimesheetApiTable rows={apiTimesheets} isLoading={isApiLoading} />
        </div>

        <aside className="dashboard-content__side">
          <TimesheetForm
            employees={employees}
            onSubmit={handleCreateApiTimesheet}
            isSubmitting={isPosting}
          />
        </aside>
      </div>

      <section className="timesheet-summary-grid">
        <TimesheetSummaryCard
          label="Tong so ngay trong ky"
          value={timesheetData.stats.totalDays}
          note="Du lieu cham cong nay la workflow timesheet cu cua project."
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
          label="Trang thai bang cong"
          value={timesheetData.summary.status}
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
        onReload={() => {
          loadTimesheet();
          setFeedback('Du lieu bang cong da duoc tai lai.');
        }}
        onOpenCorrection={() => handleOpenCorrection()}
      />

      {feedback ? (
        <div
          className={`submit-timesheet-panel__helper ${
            feedback.includes('da duoc gui') || feedback.includes('da duoc tai lai')
              ? 'is-success'
              : 'is-danger'
          }`}
        >
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
            submitState={submitState}
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
      />
    </div>
  );
}

export default TimesheetWorkspacePage;
