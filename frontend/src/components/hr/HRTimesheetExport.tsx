import { useEffect, useMemo, useState } from 'react';
import { FiDownload, FiRefreshCw } from 'react-icons/fi';
import { getTimesheetReport } from '../../services/timesheetService';
import type { TimesheetReportData, TimesheetReportSummary } from '../../services/timesheetService';
import { exportTimesheetReportPdf } from '../../utils/reportPdf';
import { formatDate } from '../../utils/dateUtils';
import {
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

const EMPTY_SUMMARY: TimesheetReportSummary = {
  totalRecords: 0,
  totalEmployees: 0,
  totalHours: 0,
  pending: 0,
  submitted: 0,
  approved: 0,
  rejected: 0,
  missingOut: 0,
  warningRecords: 0,
  byStatus: {},
};

function HRTimesheetExport({
  employees,
  departments,
  onFeedback,
}: HRTimesheetExportProps) {
  const [filters, setFilters] = useState({
    ...getCurrentMonthRange(),
    employeeId: 'all',
    departmentId: 'all',
    status: 'all',
  });
  const [reportData, setReportData] = useState<TimesheetReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadReport() {
      setIsLoading(true);

      try {
        const report = await getTimesheetReport(filters);
        if (isMounted) {
          setReportData(report);
        }
      } catch (error) {
        if (isMounted) {
          setReportData({ filters, rows: [], summary: EMPTY_SUMMARY });
          onFeedback('danger', error instanceof Error ? error.message : 'Khong the tai bao cao timesheet tu API.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadReport();

    return () => {
      isMounted = false;
    };
  }, [filters.fromDate, filters.toDate, filters.employeeId, filters.departmentId, filters.status, reloadKey]);

  const previewRows = useMemo(
    () => [...(reportData?.rows || [])].sort((left, right) => String(right.workDate || '').localeCompare(String(left.workDate || ''))),
    [reportData?.rows],
  );
  const summary = reportData?.summary || EMPTY_SUMMARY;

  const handleChange = (event: any) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const handleExportPdf = () => {
    if (previewRows.length === 0) {
      onFeedback('danger', 'Khong co du lieu de xuat PDF.');
      return;
    }

    try {
      exportTimesheetReportPdf({
        title: 'Bao cao timesheet HR',
        filters: reportData?.filters || filters,
        rows: previewRows,
        summary,
      });
      onFeedback('success', `Da mo ban PDF cho ${previewRows.length} dong timesheet.`);
    } catch (error) {
      onFeedback('danger', error instanceof Error ? error.message : 'Khong the xuat PDF.');
    }
  };

  return (
    <>
      <section className="dashboard-stat-grid dashboard-cards">
        <article className="dashboard-stat-card">
          <span>Tong dong</span>
          <strong>{summary.totalRecords}</strong>
          <p>Ban ghi timesheet phu hop bo loc.</p>
        </article>
        <article className="dashboard-stat-card">
          <span>Nhan vien</span>
          <strong>{summary.totalEmployees}</strong>
          <p>So nhan vien co du lieu trong bao cao.</p>
        </article>
        <article className="dashboard-stat-card">
          <span>Tong gio</span>
          <strong>{Number(summary.totalHours || 0).toFixed(1)}h</strong>
          <p>Tong hop tu bang timesheet.</p>
        </article>
        <article className="dashboard-stat-card">
          <span>Canh bao</span>
          <strong>{summary.warningRecords}</strong>
          <p>Missing Out hoac ban ghi can kiem tra.</p>
        </article>
      </section>

      <section className="dashboard-panel">
        <div className="hr-report-filter">
          <label>
            <span>Tu ngay</span>
            <input type="date" name="fromDate" value={filters.fromDate} onChange={handleChange} />
          </label>
          <label>
            <span>Den ngay</span>
            <input type="date" name="toDate" value={filters.toDate} onChange={handleChange} />
          </label>
          <label>
            <span>Phong ban</span>
            <select name="departmentId" value={filters.departmentId} onChange={handleChange}>
              <option value="all">Tat ca phong ban</option>
              {departments.map((department) => (
                <option key={department.id || department.departmentID} value={department.id || department.departmentID}>
                  {department.name || department.departmentName}
                </option>
              ))}
            </select>
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
          <button type="button" className="dashboard-button dashboard-button--ghost" onClick={() => setReloadKey((value) => value + 1)} disabled={isLoading}>
            <FiRefreshCw />
            Tai lai
          </button>
          <button type="button" className="dashboard-button dashboard-button--primary" onClick={handleExportPdf} disabled={isLoading || previewRows.length === 0}>
            <FiDownload />
            Xuat PDF
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
                <th>Canh bao</th>
              </tr>
            </thead>
            <tbody>
              {previewRows.length > 0 ? (
                previewRows.map((timesheet) => {
                  const employee = getEmployeeById(employees, timesheet.employeeId);
                  const warnings = Array.isArray(timesheet.warnings) ? timesheet.warnings.join(', ') : '';

                  return (
                    <tr key={timesheet.id}>
                      <td data-label="Ma bang cong" className="cell-nowrap"><strong>{timesheet.code}</strong></td>
                      <td data-label="Nhan vien">{timesheet.employeeName || employee?.fullName || '--'}</td>
                      <td data-label="Phong ban">{(timesheet as any).departmentName || getDepartmentName(departments, timesheet.departmentId || employee?.departmentId)}</td>
                      <td data-label="Ngay" className="cell-nowrap">{formatDate(timesheet.workDate)}</td>
                      <td data-label="Check-in" className="cell-nowrap">{timesheet.checkIn || '--'}</td>
                      <td data-label="Check-out" className="cell-nowrap">{timesheet.checkOut || '--'}</td>
                      <td data-label="Tong gio" className="cell-nowrap">{Number(timesheet.totalHours || 0).toFixed(1)}h</td>
                      <td data-label="Trang thai">
                        <span className={`dashboard-status-badge ${getStatusClass(timesheet.status)}`}>{timesheet.status}</span>
                      </td>
                      <td data-label="Canh bao">{warnings || '--'}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="hr-table-empty">
                    {isLoading ? 'Dang tai bao cao timesheet...' : 'Khong co du lieu preview.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function getCurrentMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  return {
    fromDate: toDateInput(new Date(year, month, 1)),
    toDate: toDateInput(new Date(year, month + 1, 0)),
  };
}

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default HRTimesheetExport;
