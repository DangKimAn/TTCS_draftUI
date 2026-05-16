import { useEffect, useMemo, useState } from 'react';
import {
  FiAlertTriangle,
  FiBarChart2,
  FiCheck,
  FiFileText,
  FiPower,
  FiShield,
  FiUsers,
} from 'react-icons/fi';
import { useNavigate, useSearchParams } from 'react-router-dom';
import HRLeaveTypeManagement from '../components/hr/HRLeaveTypeManagement';
import HRPayrollReport from '../components/hr/HRPayrollReport';
import HRTimesheetExport from '../components/hr/HRTimesheetExport';
import HRUserManagement from '../components/hr/HRUserManagement';
import {
  getToneClass,
  HRFeedback,
  InfoItem,
} from '../components/hr/hrShared';
import {
  DEFAULT_HR_SECTION,
  getHrSectionHref,
  isValidHrSection,
  normalizeHrSection,
} from '../config/hrMenu';
import { API_CONFIG } from '../config/api';
import {
  currentHrUser as mockCurrentHrUser,
  departments as mockDepartments,
  employees as mockEmployees,
  leaveTypes as mockLeaveTypes,
  payrollReports as mockPayrollReports,
  timesheets as mockTimesheets,
} from '../data/mockData';
import { fetchHrLeaveTypes, fetchHrUsers, fetchDepartments, fetchHrLeaveRequests } from '../services/hrService';
import { getAuthSession, getDashboardPathByRole } from '../utils/storage';
import './EmployeeDashboard.css';
import '../styles/timesheet.css';
import '../styles/hr.css';

// --- HR Domain Types ---
export interface HrDepartment {
  id: string;
  name: string;
  departmentID?: string;
  departmentName?: string;
  [key: string]: unknown;
}

export interface HrEmployee {
  id: string;
  fullName: string;
  email: string;
  status: string;
  isActive: boolean;
  profileStatus?: string;
  employeeCode?: string;
  [key: string]: unknown;
}

export interface HrLeaveType {
  id: string;
  name: string;
  status: string;
  [key: string]: unknown;
}

