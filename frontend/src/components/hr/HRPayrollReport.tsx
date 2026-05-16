import { useMemo, useState } from 'react';
import { FiDownload } from 'react-icons/fi';
import { exportPayrollReportExcel } from '../../services/hrService';
import {
  buildPayrollRow,
  currentYear,
} from './hrShared';

interface HRPayrollReportProps {
  employees: Array<Record<string, any>>;
  departments: Array<Record<string, any>>;
  leaveTypes: Array<Record<string, any>>;
  leaveRequests: Array<Record<string, any>>;
  timesheets: Array<Record<string, any>>;
  onFeedback: (type: string, message: string) => void;
}

function HRPayrollReport({
  employees,
  departments,
  leaveTypes,
  leaveRequests,
  timesheets,
  onFeedback,
}: HRPayrollReportProps) {
  const [filters, setFilters] = useState({
    month: '5',
    year: String(currentYear),
    departmentId: 'all',
    dataStatus: 'approved',
  });
  const [isExporting, setIsExporting] = useState(false);

  const allRows = useMemo(() => {
    return employees
      .filter((employee) => filters.departmentId === 'all' || employee.departmentId === filters.departmentId)
      .map((employee) => buildPayrollRow(employee, departments, leaveTypes, leaveRequests, timesheets, filters));
  }, [departments, employees, filters, leaveRequests, leaveTypes, timesheets]);

  const previewRows = useMemo(
    () => allRows.filter((row) => filters.dataStatus === 'all' || row.isReady),
    [allRows, filters.dataStatus],
  );

  const hasPendingData = allRows.some((row) => !row.isReady);

  const handleExport = async () => {
    const month = Number(filters.month);
    const year = Number(filters.year);

    if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year)) {
      onFeedback('danger', 'Thang hoac nam khong hop le.');
      return;
    }

    setIsExporting(true);
    try {
      await exportPayrollReportExcel(month, year);
      onFeedback('success', `Da goi API xuat bao cao luong thang ${month}/${year} (Excel).`);
    } catch (error) {
      onFeedback('danger', error instanceof Error ? error.message : 'Khong the xuat bao cao luong.');
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
            <select name="month" value={filters.month} onChange={(event) => setFilters((current) => ({ ...current, month: event.target.value }))}>
              {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((month) => (
                <option key={month} value={month}>Thang {month.padStart(2, '0')}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Nam</span>
            <input name="year" type="number" value={filters.year} onChange={(event) => setFilters((current) => ({ ...current, year: event.target.value }))} />
          </label>
          <label>
            <span>Phong ban</span>
            <select name="departmentId" value={filters.departmentId} onChange={(event) => setFilters((current) => ({ ...current, departmentId: event.target.value }))}>
              <option value="all">Tat ca phong ban</option>
              {departments.map((department) => (
                <option key={department.id || department.departmentID} value={department.id || department.departmentID}>
                  {department.name || department.departmentName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Trang thai du lieu</span>
            <select name="dataStatus" value={filters.dataStatus} onChange={(event) => setFilters((current) => ({ ...current, dataStatus: event.target.value }))}>
              <option value="approved">Chi Approved</option>
              <option value="all">Tat ca</option>
            </select>
          </label>
          <button type="button" className="dashboard-button dashboard-button--primary" onClick={handleExport} disabled={isExporting}>
            <FiDownload />
            {isExporting ? 'Dang xuat...' : 'Xuat Excel'}
          </button>
        </div>
        {hasPendingData ? (
          <div className="hr-inline-alert">
            Con du lieu chua duoc phe duyet, hay kiem tra truoc khi xuat luong.
          </div>
        ) : null}
      </section>

      <section className="dashboard-panel hr-table-panel">
        <div className="table-scroll">
          <table className="hr-table hr-table--payroll hr-table-carded">
            <thead>
              <tr>
                <th>Ma nhan vien</th>
                <th>Ho ten</th>
                <th>Phong ban</th>
                <th>Tong gio lam</th>
                <th>Nghi co luong</th>
                <th>Nghi khong luong</th>
                <th>He so luong</th>
                <th>Trang thai du lieu</th>
              </tr>
            </thead>
            <tbody>
              {previewRows.length > 0 ? (
                previewRows.map((row) => (
                  <tr key={row.employeeId}>
                    <td data-label="Ma nhan vien" className="cell-nowrap"><strong>{row.employeeCode}</strong></td>
                    <td data-label="Ho ten">{row.fullName}</td>
                    <td data-label="Phong ban">{row.departmentName}</td>
                    <td data-label="Tong gio lam" className="cell-nowrap">{row.totalHours}h</td>
                    <td data-label="Nghi co luong" className="cell-nowrap">{row.paidLeaveDays} ngay</td>
                    <td data-label="Nghi khong luong" className="cell-nowrap">{row.unpaidLeaveDays} ngay</td>
                    <td data-label="He so luong" className="cell-nowrap">{row.salaryCoefficient}</td>
                    <td data-label="Trang thai du lieu">
                      <span className={`dashboard-status-badge ${row.isReady ? 'dashboard-status-badge--success' : 'dashboard-status-badge--warning'}`}>
                        {row.dataStatus}
                      </span>
                    </td>
                  </tr>
                ))
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

export default HRPayrollReport;

