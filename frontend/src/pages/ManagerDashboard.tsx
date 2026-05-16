import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  DEFAULT_MANAGER_SECTION,
  getManagerSectionHref,
  isValidManagerSection,
  normalizeManagerSection,
} from '../config/managerMenu';
import {
  departments as mockDepartments,
} from '../data/mockData';
import {
  getDepartmentCorrectionRequests,
  reviewCorrectionRequest,
} from '../services/correctionService';
import { getDepartmentLeaveRequests, reviewLeave } from '../services/leaveService';
import {
  getManagerMonthlyTimesheetsForReview,
  reviewTimesheet,
} from '../services/timesheetService';
import { getAuthSession, getDashboardPathByRole } from '../utils/storage';
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

function ManagerDashboard() {
  const navigate = useNavigate();
  const session = getAuthSession();
  const [searchParams, setSearchParams] = useSearchParams();
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
    return {
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    };
  }, []);

  const loadReviewTimesheets = async ({ showSuccess = false } = {}) => {
    if (!currentManager.departmentId) {
      setFeedback({ type: 'danger', message: 'Khong tim thay phong ban cua manager.' });
      return;
    }
    setIsTimesheetLoading(true);
    try {
      const result = await getManagerMonthlyTimesheetsForReview(
        currentManager.departmentId,
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
      const mockDepartment = mockDepartments.find((department) => department.id === departmentId);
      const employeeInDepartment = teamEmployees.find((employee) => employee.departmentId === departmentId);
      return mockDepartment || {
        id: departmentId,
        name: employeeInDepartment?.departmentName || 'Phong ban hien tai',
      };
    });
  }, [currentManager.departmentId, teamEmployees]);

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
    }
  };

  const handleApproveCorrection = async (correctionId: string) => {
    const correction = correctionRequests.find((item) => item.id === correctionId);
    if (!correction || correction.status !== 'Pending') {
      showFeedback('danger', 'Khong tim thay correction dang cho trong pham vi quan ly.');
      return;
    }
    try {
      await reviewCorrectionRequest(correctionId, 'Approved');
      setCorrectionRequests((current) => current.filter((item) => item.id !== correctionId));
      showFeedback('success', 'Da duyet correction va cap nhat ban ghi cham cong neu co gio de xuat.');
      void loadReviewTimesheets();
    } catch (error: any) {
      showFeedback('danger', error?.message || 'Khong the duyet correction.');
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
    if (employee.leaveBalance < request.totalDays) {
      showFeedback('danger', `Số dư phép của ${employee.fullName} không đủ. Vui lòng từ chối hoặc yêu cầu kiểm tra lại.`);
      return;
    }
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
          item.id === request.employeeId
            ? {
                ...item,
                leaveBalance: roundNumber(item.leaveBalance - request.totalDays),
              }
            : item,
        ),
      );
      showFeedback('success', `Đã duyệt đơn ${request.code} và trừ ${request.totalDays} ngày phép.`);
      void loadReviewLeaves();
    } catch (error: any) {
      showFeedback('danger', error?.message || 'Khong the duyet don nghi phep.');
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
      try {
        await reviewCorrectionRequest(rejectDialog.id, 'Rejected', rejectDialog.reason.trim());
        setCorrectionRequests((current) => current.filter((item) => item.id !== rejectDialog.id));
        showFeedback('success', 'Da tu choi correction.');
        setRejectDialog(null);
      } catch (error: any) {
        showFeedback('danger', error?.message || 'Khong the tu choi correction.');
      }
      return;
    }

    const request = scopedLeaveRequests.find((item) => item.id === rejectDialog.id);
    if (!request || request.status !== 'Pending') {
      showFeedback('danger', 'Đơn nghỉ phép này đã được xử lý hoặc nằm ngoài phạm vi quản lý.');
      setRejectDialog(null);
      return;
    }
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
      default:
        return (
          <ManagerOverview
            currentManager={currentManager}
            employees={teamEmployees}
            timesheets={scopedTimesheets}
            leaveRequests={scopedLeaveRequests}
            departments={scopedDepartments}
            onOpenSection={(sectionKey) => navigate(getManagerSectionHref(sectionKey))}
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
