import { mockEmployeeProfiles } from '../data/mockProfile';

const PROFILE_STORAGE_KEY = 'timesheet_pro_employee_profiles';

function parseStoredProfiles() {
  const rawValue = localStorage.getItem(PROFILE_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function ensureProfiles() {
  const parsed = parseStoredProfiles();

  if (parsed) {
    return parsed;
  }

  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(mockEmployeeProfiles));
  return [...mockEmployeeProfiles];
}

function writeProfiles(nextProfiles) {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(nextProfiles));
}

export function getEmployeeProfile(email) {
  return ensureProfiles().find((item) => item.email === email) || null;
}

export function updateEmployeeProfile(email, updates) {
  const profiles = ensureProfiles();
  const nextProfiles = profiles.map((item) =>
    item.email === email
      ? {
          ...item,
          ...updates,
        }
      : item,
  );

  writeProfiles(nextProfiles);
  return nextProfiles.find((item) => item.email === email) || null;
}
