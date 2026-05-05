import {
  HiOutlineBolt,
  HiOutlineClipboardDocumentList,
  HiOutlineCalendarDays,
  HiOutlineChartBarSquare,
  HiOutlineUsers,
  HiOutlinePresentationChartLine,
} from 'react-icons/hi2';

const featureList = [
  {
    title: 'Chấm công nhanh',
    description: 'Check-in, check-out trong vài giây với giao diện rõ ràng, trực quan.',
    icon: HiOutlineBolt,
  },
  {
    title: 'Quản lý timesheet',
    description: 'Theo dõi giờ làm, công việc theo ngày hoặc theo dự án một cách tập trung.',
    icon: HiOutlineClipboardDocumentList,
  },
  {
    title: 'Xin nghỉ phép online',
    description: 'Gửi đơn nhanh, duyệt đơn rõ trạng thái, giảm trao đổi thủ công qua giấy tờ.',
    icon: HiOutlineCalendarDays,
  },
  {
    title: 'Báo cáo thống kê',
    description: 'Xem nhanh tỷ lệ đúng giờ, tổng giờ làm và các chỉ số theo thời gian thực.',
    icon: HiOutlineChartBarSquare,
  },
  {
    title: 'Quản lý nhân viên',
    description: 'Tập trung dữ liệu đội ngũ, ca làm, phòng ban và trạng thái làm việc.',
    icon: HiOutlineUsers,
  },
  {
    title: 'Theo dõi hiệu suất',
    description: 'Hỗ trợ nhà quản trị đánh giá tiến độ và hiệu quả dựa trên dữ liệu timesheet.',
    icon: HiOutlinePresentationChartLine,
  },
];

function Features() {
  return (
    <section className="section" id="features">
      <div className="container">
        <div className="section-heading reveal">
          <span className="section-badge">Tính năng nổi bật</span>
          <h2>Tập trung toàn bộ chấm công, timesheet và vận hành nhân sự trên một nền tảng</h2>
        </div>

        <div className="feature-grid">
          {featureList.map(({ title, description, icon: Icon }, index) => (
            <article
              className="feature-card reveal"
              style={{ animationDelay: `${index * 0.08}s` }}
              key={title}
            >
              <div className="feature-card__icon">
                <Icon />
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Features;
