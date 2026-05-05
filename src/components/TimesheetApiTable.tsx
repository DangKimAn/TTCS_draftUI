function TimesheetApiTable({ rows, isLoading }) {
  return (
    <section className="dashboard-panel timesheet-table-panel">
      <div className="dashboard-panel__heading">
        <div>
          <span className="dashboard-panel__eyebrow">GET /api/timesheets</span>
          <h2>Danh sach bang cong tu API</h2>
          <p>Du lieu duoc lay bang fetch GET va hien thi lai ngay tren giao dien.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="timesheet-empty-state">Dang tai du lieu tu API...</div>
      ) : rows.length === 0 ? (
        <div className="timesheet-empty-state">Chua co ban ghi timesheet nao.</div>
      ) : (
        <div className="dashboard-table-wrap">
          <div className="dashboard-table timesheet-table timesheet-table--api">
            <div className="dashboard-table__head timesheet-table__head timesheet-table__head--api">
              <span>Ma</span>
              <span>Nhan vien</span>
              <span>Ngay</span>
              <span>Check-in</span>
              <span>Check-out</span>
              <span>Trang thai</span>
              <span>Ghi chu</span>
            </div>

            {rows.map((row) => (
              <div key={row.id} className="dashboard-table__row timesheet-table__row timesheet-table__row--api">
                <strong>{row.id}</strong>
                <div className="dashboard-table__cell dashboard-table__cell--stacked">
                  {row.employeeName}
                  <small className="timesheet-table__subtext">{row.employeeId}</small>
                </div>
                <span>{row.date}</span>
                <span>{row.checkIn || '--'}</span>
                <span>{row.checkOut || '--'}</span>
                <div className={`dashboard-status-badge ${getApiStatusClass(row.status)}`}>
                  {row.status}
                </div>
                <span>{row.note || '--'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function getApiStatusClass(status) {
  switch (status) {
    case 'Late':
    case 'Early Leave':
      return 'dashboard-status-badge--warning';
    case 'Missing Check-out':
      return 'dashboard-status-badge--danger';
    default:
      return 'dashboard-status-badge--success';
  }
}

export default TimesheetApiTable;
