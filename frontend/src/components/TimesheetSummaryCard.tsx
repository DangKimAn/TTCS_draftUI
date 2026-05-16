function TimesheetSummaryCard({ label, value, note, accent = 'default' }) {
  return (
    <article className={`dashboard-stat-card timesheet-summary-card timesheet-summary-card--${accent}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{note}</p>
    </article>
  );
}

export default TimesheetSummaryCard;
