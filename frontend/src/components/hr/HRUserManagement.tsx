import { useEffect, useMemo, useState } from 'react';
import {
  FiCheck,
  FiEdit3,
  FiEye,
  FiPlus,
  FiPower,
  FiRefreshCw,
  FiSearch,
} from 'react-icons/fi';
import { formatDate } from '../../utils/dateUtils';
import {
  activateHrUser,
  createHrUser,
  deactivateHrUser,
  normalizeHrEmployee,
  updateHrUser,
} from '../../services/hrService';
import {
  emptyEmployeeForm,
  FormErrors,
  FormField,
  formatRange,
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
        onFeedback('success', 'Da cap nhat thong tin nhan vien.');
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
      onFeedback('success', `Da tao tai khoan nhan vien ${nextEmployee.fullName}.`);
      setEmployeeModal(null);
      return {};
    } catch (error) {
      onFeedback('danger', error instanceof Error ? error.message : 'Khong the luu nhan vien.');
      return {};
    }
  };

  const handleToggleEmployee = async (employee: Record<string, any>) => {
    if (employee.id === currentHr.id && employee.status === 'Active') {
      onFeedback('danger', 'HR khong the tu vo hieu hoa tai khoan dang dang nhap.');
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
        onFeedback('success', `Da kich hoat lai tai khoan ${employee.fullName}.`);
      } catch (error) {
        onFeedback('danger', error instanceof Error ? error.message : 'Khong the kich hoat lai nhan vien.');
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
      onFeedback('success', `Da vo hieu hoa tai khoan ${confirmEmployee.fullName}.`);
      setConfirmEmployee(null);
    } catch (error) {
      onFeedback('danger', error instanceof Error ? error.message : 'Khong the vo hieu hoa nhan vien.');
    } finally {
      setPendingEmployeeId('');
    }
  };

  return (
    <section className="employee-section">
      <div className="employee-section__header">
        <div>
          <span className="dashboard-panel__eyebrow">UC-11 / UC-12</span>
          <h1>Nhan su</h1>
          <p>Quan ly ho so, tao tai khoan va vo hieu hoa/kich hoat lai nhan vien toan cong ty.</p>
        </div>
        <button type="button" className="dashboard-button dashboard-button--primary" onClick={() => setEmployeeModal({ mode: 'create' })}>
          <FiPlus />
          Them nhan vien
        </button>
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
              placeholder="Tim theo ten hoac email..."
            />
          </label>
          <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
            <option value="all">Tat ca phong ban</option>
            {departments.map((department) => (
              <option key={department.id || department.departmentID} value={department.id || department.departmentID}>
                {department.name || department.departmentName}
              </option>
            ))}
          </select>
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            <option value="all">Tat ca vai tro</option>
            <option value="employee">employee</option>
            <option value="manager">manager</option>
            <option value="hr">hr</option>
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">Tat ca trang thai</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div className="table-scroll">
          <table className="hr-table hr-table--employees hr-table-carded">
            <thead>
              <tr>
                <th>Ma nhan vien</th>
                <th>Ho ten</th>
                <th>Email</th>
                <th>Phong ban</th>
                <th>Chuc vu</th>
                <th>Vai tro</th>
                <th>So du phep</th>
                <th>Trang thai</th>
                <th>Hanh dong</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((employee) => (
                  <tr key={employee.id}>
                    <td data-label="Ma nhan vien" className="cell-nowrap"><strong>{employee.employeeCode}</strong></td>
                    <td data-label="Ho ten"><strong>{employee.fullName}</strong></td>
                    <td data-label="Email">{employee.email}</td>
                    <td data-label="Phong ban">{getDepartmentName(departments, employee.departmentId)}</td>
                    <td data-label="Chuc vu">{employee.title}</td>
                    <td data-label="Vai tro" className="cell-nowrap">{employee.role}</td>
                    <td data-label="So du phep" className="cell-nowrap">{employee.leaveBalance} ngay</td>
                    <td data-label="Trang thai" className="cell-nowrap">
                      <span className={`dashboard-status-badge ${getStatusClass(employee.status)}`}>{employee.status}</span>
                    </td>
                    <td data-label="Hanh dong" className="hr-actions-cell">
                      <div className="hr-row-actions">
                        <button
                          type="button"
                          className="dashboard-button dashboard-button--ghost hr-action-button"
                          onClick={() => setEmployeeModal({ mode: 'detail', employeeId: employee.id })}
                        >
                          <FiEye />
                          Chi tiet
                        </button>
                        <button
                          type="button"
                          className="dashboard-button dashboard-button--ghost hr-action-button"
                          onClick={() => setEmployeeModal({ mode: 'edit', employeeId: employee.id })}
                        >
                          <FiEdit3 />
                          Sua
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
                          {employee.status === 'Active' ? 'Vo hieu hoa' : 'Kich hoat lai'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="hr-table-empty">Khong tim thay nhan vien phu hop.</td>
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
      <ModalShell title={`Chi tiet nhan vien ${employee.employeeCode}`} onClose={onClose}>
        <div className="employee-info-grid hr-detail-grid">
          <InfoItem label="Ho ten" value={employee.fullName} />
          <InfoItem label="Email" value={employee.email} />
          <InfoItem label="Phong ban" value={getDepartmentName(departments, employee.departmentId)} />
          <InfoItem label="Chuc vu" value={employee.title} />
          <InfoItem label="Vai tro" value={employee.role} />
          <InfoItem label="Trang thai" value={employee.status} />
          <InfoItem label="So du phep" value={`${employee.leaveBalance} ngay`} />
          <InfoItem label="Tong gio thang nay" value={`${employee.monthlyHours}h`} />
        </div>

        <div className="hr-modal-section">
          <h3>Lich su don nghi gan day</h3>
          <div className="dashboard-list">
            {recentLeaves.length > 0 ? recentLeaves.map((request) => (
              <div key={request.id} className="dashboard-list__item">
                <div>
                  <strong>{request.type}</strong>
                  <span>{formatRange(request.startDate, request.endDate)} | {request.totalDays} ngay</span>
                </div>
                <span className={`dashboard-status-badge ${getStatusClass(request.status)}`}>{request.status}</span>
              </div>
            )) : <div className="timesheet-empty-state">Chua co don nghi gan day.</div>}
          </div>
        </div>

        <div className="hr-modal-section">
          <h3>Lich su timesheet gan day</h3>
          <div className="dashboard-list">
            {recentTimesheets.length > 0 ? recentTimesheets.map((timesheet) => (
              <div key={timesheet.id} className="dashboard-list__item">
                <div>
                  <strong>{timesheet.code}</strong>
                  <span>{formatDate(timesheet.workDate)} | {timesheet.totalHours}h</span>
                </div>
                <span className={`dashboard-status-badge ${getStatusClass(timesheet.status)}`}>{timesheet.status}</span>
              </div>
            )) : <div className="timesheet-empty-state">Chua co timesheet gan day.</div>}
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
    <ModalShell title={modal.mode === 'edit' ? 'Sua thong tin nhan vien' : 'Them nhan vien'} onClose={onClose}>
      <form className="hr-form-grid" onSubmit={handleSubmit}>
        <FormField label="Ho ten" name="fullName" value={form.fullName} error={errors.fullName} onChange={handleChange} />
        <FormField label="Email" name="email" type="email" value={form.email} error={errors.email} onChange={handleChange} />
        <FormField
          label={modal.mode === 'edit' ? 'Mat khau moi (neu doi)' : 'Mat khau tam thoi'}
          name="password"
          type="password"
          value={form.password}
          error={errors.password}
          onChange={handleChange}
        />
        <label>
          <span>Phong ban</span>
          <select name="departmentId" value={form.departmentId} onChange={handleChange}>
            <option value="">Chon phong ban</option>
            {departments.map((department) => (
              <option key={department.id || department.departmentID} value={department.id || department.departmentID}>
                {department.name || department.departmentName}
              </option>
            ))}
          </select>
          {errors.departmentId ? <small>{errors.departmentId}</small> : null}
        </label>
        <FormField label="Chuc vu" name="title" value={form.title} error={errors.title} onChange={handleChange} />
        <label>
          <span>Vai tro</span>
          <select name="role" value={form.role} onChange={handleChange}>
            <option value="">Chon vai tro</option>
            <option value="employee">employee</option>
            <option value="manager">manager</option>
            <option value="hr">hr</option>
          </select>
          {errors.role ? <small>{errors.role}</small> : null}
        </label>
        <FormField label="He so luong" name="salaryCoefficient" type="number" step="0.1" value={form.salaryCoefficient} error={errors.salaryCoefficient} onChange={handleChange} />
        <FormField label="So du phep mac dinh" name="leaveBalance" type="number" value={form.leaveBalance} error={errors.leaveBalance} onChange={handleChange} />
        <label>
          <span>Trang thai</span>
          <select name="status" value={form.status} onChange={handleChange}>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </label>
        <div className="dashboard-panel__actions hr-form-actions">
          <button type="button" className="dashboard-button dashboard-button--ghost" onClick={onClose}>Huy</button>
          <button type="submit" className="dashboard-button dashboard-button--primary" disabled={isSaving}>
            <FiCheck />
            {isSaving ? 'Dang luu...' : 'Luu'}
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
    <ModalShell title="Xac nhan vo hieu hoa" onClose={onClose}>
      <p className="hr-modal-note">Tai khoan {employee.fullName} se chuyen sang Inactive. Du lieu lich su van duoc giu lai.</p>
      <div className="dashboard-panel__actions hr-form-actions">
        <button type="button" className="dashboard-button dashboard-button--ghost" onClick={onClose}>Huy</button>
        <button type="button" className="dashboard-button hr-button--danger" onClick={onConfirm} disabled={isSaving}>
          <FiPower />
          {isSaving ? 'Dang xu ly...' : 'Vo hieu hoa'}
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

