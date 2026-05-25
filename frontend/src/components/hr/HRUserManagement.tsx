import { useEffect, useMemo, useState } from 'react';
import {
  FiCheck,
  FiEdit3,
  FiEye,
  FiPlus,
  FiPower,
  FiRefreshCw,
  FiSearch,
  FiUpload,
  FiCopy,
} from 'react-icons/fi';
import { formatDate } from '../../utils/dateUtils';
import {
  activateHrUser,
  createHrUser,
  deactivateHrUser,
  fetchHrUsers,
  importHrUsersExcel,
  normalizeHrEmployee,
  updateHrUser,
  type HrImportError,
} from '../../services/hrService';
import {
  emptyEmployeeForm,
  FormErrors,
  FormField,
  formatRange,
  formatHrRole,
  formatHrStatus,
  getDepartmentName,
  getEmployeeById,
  getStatusClass,
  HRFeedback,
  InfoItem,
  ModalShell,
  validateEmployeeForm,
  type EmployeeForm,
} from './hrShared';

interface HRUserManagementProps {
  currentHr: Record<string, any>;
  employees: Array<Record<string, any>>;
  departments: Array<Record<string, any>>;
  leaveRequests: Array<Record<string, any>>;
  timesheets: Array<Record<string, any>>;
  feedback: { type: string; message: string } | null;
  onFeedback: (type: string, message: string) => void;
  onEmployeesChange: (updater: any) => void;
}

