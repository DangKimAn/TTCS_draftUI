import {
  FiBarChart2,
  FiClipboard,
  FiFileText,
  FiHome,
  FiLogOut,
  FiUsers,
  FiUser,
} from 'react-icons/fi';

export const MANAGER_DASHBOARD_PATH = '/dashboard/manager';
export const DEFAULT_MANAGER_SECTION = 'overview';
const MANAGER_SECTION_ALIASES = {
  reports: 'timesheet-reports',
};

export const managerMenu = [
  {
    key: 'overview',
    label: 'Tổng quan',
    description: 'Dashboard quản lý',
    icon: FiHome,
  },
  {
    key: 'timesheet-approvals',
    label: 'Bảng công cần duyệt',
    description: 'Duyệt và khóa timesheet',
    icon: FiClipboard,
  },
  {
    key: 'leave-approvals',
    label: 'Đơn nghỉ phép',
    description: 'Phê duyệt hoặc từ chối',
    icon: FiFileText,
  },
  {
    key: 'team',
    label: 'Nhân sự phụ trách',
    description: 'Theo dõi cấp dưới trực tiếp',
    icon: FiUsers,
  },
  {
    key: 'timesheet-reports',
    label: 'Báo cáo timesheet',
    description: 'Phân tích và xuất báo cáo',
    icon: FiBarChart2,
  },
  {
    key: 'profile',
    label: 'Hồ sơ cá nhân',
    description: 'Thông tin tài khoản',
    icon: FiUser,
  },
];

export function normalizeManagerSection(section) {
  return MANAGER_SECTION_ALIASES[section] || section || DEFAULT_MANAGER_SECTION;
}

export function isValidManagerSection(section) {
  const normalizedSection = normalizeManagerSection(section);
  return managerMenu.some((item) => item.key === normalizedSection);
}

export function getManagerSectionHref(sectionKey) {
  const normalizedSection = normalizeManagerSection(sectionKey);

  return normalizedSection === DEFAULT_MANAGER_SECTION
    ? MANAGER_DASHBOARD_PATH
    : `${MANAGER_DASHBOARD_PATH}?section=${normalizedSection}`;
}

export const managerLogoutItem = {
  key: 'logout',
  label: 'Đăng xuất',
  description: 'Kết thúc phiên hiện tại',
  icon: FiLogOut,
};
