import { mockUsers } from '../data/mockUsers';

const NETWORK_ERROR_EMAIL = 'ssoerror@timesheet.com';

function buildToken(email, role) {
  return `mock-token-${role}-${btoa(email)}-${Date.now()}`;
}

export async function login({ email, password, provider = 'password' }) {
  await new Promise((resolve) => {
    window.setTimeout(resolve, 1000);
  });

  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedEmail === NETWORK_ERROR_EMAIL) {
    const error = new Error('SSO connection failed');
    error.code = 'SSO_UNAVAILABLE';
    throw error;
  }

  const matchedUser = mockUsers.find((user) => user.email === normalizedEmail);

  if (!matchedUser || matchedUser.password !== password) {
    const error = new Error('Invalid credentials');
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  if (!matchedUser.isActive) {
    const error = new Error('Inactive user');
    error.code = 'USER_INACTIVE';
    throw error;
  }

  return {
    token: buildToken(matchedUser.email, matchedUser.role),
    provider,
    user: {
      id: matchedUser.id,
      email: matchedUser.email,
      name: matchedUser.name,
      role: matchedUser.role,
      departmentId: matchedUser.departmentId,
      managedEmployeeIds: matchedUser.managedEmployeeIds || [],
      permissions: matchedUser.permissions || [],
      isActive: matchedUser.isActive,
    },
  };
}