function HRUserManagement({
  currentHr,
  employees,
  departments,
  leaveRequests,
  timesheets,
  feedback,
  onFeedback,
  onEmployeesChange,
}: HRUserManagementProps) {
  const [query, setQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [employeeModal, setEmployeeModal] = useState<Record<string, any> | null>(null);
  const [confirmEmployee, setConfirmEmployee] = useState<Record<string, any> | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [pendingEmployeeId, setPendingEmployeeId] = useState('');

  const filteredEmployees = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return employees.filter((employee) => {
      const matchesQuery =
        !normalizedQuery ||
        String(employee.fullName || '').toLowerCase().includes(normalizedQuery) ||
        String(employee.email || '').toLowerCase().includes(normalizedQuery);
      const matchesDepartment = departmentFilter === 'all' || employee.departmentId === departmentFilter;
      const matchesRole = roleFilter === 'all' || employee.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || employee.status === statusFilter;

      return matchesQuery && matchesDepartment && matchesRole && matchesStatus;
    });
  }, [departmentFilter, employees, query, roleFilter, statusFilter]);

  const handleSaveEmployee = async (form: EmployeeForm, mode: string, employeeId?: string) => {
    const validationErrors = validateEmployeeForm(form, employees, employeeId, {
      requirePassword: mode === 'create',
    });

    if (Object.keys(validationErrors).length > 0) {
      return validationErrors;
    }

    const departmentName = getDepartmentName(departments, form.departmentId);
    const payload = {
      fullName: form.fullName.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password.trim(),
      departmentName: departmentName === '--' ? undefined : departmentName,
      role: form.role,
      salaryCoefficient: Number(form.salaryCoefficient),
      leaveBalance: Number(form.leaveBalance),
      isActive: form.status === 'Active',
    };

    try {
      if (mode === 'edit' && employeeId) {
        const currentEmployee = getEmployeeById(employees, employeeId) || {};
        const apiEmployee = await updateHrUser(employeeId, payload, departments);
        const nextEmployee = buildEmployeeFromForm({
          base: currentEmployee,
          apiEmployee,
          form,
          departmentName,
        });

        onEmployeesChange((current: Array<Record<string, any>>) =>
          current.map((employee) => (employee.id === employeeId ? nextEmployee : employee)),
        );
        onFeedback('success', 'Đã cập nhật thông tin nhân viên.');
        setEmployeeModal(null);
        return {};
      }

      const apiEmployee = await createHrUser(payload, departments);
      const nextEmployee = buildEmployeeFromForm({
        base: {
          id: apiEmployee?.id || `emp-${Date.now()}`,
          employeeCode: apiEmployee?.employeeCode || `EMP-${String(employees.length + 1).padStart(3, '0')}`,
          monthlyHours: 0,
          phone: '--',
          location: '--',
          startedAt: new Date().toISOString().slice(0, 10),
          profileStatus: 'new-review',
        },
        apiEmployee,
        form,
        departmentName,
      });

      onEmployeesChange((current: Array<Record<string, any>>) => [nextEmployee, ...current]);
      onFeedback('success', `Đã tạo tài khoản nhân viên ${nextEmployee.fullName}.`);
      setEmployeeModal(null);
      return {};
    } catch (error) {
      onFeedback('danger', error instanceof Error ? error.message : 'Không thể lưu nhân viên.');
      return {};
    }
  };

  const handleToggleEmployee = async (employee: Record<string, any>) => {
    if (employee.id === currentHr.id && employee.status === 'Active') {
      onFeedback('danger', 'HR không thể tự vô hiệu hóa tài khoản đang đăng nhập.');
      return;
    }

    if (employee.status === 'Inactive') {
      setPendingEmployeeId(employee.id);
      try {
        await activateHrUser(employee.id);
        onEmployeesChange((current: Array<Record<string, any>>) =>
          current.map((item) =>
            item.id === employee.id
              ? {
                  ...item,
                  status: 'Active',
                  isActive: true,
                }
              : item,
          ),
        );
        onFeedback('success', `Đã kích hoạt lại tài khoản ${employee.fullName}.`);
      } catch (error) {
        onFeedback('danger', error instanceof Error ? error.message : 'Không thể kích hoạt lại nhân viên.');
      } finally {
        setPendingEmployeeId('');
      }
      return;
    }

    setConfirmEmployee(employee);
  };

  const handleConfirmDeactivate = async () => {
    if (!confirmEmployee) {
      return;
    }

    setPendingEmployeeId(confirmEmployee.id);
    try {
      await deactivateHrUser(confirmEmployee.id);
      onEmployeesChange((current: Array<Record<string, any>>) =>
        current.map((employee) =>
          employee.id === confirmEmployee.id
            ? {
                ...employee,
                status: 'Inactive',
                isActive: false,
                profileStatus: 'inactive-recent',
              }
            : employee,
        ),
      );
      onFeedback('success', `Đã vô hiệu hóa tài khoản ${confirmEmployee.fullName}.`);
      setConfirmEmployee(null);
    } catch (error) {
      onFeedback('danger', error instanceof Error ? error.message : 'Không thể vô hiệu hóa nhân viên.');
    } finally {
      setPendingEmployeeId('');
    }
  };

  const handleImportEmployees = async (file: File) => {
    const result = await importHrUsersExcel(file);
    const refreshedEmployees = await fetchHrUsers(departments);

    onEmployeesChange(() => refreshedEmployees);

    if (result.errors.length > 0) {
      onFeedback(
        'warning',
        `Đã import ${result.importedCount} nhân viên. Một số dòng bị lỗi, vui lòng xem danh sách trong modal.`,
      );
    } else {
      setIsImportModalOpen(false);
      onFeedback('success', `Đã import thành công ${result.importedCount} nhân viên.`);
    }

    return result;
  };

  return (
    <section className="employee-section">
      <div className="employee-section__header">
        <div>
          <span className="dashboard-panel__eyebrow">UC-11 / UC-12</span>
          <h1>Nhân sự</h1>
          <p>Quản lý hồ sơ, tạo tài khoản và vô hiệu hóa/kích hoạt lại nhân viên toàn công ty.</p>
        </div>
        <div className="dashboard-panel__actions">
          <button type="button" className="dashboard-button dashboard-button--ghost" onClick={() => setIsImportModalOpen(true)}>
            <FiUpload />
            Import Excel
          </button>
          <button type="button" className="dashboard-button dashboard-button--primary" onClick={() => setEmployeeModal({ mode: 'create' })}>
            <FiPlus />
            Thêm nhân viên
          </button>
        </div>
      </div>

      <HRFeedback feedback={feedback} />

      <section className="dashboard-panel hr-table-panel">
        <div className="hr-toolbar">
          <label className="topbar__search hr-search" htmlFor="hr-employee-search">
            <FiSearch />
            <input
              id="hr-employee-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm theo tên hoặc email..."
            />
          </label>
          <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
            <option value="all">Tất cả phòng ban</option>
            {departments.map((department) => (
              <option key={department.id || department.departmentID} value={department.id || department.departmentID}>
                {department.name || department.departmentName}
              </option>
            ))}
          </select>
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            <option value="all">Tất cả vai trò</option>
            <option value="employee">{formatHrRole('employee')}</option>
            <option value="manager">{formatHrRole('manager')}</option>
            <option value="hr">{formatHrRole('hr')}</option>
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            <option value="Active">{formatHrStatus('Active')}</option>
            <option value="Inactive">{formatHrStatus('Inactive')}</option>
          </select>
        </div>

        <div className="table-scroll">
          <table className="hr-table hr-table--employees hr-table-carded">
            <thead>
              <tr>
                <th>Mã nhân viên</th>
                <th>Username</th>
                <th>Email</th>
                <th>Phòng ban</th>
                <th>Chức vụ</th>
                <th>Vai trò</th>
                <th>Số ngày phép còn lại</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((employee) => (
                  <tr key={employee.id}>
                    <td data-label="Mã nhân viên" className="cell-nowrap"><strong>{employee.employeeCode}</strong></td>
                    <td data-label="Username"><strong>{employee.fullName}</strong></td>
                    <td data-label="Email">{employee.email}</td>
                    <td data-label="Phòng ban">{getDepartmentName(departments, employee.departmentId)}</td>
                    <td data-label="Chức vụ">{employee.title}</td>
                    <td data-label="Vai trò" className="cell-nowrap">{formatHrRole(employee.role)}</td>
                    <td data-label="Số ngày phép còn lại" className="cell-nowrap">{employee.leaveBalance} ngày</td>
                    <td data-label="Trạng thái" className="cell-nowrap">
                      <span className={`dashboard-status-badge ${getStatusClass(employee.status)}`}>{formatHrStatus(employee.status)}</span>
                    </td>
                    <td data-label="Hành động" className="hr-actions-cell">
                      <div className="hr-row-actions">
                        <button
                          type="button"
                          className="dashboard-button dashboard-button--ghost hr-action-button"
                          onClick={() => setEmployeeModal({ mode: 'detail', employeeId: employee.id })}
                        >
                          <FiEye />
                          Chi tiết
                        </button>
                        <button
                          type="button"
                          className="dashboard-button dashboard-button--ghost hr-action-button"
                          onClick={() => setEmployeeModal({ mode: 'edit', employeeId: employee.id })}
                        >
                          <FiEdit3 />
                          Sửa
                        </button>
                        <button
                          type="button"
                          className={`dashboard-button hr-action-button ${employee.status === 'Active' ? 'hr-button--danger' : 'hr-button--success'}`}
                          onClick={() => handleToggleEmployee(employee)}
                          disabled={
                            pendingEmployeeId === employee.id ||
                            (employee.id === currentHr.id && employee.status === 'Active')
                          }
                        >
                          {employee.status === 'Active' ? <FiPower /> : <FiRefreshCw />}
                          {employee.status === 'Active' ? 'Vô hiệu hóa' : 'Kích hoạt lại'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="hr-table-empty">Không tìm thấy nhân viên phù hợp.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <EmployeeModal
        modal={employeeModal}
        employees={employees}
        departments={departments}
        leaveRequests={leaveRequests}
        timesheets={timesheets}
        onClose={() => setEmployeeModal(null)}
        onSave={handleSaveEmployee}
      />

      <ImportEmployeeModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportEmployees}
      />

      <ConfirmModal
        employee={confirmEmployee}
        isSaving={pendingEmployeeId === confirmEmployee?.id}
        onClose={() => setConfirmEmployee(null)}
        onConfirm={handleConfirmDeactivate}
      />
    </section>
  );
}

function EmployeeModal({
  modal,
  employees,
  departments,
  leaveRequests,
  timesheets,
  onClose,
  onSave,
}: {
  modal: Record<string, any> | null;
  employees: Array<Record<string, any>>;
  departments: Array<Record<string, any>>;
  leaveRequests: Array<Record<string, any>>;
  timesheets: Array<Record<string, any>>;
  onClose: () => void;
  onSave: (form: EmployeeForm, mode: string, employeeId?: string) => Promise<FormErrors>;
}) {
  const employee = modal?.employeeId ? getEmployeeById(employees, modal.employeeId) : null;
  const [form, setForm] = useState<EmployeeForm>(emptyEmployeeForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (modal?.mode === 'edit' && employee) {
      setForm({
        fullName: employee.fullName,
        email: employee.email,
        password: '',
        departmentId: employee.departmentId,
        title: employee.title,
        role: employee.role,
        salaryCoefficient: String(employee.salaryCoefficient),
        leaveBalance: String(employee.leaveBalance),
        status: employee.status,
      });
    } else {
      setForm(emptyEmployeeForm);
    }
    setErrors({});
  }, [employee, modal]);

  if (!modal) {
    return null;
  }

  if (modal.mode === 'detail' && employee) {
    const recentLeaves = leaveRequests
      .filter((request) => request.employeeId === employee.id)
      .slice(0, 4);
    const recentTimesheets = timesheets
      .filter((timesheet) => timesheet.employeeId === employee.id)
      .slice(0, 4);

    return (
      <ModalShell title={`Chi tiết nhân viên ${employee.employeeCode}`} onClose={onClose}>
        <div className="employee-info-grid hr-detail-grid">
          <InfoItem label="Username" value={employee.fullName} />
          <InfoItem label="Email" value={employee.email} />
          <InfoItem label="Phòng ban" value={getDepartmentName(departments, employee.departmentId)} />
          <InfoItem label="Chức vụ" value={employee.title} />
          <InfoItem label="Vai trò" value={formatHrRole(employee.role)} />
          <InfoItem label="Trạng thái" value={formatHrStatus(employee.status)} />
          <InfoItem label="Số ngày phép còn lại" value={`${employee.leaveBalance} ngày`} />
          <InfoItem label="Tổng giờ tháng này" value={`${employee.monthlyHours}h`} />
        </div>

        <div className="hr-modal-section">
          <h3>Lịch sử đơn nghỉ gần đây</h3>
          <div className="dashboard-list">
            {recentLeaves.length > 0 ? recentLeaves.map((request) => (
              <div key={request.id} className="dashboard-list__item">
                <div>
                  <strong>{request.type}</strong>
                  <span>{formatRange(request.startDate, request.endDate)} | {request.totalDays} ngày</span>
                </div>
                <span className={`dashboard-status-badge ${getStatusClass(request.status)}`}>{formatHrStatus(request.status)}</span>
              </div>
            )) : <div className="timesheet-empty-state">Chưa có đơn nghỉ gần đây.</div>}
          </div>
        </div>

        <div className="hr-modal-section">
          <h3>Lịch sử timesheet gần đây</h3>
          <div className="dashboard-list">
            {recentTimesheets.length > 0 ? recentTimesheets.map((timesheet) => (
              <div key={timesheet.id} className="dashboard-list__item">
                <div>
                  <strong>{timesheet.code}</strong>
                  <span>{formatDate(timesheet.workDate)} | {timesheet.totalHours}h</span>
                </div>
                <span className={`dashboard-status-badge ${getStatusClass(timesheet.status)}`}>{formatHrStatus(timesheet.status)}</span>
              </div>
            )) : <div className="timesheet-empty-state">Chưa có timesheet gần đây.</div>}
          </div>
        </div>
      </ModalShell>
    );
  }

  const handleChange = (event: any) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
  };

  const handleSubmit = async (event: any) => {
    event.preventDefault();
    setIsSaving(true);
    const validationErrors = await onSave(form, modal.mode, modal.employeeId);
    setErrors(validationErrors);
    setIsSaving(false);
  };

  return (
    <ModalShell title={modal.mode === 'edit' ? 'Sửa thông tin nhân viên' : 'Thêm nhân viên'} onClose={onClose}>
      <form className="hr-form-grid" onSubmit={handleSubmit}>
        <FormField label="Username" name="fullName" value={form.fullName} error={errors.fullName} onChange={handleChange} />
        <FormField label="Email" name="email" type="email" value={form.email} error={errors.email} onChange={handleChange} />
        <FormField
          label={modal.mode === 'edit' ? 'Mật khẩu mới (nếu đổi)' : 'Mật khẩu tạm thời'}
          name="password"
          type="password"
          value={form.password}
          error={errors.password}
          onChange={handleChange}
        />
        <label>
          <span>Phòng ban</span>
          <select name="departmentId" value={form.departmentId} onChange={handleChange}>
            <option value="">Chọn phòng ban</option>
            {departments.map((department) => (
              <option key={department.id || department.departmentID} value={department.id || department.departmentID}>
                {department.name || department.departmentName}
              </option>
            ))}
          </select>
          {errors.departmentId ? <small>{errors.departmentId}</small> : null}
        </label>
        <FormField label="Chức vụ" name="title" value={form.title} error={errors.title} onChange={handleChange} />
        <label>
          <span>Vai trò</span>
          <select name="role" value={form.role} onChange={handleChange}>
            <option value="">Chọn vai trò</option>
            <option value="employee">{formatHrRole('employee')}</option>
            <option value="manager">{formatHrRole('manager')}</option>
            <option value="hr">{formatHrRole('hr')}</option>
          </select>
          {errors.role ? <small>{errors.role}</small> : null}
        </label>
        <FormField label="Hệ số lương" name="salaryCoefficient" type="number" step="0.1" value={form.salaryCoefficient} error={errors.salaryCoefficient} onChange={handleChange} />
        <FormField label="Số ngày phép còn lại mặc định" name="leaveBalance" type="number" value={form.leaveBalance} error={errors.leaveBalance} onChange={handleChange} />
        <label>
          <span>Trạng thái</span>
          <select name="status" value={form.status} onChange={handleChange}>
            <option value="Active">{formatHrStatus('Active')}</option>
            <option value="Inactive">{formatHrStatus('Inactive')}</option>
          </select>
        </label>
        <div className="dashboard-panel__actions hr-form-actions">
          <button type="button" className="dashboard-button dashboard-button--ghost" onClick={onClose}>Hủy</button>
          <button type="submit" className="dashboard-button dashboard-button--primary" disabled={isSaving}>
            <FiCheck />
            {isSaving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function ImportEmployeeModal({
  isOpen,
  onClose,
  onImport,
}: {
  isOpen: boolean;
  onClose: () => void;
  onImport: (file: File) => Promise<{ importedCount: number; errors: HrImportError[], successes?: { row: number, employeeCode: string, username: string }[] }>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<HrImportError[]>([]);
  const [successes, setSuccesses] = useState<{ row: number, employeeCode: string, username: string }[]>([]);
  const [helperMessage, setHelperMessage] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setErrors([]);
      setSuccesses([]);
      setHelperMessage('');
      setIsImporting(false);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleFileChange = (event: any) => {
    const selectedFile = event.target.files?.[0] || null;
    setErrors([]);
    setSuccesses([]);
    setHelperMessage('');

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (!/\.(xlsx|xls)$/i.test(selectedFile.name)) {
      setFile(null);
      setHelperMessage('Chỉ chấp nhận file .xlsx hoặc .xls.');
      return;
    }

    setFile(selectedFile);
  };

  const handleSubmit = async (event: any) => {
    event.preventDefault();

    if (!file) {
      setHelperMessage('Vui lòng chọn file Excel trước khi import.');
      return;
    }

    setIsImporting(true);
    setErrors([]);
    setSuccesses([]);
    setHelperMessage('');

    try {
      const result = await onImport(file);
      setErrors(result.errors);
      setSuccesses(result.successes || []);
      if (result.errors.length > 0 && (result.successes?.length || 0) > 0) {
        setHelperMessage(`Đã import ${result.importedCount} nhân viên, một số dòng bị lỗi.`);
      } else if (result.errors.length === 0 && (result.successes?.length || 0) > 0) {
        setHelperMessage(`Import thành công ${result.importedCount} nhân viên.`);
      } else if (result.errors.length > 0 && result.importedCount === 0) {
        setHelperMessage(`Import thất bại. Tất cả các dòng đều bị lỗi.`);
      }
    } catch (error) {
      const importErrors = (error as Error & { importErrors?: HrImportError[] }).importErrors || [];
      const importSuccesses = (error as Error & { importSuccesses?: { row: number, employeeCode: string, username: string }[] }).importSuccesses || [];
      setErrors(importErrors);
      setSuccesses(importSuccesses);
      setHelperMessage(error instanceof Error ? error.message : 'Không thể import nhân viên từ Excel.');
    } finally {
      setIsImporting(false);
    }
  };

  const failedMembersCount = new Set(errors.filter(e => e.row > 0).map(e => e.row)).size;

  return (
    <ModalShell title="Import Excel nhân viên" onClose={onClose}>
      <form className="hr-form-grid" onSubmit={handleSubmit}>
        <label className="hr-form-full">
          <span>File Excel</span>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            onClick={(e) => {
              (e.target as HTMLInputElement).value = '';
            }}
          />
          {helperMessage ? <small>{helperMessage}</small> : null}
        </label>

        <div className="hr-modal-section hr-form-full">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ margin: 0 }}>Các cột hỗ trợ</h3>
            <button
              type="button"
              className="dashboard-button dashboard-button--ghost"
              style={{ padding: '4px 8px', fontSize: '13px' }}
              onClick={() => {
                const headers = ['Username', 'Email', 'Mật khẩu tạm thời', 'Phòng ban', 'Chức vụ', 'Vai trò', 'Hệ số lương', 'Số ngày phép mặc định', 'Trạng thái'];
                navigator.clipboard.writeText(headers.join('\t'));
                const btn = document.getElementById('copy-header-btn');
                if (btn) {
                  const originalText = btn.innerText;
                  btn.innerText = 'Đã Copy!';
                  setTimeout(() => {
                    btn.innerText = originalText;
                  }, 2000);
                }
              }}
              id="copy-header-btn"
            >
              <FiCopy style={{ marginRight: '4px' }} /> Copy cấu trúc
            </button>
          </div>
          <div style={{ overflowX: 'auto', border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '6px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap', fontSize: '14px' }}>
              <tbody>
                <tr>
                  {['Username', 'Email', 'Mật khẩu tạm thời', 'Phòng ban', 'Chức vụ', 'Vai trò', 'Hệ số lương', 'Số ngày phép mặc định', 'Trạng thái'].map((col, idx) => (
                    <td key={idx} style={{ padding: '10px 16px', borderRight: '1px solid var(--border-color, #e5e7eb)', background: 'var(--bg-color-secondary, #f9fafb)', fontWeight: 500 }}>
                      {col}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {successes.length > 0 ? (
          <div className="hr-import-successes hr-form-full" style={{ color: 'var(--color-success, #16a34a)', padding: '12px', background: 'var(--color-success-bg, #f0fdf4)', borderRadius: '8px', marginBottom: '12px' }}>
            <h4 style={{ margin: '0 0 8px', fontWeight: 'bold' }}>Thành công {successes.length} thành viên</h4>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {successes.map((success, index) => (
                <li key={`success-${success.row}-${index}`}>
                  Dòng {success.row}: {success.employeeCode} - {success.username}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {errors.length > 0 ? (
          <div className="hr-import-errors hr-form-full" style={{ color: 'var(--color-danger, #dc2626)', padding: '12px', background: 'var(--color-danger-bg, #fef2f2)', borderRadius: '8px' }}>
            <h4 style={{ margin: '0 0 8px', fontWeight: 'bold' }}>Không thành công {failedMembersCount || errors.length} thành viên</h4>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {errors.map((error, index) => (
                <li key={`error-${error.row}-${index}`}>
                  Dòng {error.row || '-'}: {error.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="dashboard-panel__actions hr-form-actions">
          <button type="button" className="dashboard-button dashboard-button--ghost" onClick={onClose}>
            Hủy
          </button>
          <button type="submit" className="dashboard-button dashboard-button--primary" disabled={isImporting || !file}>
            <FiUpload />
            {isImporting ? 'Đang import...' : 'Import Excel'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function ConfirmModal({
  employee,
  isSaving,
  onClose,
  onConfirm,
}: {
  employee: Record<string, any> | null;
  isSaving: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!employee) {
    return null;
  }

  return (
    <ModalShell title="Xác nhận vô hiệu hóa" onClose={onClose}>
      <p className="hr-modal-note">Tài khoản {employee.fullName} sẽ chuyển sang trạng thái ngừng hoạt động. Dữ liệu lịch sử vẫn được giữ lại.</p>
      <div className="dashboard-panel__actions hr-form-actions">
        <button type="button" className="dashboard-button dashboard-button--ghost" onClick={onClose}>Hủy</button>
        <button type="button" className="dashboard-button hr-button--danger" onClick={onConfirm} disabled={isSaving}>
          <FiPower />
          {isSaving ? 'Đang xử lý...' : 'Vô hiệu hóa'}
        </button>
      </div>
    </ModalShell>
  );
}

function buildEmployeeFromForm({
  base,
  apiEmployee,
  form,
  departmentName,
}: {
  base: Record<string, any>;
  apiEmployee?: Record<string, any> | null;
  form: EmployeeForm;
  departmentName: string;
}) {
  const merged = normalizeHrEmployee({ ...base, ...apiEmployee }, []);

  return {
    ...merged,
    id: apiEmployee?.id || base.id || merged.id,
    employeeCode: apiEmployee?.employeeCode || base.employeeCode || merged.employeeCode,
    fullName: form.fullName.trim(),
    email: form.email.trim().toLowerCase(),
    departmentId: form.departmentId,
    departmentName,
    title: form.title.trim(),
    role: form.role,
    salaryCoefficient: Number(form.salaryCoefficient),
    leaveBalance: Number(form.leaveBalance),
    status: form.status,
    isActive: form.status === 'Active',
  };
}

export default HRUserManagement;

