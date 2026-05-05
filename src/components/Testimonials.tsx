const testimonials = [
  {
    quote:
      'Giao diện rất trực quan, đội ngũ nhân viên chỉ mất vài phút để làm quen và bắt đầu chấm công mỗi ngày.',
    name: 'Nguyễn Văn A',
    role: 'HR Manager - Nova Office',
  },
  {
    quote:
      'Dashboard thống kê rõ ràng, giúp ban quản lý theo dõi tỷ lệ đúng giờ và hiệu suất công việc rất thuận tiện.',
    name: 'Nguyễn Trần Ngọc Duyên',
    role: 'Operation Lead - GreenTech',
  },
  {
    quote:
      'Phần xin nghỉ phép và chỉnh timesheet được trình bày chuyên nghiệp, đủ thuyết phục để demo như một sản phẩm thật.',
    name: 'Võ Hà Như Thủy',
    role: 'Admin Executive - Sky Holdings',
  },
];

function Testimonials() {
  return (
    <section className="section">
      <div className="container">
        <div className="section-heading reveal">
          <span className="section-badge">Phản hồi người dùng</span>
          <h2>Nhận xét tích cực từ doanh nghiệp và bộ phận vận hành</h2>
        </div>

        <div className="testimonial-grid">
          {testimonials.map((item, index) => (
            <article
              className="testimonial-card reveal"
              key={item.name}
              style={{ animationDelay: `${index * 0.08}s` }}
            >
              <div className="testimonial-card__rating">★★★★★</div>
              <p>"{item.quote}"</p>
              <div className="testimonial-card__author">
                <strong>{item.name}</strong>
                <span>{item.role}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Testimonials;
