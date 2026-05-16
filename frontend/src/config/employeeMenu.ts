import {
  FiClock,
  FiFileText,
  FiHome,
  FiLogOut,
  FiPieChart,
  FiPlusSquare,
  FiUser,
} from 'react-icons/fi';

export const EMPLOYEE_DASHBOARD_PATH = '/dashboard/employee';
export const DEFAULT_EMPLOYEE_SECTION = 'overview';

export const employeeMenu = [
  {
    key: 'overview',
    label: 'Tổng quan',
    description: 'Trang chủ công việc',
    icon: FiHome,
  },
  {
    key: 'attendance',
    label: 'Chấm công',
    description: 'Check-in và Check-out',
    icon: FiClock,
  },
  {
    key: 'timesheet',
    label: 'Bảng công của tôi',
    description: 'Xem log và gửi xác nhận',
    icon: FiFileText,
  },
  {
    key: 'leave-request',
    label: 'Xin nghỉ phép',
    description: 'Tạo đơn nghỉ phép mới',
    icon: FiPlusSquare,
  },
  {
    key: 'leave-balance',
    label: 'Số dư & lịch sử phép',
    description: 'Theo dõi phép năm của tôi',
    icon: FiPieChart,
  },
  {
    key: 'profile',
    label: 'Hồ sơ cá nhân',
    description: 'Thông tin tài khoản',
    icon: FiUser,
  },
];

export function isValidEmployeeSection(section) {
  return employeeMenu.some((item) => item.key === section);
}

export function getEmployeeSectionHref(sectionKey) {
  return sectionKey === DEFAULT_EMPLOYEE_SECTION
    ? EMPLOYEE_DASHBOARD_PATH
    : `${EMPLOYEE_DASHBOARD_PATH}?section=${sectionKey}`;
}

export const employeeLogoutItem = {
  key: 'logout',
  label: 'Đăng xuất',
  description: 'Kết thúc phiên hiện tại',
  icon: FiLogOut,
};
