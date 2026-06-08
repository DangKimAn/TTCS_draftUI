import { useEffect, useMemo, useState } from 'react';
import { FiBarChart2, FiClock, FiDownload, FiFileText, FiRefreshCw } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import CorrectionRequestModal from '../components/CorrectionRequestModal';
import SubmitTimesheetPanel from '../components/SubmitTimesheetPanel';
import TimesheetFilterBar from '../components/TimesheetFilterBar';
import TimesheetSummaryCard from '../components/TimesheetSummaryCard';
import TimesheetTable from '../components/TimesheetTable';
import { createCorrectionRequest } from '../services/correctionService';
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

const rows = [
  { day: 'Thứ 2', in: '08:00', out: '17:30', total: '8.5h', status: 'Đúng giờ' },
  { day: 'Thứ 3', in: '08:10', out: '17:30', total: '8.3h', status: 'Đi muộn' },
  { day: 'Thứ 4', in: '08:02', out: '17:28', total: '8.4h', status: 'Đúng giờ' },
  { day: 'Thứ 5', in: '08:00', out: '--', total: '4.0h', status: 'Đang làm việc' },
  { day: 'Thứ 6', in: '08:05', out: '17:00', total: '7.9h', status: 'Thiếu check-out' },
];

function TimesheetPage() {
  return (
    <div className="employee-dashboard">
      <div className="employee-dashboard__glow employee-dashboard__glow--left" />
      <div className="employee-dashboard__glow employee-dashboard__glow--right" />

      <div className="workspace-page">
        <section className="dashboard-panel workspace-page__hero">
          <div>
            <span className="dashboard-panel__eyebrow">Timesheet Overview</span>
            <h1>Bảng công cá nhân trực quan và dễ theo dõi</h1>
            <p>
              Xem nhanh tổng giờ làm, trạng thái chấm công từng ngày và các chỉ số cần
              thiết cho báo cáo nội bộ.
            </p>
          </div>
          <button type="button" className="dashboard-button dashboard-button--primary">
            <FiDownload />
            Xuất bảng công
          </button>
        </section>

        <section className="workspace-page__stats">
          <article className="dashboard-stat-card">
            <div className="dashboard-stat-card__icon">
              <FiClock />
            </div>
            <span>Tổng giờ tuần này</span>
            <strong>36.1h</strong>
            <p>Tăng 2.4h so với tuần trước.</p>
          </article>
          <article className="dashboard-stat-card">
            <div className="dashboard-stat-card__icon">
              <FiFileText />
            </div>
            <span>Bản ghi hợp lệ</span>
            <strong>4 / 5 ngày</strong>
            <p>Còn 1 bản ghi cần bổ sung check-out.</p>
          </article>
          <article className="dashboard-stat-card">
            <div className="dashboard-stat-card__icon">
              <FiBarChart2 />
            </div>
            <span>Hiệu suất đúng giờ</span>
            <strong>88%</strong>
            <p>Duy trì ổn định trong tháng hiện tại.</p>
          </article>
        </section>

        <div className="workspace-page__grid workspace-page__grid--single">
          <section className="dashboard-panel">
            <div className="dashboard-panel__heading">
              <div>
                <span className="dashboard-panel__eyebrow">Weekly Timesheet</span>
                <h2>Bảng công của tôi</h2>
                <p>Danh sách 5 ngày làm việc gần nhất của nhân viên.</p>
              </div>
            </div>

            <div className="dashboard-table-wrap">
              <div className="dashboard-table">
                <div className="dashboard-table__head">
                  <span>Ngày</span>
                  <span>Check-in</span>
                  <span>Check-out</span>
                  <span>Tổng giờ</span>
                  <span>Trạng thái</span>
                </div>

                {rows.map((row) => (
                  <div key={row.day} className="dashboard-table__row">
                    <strong>{row.day}</strong>
                    <span>{row.in}</span>
                    <span>{row.out}</span>
                    <span>{row.total}</span>
                    <div className={`dashboard-status-badge ${
                      row.status === 'Đúng giờ'
                        ? 'dashboard-status-badge--success'
                        : row.status === 'Đang làm việc'
                          ? 'dashboard-status-badge--info'
                          : 'dashboard-status-badge--warning'
                    }`}
                    >
                      {row.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ConnectedTimesheetPage() {
  const navigate = useNavigate();
  const session = getAuthSession();
  const [periodType, setPeriodType] = useState('week');
  const [anchorDate, setAnchorDate] = useState(getDateKey());
  const [timesheetData, setTimesheetData] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

    setIsLoading(true);
    setTimeout(() => {
      const nextData = getTimesheetByPeriod(session.email, periodType, new Date(anchorDate));
      setTimesheetData(nextData);
      setIsLoading(false);
    }, 400);
  };

  useEffect(() => {
    loadTimesheet();
  }, [session?.email, periodType, anchorDate]);

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

  if (!timesheetData) {
    return null;
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
          <span className="dashboard-panel__eyebrow">UC-03 CONFIRM TIMESHEET</span>
          <h1>Bang cong cua toi</h1>
          <p>Kiem tra log cham cong, canh bao va gui xac nhan bang cong den quan ly.</p>
        </div>
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

      <section className="timesheet-summary-grid">
        <TimesheetSummaryCard
          label="Tong so ngay trong ky"
          value={timesheetData.stats.totalDays}
          note="Du lieu cham cong duoc lay tu UC-02."
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

      <div className="dashboard-content">
        <div className="dashboard-content__main">
          <TimesheetTable rows={timesheetData.rows} onRequestCorrection={handleOpenCorrection} />
        </div>

        <aside className="dashboard-content__side">
          <SubmitTimesheetPanel
            title="Gửi xác nhận bảng công"
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
        rows={timesheetData.rows}
        period={timesheetData.period}
      />
    </div>
  );
}

export default ConnectedTimesheetPage;
