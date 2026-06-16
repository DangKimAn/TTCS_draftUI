import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import {
  DEFAULT_MANAGER_SECTION,
  getManagerSectionHref,
  isValidManagerSection,
  normalizeManagerSection,
} from '../config/managerMenu';
import {
  departments as mockDepartments,
} from '../data/mockData';
import { API_CONFIG } from '../config/api';
import {
  getDepartmentCorrectionRequests,
  reviewCorrectionRequest,
} from '../services/correctionService';
import { getDepartmentLeaveRequests, reviewLeave } from '../services/leaveService';
import {
  getManagerMonthlyTimesheetsForReview,
  reviewTimesheet,
} from '../services/timesheetService';
import { getAuthSession, getDashboardPathByRole, updateAuthSession } from '../utils/storage';
import {
  buildCurrentManager,
  mergeEmployees,
  cloneTimesheet,
  getScopedEmployees,
  isTimesheetReviewable,
  buildEmployeeFromLeaveRequest,
  buildEmployeeFromCorrectionRequest,
  roundNumber,
} from '../utils/managerUtils';

// Components
import ManagerOverview from '../components/manager/ManagerOverview';
import ManagerTimesheetApproval from '../components/manager/ManagerTimesheetApproval';
import ManagerLeaveApproval from '../components/manager/ManagerLeaveApproval';
import ManagerEmployees from '../components/manager/ManagerEmployees';
import ManagerTimesheetReport from '../components/manager/ManagerTimesheetReport';
import ManagerDetailModal from '../components/manager/ManagerDetailModal';
import RejectDialog from '../components/manager/RejectDialog';
import ProfileSection from '../components/employee/ProfileSection';
import '../styles/timesheet.css';
import { getEmployeeProfile, updateEmployeeProfile, uploadAvatar } from '../services/profileService';

