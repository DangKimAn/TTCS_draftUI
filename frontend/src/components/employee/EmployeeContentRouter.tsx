import OverviewSection from './OverviewSection';
import AttendanceSection from './AttendanceSection';
import TimesheetSection from './TimesheetSection';
import LeaveRequestSection from './LeaveRequestSection';
import LeaveBalanceSection from './LeaveBalanceSection';
import ProfileSection from './ProfileSection';

const SECTION_COMPONENTS = {
  overview: OverviewSection,
  attendance: AttendanceSection,
  timesheet: TimesheetSection,
  'leave-request': LeaveRequestSection,
  'leave-balance': LeaveBalanceSection,
  profile: ProfileSection,
};

function EmployeeContentRouter({ section, sectionProps }) {
  const SectionComponent = SECTION_COMPONENTS[section] || SECTION_COMPONENTS.overview;
  return <SectionComponent {...sectionProps[section]} />;
}

export default EmployeeContentRouter;
