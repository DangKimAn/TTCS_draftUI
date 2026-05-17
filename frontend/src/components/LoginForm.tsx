import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowRight,
  FiEye,
  FiEyeOff,
  FiLock,
  FiMail,
} from 'react-icons/fi';
import { FaGoogle, FaMicrosoft } from 'react-icons/fa';
import { useAuthStore } from '../store/authStore';
import { getDashboardPathByRole } from '../utils/storage';
import { API_CONFIG } from '../config/api';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type LoginErrors = {
  email?: string;
  password?: string;
};

const loginCopyByMode = {
  default: {
    eyebrow: 'TRUY CẬP HỆ THỐNG',
    title: 'Đăng nhập',
    description: 'Đăng nhập để truy cập không gian chấm công, timesheet và nghỉ phép tập trung của bạn.',
  },
  'get-started': {
    eyebrow: 'BẮT ĐẦU',
    title: 'Đăng nhập',
    description: 'Bắt đầu với TimeSheet Pro bằng cách truy cập vào không gian làm việc tập trung của hệ thống.',
  },
};

function LoginForm({ mode = 'default' }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);

  const copy = loginCopyByMode[mode] || loginCopyByMode.default;

  const validateForm = () => {
    const nextErrors: LoginErrors = {};

    if (!email.trim()) {
      nextErrors.email = 'Vui lòng nhập email';
    } else if (!emailPattern.test(email.trim())) {
      nextErrors.email = 'Email không đúng định dạng';
    }

    if (!password.trim()) {
      nextErrors.password = 'Vui lòng nhập mật khẩu';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const completeLogin = async ({ provider = 'password' } = {}) => {
    if (loading) {
      return;
    }

    setServerError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const session = await login({ email, password, provider });

      navigate(getDashboardPathByRole(session.role), { replace: true });
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    window.alert('Chuyển sang quy trình reset mật khẩu của hệ thống SSO.');
  };

  return (
    <>
      <div className="login-card__header">
        <span className="login-card__eyebrow">{copy.eyebrow}</span>
        <h2>{copy.title}</h2>
        <p>{copy.description}</p>
      </div>

      <form className="login-form" onSubmit={(event) => {
        event.preventDefault();
        void completeLogin();
      }}
      >
        <div className="login-field">
          <label htmlFor="email">Email công việc</label>
          <div className={`login-input ${errors.email ? 'is-error' : ''}`}>
            <FiMail />
            <input
              id="email"
              name="email"
              type="email"
              placeholder="example@company.com"
              value={email}
              disabled={loading}
              onChange={(event) => {
                setEmail(event.target.value);
                setServerError('');
                if (errors.email) {
                  setErrors((prev) => ({ ...prev, email: '' }));
                }
              }}
              autoComplete="email"
            />
          </div>
          {errors.email ? <small>{errors.email}</small> : null}
        </div>

        <div className="login-field">
          <label htmlFor="password">Mật khẩu</label>
          <div className={`login-input ${errors.password ? 'is-error' : ''}`}>
            <FiLock />
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Nhập mật khẩu"
              value={password}
              disabled={loading}
              onChange={(event) => {
                setPassword(event.target.value);
                setServerError('');
                if (errors.password) {
                  setErrors((prev) => ({ ...prev, password: '' }));
                }
              }}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="login-input__toggle"
              disabled={loading}
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>
          {errors.password ? <small>{errors.password}</small> : null}
        </div>

        <div className="login-form__options">
          <button type="button" className="login-link" disabled={loading} onClick={handleForgotPassword}>
            Quên mật khẩu?
          </button>
        </div>

        {serverError ? <div className="login-alert login-alert--error">{serverError}</div> : null}

        <button type="submit" className="login-submit" disabled={loading}>
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>

        <div className="login-divider">
          <span />
          <strong>hoặc</strong>
          <span />
        </div>

        <div className="login-sso">
          <button
            type="button"
            className="login-sso__button"
            disabled={loading}
            onClick={() => {
              window.location.href = `${API_CONFIG.BASE_URL}/auth/google`;
            }}
          >
            <FaGoogle />
            Đăng nhập với Google
          </button>
          <button
            type="button"
            className="login-sso__button"
            disabled={loading}
            onClick={() => {
              window.location.href = `${API_CONFIG.BASE_URL}/auth/microsoft`;
            }}
          >
            <FaMicrosoft />
            Dang nhap voi Microsoft
          </button>
        </div>

        <div className="login-note">
        </div>
      </form>
    </>
  );
}

export default LoginForm;
