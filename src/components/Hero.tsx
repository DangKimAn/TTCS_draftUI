import {
  HiMiniArrowTrendingUp,
  HiMiniClock,
  HiMiniUserGroup,
  HiMiniCalendarDays,
  HiMiniCheckBadge,
} from 'react-icons/hi2';

const statCards = [
  { label: 'Nhân viên đang làm việc ', value: '128', note: '+12 hôm nay', icon: HiMiniUserGroup },
  { label: 'Số giờ hôm nay ', value: '764h', note: 'Tăng 8.4%', icon: HiMiniClock },
  { label: 'Yêu cầu nghỉ phép ', value: '14', note: '5 chờ duyệt', icon: HiMiniCalendarDays },
  { label: 'Tỷ lệ đúng giờ ', value: '96%', note: 'ổn định 30 ngày', icon: HiMiniCheckBadge },
];

function Hero() {
  return (
    <section className="hero section" id="home">
      <div className="container hero__grid">
        {/* Left side introduces the product value clearly */}
        <div className="hero__content reveal">
          <span className="section-badge">Time Tracking Platform</span>
          <h1>Hệ thống quản lý chấm công và timesheet thông minh cho doanh nghiệp</h1>

          <div className="hero__actions">
            <a href="#preview" className="button button--secondary button--large">
              Xem trước
            </a>
          </div>

          <div className="hero__trust">
            <div className="hero__avatars">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>

        {/* Right side simulates a real dashboard without image assets */}
        <div className="hero__visual reveal reveal--delay">
          <div className="hero-dashboard">
            <div className="hero-dashboard__header">
              <div>
                <span className="hero-dashboard__label">Live Dashboard</span>
                <h3>Operational Overview</h3>
              </div>
              <div className="hero-dashboard__pill">
                <HiMiniArrowTrendingUp />
                <span>+18.2%</span>
              </div>
            </div>

            <div className="hero-dashboard__stats">
              {statCards.map(({ icon: Icon, label, value, note }) => (
                <article className="mini-stat-card" key={label}>
                  <div className="mini-stat-card__icon">
                    <Icon />
                  </div>
                  <strong>{value}</strong>
                  <span>{label}</span>
                  <small>{note}</small>
                </article>
              ))}
            </div>

            <div className="hero-dashboard__body">
              <div className="hero-panel hero-panel--schedule">
                <div className="hero-panel__heading">
                  <h4>Lịch làm việc hôm nay</h4>
                  <span>08:00 - 17:30</span>
                </div>
                <div className="schedule-bar">
                  <div className="schedule-bar__progress" />
                </div>
                <div className="schedule-milestones">
                  <span>Check-in</span>
                  <span>Deep work</span>
                  <span>Meeting</span>
                  <span>Report</span>
                </div>
              </div>

              <div className="hero-panel hero-panel--attendance">
                <div className="hero-panel__heading">
                  <h4>Điểm danh đội nhóm</h4>
                  <span>Realtime</span>
                </div>
                <div className="attendance-list">
                  <div className="attendance-row">
                    <span>Thiết kế</span>
                    <strong>24/26</strong>
                  </div>
                  <div className="attendance-row">
                    <span>Kinh doanh</span>
                    <strong>18/20</strong>
                  </div>
                  <div className="attendance-row">
                    <span>Kỹ thuật</span>
                    <strong>41/45</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
