import { useEffect, useMemo, useState } from 'react';
import { FiDownload } from 'react-icons/fi';
import { exportPayrollReportExcel, fetchPayrollPreview } from '../../services/hrService';
import { currentYear, formatHrStatus } from './hrShared';

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
      setPreviewError('Tháng hoặc năm không hợp lệ.');
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
          setPreviewError(error instanceof Error ? error.message : 'Không thể tải dữ liệu xem trước bảng lương từ API.');
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
      onFeedback('danger', 'Tháng hoặc năm không hợp lệ.');
      return;
    }

    setIsExporting(true);
    try {
      await exportPayrollReportExcel(month, year);
      onFeedback('success', `Đã gọi API xuất báo cáo lương tháng ${month}/${year} (Excel).`);
    } catch (error) {
      onFeedback('danger', error instanceof Error ? error.message : 'Không thể xuất báo cáo lương.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <section className="dashboard-panel">
        <div className="hr-report-filter">
          <label>
            <span>Tháng</span>
            <select name="month" value={filters.month} onChange={(event) => setFilters((current) => ({ ...current, month: event.target.value }))}>
              {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((month) => (
                <option key={month} value={month}>Tháng {month.padStart(2, '0')}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Năm</span>
            <input name="year" type="number" value={filters.year} onChange={(event) => setFilters((current) => ({ ...current, year: event.target.value }))} />
          </label>
          <label>
            <span>Phòng ban</span>
            <select name="departmentId" value={filters.departmentId} onChange={(event) => setFilters((current) => ({ ...current, departmentId: event.target.value }))}>
              <option value="all">Tất cả phòng ban</option>
              {departments.map((department) => (
                <option key={department.id || department.departmentID} value={department.id || department.departmentID}>
                  {department.name || department.departmentName}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="dashboard-button dashboard-button--primary" onClick={handleExport} disabled={isExporting}>
            <FiDownload />
            {isExporting ? 'Đang xuất...' : 'Xuất Excel'}
          </button>
        </div>
        {previewError ? <div className="hr-inline-alert">{previewError}</div> : null}
      </section>

      <section className="dashboard-panel hr-table-panel">
        <div className="table-scroll">
          <table className="hr-table hr-table--payroll hr-table-carded">
            <thead>
              <tr>
                <th>Mã nhân viên</th>
                <th>Họ tên</th>
                <th>Phòng ban</th>
                <th>Tổng giờ làm</th>
                <th>Tổng giờ OT</th>
                <th>Hệ số lương</th>
                <th>Tổng lương</th>
                <th>Trạng thái dữ liệu</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingPreview ? (
                <tr>
                  <td colSpan={8} className="hr-table-empty">Đang tải dữ liệu xem trước bảng lương từ API...</td>
                </tr>
              ) : previewRows.length > 0 ? (
                previewRows.map((row) => (
                  <tr key={row.id}>
                    <td data-label="Mã nhân viên" className="cell-nowrap"><strong>{row.employeeCode}</strong></td>
                    <td data-label="Họ tên">{row.fullName}</td>
                    <td data-label="Phòng ban">{row.departmentName}</td>
                    <td data-label="Tổng giờ làm" className="cell-nowrap">{row.totalHours}h</td>
                    <td data-label="Tổng giờ OT" className="cell-nowrap">{row.totalExtraHours}h</td>
                    <td data-label="Hệ số lương" className="cell-nowrap">{row.salaryCoefficient ?? '--'}</td>
                    <td data-label="Tổng lương" className="cell-nowrap">{row.totalSalaryByHours}</td>
                    <td data-label="Trạng thái dữ liệu">
                      <span className="dashboard-status-badge dashboard-status-badge--success">
                        {formatHrStatus(row.dataStatus)}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="hr-table-empty">
                    Chưa có bảng lương được tạo cho kỳ này. Hãy duyệt timesheet tháng và chạy tạo bảng lương trước khi xuất.
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
