function Footer() {
  return (
    <footer className="footer" id="contact">
      <div className="container footer__grid">
        <div>
          <a href="#home" className="footer__brand">
            <span>TP</span>
            <div>
              <strong>TimeSheet Pro</strong>
              <p>Giải pháp giao diện chấm công và quản lý timesheet hiện đại cho doanh nghiệp.</p>
            </div>
          </a>
        </div>

        <div>
          <h4>Liên kết nhanh</h4>
          <ul className="footer__list">
            <li>
              <a href="#hero">Trang chủ</a>
            </li>
            <li>
              <a href="#features">Tính năng</a>
            </li>
            <li>
              <a href="#process">Quy trình</a>
            </li>
            <li>
              <a href="#preview">Xem trước</a>
            </li>
          </ul>
        </div>

        <div>
          <h4>Liên hệ</h4>
          <ul className="footer__list">
            <li>Email: hello@timesheetpro.vn</li>
            <li>Điện thoại: 033 602 4090</li>
            <li>Địa chỉ: PTIT, TP. HCM</li>
          </ul>
        </div>
      </div>

      <div className="container footer__bottom">
        <span>© 2026 TimeSheet Pro. All rights reserved.</span>
        <span>Designed for final project presentation.</span>
      </div>
    </footer>
  );
}

export default Footer;
