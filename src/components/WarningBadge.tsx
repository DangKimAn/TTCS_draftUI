function getBadgeClass(label) {
  switch (label) {
    case 'Late':
      return 'warning-badge warning-badge--warning';
    case 'Early Out':
      return 'warning-badge warning-badge--warning';
    case 'Missing Out':
      return 'warning-badge warning-badge--danger';
    case 'IP Warning':
      return 'warning-badge warning-badge--danger';
    case 'Correction Pending':
      return 'warning-badge warning-badge--info';
    default:
      return 'warning-badge';
  }
}

function getBadgeLabel(label) {
  switch (label) {
    case 'Late':
      return 'Đi muộn';
    case 'Early Out':
      return 'Về sớm';
    case 'Missing Out':
      return 'Quên Check-out';
    case 'IP Warning':
      return 'Cảnh báo IP';
    case 'Correction Pending':
      return 'Chờ duyệt';
    default:
      return label;
  }
}

function WarningBadge({ label }) {
  return <span className={getBadgeClass(label)}>{getBadgeLabel(label)}</span>;
}

export default WarningBadge;
