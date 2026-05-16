import type { ApiEmployee, ApiResponse, ApiTimesheet } from '../types';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

type CreateApiTimesheetPayload = Pick<ApiTimesheet, 'employeeId' | 'date' | 'checkIn'> &
  Partial<Pick<ApiTimesheet, 'checkOut' | 'note'>>;

async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const data = await response.json().catch(() => ({})) as ApiResponse<T>;

  if (!response.ok) {
    throw new Error(data.message || 'API request failed.');
  }

  return data;
}

export async function fetchEmployees(): Promise<ApiResponse<ApiEmployee[]>> {
  const response = await fetch('/api/employees');
  return handleResponse(response);
}

export async function fetchTimesheets(): Promise<ApiResponse<ApiTimesheet[]>> {
  const response = await fetch('/api/timesheets');
  return handleResponse(response);
}

export async function createTimesheet(
  payload: CreateApiTimesheetPayload,
): Promise<ApiResponse<ApiTimesheet>> {
  const response = await fetch('/api/timesheets', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
}
