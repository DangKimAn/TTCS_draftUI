import CorrectionRequestModal from '../CorrectionRequestModal';
import SubmitTimesheetPanel from '../SubmitTimesheetPanel';
import TimesheetFilterBar from '../TimesheetFilterBar';
import TimesheetSummaryCard from '../TimesheetSummaryCard';
import TimesheetTable from '../TimesheetTable';

function TimesheetSection({
  timesheetData,
  displayRows,
  periodType,
  anchorDate,
  submitState,
  feedback,
  isCorrectionOpen,
  selectedRow,
  onPeriodTypeChange,
  onAnchorDateChange,
  onReload,
  onOpenCorrection,
  onSubmitTimesheet,
  onCloseCorrection,
  onSubmitCorrection,
}) {
  if (!timesheetData) {
    return (
      <div className="employee-section">
        <div className="employee-section__header">
          <h2>Bảng công của tôi</h2>
        </div>
        {feedback ? (
          <div className={`submit-timesheet-panel__helper ${feedback.type === 'success' ? 'is-success' : 'is-danger'}`}>
            {feedback.message}
          </div>
        ) : (
          <div className="dashboard-content__loading">Đang tải dữ liệu bảng công...</div>
        )}
      </div>
    );
  }

  return (
    <section className="employee-section">
      <div className="employee-section__header">
        <div>
          <h1>Bảng công của tôi</h1>
          <p>Xem log chấm công, cảnh báo và gửi xác nhận bảng công theo từng kỳ.</p>
        </div>
      </div>

      <section className="timesheet-summary-grid">
        <TimesheetSummaryCard
          label="Số ngày đã chấm"
          value={timesheetData.stats.totalDays}
          note="Số bản ghi trong kỳ đang xem."
        />
        <TimesheetSummaryCard
          label="Ngày hợp lệ"
          value={timesheetData.stats.validDays}
          note="Không thiếu dữ liệu và không có yêu cầu chỉnh sửa chờ duyệt."
          accent="success"
        />
        <TimesheetSummaryCard
          label="Ngày có cảnh báo"
          value={timesheetData.stats.warningDays}
          note="Đi muộn, về sớm, quên Check-out hoặc cảnh báo IP."
          accent="warning"
        />
        <TimesheetSummaryCard
          label="Trạng thái bảng công"
          value={timesheetData.summary.status}
          note={timesheetData.period.label}
          accent="danger"
        />
      </section>

      <TimesheetFilterBar
        periodType={periodType}
        anchorDate={anchorDate}
        periodLabel={timesheetData.period.label}
        onPeriodTypeChange={onPeriodTypeChange}
        onAnchorDateChange={onAnchorDateChange}
        onReload={onReload}
        onOpenCorrection={() => onOpenCorrection()}
      />

      {feedback ? (
        <div className={`submit-timesheet-panel__helper ${feedback.type === 'success' ? 'is-success' : 'is-danger'}`}>
          {feedback.message}
        </div>
      ) : null}

      <div className="dashboard-content">
        <div className="dashboard-content__main">
          <TimesheetTable rows={displayRows || timesheetData.rows} onRequestCorrection={onOpenCorrection} />
        </div>

        <aside className="dashboard-content__side">
          <SubmitTimesheetPanel
            title={`Gửi bảng công Tháng ${new Date(timesheetData.period.startDate).getMonth() + 1}/${new Date(timesheetData.period.startDate).getFullYear()}`}
            stats={timesheetData.stats}
            summaryStatus={timesheetData.summary.status}
            submitState={submitState}
            onSubmit={onSubmitTimesheet}
          />
        </aside>
      </div>

      <CorrectionRequestModal
        isOpen={isCorrectionOpen}
        selectedRow={selectedRow}
        onClose={onCloseCorrection}
        onSubmit={onSubmitCorrection}
        rows={timesheetData.rows}
        period={timesheetData.period}
      />
    </section>
  );
}

export default TimesheetSection;
