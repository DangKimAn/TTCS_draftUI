const dashboardStats = [
  { label: 'Tổng nhân sự', value: '186', note: '+4 so với tháng trước' },
  { label: 'Check-in hôm nay', value: '173', note: '93% hoàn thành' },
  { label: 'Đơn chờ duyệt', value: '21', note: '7 nghỉ phép, 14 chỉnh công' },
  { label: 'Hiệu suất trung bình', value: '89%', note: 'Ổn định trong 4 tuần' },
];

const attendanceRows = [
  { name: 'Nguyễn Trần Ngọc Duyên', department: 'Kỹ thuật', checkIn: '08:03', status: 'Đúng giờ' },
  { name: 'Võ Hà Như Thủy', department: 'Kinh doanh', checkIn: '08:10', status: 'Đi muộn' },
  { name: 'Nguyễn A', department: 'Thiết kế', checkIn: '07:56', status: 'Đúng giờ' },
  { name: 'Nguyễn B', department: 'Nhân sự', checkIn: '08:01', status: 'Đúng giờ' },
];

const taskStatuses = [
  { label: 'Hoàn thành', value: '72%' },
  { label: 'Đang xử lý', value: '18%' },
  { label: 'Quá hạn', value: '10%' },
];

const barHeights = ['72%', '88%', '61%', '95%', '79%', '68%', '91%'];

function DashboardPreview() {
  const previewMenuItems = [
    { label: 'Dashboard', active: true },
    { label: 'Nhân sự' },
    { label: 'Timesheet' },
    { label: 'Xin nghỉ phép' },
    { label: 'Báo cáo' },
    { label: 'Cài đặt' },
  ];

  return (
    <section className="section" id="preview">
      <div className="container dashboard-section">
        <div className="section-heading reveal">
          <span className="section-badge">Dashboard Preview</span>
          <h2>Góc nhìn nhanh về không gian quản trị của TimeSheet Pro</h2>
        </div>

        <div className="dashboard-mockup dashboard-mockup--preview reveal reveal--delay" aria-label="Dashboard preview">
          <aside className="dashboard-mockup__sidebar" aria-hidden="true">
            <div className="dashboard-brand">
              <span>TP</span>
              <div>
                <strong>TimeSheet Pro</strong>
                <small>Admin Workspace</small>
              </div>
            </div>

            <div className="dashboard-preview-note">
              <span className="status-badge status-badge--neutral">Static Preview</span>
            </div>

            <div className="dashboard-nav" role="presentation">
              {previewMenuItems.map(({ label, active }) => (
                <div key={label} className={`dashboard-nav__item${active ? ' active' : ''}`}>
                  {label}
                </div>
              ))}
            </div>

            <div className="sidebar-card">
              <span>Tuần này</span>
              <strong>1,284 giờ</strong>
              <p>Thời gian làm việc được ghi nhận trên toàn công ty.</p>
            </div>
          </aside>

          <div className="dashboard-mockup__main" aria-hidden="true">
            <div className="dashboard-topbar">
              <div>
                <span className="dashboard-topbar__tag">Overview</span>
                <h3>Bảng điều khiển chấm công doanh nghiệp</h3>
              </div>
              <div className="dashboard-topbar__actions">
                <div className="dashboard-display-chip">
                  <span className="dashboard-display-chip__dot" />
                  Preview only
                </div>
                <div className="user-pill">
                  <span>AD</span>
                  <strong>Admin HR</strong>
                </div>
              </div>
            </div>

            <div className="dashboard-stats">
              {dashboardStats.map(({ label, value, note }) => (
                <article className="dashboard-stat" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                  <small>{note}</small>
                </article>
              ))}
            </div>

            <div className="dashboard-content-grid">
              <section className="dashboard-panel">
                <div className="panel-heading">
                  <div>
                    <h4>Bảng chấm công hôm nay</h4>
                    <p>Dữ liệu mẫu minh họa theo phòng ban</p>
                  </div>
                  <span className="status-badge status-badge--soft">Sample data</span>
                </div>

                <div className="attendance-table">
                  <div className="attendance-table__head">
                    <span>Nhân viên</span>
                    <span>Phòng ban</span>
                    <span>Check-in</span>
                    <span>Trạng thái</span>
                  </div>
                  {attendanceRows.map((row) => (
                    <div className="attendance-table__row" key={row.name}>
                      <span>{row.name}</span>
                      <span>{row.department}</span>
                      <span>{row.checkIn}</span>
                      <span className={`status-badge ${row.status === 'Đi muộn' ? 'status-badge--warning' : 'status-badge--success'}`}>
                        {row.status}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="dashboard-sidepanels">
                <article className="dashboard-panel dashboard-panel--compact">
                  <div className="panel-heading">
                    <div>
                      <h4>Tiến độ công việc</h4>
                      <p>Phân bổ trạng thái theo tuần</p>
                    </div>
                  </div>
                  <div className="task-status-list">
                    {taskStatuses.map(({ label, value }) => (
                      <div className="task-status-item" key={label}>
                        <span>{label}</span>
                        <strong>{value}</strong>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="dashboard-panel dashboard-panel--compact">
                  <div className="panel-heading">
                    <div>
                      <h4>Biểu đồ giờ làm</h4>
                      <p>7 ngày gần nhất</p>
                    </div>
                  </div>
                  <div className="bar-chart">
                    {barHeights.map((height, index) => (
                      <div className="bar-chart__item" key={`${height}-${index}`}>
                        <div className="bar-chart__bar" style={{ height }} />
                        <span>T{index + 2}</span>
                      </div>
                    ))}
                  </div>
                </article>
              </section>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default DashboardPreview;
