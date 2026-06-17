export function formatDate(dateValue) {
  if (!dateValue) {
    return '--';
  }

  const isDateOnly = typeof dateValue === 'string' && !dateValue.includes('T');
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return '--';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(isDateOnly && { timeZone: 'UTC' }),
  }).format(date);
}

export function formatDateShort(dateValue) {
  if (!dateValue) {
    return '--';
  }

  const isDateOnly = typeof dateValue === 'string' && !dateValue.includes('T');
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return '--';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    ...(isDateOnly && { timeZone: 'UTC' }),
  }).format(date);
}

export function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDefaultAnchorDate() {
  const now = new Date();
  const d = now.getDate();
  // Nếu ngày hiện tại từ 17 đến 23, mặc định hiển thị bảng công kỳ trước (để nộp)
  if (d >= 17 && d <= 23) {
    const prevPeriodDate = new Date(now.getFullYear(), now.getMonth(), 16);
    return getDateKey(prevPeriodDate);
  }
  return getDateKey(now);
}

function normalizeDate(inputDate) {
  const date = new Date(inputDate);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function getCurrentWeekRange(anchorDate = new Date()) {
  const date = normalizeDate(anchorDate);
  const currentDay = date.getDay();
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const startDate = new Date(date);
  startDate.setDate(date.getDate() + diffToMonday);

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);

  return {
    startDate,
    endDate,
    startKey: getDateKey(startDate),
    endKey: getDateKey(endDate),
    label: `${formatDate(getDateKey(startDate))} - ${formatDate(getDateKey(endDate))}`,
  };
}

export function getCurrentMonthRange(anchorDate = new Date()) {
  const date = normalizeDate(anchorDate);
  const d = date.getDate();
  const y = date.getFullYear();
  const m = date.getMonth();

  let startDate, endDate, periodMonth, periodYear;
  if (d >= 17) {
    startDate = new Date(y, m, 17);
    endDate = new Date(y, m + 1, 16);
    periodMonth = m + 2;
    periodYear = y;
    if (periodMonth > 12) {
      periodMonth = 1;
      periodYear += 1;
    }
  } else {
    startDate = new Date(y, m - 1, 17);
    endDate = new Date(y, m, 16);
    periodMonth = m + 1;
    periodYear = y;
  }

  return {
    startDate,
    endDate,
    periodMonth,
    periodYear,
    startKey: getDateKey(startDate),
    endKey: getDateKey(endDate),
    label: `Tháng ${periodMonth}/${periodYear}`,
  };
}

function parseTimeValue(timeValue) {
  if (!timeValue || timeValue === '--') {
    return null;
  }

  const [hour, minute] = timeValue.split(':').map(Number);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }

  return hour * 60 + minute;
}

export function isLate(checkInTime) {
  const minutes = parseTimeValue(checkInTime);
  return minutes !== null && minutes > 8 * 60;
}

export function isEarlyOut(checkOutTime) {
  const minutes = parseTimeValue(checkOutTime);
  return minutes !== null && minutes < 17 * 60 + 30;
}

export function isDateWithinRange(dateKey, startKey, endKey) {
  return dateKey >= startKey && dateKey <= endKey;
}

export function getLastMonthRange(anchorDate = new Date()) {
  const currentRange = getCurrentMonthRange(anchorDate);
  const lastMonthAnchor = new Date(currentRange.startDate);
  lastMonthAnchor.setDate(lastMonthAnchor.getDate() - 1);
  return getCurrentMonthRange(lastMonthAnchor);
}

export function getPeriodConfig(periodType, anchorDate = new Date()) {
  if (periodType === 'last_month') return getLastMonthRange(anchorDate);
  return periodType === 'month'
    ? getCurrentMonthRange(anchorDate)
    : getCurrentWeekRange(anchorDate);
}
