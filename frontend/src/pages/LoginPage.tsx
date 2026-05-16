import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import LoginForm from '../components/LoginForm';
import { getAuthSession, getDashboardPathByRole } from '../utils/storage';
import './LoginPage.css';

function AuthLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') === 'get-started' ? 'get-started' : 'default';

  useEffect(() => {
    const session = getAuthSession();

    if (session?.accessToken || session?.token) {
      navigate(getDashboardPathByRole(session.role), { replace: true });
    }
  }, [navigate]);

  return (
    <div className="login-page">
      <div className="login-page__glow login-page__glow--left" />
      <div className="login-page__glow login-page__glow--right" />
      <div className="login-page__shape login-page__shape--one" />
      <div className="login-page__shape login-page__shape--two" />
      <div className="login-page__shape login-page__shape--three" />

      <div className="login-page__layout login-page__layout--center">
        <section className="login-panel login-panel--center">
          <div className="login-page__intro">
            <div className="login-page__brand">
              <div className="login-page__brand-mark">TP</div>
              <div>
                <strong>TimeSheet Pro</strong>
                <span>Smart Time Tracking</span>
              </div>
            </div>
          </div>

          <div className="login-card">
            <LoginForm mode={mode} />

            <button type="button" className="login-back" onClick={() => navigate('/')}>
              <FiArrowLeft />
              Quay về trang chủ
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default AuthLoginPage;
