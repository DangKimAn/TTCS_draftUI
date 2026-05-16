import { useEffect, useMemo, useState } from 'react';
import { FiDownload } from 'react-icons/fi';
import { exportDepartmentTimesheetExcel } from '../../services/hrService';
import { formatDate } from '../../utils/dateUtils';
import {
  currentYear,
  getDepartmentName,
  getEmployeeById,
  getStatusClass,
} from './hrShared';

interface HRTimesheetExportProps {
  employees: Array<Record<string, any>>;
  departments: Array<Record<string, any>>;
  timesheets: Array<Record<string, any>>;
  onFeedback: (type: string, message: string) => void;
}

function HRTimesheetExport({
  employees,
  departments,
  timesheets,
  onFeedback,
}: HRTimesheetExportProps) {
  const [filters, setFilters] = useState({
    month: '5',
    year: String(currentYear),
    employeeId: 'all',
    departmentId: departments[0]?.id || departments[0]?.departmentID || '',
    status: 'all',
  });
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!filters.departmentId && departments.length > 0) {
      setFilters((current) => ({
        ...current,
        departmentId: departments[0].id || departments[0].departmentID || '',
      }));
    }
  }, [departments, filters.departmentId]);

  const previewRows = useMemo(() => {
    const periodPrefix = `${filters.year}-${String(filters.month).padStart(2, '0')}`;

    return timesheets.filter((timesheet) => {
      const employee = getEmployeeById(employees, timesheet.employeeId);
      const matchesDate = !filters.month || !filters.year || String(timesheet.workDate || '').startsWith(periodPrefix);
      const matchesEmployee = filters.employeeId === 'all' || timesheet.employeeId === filters.employeeId;
      const matchesDepartment = !filters.departmentId || employee?.departmentId === filters.departmentId;
      const matchesStatus = filters.status === 'all' || timesheet.status === filters.status;

      return matchesDate && matchesEmployee && matchesDepartment && matchesStatus;
    });
  }, [employees, filters, timesheets]);

  const handleChange = (event: any) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const handleExport = async () => {
    const month = Number(filters.month);
    const year = Number(filters.year);

    if (!filters.departmentId.trim()) {
      onFeedback('danger', 'Vui long chon hoac nhap departmentID de xuat timesheet.');
      return;
    }

    if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year)) {
      onFeedback('danger', 'Thang hoac nam khong hop le.');
      return;
    }

    setIsExporting(true);
    try {
      await exportDepartmentTimesheetExcel(filters.departmentId.trim(), month, year);
      onFeedback('success', `Da goi API xuat timesheet phong ban thang ${month}/${year} (Excel).`);
    } catch (error) {
      onFeedback('danger', error instanceof Error ? error.message : 'Khong the xuat timesheet.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <section className="dashboard-panel">
        <div className="hr-report-filter">
          <label>
            <span>Thang</span>
            <select name="month" value={filters.month} onChange={handleChange}>
              {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((month) => (
                <option key={month} value={month}>Thang {month.padStart(2, '0')}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Nam</span>
            <input type="number" name="year" value={filters.year} onChange={handleChange} />
          </label>
          <label>
            <span>Phong ban</span>
            <select name="departmentId" value={filters.departmentId} onChange={handleChange}>
              <option value="">Nhap ID ben canh</option>
              {departments.map((department) => (
                <option key={department.id || department.departmentID} value={department.id || department.departmentID}>
                  {department.name || department.departmentName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>DeptID API</span>
            <input type="text" name="departmentId" value={filters.departmentId} onChange={handleChange} placeholder="department UUID" />
          </label>
          <label>
            <span>Nhan vien</span>
            <select name="employeeId" value={filters.employeeId} onChange={handleChange}>
              <option value="all">Tat ca nhan vien</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.fullName}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Trang thai</span>
            <select name="status" value={filters.status} onChange={handleChange}>
              <option value="all">Tat ca trang thai</option>
              <option value="Pending">Pending</option>
              <option value="Submitted">Submitted</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </label>
          <button type="button" className="dashboard-button dashboard-button--primary" onClick={handleExport} disabled={isExporting}>
            <FiDownload />
            {isExporting ? 'Dang xuat...' : 'Xuat bao cao'}
          </button>
        </div>
      </section>

      <section className="dashboard-panel hr-table-panel">
        <div className="table-scroll">
          <table className="hr-table hr-table--timesheet hr-table-carded">
            <thead>
              <tr>
                <th>Ma bang cong</th>
                <th>Nhan vien</th>
                <th>Phong ban</th>
                <th>Ngay</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Tong gio</th>
                <th>Trang thai</th>
              </tr>
            </thead>
            <tbody>
              {previewRows.length > 0 ? (
                previewRows.map((timesheet) => {
                  const employee = getEmployeeById(employees, timesheet.employeeId);

                  return (
                    <tr key={timesheet.id}>
                      <td data-label="Ma bang cong" className="cell-nowrap"><strong>{timesheet.code}</strong></td>
                      <td data-label="Nhan vien">{employee?.fullName || '--'}</td>
                      <td data-label="Phong ban">{getDepartmentName(departments, employee?.departmentId)}</td>
                      <td data-label="Ngay" className="cell-nowrap">{formatDate(timesheet.workDate)}</td>
                      <td data-label="Check-in" className="cell-nowrap">{timesheet.checkIn || '--'}</td>
                      <td data-label="Check-out" className="cell-nowrap">{timesheet.checkOut || '--'}</td>
                      <td data-label="Tong gio" className="cell-nowrap">{timesheet.totalHours}h</td>
                      <td data-label="Trang thai">
                        <span className={`dashboard-status-badge ${getStatusClass(timesheet.status)}`}>{timesheet.status}</span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="hr-table-empty">Khong co du lieu preview.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export default HRTimesheetExport;

