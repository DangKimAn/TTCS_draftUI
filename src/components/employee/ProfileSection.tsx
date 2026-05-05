import { useEffect, useState } from 'react';

const editableDefaults = {
  phone: '',
  address: '',
  emergencyContact: '',
};

function ProfileSection({ profile, onSaveProfile, personalStats }) {
  const [form, setForm] = useState(editableDefaults);
  const [feedback, setFeedback] = useState('');

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

  const handleSubmit = (event) => {
    event.preventDefault();
    onSaveProfile(form);
    setFeedback('Thông tin cá nhân đã được cập nhật.');
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
              <div className="profile-avatar">{profile.name.slice(0, 2).toUpperCase()}</div>
              <div>
                <h2>{profile.name}</h2>
                <p>{profile.email}</p>
                <div className="dashboard-status-badge dashboard-status-badge--success">
                  {profile.role === 'employee' ? 'Nhân viên' : profile.role}
                </div>
              </div>
            </div>

            <div className="employee-info-grid">
              <article className="employee-info-card">
                <span>Mã nhân viên</span>
                <strong>{profile.employeeId}</strong>
              </article>
              <article className="employee-info-card">
                <span>Phòng ban</span>
                <strong>{profile.department}</strong>
              </article>
              <article className="employee-info-card">
                <span>Chức vụ</span>
                <strong>{profile.position}</strong>
              </article>
              <article className="employee-info-card">
                <span>Quản lý trực tiếp</span>
                <strong>{profile.manager}</strong>
              </article>
              <article className="employee-info-card">
                <span>Ngày vào làm</span>
                <strong>{profile.joinDate}</strong>
              </article>
              <article className="employee-info-card">
                <span>Trạng thái tài khoản</span>
                <strong>{profile.accountStatus}</strong>
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
              <div className="submit-timesheet-panel__helper is-success">{feedback}</div>
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

              <div className="dashboard-panel__actions">
                <button type="submit" className="dashboard-button dashboard-button--primary">
                  Lưu thay đổi
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
    </section>
  );
}

export default ProfileSection;
