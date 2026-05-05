import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowRight,
  FiEye,
  FiEyeOff,
  FiLock,
  FiMail,
} from 'react-icons/fi';
import { FaGoogle, FaMicrosoft } from 'react-icons/fa';
import { login as loginService } from '../services/authService';
import { getDashboardPathByRole, saveAuthSession } from '../utils/storage';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type LoginErrors = {
  email?: string;
  password?: string;
};

function getErrorMessage(code) {
  switch (code) {
    case 'INVALID_CREDENTIALS':
      return 'Email hoặc mật khẩu không chính xác.';
    case 'USER_INACTIVE':
      return 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.';
    case 'SSO_UNAVAILABLE':
      return 'Không thể kết nối máy chủ xác thực. Vui lòng thử lại sau.';
    default:
      return 'Đã có lỗi xảy ra. Vui lòng thử lại.';
  }
}

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
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const helperAccounts = useMemo(
    () => [
      'employee@timesheet.com / 123456',
      'manager@timesheet.com / 123456',
      'hr@timesheet.com / 123456',
      'inactive@timesheet.com / 123456',
      'ssoerror@timesheet.com / any',
    ],
    [],
  );

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
    setServerError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const result = await loginService({
        email,
        password,
        provider,
      });

      const session = {
        token: result.token,
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        departmentId: result.user.departmentId,
        managedEmployeeIds: result.user.managedEmployeeIds || [],
        permissions: result.user.permissions || [],
        isActive: result.user.isActive,
        provider: result.provider,
        loggedInAt: new Date().toISOString(),
      };

      saveAuthSession(session, remember);
      navigate(getDashboardPathByRole(result.user.role), { replace: true });
    } catch (error) {
      setServerError(getErrorMessage(error.code));
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
              onChange={(event) => {
                setEmail(event.target.value);
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
              onChange={(event) => {
                setPassword(event.target.value);
                if (errors.password) {
                  setErrors((prev) => ({ ...prev, password: '' }));
                }
              }}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="login-input__toggle"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>
          {errors.password ? <small>{errors.password}</small> : null}
        </div>

        <div className="login-form__options">
          <label className="login-checkbox">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />
            <span>Ghi nhớ đăng nhập</span>
          </label>

          <button type="button" className="login-link" onClick={handleForgotPassword}>
            Quên mật khẩu?
          </button>
        </div>

        {serverError ? <div className="login-alert login-alert--error">{serverError}</div> : null}

        <button type="submit" className="login-submit" disabled={loading}>
          {loading ? 'Đang xác thực SSO...' : 'Đăng nhập'}
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
            onClick={() => void completeLogin({ provider: 'google' })}
          >
            <FaGoogle />
            Đăng nhập với Google
          </button>
          <button
            type="button"
            className="login-sso__button"
            disabled={loading}
            onClick={() => void completeLogin({ provider: 'microsoft' })}
          >
            <FaMicrosoft />
            Đăng nhập với Microsoft
          </button>
        </div>

        <div className="login-helper">
          <strong>Tài khoản test nhanh</strong>
          <ul>
            {helperAccounts.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="login-note">
        </div>
      </form>
    </>
  );
}

export default LoginForm;
