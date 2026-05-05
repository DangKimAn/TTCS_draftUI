export function formatDate(dateValue) {
  if (!dateValue) {
    return '--';
  }

  const date = typeof dateValue === 'string' && dateValue.includes('T')
    ? new Date(dateValue)
    : new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return '--';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatDateShort(dateValue) {
  if (!dateValue) {
    return '--';
  }

  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return '--';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

export function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
  const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  return {
    startDate,
    endDate,
    startKey: getDateKey(startDate),
    endKey: getDateKey(endDate),
    label: `Thang ${String(startDate.getMonth() + 1).padStart(2, '0')}/${startDate.getFullYear()}`,
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

export function getPeriodConfig(periodType, anchorDate = new Date()) {
  return periodType === 'month'
    ? getCurrentMonthRange(anchorDate)
    : getCurrentWeekRange(anchorDate);
}
