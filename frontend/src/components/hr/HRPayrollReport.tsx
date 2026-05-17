import { useEffect, useMemo, useState } from 'react';
import { FiDownload } from 'react-icons/fi';
import { exportPayrollReportExcel, fetchPayrollPreview } from '../../services/hrService';
import { currentYear } from './hrShared';

interface HRPayrollReportProps {
  employees?: Array<Record<string, any>>;
  departments: Array<Record<string, any>>;
  leaveTypes?: Array<Record<string, any>>;
  leaveRequests?: Array<Record<string, any>>;
  timesheets?: Array<Record<string, any>>;
  onFeedback: (type: string, message: string) => void;
}

function HRPayrollReport({
  departments,
  onFeedback,
}: HRPayrollReportProps) {
  const [filters, setFilters] = useState({
    month: '5',
    year: String(currentYear),
    departmentId: 'all',
  });
  const [isExporting, setIsExporting] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [payrollRows, setPayrollRows] = useState<Array<Record<string, any>>>([]);

  useEffect(() => {
    const month = Number(filters.month);
    const year = Number(filters.year);

    if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year)) {
      setPayrollRows([]);
      setPreviewError('Thang hoac nam khong hop le.');
      return;
    }

    let isMounted = true;

    async function loadPreview() {
      setIsLoadingPreview(true);
      setPreviewError('');

      try {
        const rows = await fetchPayrollPreview(month, year);

        if (isMounted) {
          setPayrollRows(rows);
        }
      } catch (error) {
        if (isMounted) {
          setPayrollRows([]);
          setPreviewError(error instanceof Error ? error.message : 'Khong the tai payroll preview tu API.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingPreview(false);
        }
      }
    }

    void loadPreview();

    return () => {
      isMounted = false;
    };
  }, [filters.month, filters.year]);

  const previewRows = useMemo(
    () => payrollRows.filter((row) => filters.departmentId === 'all' || row.departmentId === filters.departmentId),
    [filters.departmentId, payrollRows],
  );

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
          <button type="button" className="dashboard-button dashboard-button--primary" onClick={handleExport} disabled={isExporting}>
            <FiDownload />
            {isExporting ? 'Dang xuat...' : 'Xuat Excel'}
          </button>
        </div>
        {previewError ? <div className="hr-inline-alert">{previewError}</div> : null}
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
                <th>Tong gio OT</th>
                <th>He so luong</th>
                <th>Tong luong</th>
                <th>Trang thai du lieu</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingPreview ? (
                <tr>
                  <td colSpan={8} className="hr-table-empty">Dang tai payroll preview tu API...</td>
                </tr>
              ) : previewRows.length > 0 ? (
                previewRows.map((row) => (
                  <tr key={row.id}>
                    <td data-label="Ma nhan vien" className="cell-nowrap"><strong>{row.employeeCode}</strong></td>
                    <td data-label="Ho ten">{row.fullName}</td>
                    <td data-label="Phong ban">{row.departmentName}</td>
                    <td data-label="Tong gio lam" className="cell-nowrap">{row.totalHours}h</td>
                    <td data-label="Tong gio OT" className="cell-nowrap">{row.totalExtraHours}h</td>
                    <td data-label="He so luong" className="cell-nowrap">{row.salaryCoefficient ?? '--'}</td>
                    <td data-label="Tong luong" className="cell-nowrap">{row.totalSalaryByHours}</td>
                    <td data-label="Trang thai du lieu">
                      <span className="dashboard-status-badge dashboard-status-badge--success">
                        {row.dataStatus}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="hr-table-empty">
                    Chua co payroll da generate cho ky nay. Duyet monthly timesheet va chay generate payroll truoc khi xuat.
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

export default HRPayrollReport;
