import { mockEmployees, mockTimesheets } from '../src/mock/timesheetApiData';

interface TimesheetApiPayload {
  employeeId?: string;
  date?: string;
  checkIn?: string;
  checkOut?: string;
  note?: string;
}

function createState() {
  return {
    employees: mockEmployees.map((employee) => ({ ...employee })),
    timesheets: mockTimesheets.map((timesheet) => ({ ...timesheet })),
  };
}

function createJsonResponse(body, status = 200) {
  return JSON.stringify(body, null, 2);
}

function sendJson(response, body, status = 200) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json');
  response.end(createJsonResponse(body, status));
}

function parseRequestBody(request): Promise<TimesheetApiPayload> {
  return new Promise((resolve, reject) => {
    let body = '';

    request.on('data', (chunk) => {
      body += chunk;
    });

    request.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('INVALID_JSON'));
      }
    });

    request.on('error', reject);
  });
}

function buildTimesheetId(timesheets) {
  return `TS-${String(timesheets.length + 1001).padStart(4, '0')}`;
}

function getStatusByTime(checkIn, checkOut) {
  if (!checkOut) {
    return 'Missing Check-out';
  }

  if (checkIn > '08:15') {
    return 'Late';
  }

  if (checkOut < '17:00') {
    return 'Early Leave';
  }

  return 'On Time';
}

function validatePayload(payload: TimesheetApiPayload) {
  if (!payload.employeeId || !payload.date || !payload.checkIn) {
    return 'employeeId, date va checkIn la cac truong bat buoc.';
  }

  return null;
}

function createTimesheetApiMiddleware(state) {
  return async (request, response, next) => {
    const url = request.url || '';

    if (!url.startsWith('/api/')) {
      next();
      return;
    }

    const [pathname] = url.split('?');

    if (request.method === 'GET' && pathname === '/api/employees') {
      sendJson(response, {
        success: true,
        data: state.employees,
      });
      return;
    }

    if (request.method === 'GET' && pathname === '/api/timesheets') {
      sendJson(response, {
        success: true,
        data: state.timesheets,
      });
      return;
    }

    if (request.method === 'GET' && pathname.startsWith('/api/timesheets/')) {
      const timesheetId = pathname.replace('/api/timesheets/', '');
      const timesheet = state.timesheets.find((item) => item.id === timesheetId);

      if (!timesheet) {
        sendJson(response, { success: false, message: 'Khong tim thay ban ghi timesheet.' }, 404);
        return;
      }

      sendJson(response, {
        success: true,
        data: timesheet,
      });
      return;
    }

    if (request.method === 'POST' && pathname === '/api/timesheets') {
      try {
        const payload = await parseRequestBody(request);
        const errorMessage = validatePayload(payload);

        if (errorMessage) {
          sendJson(response, { success: false, message: errorMessage }, 400);
          return;
        }

        const employee = state.employees.find((item) => item.id === payload.employeeId);

        if (!employee) {
          sendJson(response, { success: false, message: 'Nhan vien khong ton tai.' }, 404);
          return;
        }

        const newTimesheet = {
          id: buildTimesheetId(state.timesheets),
          employeeId: employee.id,
          employeeName: employee.name,
          date: payload.date,
          checkIn: payload.checkIn,
          checkOut: payload.checkOut || '',
          status: getStatusByTime(payload.checkIn, payload.checkOut || ''),
          note: payload.note?.trim() || 'No note',
        };

        state.timesheets = [newTimesheet, ...state.timesheets];

        sendJson(response, {
          success: true,
          message: 'Them timesheet thanh cong.',
          data: newTimesheet,
        }, 201);
      } catch (error) {
        sendJson(
          response,
          {
            success: false,
            message:
              error.message === 'INVALID_JSON'
                ? 'Du lieu gui len khong dung dinh dang JSON.'
                : 'Khong the xu ly yeu cau.',
          },
          400,
        );
      }
      return;
    }

    sendJson(response, { success: false, message: 'API endpoint khong ton tai.' }, 404);
  };
}

export function timesheetApiPlugin() {
  return {
    name: 'timesheet-api-plugin',
    configureServer(server) {
      const state = createState();
      server.middlewares.use(createTimesheetApiMiddleware(state));
    },
    configurePreviewServer(server) {
      const state = createState();
      server.middlewares.use(createTimesheetApiMiddleware(state));
    },
  };
}
