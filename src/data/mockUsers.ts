import type { User } from '../types';

interface MockUser extends User {
  password: string;
}

export const mockUsers: MockUser[] = [
  {
    id: 'emp-001',
    email: 'employee@timesheet.com',
    password: '123456',
    name: 'Nguyễn Trần Ngọc Duyên',
    role: 'employee',
    departmentId: 'dept-engineering',
    isActive: true,
  },
  {
    id: 'mgr-001',
    email: 'manager@timesheet.com',
    password: '123456',
    name: 'Đặng Kim An',
    role: 'manager',
    departmentId: 'dept-engineering',
    managedEmployeeIds: ['emp-001', 'emp-002', 'emp-003', 'emp-004'],
    isActive: true,
  },
  {
    id: 'hr-001',
    email: 'hr@timesheet.com',
    password: '123456',
    name: 'Lê Thu Hà',
    role: 'hr',
    departmentId: 'dept-hr',
    permissions: ['MANAGE_EMPLOYEES', 'EXPORT_PAYROLL', 'MANAGE_LEAVE_TYPES'],
    isActive: true,
  },
  {
    id: 'emp-999',
    email: 'inactive@timesheet.com',
    password: '123456',
    name: 'Phạm Quốc Bảo',
    role: 'employee',
    departmentId: 'dept-product',
    isActive: false,
  },
];
