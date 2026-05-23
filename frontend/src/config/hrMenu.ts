import { FiFileText, FiHome, FiLogOut, FiShield, FiUsers, FiUser, FiActivity } from 'react-icons/fi';

export const HR_DASHBOARD_PATH = '/dashboard/hr';
export const DEFAULT_HR_SECTION = 'overview';
const HR_SECTION_ALIASES = {
  people: 'employees',
};

export const hrMenu = [
  {
    key: 'overview',
    label: 'Tổng quan HR',
    description: 'Bảng điều khiển nhân sự',
    icon: FiHome,
  },
  {
    key: 'employees',
    label: 'Nhân sự',
    description: 'Theo dõi hồ sơ nhân viên',
    icon: FiUsers,
  },
  {
    key: 'reports',
    label: 'Báo cáo',
    description: 'Tài liệu và thống kê',
    icon: FiFileText,
  },
  {
    key: 'policies',
    label: 'Chính sách',
    description: 'Thiết lập và phân quyền',
    icon: FiShield,
  },
  {
    key: 'system-logs',
    label: 'Nhật ký hệ thống',
    description: 'Giám sát hoạt động',
    icon: FiActivity,
  },
  {
    key: 'profile',
    label: 'Hồ sơ cá nhân',
    description: 'Thông tin tài khoản',
    icon: FiUser,
  },
];

export function normalizeHrSection(section) {
  return HR_SECTION_ALIASES[section] || section || DEFAULT_HR_SECTION;
}

export function isValidHrSection(section) {
  const normalizedSection = normalizeHrSection(section);
  return hrMenu.some((item) => item.key === normalizedSection);
}

export function getHrSectionHref(sectionKey) {
  const normalizedSection = normalizeHrSection(sectionKey);

  return normalizedSection === DEFAULT_HR_SECTION
    ? HR_DASHBOARD_PATH
    : `${HR_DASHBOARD_PATH}?section=${normalizedSection}`;
}

export const hrLogoutItem = {
  key: 'logout',
  label: 'Đăng xuất',
  description: 'Kết thúc phiên hiện tại',
  icon: FiLogOut,
};