function HRDashboard() {
  const navigate = useNavigate();
  const session = getAuthSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const [section, setSection] = useState(DEFAULT_HR_SECTION);
  const [employees, setEmployees] = useState<HrEmployee[]>([]);
  const [departments, setDepartments] = useState<HrDepartment[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<HrLeaveType[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<{ type: string; message: string } | null>(null);

  useEffect(() => {
    if (!session?.token) {
      navigate('/login', { replace: true });
      return;
    }

    if (session.role !== 'hr' && session.role !== 'admin') {
      navigate(getDashboardPathByRole(session.role), { replace: true });
    }
  }, [navigate, session?.role, session?.token]);

  useEffect(() => {
    const nextSection = searchParams.get('section') || DEFAULT_HR_SECTION;

    if (!isValidHrSection(nextSection)) {
      setSearchParams({}, { replace: true });
      setSection(DEFAULT_HR_SECTION);
      return;
    }

    setSection(normalizeHrSection(nextSection));
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!session?.token) {
      return;
    }

    let isMounted = true;

    async function loadHrData() {
      const [departmentsResult, leaveTypesResult, leaveRequestsResult] = await Promise.allSettled([
        fetchDepartments(),
        fetchHrLeaveTypes(),
        fetchHrLeaveRequests(),
      ]);

      const loadedDepartments: HrDepartment[] =
        departmentsResult.status === 'fulfilled' && departmentsResult.value.length > 0
          ? (departmentsResult.value as HrDepartment[])
          : API_CONFIG.ENABLE_MOCK_FALLBACK
            ? (mockDepartments as HrDepartment[])
            : [];

      if (departmentsResult.status === 'fulfilled' && departmentsResult.value.length > 0) {
        setDepartments(departmentsResult.value as HrDepartment[]);
      } else if (departmentsResult.status === 'rejected' || departmentsResult.value.length === 0) {
        if (API_CONFIG.ENABLE_MOCK_FALLBACK) {
          console.warn('[HRDashboard] Departments API failed, using mock data.');
          setDepartments(mockDepartments as HrDepartment[]);
        } else {
          setDepartments([]);
        }
      }

      const usersResult = await fetchHrUsers(loadedDepartments).catch(() => null);

      if (!isMounted) {
        return;
      }

      if (usersResult && usersResult.length > 0) {
        setEmployees(usersResult as HrEmployee[]);
      } else {
        if (API_CONFIG.ENABLE_MOCK_FALLBACK) {
          console.warn('[HRDashboard] Users API failed or returned empty, using mock data.');
          setEmployees(mockEmployees as HrEmployee[]);
        } else {
          setEmployees([]);
        }
      }

      if (leaveTypesResult.status === 'fulfilled' && leaveTypesResult.value.length > 0) {
        setLeaveTypes(leaveTypesResult.value as HrLeaveType[]);
      } else if (leaveTypesResult.status === 'rejected' || leaveTypesResult.value.length === 0) {
        if (API_CONFIG.ENABLE_MOCK_FALLBACK) {
          console.warn('[HRDashboard] Leave types API failed, using mock data.');
          setLeaveTypes(mockLeaveTypes as HrLeaveType[]);
        } else {
          setLeaveTypes([]);
        }
      }

      if (leaveRequestsResult.status === 'fulfilled' && Array.isArray(leaveRequestsResult.value)) {
        setLeaveRequests(leaveRequestsResult.value);
      }

      const anyApiFailed =
        !usersResult ||
        leaveTypesResult.status === 'rejected' ||
        departmentsResult.status === 'rejected' ||
        leaveRequestsResult.status === 'rejected';

      if (anyApiFailed) {
        if (API_CONFIG.ENABLE_MOCK_FALLBACK) {
          setFeedback({
            type: 'info',
            message: 'Không tải được một số dữ liệu từ API, hệ thống đang hiển thị dữ liệu mẫu để duy trì giao diện.',
          });
        } else {
          setFeedback({
            type: 'error',
            message: 'Lỗi kết nối API. Không thể tải dữ liệu thực tế.',
          });
        }
      }
    }

    loadHrData();

    return () => {
      isMounted = false;
    };
  }, [session?.token]);

  const currentHr = useMemo(() => buildCurrentHr(session), [session]);

  const showFeedback = (type: string, message: string) => {
    setFeedback({ type, message });
  };

  const commonProps = {
    currentHr,
    employees,
    departments,
    leaveTypes,
    leaveRequests,
    timesheets: mockTimesheets,
    payrollReports: mockPayrollReports,
    feedback,
    onFeedback: showFeedback,
  };

  return (
    <div className="dashboard-page employee-workspace-page hr-workspace-page">
      <HRContentRouter
        section={section}
        commonProps={commonProps}
        onNavigate={(sectionKey: string) => navigate(getHrSectionHref(sectionKey))}
        onEmployeesChange={setEmployees}
        onLeaveTypesChange={setLeaveTypes}
      />
    </div>
  );
}

interface CommonHrProps {
  currentHr: Record<string, any>;
  employees: HrEmployee[];
  departments: HrDepartment[];
  leaveTypes: HrLeaveType[];
  leaveRequests: any[];
  timesheets: any[];
  payrollReports: any[];
  feedback: { type: string; message: string } | null;
  onFeedback: (type: string, message: string) => void;
}

function HRContentRouter({
  section,
  commonProps,
  onNavigate,
  onEmployeesChange,
  onLeaveTypesChange,
}: {
  section: string;
  commonProps: CommonHrProps;
  onNavigate: (sectionKey: string) => void;
  onEmployeesChange: (updater: React.SetStateAction<HrEmployee[]>) => void;
  onLeaveTypesChange: (updater: React.SetStateAction<HrLeaveType[]>) => void;
}) {
  switch (section) {
    case 'employees':
      return (
        <HRUserManagement
          {...commonProps}
          onEmployeesChange={onEmployeesChange}
        />
      );
    case 'reports':
      return <HRReports {...commonProps} />;
    case 'policies':
      return (
        <HRLeaveTypeManagement
          leaveTypes={commonProps.leaveTypes}
          feedback={commonProps.feedback}
          onFeedback={commonProps.onFeedback}
          onLeaveTypesChange={onLeaveTypesChange}
        />
      );
    default:
      return <HROverview {...commonProps} onNavigate={onNavigate} />;
  }
}

function HRReports({
  employees,
  departments,
  leaveTypes,
  leaveRequests,
  timesheets,
  feedback,
  onFeedback,
}: {
  employees?: HrEmployee[];
  departments?: HrDepartment[];
  leaveTypes?: HrLeaveType[];
  leaveRequests?: any[];
  timesheets?: any[];
  feedback?: { type: string; message: string } | null;
  onFeedback?: (type: string, message: string) => void;
}) {
  const [activeTab, setActiveTab] = useState('payroll');

  return (
    <section className="employee-section">
      <div className="employee-section__header">
        <div>
          <span className="dashboard-panel__eyebrow">UC-08 / UC-09</span>
          <h1>Bao cao</h1>
          <p>Xuat bao cao luong va timesheet phong ban qua API backend.</p>
        </div>
      </div>

      <HRFeedback feedback={feedback} />

      <section className="dashboard-panel">
        <div className="hr-tabs">
          <button type="button" className={activeTab === 'payroll' ? 'is-active' : ''} onClick={() => setActiveTab('payroll')}>
            Bao cao luong
          </button>
          <button type="button" className={activeTab === 'timesheet' ? 'is-active' : ''} onClick={() => setActiveTab('timesheet')}>
            Bao cao timesheet
          </button>
        </div>
      </section>

      {activeTab === 'payroll' ? (
        <HRPayrollReport
          employees={employees}
          departments={departments}
          leaveTypes={leaveTypes}
          leaveRequests={leaveRequests}
          timesheets={timesheets}
          onFeedback={onFeedback}
        />
      ) : (
        <HRTimesheetExport
          employees={employees}
          departments={departments}
          timesheets={timesheets}
          onFeedback={onFeedback}
        />
      )}
    </section>
  );
}

function HROverview({
  currentHr,
  employees,
  leaveTypes,
  leaveRequests,
  timesheets,
  payrollReports,
  feedback,
  onNavigate,
}: {
  currentHr?: Record<string, any>;
  employees?: HrEmployee[];
  leaveTypes?: HrLeaveType[];
  leaveRequests?: any[];
  timesheets?: any[];
  payrollReports?: any[];
  feedback?: { type: string; message: string } | null;
  onNavigate?: (sectionKey: string) => void;
}) {
  const safeEmployees = employees ?? [];
  const safeLeaveTypes = leaveTypes ?? [];
  const safeLeaveRequests = leaveRequests ?? [];
  const safeTimesheets = timesheets ?? [];
  const safePayrollReports = payrollReports ?? [];
  const activeCount = safeEmployees.filter((employee) => employee.status === 'Active').length;
  const inactiveCount = safeEmployees.filter((employee) => employee.status === 'Inactive').length;
  const activeLeaveTypes = safeLeaveTypes.filter((type) => type.status === 'Active').length;
  const payrollReady = safePayrollReports.filter((report: any) => report.status === 'Ready').length;
  const pendingDataCount =
    safeTimesheets.filter((timesheet: any) => ['Pending', 'Submitted'].includes(timesheet.status)).length +
    safeLeaveRequests.filter((request: any) => request.status === 'Pending').length;
  const newProfiles = safeEmployees.filter((employee) => employee.profileStatus === 'new-review');
  const recentInactive = safeEmployees.filter((employee) => employee.profileStatus === 'inactive-recent');

  const stats = [
    { icon: FiUsers, label: 'Tong ho so nhan vien', value: safeEmployees.length, tone: 'info' },
    { icon: FiCheck, label: 'Nhan vien Active', value: activeCount, tone: 'success' },
    { icon: FiPower, label: 'Nhan vien Inactive', value: inactiveCount, tone: 'neutral' },
    { icon: FiFileText, label: 'Bao cao luong san sang', value: payrollReady, tone: 'info' },
    { icon: FiShield, label: 'Loai nghi dang ap dung', value: activeLeaveTypes, tone: 'success' },
    { icon: FiAlertTriangle, label: 'Du lieu con anh huong luong', value: pendingDataCount, tone: 'warning' },
  ];

  const tasks = [
    ...newProfiles.map((employee) => ({
      id: `new-${employee.id}`,
      title: 'Nhan vien moi can kiem tra ho so',
      meta: `${employee.fullName} | ${employee.email}`,
      section: 'employees',
      tone: 'info',
    })),
    ...recentInactive.map((employee) => ({
      id: `inactive-${employee.id}`,
      title: 'Tai khoan inactive gan day',
      meta: `${employee.fullName} | ${employee.employeeCode}`,
      section: 'employees',
      tone: 'neutral',
    })),
    {
      id: 'payroll-current',
      title: 'Bao cao luong thang hien tai',
      meta: pendingDataCount > 0 ? 'Can kiem tra du lieu chua approved.' : 'Du lieu da san sang de xuat.',
      section: 'reports',
      tone: pendingDataCount > 0 ? 'warning' : 'success',
    },
    {
      id: 'pending-data',
      title: 'Canh bao timesheet/leave chua approved',
      meta: `${pendingDataCount} ban ghi can kiem tra truoc khi chot luong.`,
      section: 'reports',
      tone: pendingDataCount > 0 ? 'warning' : 'success',
    },
  ].slice(0, 6);

  return (
    <section className="employee-section">
      <div className="employee-section__header">
        <div>
          <span className="dashboard-panel__eyebrow">HR Workspace</span>
          <h1>Tong quan HR</h1>
          <p>{String(currentHr?.name ?? '')} dang xem du lieu nhan su, chinh sach va bao cao toan cong ty.</p>
        </div>
      </div>

      <HRFeedback feedback={feedback} />

      <section className="hr-stat-grid">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article key={stat.label} className={`dashboard-stat-card hr-stat-card hr-stat-card--${stat.tone}`}>
              <div className="dashboard-stat-card__icon">
                <Icon />
              </div>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </article>
          );
        })}
      </section>

      <div className="dashboard-content">
        <div className="dashboard-content__main">
          <section className="dashboard-panel">
            <div className="dashboard-panel__heading">
              <div>
                <span className="dashboard-panel__eyebrow">Viec can xu ly</span>
                <h2>Cong viec HR can xu ly</h2>
              </div>
              <div className="dashboard-panel__actions hr-panel-actions">
                <button type="button" className="dashboard-button dashboard-button--ghost" onClick={() => onNavigate('employees')}>
                  <FiUsers />
                  Nhan su
                </button>
                <button type="button" className="dashboard-button dashboard-button--primary" onClick={() => onNavigate('reports')}>
                  <FiBarChart2 />
                  Bao cao
                </button>
                <button type="button" className="dashboard-button dashboard-button--ghost" onClick={() => onNavigate('policies')}>
                  <FiShield />
                  Chinh sach
                </button>
              </div>
            </div>

            <div className="dashboard-list">
              {tasks.map((task) => (
                <div key={task.id} className="dashboard-list__item">
                  <div className="hr-task-copy">
                    <span className={`dashboard-status-badge ${getToneClass(task.tone)}`}>{task.title}</span>
                    <strong>{task.meta}</strong>
                  </div>
                  <button type="button" className="dashboard-button dashboard-button--ghost hr-small-button" onClick={() => onNavigate(task.section)}>
                    Xu ly
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="dashboard-content__side">
          <section className="dashboard-panel employee-section__panel">
            <div className="dashboard-panel__heading">
              <div>
                <span className="dashboard-panel__eyebrow">Quyen HR</span>
                <h2>Pham vi thao tac</h2>
              </div>
            </div>
            <div className="employee-info-grid employee-info-grid--single">
              <InfoItem label="Nguoi dung" value={String(currentHr?.name ?? '')} />
              <InfoItem label="Vai tro" value={String(currentHr?.role ?? '')} />
              <InfoItem label="Quyen" value={Array.isArray(currentHr?.permissions) ? (currentHr.permissions as string[]).join(', ') : ''} />
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

function buildCurrentHr(session: Record<string, any> | null) {
  return {
    ...mockCurrentHrUser,
    ...session,
    id: session?.id || mockCurrentHrUser.id,
    role: 'hr',
    permissions: session?.permissions?.length ? session.permissions : mockCurrentHrUser.permissions,
  };
}

export default HRDashboard;
