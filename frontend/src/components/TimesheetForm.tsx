import { useEffect, useState } from 'react';

const initialFormState = {
  employeeId: '',
  date: '',
  checkIn: '',
  checkOut: '',
  note: '',
};

function TimesheetForm({ employees, onSubmit, isSubmitting }) {
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    if (!employees.length || formData.employeeId) {
      return;
    }

    setFormData((current) => ({
      ...current,
      employeeId: employees[0].id,
    }));
  }, [employees, formData.employeeId]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const isSuccess = await onSubmit(formData);

    if (isSuccess) {
      setFormData({
        ...initialFormState,
        employeeId: employees[0]?.id || '',
      });
    }
  };

  return (
    <section className="dashboard-panel timesheet-api-form">
      <div className="dashboard-panel__heading">
        <div>
          <span className="dashboard-panel__eyebrow">POST /api/timesheets</span>
          <h2>Them ban ghi cham cong</h2>
          <p>Nhap thong tin co ban va gui du lieu len mock API bang fetch POST.</p>
        </div>
      </div>

      <form className="timesheet-api-form__grid" onSubmit={handleSubmit}>
        <label htmlFor="timesheet-employee">
          <span>Chon nhan vien</span>
          <select
            id="timesheet-employee"
            name="employeeId"
            value={formData.employeeId}
            onChange={handleChange}
            required
          >
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name} - {employee.id}
              </option>
            ))}
          </select>
        </label>

        <label htmlFor="timesheet-date">
          <span>Ngay</span>
          <input
            id="timesheet-date"
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
          />
        </label>

        <label htmlFor="timesheet-checkin">
          <span>Check-in</span>
          <input
            id="timesheet-checkin"
            type="time"
            name="checkIn"
            value={formData.checkIn}
            onChange={handleChange}
            required
          />
        </label>

        <label htmlFor="timesheet-checkout">
          <span>Check-out</span>
          <input
            id="timesheet-checkout"
            type="time"
            name="checkOut"
            value={formData.checkOut}
            onChange={handleChange}
          />
        </label>

        <label className="timesheet-api-form__full" htmlFor="timesheet-note">
          <span>Ghi chu</span>
          <textarea
            id="timesheet-note"
            name="note"
            value={formData.note}
            onChange={handleChange}
            placeholder="Vi du: Hoan thanh bao cao, hop client, di onsite..."
            rows={4}
          />
        </label>

        <div className="dashboard-panel__actions">
          <button
            type="submit"
            className="dashboard-button dashboard-button--primary"
            disabled={isSubmitting || !employees.length}
          >
            {isSubmitting ? 'Dang gui du lieu...' : 'Them timesheet'}
          </button>
        </div>
      </form>
    </section>
  );
}

export default TimesheetForm;
