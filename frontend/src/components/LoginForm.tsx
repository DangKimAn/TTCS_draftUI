import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiEye,
  FiEyeOff,
  FiLock,
  FiMail,
  FiCheckCircle,
} from 'react-icons/fi';
import { FaGoogle, FaMicrosoft } from 'react-icons/fa';
import { useAuthStore } from '../store/authStore';
import { getDashboardPathByRole } from '../utils/storage';
import { API_CONFIG } from '../config/api';
import {
  sendForgotPasswordCode,
  verifyForgotPasswordCode,
  resetPassword as apiResetPassword,
} from '../services/authService';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type LoginErrors = {
  email?: string;
  password?: string;
};

type FormStep = 'login' | 'forgot-email' | 'forgot-code' | 'forgot-reset';

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

  const [step, setStep] = useState<FormStep>('login');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const copy = loginCopyByMode[mode as keyof typeof loginCopyByMode] || loginCopyByMode.default;

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

  const handleSendCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});
    if (!email.trim() || !emailPattern.test(email.trim())) {
      setErrors({ email: 'Vui lòng nhập email hợp lệ' });
      return;
    }
    setLoading(true);
    setServerError('');
    try {
      await sendForgotPasswordCode(email);
      setStep('forgot-code');
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Có lỗi xảy ra.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!resetCode.trim()) {
      setServerError('Vui lòng nhập mã xác nhận');
      return;
    }
    setLoading(true);
    setServerError('');
    try {
      await verifyForgotPasswordCode(email, resetCode);
      setStep('forgot-reset');
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Mã không hợp lệ.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword.length < 6) {
      setServerError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      setServerError('Mật khẩu xác nhận không khớp');
      return;
    }
    setLoading(true);
    setServerError('');
    try {
      await apiResetPassword(email, resetCode, newPassword);
      window.alert('Đổi mật khẩu thành công! Vui lòng đăng nhập lại.');
      setStep('login');
      setPassword('');
      setResetCode('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Lỗi đổi mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'forgot-email') {
    return (
      <>
        <div className="login-card__header">
          <span className="login-card__eyebrow">QUÊN MẬT KHẨU</span>
          <h2>Lấy lại mật khẩu</h2>
          <p>Nhập email tài khoản của bạn để nhận mã xác nhận (OTP).</p>
        </div>
        <form className="login-form" onSubmit={handleSendCode}>
          <div className="login-field">
            <label htmlFor="email">Email công việc</label>
            <div className={`login-input ${errors.email ? 'is-error' : ''}`}>
              <FiMail />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors({});
                  setServerError('');
                }}
                disabled={loading}
                placeholder="example@company.com"
              />
            </div>
            {errors.email ? <small>{errors.email}</small> : null}
          </div>
          {serverError ? <div className="login-alert login-alert--error">{serverError}</div> : null}
          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? 'Đang gửi...' : 'Gửi mã xác nhận'}
          </button>
          <div className="login-form__options" style={{ marginTop: '1rem', justifyContent: 'center' }}>
            <button
              type="button"
              className="login-link"
              onClick={() => {
                setStep('login');
                setServerError('');
                setErrors({});
              }}
            >
              Quay lại Đăng nhập
            </button>
          </div>
        </form>
      </>
    );
  }

  if (step === 'forgot-code') {
    return (
      <>
        <div className="login-card__header">
          <span className="login-card__eyebrow">QUÊN MẬT KHẨU</span>
          <h2>Xác nhận OTP</h2>
          <p>Nhập mã xác nhận 6 số vừa được gửi đến email <strong>{email}</strong>.</p>
        </div>
        <form className="login-form" onSubmit={handleVerifyCode}>
          <div className="login-field">
            <label htmlFor="resetCode">Mã xác nhận</label>
            <div className="login-input">
              <FiCheckCircle />
              <input
                id="resetCode"
                type="text"
                maxLength={6}
                value={resetCode}
                onChange={(e) => {
                  setResetCode(e.target.value);
                  setServerError('');
                }}
                disabled={loading}
                placeholder="123456"
              />
            </div>
          </div>
          {serverError ? <div className="login-alert login-alert--error">{serverError}</div> : null}
          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? 'Đang kiểm tra...' : 'Xác nhận mã'}
          </button>
          <div className="login-form__options" style={{ marginTop: '1rem', justifyContent: 'center' }}>
            <button
              type="button"
              className="login-link"
              onClick={() => {
                setStep('login');
                setServerError('');
              }}
            >
              Hủy
            </button>
          </div>
        </form>
      </>
    );
  }

  if (step === 'forgot-reset') {
    return (
      <>
        <div className="login-card__header">
          <span className="login-card__eyebrow">QUÊN MẬT KHẨU</span>
          <h2>Đặt mật khẩu mới</h2>
          <p>Mã hợp lệ. Vui lòng tạo mật khẩu mới cho tài khoản của bạn.</p>
        </div>
        <form className="login-form" onSubmit={handleResetPassword}>
          <div className="login-field">
            <label htmlFor="newPassword">Mật khẩu mới</label>
            <div className="login-input">
              <FiLock />
              <input
                id="newPassword"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setServerError('');
                }}
                disabled={loading}
                placeholder="Tối thiểu 6 ký tự"
              />
              <button
                type="button"
                className="login-input__toggle"
                disabled={loading}
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>
          <div className="login-field">
            <label htmlFor="confirmPassword">Xác nhận mật khẩu</label>
            <div className="login-input">
              <FiLock />
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setServerError('');
                }}
                disabled={loading}
                placeholder="Nhập lại mật khẩu mới"
              />
            </div>
          </div>
          {serverError ? <div className="login-alert login-alert--error">{serverError}</div> : null}
          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </form>
      </>
    );
  }

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
          <button
            type="button"
            className="login-link"
            disabled={loading}
            onClick={() => {
              setStep('forgot-email');
              setErrors({});
              setServerError('');
            }}
          >
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
