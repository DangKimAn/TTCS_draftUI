import {
  HiOutlineLockClosed,
  HiOutlineClock,
  HiOutlineDocumentText,
  HiOutlineChartPie,
} from 'react-icons/hi2';

const steps = [
  {
    title: 'Đăng nhập hệ thống',
    description: 'Người dùng truy cập nhanh vào nền tảng với tài khoản theo vai trò.',
    icon: HiOutlineLockClosed,
  },
  {
    title: 'Chấm công hoặc nhập timesheet',
    description: 'Nhân viên cập nhật thời gian làm việc, ca làm hoặc công việc theo ngày.',
    icon: HiOutlineClock,
  },
  {
    title: 'Gửi yêu cầu khi cần',
    description: 'Xin nghỉ phép, chỉnh sửa công hoặc bổ sung thông tin chỉ bằng vài thao tác.',
    icon: HiOutlineDocumentText,
  },
  {
    title: 'Quản trị theo dõi và báo cáo',
    description: 'Nhà quản lý xem thống kê tổng quan, phê duyệt yêu cầu và xuất dữ liệu.',
    icon: HiOutlineChartPie,
  },
];

function Process() {
  return (
    <section className="section section--soft" id="process">
      <div className="container">
        <div className="section-heading reveal">
          <span className="section-badge">Quy trình hoạt động</span>
          <h2>Luồng sử dụng rõ ràng từ nhân viên đến quản trị</h2>
        </div>

        <div className="process-timeline">
          {steps.map(({ title, description, icon: Icon }, index) => (
            <article
              className="process-card reveal"
              key={title}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="process-card__step">0{index + 1}</div>
              <div className="process-card__icon">
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

export default Process;
