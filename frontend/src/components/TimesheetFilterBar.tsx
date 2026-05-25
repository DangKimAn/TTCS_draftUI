function TimesheetFilterBar({
  periodType,
  anchorDate,
  periodLabel,
  onPeriodTypeChange,
  onAnchorDateChange,
  onReload,
  onOpenCorrection,
}) {
  return (
    <section className="dashboard-panel timesheet-filter-bar">
      <div className="timesheet-filter-bar__group">
        <label htmlFor="timesheet-period-type">
          <span>Xem theo</span>
          <select
            id="timesheet-period-type"
            value={periodType}
            onChange={(event) => onPeriodTypeChange(event.target.value)}
          >
            <option value="week">Tuần này</option>
            <option value="month">Tháng này</option>
            <option value="last_month">Tháng trước</option>
          </select>
        </label>

        <label htmlFor="timesheet-anchor-date">
          <span>Khoảng thời gian</span>
          <input
            id="timesheet-anchor-date"
            type="date"
            value={anchorDate}
            onChange={(event) => onAnchorDateChange(event.target.value)}
          />
        </label>

        <div className="timesheet-filter-bar__period">
          <span>Kỳ đang xem</span>
          <strong>{periodLabel}</strong>
        </div>
      </div>

      <div className="timesheet-filter-bar__actions">
        <button type="button" className="dashboard-button dashboard-button--ghost" onClick={onReload}>
          Tải lại
        </button>
        <button type="button" className="dashboard-button dashboard-button--primary" onClick={onOpenCorrection}>
          Tạo yêu cầu chỉnh sửa
        </button>
      </div>
    </section>
  );
}

export default TimesheetFilterBar;
