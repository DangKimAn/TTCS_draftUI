import {
  HiOutlineSparkles,
  HiOutlineShieldCheck,
  HiOutlineUserGroup,
  HiOutlineArrowsPointingOut,
  HiOutlineClock,
  HiOutlineClipboardDocumentList,
  HiOutlineCalendarDays,
} from 'react-icons/hi2';

const benefits = [
  {
    title: 'Tiết kiệm thời gian quản lý',
    description: 'Tự động hóa quy trình theo dõi công, giảm thao tác tổng hợp thủ công mỗi ngày.',
    icon: HiOutlineSparkles,
  },
  {
    title: 'Giảm sai sót bảng công',
    description: 'Dữ liệu tập trung, hiển thị rõ ràng, dễ rà soát và hạn chế thất thoát thông tin.',
    icon: HiOutlineShieldCheck,
  },
  {
    title: 'Tăng hiệu quả theo dõi nhân sự',
    description: 'Quản lý trạng thái làm việc, hiệu suất và đơn từ trên cùng một không gian.',
    icon: HiOutlineUserGroup,
  },
  {
    title: 'Dễ mở rộng cho doanh nghiệp',
    description: 'Phù hợp cho nhiều quy mô công ty và các nhóm vận hành khác nhau.',
    icon: HiOutlineArrowsPointingOut,
  },
];

const summaryHighlights = [
  {
    title: 'Tự động hóa chấm công',
    description: 'Ghi nhận và tổng hợp giờ làm theo quy trình rõ ràng, nhất quán.',
    icon: HiOutlineClock,
  },
  {
    title: 'Timesheet minh bạch',
    description: 'Nhìn nhanh trạng thái bảng công, phê duyệt và điều chỉnh trong một luồng chung.',
    icon: HiOutlineClipboardDocumentList,
  },
  {
    title: 'Nghỉ phép tập trung',
    description: 'Theo dõi lịch nghỉ và đơn từ mà không bị rời rạc giữa nhiều công cụ.',
    icon: HiOutlineCalendarDays,
  },
];

function Benefits() {
  return (
    <section className="section section--soft">
      <div className="container benefits-layout">
        <div className="benefits-copy reveal">
          <span className="section-badge">Lợi ích nổi bật</span>
          <h2>Vận hành chấm công gọn hơn, rõ hơn và đáng tin cậy hơn</h2>
          <p>
            TimeSheet Pro giúp đội ngũ quản lý tiết kiệm thời gian xử lý bảng công, giảm sai sót khi tổng hợp dữ
            liệu và giữ mọi tác vụ nhân sự quan trọng trong cùng một hệ thống.
          </p>

          <div className="benefits-summary">
            <strong>Thiết kế cho nhịp vận hành hằng ngày của doanh nghiệp hiện đại.</strong>
            <span>Tối ưu theo dõi công, kiểm soát nghỉ phép và phối hợp giữa nhân sự, quản lý, kế toán.</span>
          </div>

          <div className="benefits-highlights">
            {summaryHighlights.map(({ title, description, icon: Icon }) => (
              <div className="benefits-highlight" key={title}>
                <div className="benefits-highlight__icon">
                  <Icon />
                </div>
                <div>
                  <strong>{title}</strong>
                  <p>{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="benefits-grid">
          {benefits.map(({ title, description, icon: Icon }, index) => (
            <article
              className="benefit-card reveal"
              key={title}
              style={{ animationDelay: `${index * 0.08}s` }}
            >
              <div className="benefit-card__icon">
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

export default Benefits;
