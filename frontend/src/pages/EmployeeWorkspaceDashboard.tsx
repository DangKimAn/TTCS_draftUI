import { useEffect, useMemo, useState } from 'react';
import { FiAlertCircle, FiCheckCircle, FiClock, FiFileText } from 'react-icons/fi';
import { useNavigate, useSearchParams } from 'react-router-dom';
import EmployeeContentRouter from '../components/employee/EmployeeContentRouter';
import { DEFAULT_EMPLOYEE_SECTION, isValidEmployeeSection } from '../config/employeeMenu';
import {
  checkIn,
  checkOut,
  getAttendanceHistory,
  getCurrentDeviceInfo,
  getCurrentMockIp,
  getMonthlyAttendance,
  getTodayAttendance,
  toggleMockIp,
} from '../services/attendanceService';
import { createCorrectionRequest } from '../services/correctionService';
import { createLeaveRequest, getLeaveBalance, getLeaveTypes, getMyLeaveRequests } from '../services/leaveService';
import { getEmployeeProfile, updateEmployeeProfile } from '../services/profileService';
import {
  canSubmitTimesheet,
  getMonthlyTimesheetPeriodData,
  submitTimesheet,
} from '../services/timesheetService';
import {
  formatDurationFromMinutes,
  formatHours,
  getElapsedMinutes,
  getWorkdayProgressPercent,
} from '../utils/timeUtils';
import { getDateKey } from '../utils/dateUtils';
import { getAuthSession, getDashboardPathByRole } from '../utils/storage';
import './EmployeeDashboard.css';
import '../styles/attendance.css';
import '../styles/timesheet.css';

