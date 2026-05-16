import { AnotherError } from './response.dto';

const NOTFOUND_CODE: number = 404;
const OK_CODE: number = 200;
const CONFLIG_CODE: number = 409;
const CREATED_RESPONE: number = 201;
const BADREQUEST_CODE: number = 400;
const UNAUTHORIZED_CODE: number = 403;
const Interval_Server_Network_Exeception_Code: number = 500;
const ANOTHER_ERROR_RESPONE: AnotherError = {
  statusCode: BADREQUEST_CODE,
  message: 'another ',
};

// const timesheet status

export const DRAFT: string = 'DRAFT';

export const SUBMITTED: string = 'SUBMITTED';

export const APPROVED: string = 'APPROVED';

// Backward-compatible alias for old imports. Do not persist "accepted" for monthly timesheets.
export const ACCEPTED: string = APPROVED;

export const REJECTED: string = 'REJECTED';

export const PENDING: string = 'PENDING';

// const nameRole

export const nameRole_admin: string = 'admin';
export const nameRole_manager: string = 'manager';
export const nameRole_emloyee: string = 'employee';
export const nameRole_noneRole: string = 'none Role';

export const nameTypeLeave_AnnualLeave: string = 'Annual Leave';
export const nameTypeLeave_LeaveWithPermission: string =
  'Leave with permission';

export const nameTypeLeave_LeaveWithoutPermission: string =
  'Leave with permission';

export {
  NOTFOUND_CODE,
  OK_CODE,
  CONFLIG_CODE,
  CREATED_RESPONE,
  BADREQUEST_CODE,
  ANOTHER_ERROR_RESPONE,
  UNAUTHORIZED_CODE,
  Interval_Server_Network_Exeception_Code,
};
