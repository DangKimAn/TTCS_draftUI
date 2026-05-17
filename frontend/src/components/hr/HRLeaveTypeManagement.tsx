import { useEffect, useState } from 'react';
import { FiCheck, FiEdit3, FiPlus, FiPower, FiTrash2 } from 'react-icons/fi';
import {
  activateHrLeaveType,
  createHrLeaveType,
  deleteHrLeaveType,
  updateHrLeaveType,
} from '../../services/hrService';
import {
  emptyLeaveTypeForm,
  FormErrors,
  FormField,
  getStatusClass,
  HRFeedback,
  ModalShell,
  validateLeaveTypeForm,
  type LeaveTypeForm,
} from './hrShared';

interface HRLeaveTypeManagementProps {
  leaveTypes: Array<Record<string, any>>;
  feedback: { type: string; message: string } | null;
  onFeedback: (type: string, message: string) => void;
  onLeaveTypesChange: (updater: any) => void;
}

function HRLeaveTypeManagement({
  leaveTypes,
  feedback,
  onFeedback,
  onLeaveTypesChange,
}: HRLeaveTypeManagementProps) {
  const [policyModal, setPolicyModal] = useState<Record<string, any> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Record<string, any> | null>(null);
  const [pendingId, setPendingId] = useState('');

  const handleSaveLeaveType = async (form: LeaveTypeForm, mode: string, leaveTypeId?: string) => {
    const validationErrors = validateLeaveTypeForm(form, leaveTypes, leaveTypeId);

    if (Object.keys(validationErrors).length > 0) {
      return validationErrors;
    }

    try {
      if (mode === 'edit' && leaveTypeId) {
        const currentType = leaveTypes.find((type) => type.id === leaveTypeId) || {};
        const apiType = await updateHrLeaveType(leaveTypeId, {
          code: form.code,
          name: form.name,
          isPaid: form.isPaid,
          status: form.status,
        });
        const nextType = buildLeaveTypeFromForm(currentType, apiType, form);

        onLeaveTypesChange((current: Array<Record<string, any>>) =>
          current.map((type) => (type.id === leaveTypeId ? nextType : type)),
        );
        onFeedback('success', 'Da cap nhat loai nghi phep.');
        setPolicyModal(null);
        return {};
      }

      const apiType = await createHrLeaveType({
        code: form.code,
        name: form.name,
        isPaid: form.isPaid,
        status: form.status,
      });
      const nextType = buildLeaveTypeFromForm(
        {
          id: apiType?.id || form.code.trim().toLowerCase().replaceAll(' ', '-'),
          hasUsageHistory: false,
        },
        apiType,
        form,
      );

      onLeaveTypesChange((current: Array<Record<string, any>>) => [nextType, ...current]);
      onFeedback('success', `Da them loai nghi ${nextType.name}.`);
      setPolicyModal(null);
      return {};
    } catch (error) {
      onFeedback('danger', error instanceof Error ? error.message : 'Khong the luu loai nghi phep.');
      return {};
    }
  };

  const handleDeleteLeaveType = async () => {
    if (!deleteTarget) {
      return;
    }

    setPendingId(deleteTarget.id);
    try {
      const apiType = await deleteHrLeaveType(deleteTarget.id);
      onLeaveTypesChange((current: Array<Record<string, any>>) =>
        current.map((type) =>
          type.id === deleteTarget.id
            ? buildLeaveTypeFromForm(type, apiType || { ...type, isActive: false, status: 'Inactive' }, {
                code: type.code,
                name: type.name,
                isPaid: type.isPaid,
                defaultDaysPerYear: String(type.defaultDaysPerYear || 0),
                note: type.note || '',
                status: 'Inactive',
              })
            : type,
        ),
      );
      onFeedback('success', `Da vo hieu hoa loai nghi ${deleteTarget.name}.`);
      setDeleteTarget(null);
    } catch (error) {
      onFeedback('danger', error instanceof Error ? error.message : 'Khong the vo hieu hoa loai nghi phep.');
    } finally {
      setPendingId('');
    }
  };

  const handleActivateLeaveType = async (leaveType: Record<string, any>) => {
    setPendingId(leaveType.id);
    try {
      const apiType = await activateHrLeaveType(leaveType.id);
      onLeaveTypesChange((current: Array<Record<string, any>>) =>
        current.map((type) => (type.id === leaveType.id ? { ...type, ...apiType, status: 'Active', isActive: true } : type)),
      );
      onFeedback('success', `Da kich hoat loai nghi ${leaveType.name}.`);
    } catch (error) {
      onFeedback('danger', error instanceof Error ? error.message : 'Khong the kich hoat loai nghi phep.');
    } finally {
      setPendingId('');
    }
  };

  return (
    <section className="employee-section">
      <div className="employee-section__header">
        <div>
          <span className="dashboard-panel__eyebrow">UC-10</span>
          <h1>Chinh sach nghi phep</h1>
          <p>Quan ly loai nghi phep, trang thai ap dung va quy tac mac dinh.</p>
        </div>
        <button type="button" className="dashboard-button dashboard-button--primary" onClick={() => setPolicyModal({ mode: 'create' })}>
          <FiPlus />
          Them loai nghi
        </button>
      </div>

      <HRFeedback feedback={feedback} />

      <section className="dashboard-panel hr-table-panel">
        <div className="table-scroll">
          <table className="hr-table hr-table--policies hr-table-carded">
            <thead>
              <tr>
                <th>Ma loai nghi</th>
                <th>Ten loai nghi</th>
                <th>Co luong</th>
                <th>So ngay/nam</th>
                <th>Trang thai</th>
                <th>Ghi chu</th>
                <th>Hanh dong</th>
              </tr>
            </thead>
            <tbody>
              {leaveTypes.length > 0 ? (
                leaveTypes.map((type) => (
                  <tr key={type.id}>
                    <td data-label="Ma loai nghi" className="cell-nowrap"><strong>{type.code}</strong></td>
                    <td data-label="Ten loai nghi">{type.name}</td>
                    <td data-label="Co luong">
                      <span className={`dashboard-status-badge ${type.isPaid ? 'dashboard-status-badge--success' : 'dashboard-status-badge--warning'}`}>
                        {type.isPaid ? 'Paid' : 'Unpaid'}
                      </span>
                    </td>
                    <td data-label="So ngay/nam" className="cell-nowrap">{type.defaultDaysPerYear} ngay</td>
                    <td data-label="Trang thai">
                      <span className={`dashboard-status-badge ${getStatusClass(type.status)}`}>{type.status}</span>
                    </td>
                    <td data-label="Ghi chu">
                      <div className="hr-cell-stack">
                        <span>{type.note || '--'}</span>
                        {type.hasUsageHistory ? (
                          <small>Loai nghi da co du lieu su dung, API co the tu choi xoa.</small>
                        ) : null}
                      </div>
                    </td>
                    <td data-label="Hanh dong" className="hr-actions-cell">
                      <div className="hr-row-actions">
                        <button
                          type="button"
                          className="dashboard-button dashboard-button--ghost hr-action-button"
                          onClick={() => setPolicyModal({ mode: 'edit', leaveTypeId: type.id })}
                        >
                          <FiEdit3 />
                          Sua
                        </button>
                        {type.status === 'Inactive' ? (
                          <button
                            type="button"
                            className="dashboard-button dashboard-button--ghost hr-action-button"
                            onClick={() => void handleActivateLeaveType(type)}
                            disabled={pendingId === type.id}
                          >
                            <FiPower />
                            Kich hoat
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="dashboard-button hr-button--danger hr-action-button"
                            onClick={() => setDeleteTarget(type)}
                            disabled={pendingId === type.id}
                          >
                            <FiTrash2 />
                            Vo hieu hoa
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="hr-table-empty">Chua co loai nghi phep.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <LeaveTypeModal
        modal={policyModal}
        leaveTypes={leaveTypes}
        onClose={() => setPolicyModal(null)}
        onSave={handleSaveLeaveType}
      />

      <DeleteLeaveTypeModal
        leaveType={deleteTarget}
        isSaving={pendingId === deleteTarget?.id}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteLeaveType}
      />
    </section>
  );
}

function LeaveTypeModal({
  modal,
  leaveTypes,
  onClose,
  onSave,
}: {
  modal: Record<string, any> | null;
  leaveTypes: Array<Record<string, any>>;
  onClose: () => void;
  onSave: (form: LeaveTypeForm, mode: string, leaveTypeId?: string) => Promise<FormErrors>;
}) {
  const leaveType = modal?.leaveTypeId ? leaveTypes.find((type) => type.id === modal.leaveTypeId) : null;
  const [form, setForm] = useState<LeaveTypeForm>(emptyLeaveTypeForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (modal?.mode === 'edit' && leaveType) {
      setForm({
        code: leaveType.code,
        name: leaveType.name,
        isPaid: leaveType.isPaid,
        defaultDaysPerYear: String(leaveType.defaultDaysPerYear),
        note: leaveType.note,
        status: leaveType.status,
      });
    } else {
      setForm(emptyLeaveTypeForm);
    }
    setErrors({});
  }, [leaveType, modal]);

  if (!modal) {
    return null;
  }

  const handleChange = (event: any) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: name === 'isPaid' ? value === 'true' : value,
    }));
    setErrors((current) => ({ ...current, [name]: '' }));
  };

  const handleSubmit = async (event: any) => {
    event.preventDefault();
    setIsSaving(true);
    const validationErrors = await onSave(form, modal.mode, modal.leaveTypeId);
    setErrors(validationErrors);
    setIsSaving(false);
  };

  return (
    <ModalShell title={modal.mode === 'edit' ? 'Sua loai nghi phep' : 'Them loai nghi phep'} onClose={onClose}>
      {leaveType?.hasUsageHistory ? (
        <div className="hr-inline-alert">Loai nghi da co du lieu su dung. Khi vo hieu hoa, backend se giu lai lich su don nghi.</div>
      ) : null}
      <form className="hr-form-grid" onSubmit={handleSubmit}>
        <FormField label="Ma loai nghi" name="code" value={form.code} error={errors.code} onChange={handleChange} />
        <FormField label="Ten loai nghi" name="name" value={form.name} error={errors.name} onChange={handleChange} />
        <label>
          <span>Co luong khong</span>
          <select name="isPaid" value={String(form.isPaid)} onChange={handleChange}>
            <option value="true">Co luong</option>
            <option value="false">Khong luong</option>
          </select>
        </label>
        <FormField label="So ngay mac dinh" name="defaultDaysPerYear" type="number" value={form.defaultDaysPerYear} error={errors.defaultDaysPerYear} onChange={handleChange} />
        <label>
          <span>Trang thai</span>
          <select name="status" value={form.status} onChange={handleChange}>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </label>
        <label className="hr-form-full">
          <span>Ghi chu</span>
          <textarea name="note" rows={4} value={form.note} onChange={handleChange} />
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

function DeleteLeaveTypeModal({
  leaveType,
  isSaving,
  onClose,
  onConfirm,
}: {
  leaveType: Record<string, any> | null;
  isSaving: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!leaveType) {
    return null;
  }

  return (
    <ModalShell title="Xac nhan vo hieu hoa loai nghi" onClose={onClose}>
      <p className="hr-modal-note">Loai nghi {leaveType.name} se chuyen sang Inactive va khong xuat hien khi nhan vien tao don moi. Lich su don nghi van duoc giu lai.</p>
      <div className="dashboard-panel__actions hr-form-actions">
        <button type="button" className="dashboard-button dashboard-button--ghost" onClick={onClose}>Huy</button>
        <button type="button" className="dashboard-button hr-button--danger" onClick={onConfirm} disabled={isSaving}>
          <FiTrash2 />
          {isSaving ? 'Dang xu ly...' : 'Vo hieu hoa'}
        </button>
      </div>
    </ModalShell>
  );
}

function buildLeaveTypeFromForm(base: Record<string, any>, apiType: Record<string, any> | null | undefined, form: LeaveTypeForm) {
  return {
    ...base,
    ...apiType,
    id: apiType?.id || base.id,
    typeLeaveID: apiType?.typeLeaveID || apiType?.id || base.typeLeaveID || base.id,
    code: form.code.trim().toUpperCase(),
    name: form.name.trim(),
    isPaid: form.isPaid,
    hasSalary: form.isPaid ? 1 : 0,
    defaultDaysPerYear: Number(form.defaultDaysPerYear || 0),
    note: form.note.trim(),
    status: form.status,
  };
}

export default HRLeaveTypeManagement;
