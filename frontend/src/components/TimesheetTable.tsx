import React from 'react';
import { FixedSizeList as List } from 'react-window';
import WarningBadge from './WarningBadge';
import { formatDateShort } from '../utils/dateUtils';
import { formatHours } from '../utils/timeUtils';

function getStatusBadgeClass(status: string) {
  switch (status) {
    case 'Submitted':
      return 'dashboard-status-badge--info';
    case 'Missing Out':
      return 'dashboard-status-badge--warning';
    case 'Open':
      return 'dashboard-status-badge--neutral';
    case 'Approved':
      return 'dashboard-status-badge--success';
    case 'Rejected':
      return 'dashboard-status-badge--danger';
    default:
      return 'dashboard-status-badge--success';
  }
}

function getCorrectionLabel(correction: any) {
  if (!correction) {
    return 'Không có';
  }

  switch (correction.status) {
    case 'Pending':
      return 'Chờ duyệt';
    case 'Approved':
      return 'Đã duyệt';
    case 'Rejected':
      return 'Bị từ chối';
    default:
      return correction.status;
  }
}

function getStatusLabel(row: any) {
  if (row.status === 'Missing Out') {
    return 'Quên Check-out';
  }

  switch (row.timesheetStatus || row.status) {
    case 'Submitted':
      return 'Đã gửi';
    case 'Approved':
      return 'Đã duyệt';
    case 'Rejected':
      return 'Từ chối';
    case 'Open':
      return 'Đang mở';
    default:
      return 'Nháp';
  }
}

const TimesheetRowItem = React.memo(({ index, data, style }: any) => {
  const row = data.rows[index];
  const onRequestCorrection = data.onRequestCorrection;

  return (
    <div style={style} className="dashboard-table__row timesheet-table__row border-b border-slate-100 last:border-0">
      <strong>{formatDateShort(row.date)}</strong>
      <span>{row.checkInTime || '--'}</span>
      <span>{row.checkOutTime || '--'}</span>
      <span>{formatHours(row.totalHours)}</span>
      <div className={`dashboard-status-badge ${getStatusBadgeClass(row.timesheetStatus || row.status)}`}>
        {getStatusLabel(row)}
      </div>
      <div className="timesheet-table__warnings">
        {row.warnings.length > 0 ? row.warnings.map((warning: string) => (
          <WarningBadge key={`${row.id}-${warning}`} label={warning} />
        )) : '--'}
      </div>
      <span>{getCorrectionLabel(row.correction)}</span>
      <button
        type="button"
        className="timesheet-table__action"
        onClick={() => onRequestCorrection(row)}
        disabled={
          row.correction?.status === 'Pending' ||
          row.timesheetStatus === 'Submitted' ||
          row.timesheetStatus === 'Approved'
        }
      >
        Tạo yêu cầu
      </button>
    </div>
  );
});

function TimesheetTable({ rows, onRequestCorrection }: { rows: any[]; onRequestCorrection: (row: any) => void }) {
  const rowHeight = 84; 
  const maxVisibleRows = 10;
  const listHeight = Math.min(rows.length * rowHeight, maxVisibleRows * rowHeight);

  return (
    <section className="dashboard-panel timesheet-table-panel">
      <div className="dashboard-panel__heading">
        <div>
          <span className="dashboard-panel__eyebrow">Bảng công</span>
          <h2>Bảng công của tôi</h2>
          <p>Kiểm tra log chấm công, cảnh báo và yêu cầu chỉnh sửa theo từng ngày.</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="timesheet-empty-state">Chưa có dữ liệu chấm công trong kỳ này.</div>
      ) : (
        <div className="dashboard-table-wrap">
          <div className="dashboard-table timesheet-table">
            <div className="dashboard-table__head timesheet-table__head">
              <span>Ngày</span>
              <span>Vào</span>
              <span>Ra</span>
              <span>Tổng giờ</span>
              <span>Trạng thái</span>
              <span>Cảnh báo</span>
              <span>Chỉnh sửa</span>
              <span>Hành động</span>
            </div>

            <List
              height={listHeight}
              itemCount={rows.length}
              itemSize={rowHeight}
              width="100%"
              itemData={{ rows, onRequestCorrection }}
              className="virtual-list"
            >
              {TimesheetRowItem}
            </List>
          </div>
        </div>
      )}
    </section>
  );
}

export default TimesheetTable;
