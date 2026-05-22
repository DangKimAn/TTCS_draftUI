import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { completeSsoLogin } from '../services/authService';
import { useAuthStore } from '../store/authStore';
import { getDashboardPathByRole } from '../utils/storage';
import './LoginPage.css';

function SsoCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setSession = useAuthStore((state) => state.setSession);
  const [message, setMessage] = useState('Dang hoan tat dang nhap SSO...');

  useEffect(() => {
    const provider = searchParams.get('provider') || 'sso';
    const error = searchParams.get('error');
    const errorMessage = searchParams.get('message');

    if (error) {
      setMessage(errorMessage || `SSO failed: ${error}`);
      return;
    }

    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const accessToken = fragment.get('accessToken') || '';
    const refreshToken = fragment.get('refreshToken') || '';

    if (!accessToken || !refreshToken) {
      setMessage('SSO callback khong co token hop le.');
      return;
    }

    try {
      const result = completeSsoLogin({ accessToken, refreshToken }, provider);
      setSession(result.session, true);
      window.history.replaceState(null, document.title, window.location.pathname);
      navigate(getDashboardPathByRole(result.session.role), { replace: true });
    } catch (callbackError) {
      setMessage(
        callbackError instanceof Error
          ? callbackError.message
          : 'Khong the hoan tat dang nhap SSO.',
      );
    }
  }, [navigate, searchParams, setSession]);

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-card__header">
          <span className="login-card__eyebrow">SSO</span>
          <h2>Dang nhap bang SSO</h2>
          <p>{message}</p>
        </div>
        <div className="login-form">
          <Link className="login-submit" to="/login">
            Quay lai dang nhap
          </Link>
        </div>
      </section>
    </main>
  );
}

export default SsoCallbackPage;
