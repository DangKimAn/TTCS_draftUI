export function getTodayDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getRelativeDateKey(offsetDays) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return getTodayDateKey(date);
}

export function formatTimeFromIso(value) {
  if (!value) {
    return '--';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '--';
  }

  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatTimeWithSeconds(value) {
  if (!value) {
    return '--';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '--';
  }

  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatDateLabel(value) {
  if (!value) {
    return '--';
  }

  const isDateOnly = typeof value === 'string' && !value.includes('T');
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    ...(isDateOnly && { timeZone: 'UTC' }),
  }).format(date);
}

export function calculateWorkingHours(checkInIso, checkOutIso) {
  if (!checkInIso || !checkOutIso) {
    return null;
  }

  const start = new Date(checkInIso).getTime();
  const end = new Date(checkOutIso).getTime();

  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return 0;
  }

  return Math.round(((end - start) / 3600000) * 10) / 10;
}

export function formatHours(hours) {
  if (hours === null || hours === undefined || Number.isNaN(hours)) {
    return '--';
  }

  return `${hours.toFixed(1)}h`;
}

export function formatDurationFromMinutes(totalMinutes) {
  if (!Number.isFinite(totalMinutes) || totalMinutes < 0) {
    return '--';
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
}

export function getElapsedMinutes(startIso, endIso = new Date().toISOString()) {
  if (!startIso) {
    return 0;
  }

  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();

  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return 0;
  }

  return Math.floor((end - start) / 60000);
}

export function getWorkdayProgressPercent(startHour = 8, startMinute = 0, endHour = 17, endMinute = 30, now = new Date()) {
  const start = new Date(now);
  start.setHours(startHour, startMinute, 0, 0);

  const end = new Date(now);
  end.setHours(endHour, endMinute, 0, 0);

  const total = end.getTime() - start.getTime();

  if (total <= 0) {
    return 0;
  }

  const current = now.getTime() - start.getTime();
  const ratio = Math.min(Math.max(current / total, 0), 1);
  return Math.round(ratio * 100);
}