function EmployeeWorkspaceDashboard() {
  const navigate = useNavigate();
  const session = getAuthSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const [section, setSection] = useState(DEFAULT_EMPLOYEE_SECTION);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [history, setHistory] = useState([]);
  const [missingCount, setMissingCount] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date().toISOString());
  const [currentIp, setCurrentIp] = useState(getCurrentMockIp());
  const [currentDevice, setCurrentDevice] = useState(getCurrentDeviceInfo());
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState('');
  const [loadingAction, setLoadingAction] = useState('');
  const [attendanceFeedback, setAttendanceFeedback] = useState(null);
  const [periodType, setPeriodType] = useState('week');
  const [anchorDate, setAnchorDate] = useState(getDateKey());
  const [timesheetData, setTimesheetData] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
  const [timesheetFeedback, setTimesheetFeedback] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveSummary, setLeaveSummary] = useState({
    totalAnnualDays: 0,
    usedDays: 0,
    pendingDays: 0,
    remainingDays: 0,
  });
  const [profile, setProfile] = useState(null);

  const canManageAttendance = session?.role === 'employee';

  useEffect(() => {
    if (!session?.token) {
      navigate('/login', { replace: true });
      return;
    }

    if (session.role !== 'employee') {
      navigate(getDashboardPathByRole(session.role), { replace: true });
    }
  }, [navigate, session?.role, session?.token]);

  useEffect(() => {
    const nextSection = searchParams.get('section') || DEFAULT_EMPLOYEE_SECTION;

    if (!isValidEmployeeSection(nextSection)) {
      setSearchParams({}, { replace: true });
      setSection(DEFAULT_EMPLOYEE_SECTION);
      return;
    }

    setSection(nextSection);
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(new Date().toISOString());
      setCurrentIp(getCurrentMockIp());
      setCurrentDevice(getCurrentDeviceInfo());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const loadAttendanceData = async (options = { showLoading: true }) => {
    const userID = session?.userID || session?.id;
    const userKey = session?.email || userID;

    if (!userID || !userKey) {
      return;
    }

    if (options.showLoading) {
      setAttendanceLoading(true);
    }

    setAttendanceError('');

    try {
      const now = new Date();
      const records = await getMonthlyAttendance(userID, now.getMonth() + 1, now.getFullYear());
      const todayRecord = getTodayAttendance(userKey);
      const recentHistory = getAttendanceHistory(userKey, 7);
      const missingRecords = records.filter((record) => record.status === 'Missing Out');

      setTodayAttendance(todayRecord);
      setHistory(recentHistory);
      setMissingCount(missingRecords.length);
      setCurrentIp(getCurrentMockIp());
      setCurrentDevice(getCurrentDeviceInfo());
    } catch (error) {
      const message = getAttendanceMessage(error);
      setAttendanceError(message);
      setAttendanceFeedback({ type: 'danger', message });
    } finally {
      if (options.showLoading) {
        setAttendanceLoading(false);
      }
    }
  };

  const loadTimesheet = async () => {
    const userID = session?.userID || session?.id;

    if (!session?.email || !userID) {
      return;
    }

    const date = new Date(anchorDate);
    const nextData = await getMonthlyTimesheetPeriodData({
      userID,
      userEmail: session.email,
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      periodType,
      anchorDate: date,
      createIfMissing: true,
    });

    setTimesheetData(nextData);
  };

  const loadLeaveData = async () => {
    const userID = session?.userID || session?.id;

    if (!userID) {
      return;
    }

    try {
      const [requests, summary, types] = await Promise.all([
        getMyLeaveRequests(userID),
        getLeaveBalance(userID),
        getLeaveTypes(),
      ]);

      setLeaveRequests(requests);
      setLeaveSummary(summary);
      setLeaveTypes(types);
    } catch (error) {
      console.error('[EmployeeWorkspaceDashboard] Cannot load leave data:', error);
      setLeaveTypes([]);
    }
  };

  const loadProfile = () => {
    if (!session?.email) {
      return;
    }

    getEmployeeProfile(session.email).then(setProfile);
  };

  useEffect(() => {
    void loadAttendanceData().then(() => {
      void loadTimesheet();
    });
    void loadLeaveData();
    loadProfile();
  }, [session?.email, session?.id, session?.userID]);

  useEffect(() => {
    void loadTimesheet();
  }, [session?.email, periodType, anchorDate]);

  const workingDuration = useMemo(() => {
    if (todayAttendance?.status !== 'Working' || !todayAttendance?.serverTimeAtCheckIn) {
      return formatHours(todayAttendance?.totalHours);
    }

    return formatDurationFromMinutes(getElapsedMinutes(todayAttendance.serverTimeAtCheckIn, currentTime));
  }, [currentTime, todayAttendance]);

  const progressPercent = useMemo(
    () => getWorkdayProgressPercent(8, 0, 17, 30, new Date(currentTime)),
    [currentTime],
  );

  const submitState = useMemo(() => {
    if (!timesheetData) {
      return { allowed: false, reason: 'Đang tải bảng công...' };
    }

    const periodCorrections = timesheetData.corrections.filter(
      (item) => item.date >= timesheetData.period.startKey && item.date <= timesheetData.period.endKey,
    );

    return canSubmitTimesheet(timesheetData.rows, periodCorrections, timesheetData.summary);
  }, [timesheetData]);

  const overviewStats = useMemo(() => {
    const pendingLeaveCount = leaveRequests.filter((item) => item.status === 'Pending').length;
    const weeklyHours = history.reduce((total, item) => total + (item.totalHours || 0), 0);

    return [
      {
        icon: FiCheckCircle,
        label: 'Trạng thái hôm nay',
        value: getAttendanceStatusLabel(todayAttendance?.status) || 'Chưa Check-in',
        note: 'Cập nhật theo phiên làm việc hiện tại.',
      },
      {
        icon: FiClock,
        label: 'Giờ vào gần nhất',
        value: todayAttendance?.checkInTime || '--',
        note: 'Lấy từ bản ghi chấm công của hôm nay.',
      },
      {
        icon: FiFileText,
        label: 'Tổng giờ tuần này',
        value: formatHours(weeklyHours),
        note: 'Tổng hợp nhanh từ lịch sử chấm công.',
      },
      {
        icon: FiAlertCircle,
        label: 'Đơn nghỉ đang chờ',
        value: `${pendingLeaveCount} đơn`,
        note: 'Cần theo dõi kết quả phê duyệt.',
      },
    ];
  }, [history, leaveRequests, todayAttendance]);

  const overviewSession = useMemo(
    () => ({
      status: getAttendanceStatusLabel(todayAttendance?.status) || 'Chưa bắt đầu',
      checkIn: todayAttendance?.checkInTime || '--',
      checkOut: todayAttendance?.checkOutTime || '--',
      totalHours: todayAttendance?.totalHours,
      badgeClass:
        todayAttendance?.status === 'Completed'
          ? 'dashboard-status-badge--success'
          : todayAttendance?.status === 'Working'
            ? 'dashboard-status-badge--info'
            : 'dashboard-status-badge--neutral',
    }),
    [todayAttendance],
  );

  const quickTasks = useMemo(() => {
    const tasks = [];

    if (todayAttendance?.status === 'Working') {
      tasks.push({ label: 'Bạn đang mở phiên làm việc, nhớ Check-out đúng giờ.', type: 'warning' });
    } else {
      tasks.push({ label: 'Nếu bắt đầu ngày làm việc, hãy Check-in để mở phiên.', type: 'success' });
    }

    tasks.push({
      label: submitState.allowed
        ? 'Bảng công kỳ này đã sẵn sàng để gửi xác nhận.'
        : localizeMessage(submitState.reason),
      type: submitState.allowed ? 'success' : 'warning',
    });

    tasks.push({
      label: leaveSummary.pendingDays > 0
        ? `Bạn đang có ${leaveSummary.pendingDays} ngày nghỉ chờ duyệt.`
        : 'Không có đơn nghỉ nào đang chờ duyệt.',
      type: leaveSummary.pendingDays > 0 ? 'warning' : 'success',
    });

    return tasks;
  }, [leaveSummary.pendingDays, submitState.allowed, submitState.reason, todayAttendance?.status]);

  const notifications = [
    'Hệ thống đã đồng bộ dữ liệu chấm công và bảng công mới nhất.',
    'Đơn nghỉ phép chờ duyệt sẽ được quản lý xem xét trong ngày.',
    'Kiểm tra lại các bản ghi quên Check-out trước khi gửi xác nhận bảng công.',
  ];

  const profileStats = useMemo(
    () => [
      { label: 'Tổng ngày chấm công', value: `${history.length} bản ghi gần đây` },
      { label: 'Ngày nghỉ đã duyệt', value: `${leaveSummary.usedDays} ngày` },
      { label: 'Trạng thái bảng công', value: getTimesheetStatusLabel(timesheetData?.summary.status) || 'Bản nháp' },
    ],
    [history.length, leaveSummary.usedDays, timesheetData?.summary.status],
  );

  const handleCheckIn = async () => {
    const userID = session?.userID || session?.id;

    if (!userID) {
      setAttendanceFeedback({ type: 'danger', message: 'Không tìm thấy userID để Check-in.' });
      return;
    }

    setLoadingAction('checkin');
    setAttendanceFeedback(null);

    try {
      await checkIn(userID);
      await loadAttendanceData({ showLoading: false });
      void loadTimesheet();
      setAttendanceFeedback({ type: 'success', message: 'Check-in thành công.' });
    } catch (error) {
      setAttendanceFeedback({ type: 'danger', message: getAttendanceMessage(error) });
    } finally {
      setLoadingAction('');
    }
  };

  const handleCheckOut = async () => {
    const userID = session?.userID || session?.id;

    if (!userID) {
      setAttendanceFeedback({ type: 'danger', message: 'Không tìm thấy userID để Check-out.' });
      return;
    }

    setLoadingAction('checkout');
    setAttendanceFeedback(null);

    try {
      await checkOut(userID);
      await loadAttendanceData({ showLoading: false });
      void loadTimesheet();
      setAttendanceFeedback({ type: 'success', message: 'Check-out thành công.' });
    } catch (error) {
      setAttendanceFeedback({ type: 'danger', message: getAttendanceMessage(error) });
    } finally {
      setLoadingAction('');
    }
  };

  const handleToggleIp = () => {
    toggleMockIp();
    setCurrentIp(getCurrentMockIp());
    setAttendanceFeedback({ type: 'info', message: `IP mô phỏng đã đổi sang ${getCurrentMockIp()}.` });
  };

  const handleOpenCorrection = (row = null) => {
    setSelectedRow(row || timesheetData?.rows[0] || null);
    setIsCorrectionOpen(true);
  };

  const handleSubmitCorrection = async (formData) => {
    try {
      const attendanceRow =
        selectedRow ||
        timesheetData?.rows.find((row) => row.date === formData.date) ||
        null;

      if (!attendanceRow?.id) {
        setTimesheetFeedback({ type: 'danger', message: 'Không tìm thấy bản ghi cần chỉnh sửa.' });
        return;
      }

      await createCorrectionRequest({
        userID: session.userID || session.id,
        monthlyTimesheetID: timesheetData.summary.id,
        userEmail: session.email,
        attendanceId: attendanceRow.id,
        date: formData.date,
        requestedCheckIn: formData.requestedCheckIn || null,
        requestedCheckOut: formData.requestedCheckOut || null,
        reason: formData.reason.trim(),
      });

      setIsCorrectionOpen(false);
      setSelectedRow(null);
      setTimesheetFeedback({ type: 'success', message: 'Yêu cầu chỉnh sửa đã được gửi.' });
      void loadTimesheet();
    } catch (error) {
      setTimesheetFeedback({
        type: 'danger',
        message:
          error.code === 'CORRECTION_PENDING_EXISTS'
            ? 'Ngày này đã có yêu cầu chỉnh sửa đang chờ duyệt.'
            : 'Không thể tạo yêu cầu chỉnh sửa.',
      });
    }
  };

  const handleSubmitTimesheet = async () => {
    if (!timesheetData?.summary?.id) {
      setTimesheetFeedback({ type: 'danger', message: 'Không tìm thấy bảng công để gửi xác nhận.' });
      return;
    }

    try {
      await submitTimesheet(timesheetData.summary.id);
      setTimesheetFeedback({ type: 'success', message: 'Bảng công đã được gửi xác nhận.' });
      void loadTimesheet();
    } catch (error) {
      setTimesheetFeedback({ type: 'danger', message: localizeMessage(error.message) });
    }
  };

  const handleCreateLeaveRequest = async (payload) => {
    const userID = session?.userID || session?.id;

    if (!userID) {
      throw new Error('Không tìm thấy userID để tạo đơn nghỉ phép.');
    }

    await createLeaveRequest(userID, payload);
    await loadLeaveData();
  };

  const handleSaveProfile = async (updates) => {
    const nextProfile = await updateEmployeeProfile(session.email, updates);
    if (!nextProfile) {
      throw new Error('Không thể cập nhật thông tin cá nhân.');
    }
    setProfile(nextProfile);
    return nextProfile;
  };

  const sectionProps = {
    overview: {
      overviewStats,
      todaySession: overviewSession,
      quickTasks,
      notifications,
    },
    attendance: {
      attendance: todayAttendance,
      currentTime,
      currentIp,
      currentDevice,
      missingCount,
      workingDuration,
      progressPercent,
      history,
      loading: attendanceLoading,
      error: attendanceError,
      loadingAction,
      feedback: attendanceFeedback,
      canManageAttendance,
      onCheckIn: handleCheckIn,
      onCheckOut: handleCheckOut,
      onToggleIp: handleToggleIp,
      onReload: () => {
        void loadAttendanceData();
      },
    },
    timesheet: {
      timesheetData,
      periodType,
      anchorDate,
      submitState,
      feedback: timesheetFeedback,
      isCorrectionOpen,
      selectedRow,
      onPeriodTypeChange: setPeriodType,
      onAnchorDateChange: setAnchorDate,
      onReload: () => {
        void loadTimesheet();
        setTimesheetFeedback({ type: 'success', message: 'Dữ liệu bảng công đã được tải lại.' });
      },
      onOpenCorrection: handleOpenCorrection,
      onSubmitTimesheet: handleSubmitTimesheet,
      onCloseCorrection: () => {
        setIsCorrectionOpen(false);
        setSelectedRow(null);
      },
      onSubmitCorrection: handleSubmitCorrection,
    },
    'leave-request': {
      summary: leaveSummary,
      requests: leaveRequests,
      leaveTypes,
      onSubmitRequest: handleCreateLeaveRequest,
    },
    'leave-balance': {
      summary: leaveSummary,
      requests: leaveRequests,
    },
    profile: {
      profile,
      onSaveProfile: handleSaveProfile,
      personalStats: profileStats,
    },
  };

  return (
    <div className="dashboard-page employee-workspace-page">
      <EmployeeContentRouter section={section} sectionProps={sectionProps} />
    </div>
  );
}

function getAttendanceMessage(errorOrCode) {
  const errorCode = typeof errorOrCode === 'string' ? errorOrCode : errorOrCode?.code;
  const fallbackMessage = typeof errorOrCode === 'string' ? '' : errorOrCode?.message;

  switch (errorCode) {
    case 'ALREADY_CHECKED_IN':
      return 'Bạn đã Check-in cho hôm nay.';
    case 'NOT_CHECKED_IN':
      return 'Bạn chưa Check-in hôm nay.';
    case 'ALREADY_COMPLETED':
      return 'Bạn đã hoàn tất chấm công hôm nay.';
    case 'ATTENDANCE_IP_MISMATCH':
      return 'IP Check-out không khớp với IP Check-in.';
    case 'ATTENDANCE_LOAD_FAILED':
      return 'Không thể tải dữ liệu chấm công từ API.';
    case 'ATTENDANCE_UNAUTHORIZED':
      return 'Bạn không có quyền sử dụng chức năng chấm công.';
    case 'ATTENDANCE_USER_MISSING':
      return 'Không tìm thấy userID để chấm công.';
    default:
      return fallbackMessage || 'Đã có lỗi xảy ra. Vui lòng thử lại.';
  }
}

function getAttendanceStatusLabel(status) {
  switch (status) {
    case 'Working':
      return 'Đang làm việc';
    case 'Completed':
      return 'Hoàn thành';
    case 'Missing Out':
      return 'Quên Check-out';
    default:
      return '';
  }
}

function getTimesheetStatusLabel(status) {
  switch (status) {
    case 'Submitted':
      return 'Đã gửi';
    case 'Approved':
      return 'Đã duyệt';
    case 'Rejected':
      return 'Từ chối';
    case 'Draft':
      return 'Bản nháp';
    default:
      return status || '';
  }
}

function localizeMessage(message) {
  switch (message) {
    case 'Dang tai bang cong...':
    case 'Đang tải bảng công...':
      return 'Đang tải bảng công...';
    case 'Chua co du lieu cham cong trong ky nay.':
      return 'Chưa có dữ liệu chấm công trong kỳ này.';
    case 'Bang cong da duoc gui xac nhan va dang cho duyet.':
      return 'Bảng công đã được gửi xác nhận và đang chờ duyệt.';
    case 'Ban van con ngay cong thieu du lieu, chua the gui xac nhan.':
      return 'Bạn vẫn còn ngày công thiếu dữ liệu, chưa thể gửi xác nhận.';
    case 'Vui long doi quan ly duyet yeu cau chinh sua truoc khi chot cong.':
      return 'Vui lòng đợi quản lý duyệt yêu cầu chỉnh sửa trước khi chốt công.';
    case 'Du lieu hop le va san sang gui xac nhan den quan ly.':
      return 'Dữ liệu hợp lệ và sẵn sàng gửi xác nhận đến quản lý.';
    case 'Không thể gửi xác nhận bảng công.':
      return 'Không thể gửi xác nhận bảng công.';
    default:
      return message;
  }
}

export default EmployeeWorkspaceDashboard;
