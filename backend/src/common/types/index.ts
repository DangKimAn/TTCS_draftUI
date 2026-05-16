import {
  NotificationRelatedType,
  TimesheetStatus,
  MonthlyTimesheetStatus,
  LeaveStatus,
  WarningLevel,
} from '@prisma/client';

export interface RequestUser {
  userID: string;
  username: string;
  email: string;
  roleId: string;
  role: string;
  roleName: string;
  departmentID?: string;
}

export {
  NotificationRelatedType,
  TimesheetStatus,
  MonthlyTimesheetStatus,
  LeaveStatus,
  WarningLevel,
};
