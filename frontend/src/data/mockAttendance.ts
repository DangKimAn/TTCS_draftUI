import type { Attendance } from '../types';

function getDateKey(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function createIsoForDate(dateKey: string, timeValue: string): string {
  return `${dateKey}T${timeValue}:00`;
}

function createCompletedRecord(
  index: number,
  offsetDays: number,
  checkIn: string,
  checkOut: string,
  note = '',
): Attendance {
  const date = getDateKey(offsetDays);

  return {
    id: `seed-completed-${index}-${date}`,
    userEmail: 'employee@timesheet.com',
    date,
    checkInTime: checkIn,
    checkOutTime: checkOut,
    totalHours: 8.5,
    status: 'Completed',
    serverTimeAtCheckIn: createIsoForDate(date, checkIn),
    serverTimeAtCheckOut: createIsoForDate(date, checkOut),
    ipAddressAtCheckIn: '192.168.1.20',
    ipAddressAtCheckOut: '192.168.1.20',
    deviceInfoAtCheckIn: 'Chrome on Windows',
    deviceInfoAtCheckOut: 'Chrome on Windows',
    hasIpWarning: false,
    note,
  };
}

export function createMockAttendanceSeed(): Attendance[] {
  const missingOutDate = getDateKey(-1);

  return [
    createCompletedRecord(1, -5, '08:00', '17:30'),
    createCompletedRecord(2, -4, '08:06', '17:28'),
    createCompletedRecord(3, -3, '08:02', '17:34'),
    {
      id: `seed-open-${missingOutDate}`,
      userEmail: 'employee@timesheet.com',
      date: missingOutDate,
      checkInTime: '08:04',
      checkOutTime: null,
      totalHours: null,
      status: 'Working',
      serverTimeAtCheckIn: createIsoForDate(missingOutDate, '08:04'),
      serverTimeAtCheckOut: null,
      ipAddressAtCheckIn: '192.168.1.20',
      ipAddressAtCheckOut: null,
      deviceInfoAtCheckIn: 'Chrome on Windows',
      deviceInfoAtCheckOut: null,
      hasIpWarning: false,
      note: '',
    },
  ];
}