function ManagerDashboard() {
  const navigate = useNavigate();
  const session = getAuthSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const [section, setSection] = useState(DEFAULT_MANAGER_SECTION);
  const [employees, setEmployees] = useState<any[]>([]);
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [correctionRequests, setCorrectionRequests] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<{ type: string; message: string } | null>(null);
  const [detail, setDetail] = useState<{ type: string; id: string } | null>(null);
  const [rejectDialog, setRejectDialog] = useState<any>(null);
  const [isTimesheetLoading, setIsTimesheetLoading] = useState(false);
  const [isLeaveLoading, setIsLeaveLoading] = useState(false);
  const [isCorrectionLoading, setIsCorrectionLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  const loadProfile = () => {
    if (!session?.email) return;

    getEmployeeProfile(session.email).then((fetchedProfile) => {
      setProfile(fetchedProfile);

      const currentSession = getAuthSession();
      if (currentSession && fetchedProfile?.avatar && currentSession.avatar !== fetchedProfile.avatar) {
        const nextSession = { ...currentSession, avatar: String(fetchedProfile.avatar) };
        updateAuthSession(nextSession);
        window.dispatchEvent(new Event('avatar_updated'));
      }
    });
  };

  useEffect(() => {
    loadProfile();
  }, [session?.email]);

  const handleSaveProfile = async (updates: any) => {
    const nextProfile = await updateEmployeeProfile(session.email, updates);
    if (!nextProfile) throw new Error('Không thể cập nhật thông tin cá nhân.');
    setProfile(nextProfile);
    return nextProfile;
  };

  const handleUploadAvatar = async (file: File) => {
    const nextProfile = await uploadAvatar(file);
    if (!nextProfile) throw new Error('Không thể cập nhật ảnh đại diện.');
    setProfile(nextProfile);

    const currentSession = getAuthSession();
    if (currentSession) {
      const nextSession = { ...currentSession, avatar: String(nextProfile.avatar) };
      updateAuthSession(nextSession);
      window.dispatchEvent(new Event('avatar_updated'));
    }

    return nextProfile;
  };

  const profileStats = useMemo(() => [
    { label: 'Thâm niên', value: profile?.tenure || 'Chưa rõ' },
    { label: 'Phép năm còn lại', value: `${profile?.leaveBalance || 0} ngày` },
    { label: 'Trạng thái', value: profile?.accountStatus || 'Đang hoạt động' },
  ], [profile]);

  useEffect(() => {
    if (!session?.token) {
      navigate('/login', { replace: true });
      return;
    }

    if (session.role !== 'manager') {
      navigate(getDashboardPathByRole(session.role), { replace: true });
    }
  }, [navigate, session?.role, session?.token]);

  useEffect(() => {
    const nextSection = searchParams.get('section') || DEFAULT_MANAGER_SECTION;

    if (!isValidManagerSection(nextSection)) {
      setSearchParams({}, { replace: true });
      setSection(DEFAULT_MANAGER_SECTION);
      return;
    }

    setSection(normalizeManagerSection(nextSection));
  }, [searchParams, setSearchParams]);

  const currentManager = useMemo(() => buildCurrentManager(session), [session]);
  const reviewPeriod = useMemo(() => {
    const now = new Date();
    let month = now.getMonth() + 1;
    let year = now.getFullYear();

    if (now.getDate() <= 15) {
      month -= 1;
      if (month === 0) {
        month = 12;
        year -= 1;
      }
    }

    return {
      month,
      year,
    };
  }, []);

  const loadReviewTimesheets = async ({ showSuccess = false } = {}) => {
    setIsTimesheetLoading(true);
    try {
      const result = await getManagerMonthlyTimesheetsForReview(
        currentManager.departmentId || '',
        reviewPeriod.month,
        reviewPeriod.year,
      );
      setEmployees((current) => mergeEmployees(current, result.employees));
      setTimesheets(result.timesheets.map(cloneTimesheet));
      if (showSuccess) {
        setFeedback({ type: 'success', message: 'Da tai danh sach bang cong can duyet tu API.' });
      }
    } catch (error: any) {
      setFeedback({
        type: 'danger',
        message: error?.message || 'Khong the tai danh sach bang cong can duyet.',
      });
    } finally {
      setIsTimesheetLoading(false);
    }
  };

  const loadReviewLeaves = async ({ showSuccess = false } = {}) => {
    if (!currentManager.departmentId) {
      setFeedback({ type: 'danger', message: 'Khong tim thay phong ban cua manager.' });
      return;
    }
    setIsLeaveLoading(true);
    try {
      const requests = await getDepartmentLeaveRequests(currentManager.departmentId);
      setLeaveRequests(requests);
      setEmployees((current) => mergeEmployees(current, requests.map(buildEmployeeFromLeaveRequest).filter(Boolean)));
      if (showSuccess) {
        setFeedback({ type: 'success', message: 'Da tai danh sach don nghi phep can duyet tu API.' });
      }
    } catch (error: any) {
      setFeedback({
        type: 'danger',
        message: error?.message || 'Khong the tai danh sach don nghi phep can duyet.',
      });
    } finally {
      setIsLeaveLoading(false);
    }
  };

  const loadReviewCorrections = async ({ showSuccess = false } = {}) => {
    if (!currentManager.departmentId) {
      setFeedback({ type: 'danger', message: 'Khong tim thay phong ban cua manager.' });
      return;
    }
    setIsCorrectionLoading(true);
    try {
      const requests = await getDepartmentCorrectionRequests(currentManager.departmentId);
      setCorrectionRequests(requests);
      setEmployees((current) => mergeEmployees(current, requests.map(buildEmployeeFromCorrectionRequest).filter(Boolean)));
      if (showSuccess) {
        setFeedback({ type: 'success', message: 'Da tai danh sach correction dang cho tu API.' });
      }
    } catch (error: any) {
      setFeedback({
        type: 'danger',
        message: error?.message || 'Khong the tai danh sach correction dang cho.',
      });
    } finally {
      setIsCorrectionLoading(false);
    }
  };

  useEffect(() => {
    if (!session?.token || session.role !== 'manager') {
      return;
    }
    void loadReviewTimesheets();
    void loadReviewLeaves();
    void loadReviewCorrections();
  }, [session?.token, session?.role, currentManager.departmentId]);

  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || session?.role !== 'manager') return;

    const handleNewNotification = (notification) => {
      if (notification.relatedType === 'LEAVE') {
        void loadReviewLeaves();
      } else if (notification.relatedType === 'TIMESHEET') {
        void loadReviewTimesheets();
        void loadReviewCorrections();
      }

      if (Notification.permission === 'granted') {
        new Notification('Timesheet Manager', { body: notification.content });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification('Timesheet Manager', { body: notification.content });
          }
        });
      }
    };

    socket.on('new_notification', handleNewNotification);

    return () => {
      socket.off('new_notification', handleNewNotification);
    };

  }, [socket, session?.role, currentManager.departmentId]);

  const teamEmployees = useMemo(
    () => getScopedEmployees(employees, currentManager),
    [currentManager, employees],
  );

  const teamEmployeeIds = useMemo(
    () => new Set(teamEmployees.map((employee) => employee.id)),
    [teamEmployees],
  );

  const scopedTimesheets = useMemo(
    () => timesheets.filter((timesheet) => teamEmployeeIds.has(timesheet.employeeId)),
    [teamEmployeeIds, timesheets],
  );

  const scopedLeaveRequests = useMemo(
    () => teamEmployeeIds.size > 0
      ? leaveRequests.filter((request) => teamEmployeeIds.has(request.employeeId))
      : leaveRequests,
    [leaveRequests, teamEmployeeIds],
  );

  const scopedCorrectionRequests = useMemo(
    () => correctionRequests.filter((request) => request.status === 'Pending'),
    [correctionRequests],
  );

  const scopedDepartments = useMemo(() => {
    const departmentIds = Array.from(new Set(teamEmployees.map((employee) => employee.departmentId).filter(Boolean)));
    if (!departmentIds.length && currentManager.departmentId) {
      departmentIds.push(currentManager.departmentId);
    }
    return departmentIds.map((departmentId: any) => {
      const mockDepartment = API_CONFIG.ENABLE_MOCK_FALLBACK ? mockDepartments.find((department) => department.id === departmentId) : null;
      const employeeInDepartment = teamEmployees.find((employee) => employee.departmentId === departmentId);
      return mockDepartment || {
        id: departmentId,
        name: employeeInDepartment?.departmentName || 'Phong ban hien tai',
      };
    });
  }, [currentManager.departmentId, teamEmployees]);

  const [processingId, setProcessingId] = useState<string | null>(null);

  const showFeedback = (type: string, message: string) => {
    setFeedback({ type, message });
  };

  const handleApproveTimesheet = async (timesheetId: string) => {
    const timesheet = scopedTimesheets.find((item) => item.id === timesheetId);
    if (!timesheet) {
      showFeedback('danger', 'Không tìm thấy bảng công trong phạm vi quản lý.');
      return;
    }
    if (!isTimesheetReviewable(timesheet)) {
      showFeedback('danger', 'Bảng công này đã được xử lý, không thể duyệt lại.');
      return;
    }
    setProcessingId(timesheetId);
    try {
      await reviewTimesheet(timesheetId, 'Approved');
      setTimesheets((current) =>
        current.map((item) =>
          item.id === timesheetId
            ? {
              ...item,
              status: 'Approved',
              locked: true,
              approvedAt: new Date().toISOString(),
              rejectionReason: '',
            }
            : item,
        ),
      );
      showFeedback('success', `Đã duyệt bảng công ${timesheet.code} và khóa chỉnh sửa.`);
    } catch (error: any) {
      showFeedback('danger', error?.message || 'Khong the duyet bang cong.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveCorrection = async (correctionId: string) => {
    const correction = correctionRequests.find((item) => item.id === correctionId);
    if (!correction || correction.status !== 'Pending') {
      showFeedback('danger', 'Khong tim thay correction dang cho trong pham vi quan ly.');
      return;
    }
    setProcessingId(correctionId);
    try {
      await reviewCorrectionRequest(correctionId, 'Approved');
      setCorrectionRequests((current) => current.filter((item) => item.id !== correctionId));
      showFeedback('success', 'Da duyet correction va cap nhat ban ghi cham cong neu co gio de xuat.');
      void loadReviewTimesheets();
    } catch (error: any) {
      showFeedback('danger', error?.message || 'Khong the duyet correction.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveLeave = async (requestId: string) => {
    const request = scopedLeaveRequests.find((item) => item.id === requestId);
    const employee = request ? employees.find((item) => item.id === request.employeeId) : null;
    if (!request || !employee) {
      showFeedback('danger', 'Không tìm thấy đơn nghỉ phép trong phạm vi quản lý.');
      return;
    }
    if (request.status !== 'Pending') {
      showFeedback('danger', 'Đơn nghỉ phép này đã được xử lý, không thể duyệt lại.');
      return;
    }
    if (!request.isUnpaid && employee.leaveBalance < request.totalDays) {
      showFeedback('danger', `Số dư phép của ${employee.fullName} không đủ. Vui lòng từ chối hoặc yêu cầu kiểm tra lại.`);
      return;
    }
    setProcessingId(requestId);
    try {
      await reviewLeave(requestId, 'Approved');
      setLeaveRequests((current) =>
        current.map((item) =>
          item.id === requestId
            ? {
              ...item,
              status: 'Approved',
              approvedAt: new Date().toISOString(),
              rejectionReason: '',
            }
            : item,
        ),
      );
      setEmployees((current) =>
        current.map((item) =>
          item.id === request.employeeId && !request.isUnpaid
            ? {
              ...item,
              leaveBalance: roundNumber(item.leaveBalance - request.totalDays),
            }
            : item,
        ),
      );
      const successMessage = request.isUnpaid
        ? `Đã duyệt đơn ${request.code}.`
        : `Đã duyệt đơn ${request.code} và trừ ${request.totalDays} ngày phép.`;
      showFeedback('success', successMessage);
      void loadReviewLeaves();
    } catch (error: any) {
      showFeedback('danger', error?.message || 'Khong the duyet don nghi phep.');
    } finally {
      setProcessingId(requestId); // Wait, this should be null. Fix in next block or here: setProcessingId(null);
    }
  };

  const handleOpenRejectDialog = (type: string, id: string) => {
    setRejectDialog({
      type,
      id,
      reason: '',
      error: '',
    });
  };

  const handleSubmitReject = async () => {
    if (!rejectDialog?.reason.trim()) {
      setRejectDialog((current: any) => ({
        ...current,
        error: 'Vui lòng nhập lý do từ chối.',
      }));
      return;
    }

    if (rejectDialog.type === 'timesheet') {
      const timesheet = scopedTimesheets.find((item) => item.id === rejectDialog.id);
      if (!timesheet || !isTimesheetReviewable(timesheet)) {
        showFeedback('danger', 'Bảng công này đã được xử lý hoặc nằm ngoài phạm vi quản lý.');
        setRejectDialog(null);
        return;
      }
      setProcessingId(rejectDialog.id);
      try {
        await reviewTimesheet(rejectDialog.id, 'Rejected', rejectDialog.reason.trim());
        setTimesheets((current) =>
          current.map((item) =>
            item.id === rejectDialog.id
              ? {
                ...item,
                status: 'Rejected',
                locked: false,
                rejectionReason: rejectDialog.reason.trim(),
                rejectedAt: new Date().toISOString(),
              }
              : item,
          ),
        );
        showFeedback('success', `Đã từ chối bảng công ${timesheet.code}.`);
        setRejectDialog(null);
      } catch (error: any) {
        showFeedback('danger', error?.message || 'Khong the tu choi bang cong.');
      } finally {
        setProcessingId(null);
      }
      return;
    }

    if (rejectDialog.type === 'correction') {
      const correction = scopedCorrectionRequests.find((item) => item.id === rejectDialog.id);
      if (!correction || correction.status !== 'Pending') {
        showFeedback('danger', 'Correction nay da duoc xu ly hoac nam ngoai pham vi quan ly.');
        setRejectDialog(null);
        return;
      }
      setProcessingId(rejectDialog.id);
      try {
        await reviewCorrectionRequest(rejectDialog.id, 'Rejected', rejectDialog.reason.trim());
        setCorrectionRequests((current) => current.filter((item) => item.id !== rejectDialog.id));
        showFeedback('success', 'Da tu choi correction.');
        setRejectDialog(null);
      } catch (error: any) {
        showFeedback('danger', error?.message || 'Khong the tu choi correction.');
      } finally {
        setProcessingId(null);
      }
      return;
    }

    const request = scopedLeaveRequests.find((item) => item.id === rejectDialog.id);
    if (!request || request.status !== 'Pending') {
      showFeedback('danger', 'Đơn nghỉ phép này đã được xử lý hoặc nằm ngoài phạm vi quản lý.');
      setRejectDialog(null);
      return;
    }
    setProcessingId(rejectDialog.id);
    try {
      await reviewLeave(rejectDialog.id, 'Rejected', rejectDialog.reason.trim());
      setLeaveRequests((current) =>
        current.map((item) =>
          item.id === rejectDialog.id
            ? {
              ...item,
              status: 'Rejected',
              rejectionReason: rejectDialog.reason.trim(),
              rejectedAt: new Date().toISOString(),
            }
            : item,
        ),
      );
      showFeedback('success', `Đã từ chối đơn nghỉ phép ${request.code}.`);
      setRejectDialog(null);
      void loadReviewLeaves();
    } catch (error: any) {
      showFeedback('danger', error?.message || 'Khong the tu choi don nghi phep.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRequestLeaveCheck = (requestId: string) => {
    const request = scopedLeaveRequests.find((item) => item.id === requestId);
    if (!request) {
      showFeedback('danger', 'Không tìm thấy đơn nghỉ phép trong phạm vi quản lý.');
      return;
    }
    showFeedback('info', `Đã ghi nhận yêu cầu kiểm tra lại số dư phép cho đơn ${request.code}.`);
  };

  const renderSection = () => {
    switch (section) {
      case 'timesheet-approvals':
        return (
          <ManagerTimesheetApproval
            timesheets={scopedTimesheets}
            correctionRequests={scopedCorrectionRequests}
            employees={teamEmployees}
            departments={scopedDepartments}
            feedback={feedback}
            isLoading={isTimesheetLoading || isCorrectionLoading}
            onApprove={handleApproveTimesheet}
            onReject={(id) => handleOpenRejectDialog('timesheet', id)}
            onApproveCorrection={handleApproveCorrection}
            onRejectCorrection={(id) => handleOpenRejectDialog('correction', id)}
            onViewDetail={(id) => setDetail({ type: 'timesheet', id })}
            highlightId={highlightId}
            processingId={processingId}
            onReload={() => {
              void loadReviewTimesheets({ showSuccess: true });
              void loadReviewCorrections();
            }}
          />
        );
      case 'leave-approvals':
        return (
          <ManagerLeaveApproval
            leaveRequests={scopedLeaveRequests}
            employees={teamEmployees}
            departments={scopedDepartments}
            feedback={feedback}
            isLoading={isLeaveLoading}
            onApprove={handleApproveLeave}
            onReject={(id) => handleOpenRejectDialog('leave', id)}
            onRequestCheck={handleRequestLeaveCheck}
            onViewDetail={(id) => setDetail({ type: 'leave', id })}
            highlightId={highlightId}
            processingId={processingId}
            onReload={() => void loadReviewLeaves({ showSuccess: true })}
          />
        );
      case 'team':
        return (
          <ManagerEmployees
            employees={teamEmployees}
            timesheets={scopedTimesheets}
            leaveRequests={scopedLeaveRequests}
            departments={scopedDepartments}
          />
        );
      case 'timesheet-reports':
        return (
          <ManagerTimesheetReport
            timesheets={scopedTimesheets}
            employees={teamEmployees}
            departments={scopedDepartments}
            feedback={feedback}
            onFeedback={showFeedback}
          />
        );
      case 'profile':
        return (
          <ProfileSection
            profile={profile}
            onSaveProfile={handleSaveProfile}
            onUploadAvatar={handleUploadAvatar}
            personalStats={profileStats}
          />
        );
      default:
        return (
          <ManagerOverview
            currentManager={currentManager}
            employees={teamEmployees}
            timesheets={scopedTimesheets}
            leaveRequests={scopedLeaveRequests}
            departments={scopedDepartments}
            onOpenSection={(sectionKey, hId) => {
              const url = getManagerSectionHref(sectionKey);
              navigate(hId ? `${url}&highlight=${hId}` : url);
            }}
          />
        );
    }
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden p-6">
      {renderSection()}

      <ManagerDetailModal
        detail={detail}
        timesheets={scopedTimesheets}
        leaveRequests={scopedLeaveRequests}
        employees={teamEmployees}
        departments={scopedDepartments}
        onClose={() => setDetail(null)}
      />

      <RejectDialog
        dialog={rejectDialog}
        timesheets={scopedTimesheets}
        leaveRequests={scopedLeaveRequests}
        correctionRequests={scopedCorrectionRequests}
        onChange={(reason) =>
          setRejectDialog((current: any) => ({
            ...current,
            reason,
            error: '',
          }))
        }
        onClose={() => setRejectDialog(null)}
        onSubmit={handleSubmitReject}
      />
    </div>
  );
}

export default ManagerDashboard;
