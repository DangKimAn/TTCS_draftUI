import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { API_CONFIG } from '../../config/api';

const editableDefaults = {
  phone: '',
  address: '',
  emergencyContact: '',
};

function ProfileSection({ profile, onSaveProfile, onUploadAvatar, personalStats }) {
  const [form, setForm] = useState(editableDefaults);
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState('success');
  const [isUploading, setIsUploading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!profile) {
      return;
    }

    setForm({
      phone: profile.phone || '',
      address: profile.address || '',
      emergencyContact: profile.emergencyContact || '',
    });
  }, [profile]);

  if (!profile) {
    return (
      <section className="employee-section">
        <div className="timesheet-empty-state">Không tìm thấy thông tin hồ sơ nhân viên.</div>
      </section>
    );
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await onSaveProfile(form);
      setFeedbackType('success');
      setFeedback('Thông tin cá nhân đã được cập nhật.');
    } catch (error) {
      setFeedbackType('danger');
      setFeedback(error instanceof Error ? error.message : 'Không thể cập nhật thông tin cá nhân.');
    }
  };

  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      await onUploadAvatar(file);
      setFeedbackType('success');
      setFeedback('Ảnh đại diện đã được cập nhật.');
    } catch (error) {
      setFeedbackType('danger');
      setFeedback(error instanceof Error ? error.message : 'Không thể tải lên ảnh đại diện.');
    } finally {
      setIsUploading(false);
      // Reset input value to allow selecting the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Mật khẩu không khớp');
      return;
    }
    if (!passwordForm.newPassword) {
      setPasswordError('Vui lòng nhập mật khẩu mới');
      return;
    }
    
    setIsSavingPassword(true);
    setPasswordError('');
    try {
      await onSaveProfile({ password: passwordForm.newPassword, oldPassword: passwordForm.oldPassword });
      setFeedbackType('success');
      setFeedback('Mật khẩu đã được cập nhật thành công.');
      setIsPasswordModalOpen(false);
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Lỗi khi cập nhật mật khẩu.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <section className="employee-section">
      <div className="employee-section__header">
        <div>
          <span className="dashboard-panel__eyebrow">Hồ sơ</span>
          <h1>Hồ sơ cá nhân</h1>
          <p>Quản lý thông tin tài khoản, liên hệ khẩn cấp và một số chỉ số cá nhân nhanh.</p>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-content__main">
          <section className="dashboard-panel employee-section__panel">
            <div className="profile-header">
              <div 
                className="profile-avatar" 
                onClick={handleAvatarClick} 
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                style={{ cursor: isUploading ? 'wait' : 'pointer', position: 'relative', overflow: 'hidden' }}
                title="Nhấn để thay đổi ảnh đại diện"
              >
                {isHovered && !isUploading && (
                  <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
                    fontWeight: '500',
                    textAlign: 'center',
                    zIndex: 10
                  }}>
                    Đổi avatar
                  </div>
                )}
                {isUploading ? (
                  <span style={{ fontSize: '1rem' }}>...</span>
                ) : profile.avatar ? (
                  <img 
                    src={profile.avatar.startsWith('http') ? profile.avatar : `${API_CONFIG.BASE_URL.replace('/api', '')}${profile.avatar}`} 
                    alt="Avatar" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                ) : (
                  profile.name.slice(0, 2).toUpperCase()
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                />
              </div>
              <div>
                <h2>{profile.name}</h2>
                <p>{profile.email}</p>
                <div className="dashboard-status-badge dashboard-status-badge--success">
                  {profile.role === 'employee' ? 'Nhân viên' : profile.role}
                </div>
              </div>
            </div>

            <div className="employee-info-grid">
              <article className="employee-info-card" style={{ minWidth: 0 }}>
                <span>Mã nhân viên</span>
                <strong className="truncate" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={profile.employeeId}>{profile.employeeId}</strong>
              </article>
              <article className="employee-info-card" style={{ minWidth: 0 }}>
                <span>Phòng ban</span>
                <strong className="truncate" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={profile.department}>{profile.department}</strong>
              </article>

              <article className="employee-info-card" style={{ minWidth: 0 }}>
                <span>Quản lý trực tiếp</span>
                <strong className="truncate" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={profile.manager}>{profile.manager}</strong>
              </article>
              <article className="employee-info-card" style={{ minWidth: 0 }}>
                <span>Ngày tạo tài khoản</span>
                <strong className="truncate" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={profile.joinDate}>{profile.joinDate}</strong>
              </article>
              <article className="employee-info-card" style={{ minWidth: 0 }}>
                <span>Trạng thái tài khoản</span>
                <strong className="truncate" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={profile.accountStatus}>{profile.accountStatus}</strong>
              </article>
            </div>
          </section>

          <section className="dashboard-panel employee-section__panel">
            <div className="dashboard-panel__heading">
              <div>
                <span className="dashboard-panel__eyebrow">Thông tin chỉnh sửa</span>
                <h2>Thông tin có thể cập nhật</h2>
              </div>
            </div>

            {feedback ? (
              <div className={`submit-timesheet-panel__helper is-${feedbackType}`}>{feedback}</div>
            ) : null}

            <form className="employee-form-grid" onSubmit={handleSubmit}>
              <label htmlFor="profile-phone">
                <span>Số điện thoại</span>
                <input id="profile-phone" name="phone" value={form.phone} onChange={handleChange} />
              </label>

              <label htmlFor="profile-address">
                <span>Địa chỉ</span>
                <input id="profile-address" name="address" value={form.address} onChange={handleChange} />
              </label>

              <label className="employee-form-grid__full" htmlFor="profile-emergency">
                <span>Liên hệ khẩn cấp</span>
                <input
                  id="profile-emergency"
                  name="emergencyContact"
                  value={form.emergencyContact}
                  onChange={handleChange}
                />
              </label>

              <div className="dashboard-panel__actions employee-form-grid__full" style={{ display: 'flex', flexDirection: 'row', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="dashboard-button dashboard-button--primary" style={{ whiteSpace: 'nowrap', flex: '0 1 auto', width: 'auto' }}>
                  Lưu thay đổi
                </button>
                <button 
                  type="button" 
                  className="dashboard-button"
                  style={{ backgroundColor: '#f1f5f9', color: '#ef4444', whiteSpace: 'nowrap', flex: '0 1 auto', width: 'auto' }}
                  onClick={() => {
                    setIsPasswordModalOpen(true);
                    setPasswordError('');
                    setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                >
                  Đổi mật khẩu
                </button>
              </div>
            </form>
          </section>
        </div>

        <aside className="dashboard-content__side">
          <section className="dashboard-panel employee-section__panel">
            <div className="dashboard-panel__heading">
              <div>
                <span className="dashboard-panel__eyebrow">Đăng nhập</span>
                <h2>Thông tin đăng nhập</h2>
              </div>
            </div>

            <div className="dashboard-list">
              <div className="dashboard-list__item">
                <strong>Email</strong>
                <span>{profile.email}</span>
              </div>
              <div className="dashboard-list__item">
                <strong>Hình thức</strong>
                <span>{profile.provider || 'password'}</span>
              </div>
              <div className="dashboard-list__item">
                <strong>Vai trò</strong>
                <span>{profile.role === 'employee' ? 'Nhân viên' : profile.role}</span>
              </div>
            </div>
          </section>

          <section className="dashboard-panel employee-section__panel">
            <div className="dashboard-panel__heading">
              <div>
                <span className="dashboard-panel__eyebrow">Thống kê nhanh</span>
                <h2>Thống kê nhanh</h2>
              </div>
            </div>

            <div className="employee-info-grid employee-info-grid--single">
              {personalStats.map((item) => (
                <article key={item.label} className="employee-info-card">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {isPasswordModalOpen && createPortal(
        <div className="modal-backdrop" onClick={() => !isSavingPassword && setIsPasswordModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="dashboard-panel__heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h2>Đổi mật khẩu</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                disabled={isSavingPassword}
                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', lineHeight: 1, padding: 0, color: 'var(--text-soft)' }}
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handlePasswordSubmit} className="employee-form-grid">
              <label className="employee-form-grid__full">
                <span>Mật khẩu cũ</span>
                <input
                  type="password"
                  required
                  value={passwordForm.oldPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                />
              </label>
              
              <label className="employee-form-grid__full">
                <span>Mật khẩu mới</span>
                <input
                  type="password"
                  required
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                />
              </label>
              
              <label className="employee-form-grid__full">
                <span>Xác nhận mật khẩu mới</span>
                <input
                  type="password"
                  required
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                />
              </label>

              {passwordError && (
                <div className="employee-form-grid__full" style={{ color: '#ef4444', fontSize: '14px', fontWeight: 500 }}>
                  {passwordError}
                </div>
              )}

              <div className="dashboard-panel__actions employee-form-grid__full" style={{ justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  type="button"
                  className="dashboard-button dashboard-button--ghost"
                  onClick={() => setIsPasswordModalOpen(false)}
                  disabled={isSavingPassword}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="dashboard-button dashboard-button--primary"
                  disabled={isSavingPassword}
                >
                  {isSavingPassword ? 'Đang cập nhật...' : 'Cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}

export default ProfileSection;
