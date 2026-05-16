import { useLocation, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiShieldOff } from 'react-icons/fi';

function UnauthorizedPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.redirectTo || '/';

  return (
    <div className="login-page">
      <div className="login-page__glow login-page__glow--left" />
      <div className="login-page__glow login-page__glow--right" />

      <div className="login-page__layout unauthorized-page">
        <div className="login-card unauthorized-card">
          <div className="unauthorized-card__icon">
            <FiShieldOff />
          </div>
          <div className="login-card__header">
            <span className="login-card__eyebrow">ACCESS DENIED</span>
            <h2>Khong co quyen truy cap</h2>
            <p>Ban khong co quyen xem man hinh nay. He thong se dua ban ve khu vuc phu hop.</p>
          </div>

          <div className="dashboard-panel__actions dashboard-panel__actions--stack">
            <button type="button" className="dashboard-button dashboard-button--primary" onClick={() => navigate(redirectTo, { replace: true })}>
              Ve dashboard cua toi
            </button>
            <button type="button" className="dashboard-button dashboard-button--ghost" onClick={() => navigate('/', { replace: true })}>
              <FiArrowLeft />
              Ve trang chu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UnauthorizedPage;
