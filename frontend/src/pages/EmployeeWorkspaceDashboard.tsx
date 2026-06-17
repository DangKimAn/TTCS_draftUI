import { useEffect, useMemo, useState } from 'react';
import { FiAlertCircle, FiCheckCircle, FiClock, FiFileText } from 'react-icons/fi';
import { useNavigate, useSearchParams } from 'react-router-dom';
import EmployeeContentRouter from '../components/employee/EmployeeContentRouter';
import { useSocket } from '../contexts/SocketContext';
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
import { getEmployeeProfile, updateEmployeeProfile, uploadAvatar } from '../services/profileService';
import { getMyNotifications } from '../services/notificationService';
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
import { getDateKey, getCurrentWeekRange, getPeriodConfig, getDefaultAnchorDate } from '../utils/dateUtils';
import { exportTimesheetReportPdf } from '../utils/reportPdf';
import { getAuthSession, getDashboardPathByRole, updateAuthSession } from '../utils/storage';
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
  const [anchorDate, setAnchorDate] = useState(getDefaultAnchorDate());
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
  const [notifications, setNotifications] = useState([]);

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
    const userEmail = session?.email || userID;

    if (!userID || !userEmail) {
      return;
    }

    const anchorDateObj = typeof anchorDate === 'string' ? new Date(anchorDate) : anchorDate;
    const periodConfig = getPeriodConfig(periodType, anchorDateObj);
    const month = periodConfig.startDate.getMonth() + 1;
    const year = periodConfig.startDate.getFullYear();
    const date = getDateKey(periodConfig.startDate);

    try {
      const nextData = await getMonthlyTimesheetPeriodData({
        userID,
        userEmail,
        month,
        year,
        periodType: periodType,
        anchorDate: anchorDateObj,
        createIfMissing: true,
      });

      setTimesheetData(nextData);
    } catch (error) {
      setTimesheetFeedback({ type: 'danger', message: error?.message || 'Khong the tai du lieu bang cong tu API.' });
    }
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

  const loadNotifications = async () => {
    const userID = session?.userID || session?.id;
    if (!userID) return;
    try {
      const data = await getMyNotifications(userID);
      setNotifications(data.slice(0, 3));
    } catch (error) {
      console.error('[EmployeeWorkspaceDashboard] Cannot load notifications:', error);
      setNotifications([]);
    }
  };

  useEffect(() => {
    void loadAttendanceData().then(() => {
      void loadTimesheet();
    });
    void loadLeaveData();
    void loadNotifications();
    loadProfile();
  }, [session?.email, session?.id, session?.userID]);

  useEffect(() => {
    void loadTimesheet();
  }, [session?.email, periodType, anchorDate]);

  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification) => {
      void loadNotifications();
      
      if (notification.relatedType === 'LEAVE') {
        void loadLeaveData();
      } else if (notification.relatedType === 'TIMESHEET') {
        void loadTimesheet();
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
     
  }, [socket, periodType, anchorDate]);

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

    const summary = timesheetData.summary as any; // Cast to access MonthlyTimesheetData fields
    
    if (summary?.status === 'Approved') {
      return { allowed: false, reason: 'Bảng công kỳ này đã được phê duyệt.' };
    }
    if (summary?.status === 'Submitted') {
      return { allowed: false, reason: 'Bảng công đã được gửi xác nhận và đang chờ duyệt.' };
    }

    // Rely on the backend's assessment for the whole month if available
    if (summary && typeof summary.canSubmit === 'boolean') {
      if (!summary.canSubmit) {
        return { 
          allowed: false, 
          reason: 'Bạn vẫn còn ngày công thiếu dữ liệu hoặc yêu cầu chỉnh sửa đang chờ duyệt trong tháng này, chưa thể gửi xác nhận.' 
        };
      }
      return { allowed: true, reason: 'Dữ liệu tháng này hợp lệ và sẵn sàng gửi xác nhận đến quản lý.' };
    }

    // Fallback if no backend canSubmit is available
    const periodCorrections = timesheetData.corrections.filter(
      (item) => item.date >= timesheetData.period.startKey && item.date <= timesheetData.period.endKey,
    );

    return canSubmitTimesheet(timesheetData.rows, periodCorrections, timesheetData.summary);
  }, [timesheetData]);

  const displayRows = useMemo(() => {
    if (!timesheetData) return [];
    if (periodType === 'month' || periodType === 'last_month') return timesheetData.rows;

    const anchorDateObj2 = typeof anchorDate === 'string' ? new Date(anchorDate) : anchorDate;
    const { startKey, endKey } = getCurrentWeekRange(anchorDateObj2);
    return timesheetData.rows.filter((r) => r.date >= startKey && r.date <= endKey);
  }, [timesheetData, periodType, anchorDate]);

  const overviewStats = useMemo(() => {
    const pendingLeaveCount = leaveRequests.filter((item) => item.status === 'Pending').length;
    const weeklyHours = history.reduce((total, item) => total + (item.totalHours || 0), 0);

    return [
      {
        icon: FiCheckCircle,
        label: 'Trạng thái hôm nay',
        value: getAttendanceStatusLabel(todayAttendance?.status) || 'Chưa Check-in',
        note: 'Cập nhật theo phiên làm việc hiện tại.',
        action: 'attendance',
      },
      {
        icon: FiClock,
        label: 'Giờ vào gần nhất',
        value: todayAttendance?.checkInTime || '--',
        note: 'Lấy từ bản ghi chấm công của hôm nay.',
        action: 'attendance',
      },
      {
        icon: FiFileText,
        label: 'Tổng giờ tuần này',
        value: formatHours(weeklyHours),
        note: 'Tổng hợp nhanh từ lịch sử chấm công.',
        action: 'timesheet',
      },
      {
        icon: FiAlertCircle,
        label: 'Đơn nghỉ đang chờ',
        value: `${pendingLeaveCount} đơn`,
        note: 'Cần theo dõi kết quả phê duyệt.',
        action: 'leave-request',
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
    } else if (todayAttendance?.status !== 'Completed') {
      tasks.push({ label: 'Nếu bắt đầu ngày làm việc, hãy Check-in để mở phiên.', type: 'success' });
    }

    if (missingCount > 0) {
      tasks.push({ 
        label: `Bạn có ${missingCount} ngày công quên Check-out, vui lòng tạo giải trình.`, 
        type: 'warning',
        action: 'timesheet'
      });
    }

    const tsStatus = timesheetData?.summary?.status;
    if (tsStatus !== 'Submitted' && tsStatus !== 'Approved') {
      if (submitState.allowed) {
        tasks.push({ 
          label: 'Bảng công kỳ này đã sẵn sàng, vui lòng nộp bảng công.', 
          type: 'warning',
          action: 'timesheet'
        });
      } else {
        tasks.push({ 
          label: localizeMessage(submitState.reason), 
          type: 'warning',
          action: 'timesheet'
        });
      }
    }

    if (leaveSummary.pendingDays > 0) {
      tasks.push({
        label: `Bạn đang có ${leaveSummary.pendingDays} ngày nghỉ chờ duyệt.`,
        type: 'warning',
        action: 'leave-request'
      });
    }

    return tasks;
  }, [
    leaveSummary.pendingDays,
    submitState.allowed,
    submitState.reason,
    todayAttendance?.status,
    missingCount,
    timesheetData?.summary?.status,
  ]);

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
      const attendanceRow = timesheetData?.rows.find((row) => row.date === formData.date) || null;

      if (!attendanceRow?.id) {
        throw new Error('Không tìm thấy bản ghi cần chỉnh sửa.');
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
      throw new Error(
        error.code === 'CORRECTION_PENDING_EXISTS'
          ? 'Ngày này đã có yêu cầu chỉnh sửa đang chờ duyệt.'
          : error.message || 'Không thể tạo yêu cầu chỉnh sửa.',
      );
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

  const handleUploadAvatar = async (file) => {
    const nextProfile = await uploadAvatar(file);
    if (!nextProfile) {
      throw new Error('Không thể cập nhật ảnh đại diện.');
    }
    setProfile(nextProfile);
    
    // Update local storage session and dispatch event
    const currentSession = getAuthSession();
    if (currentSession) {
      const nextSession = { ...currentSession, avatar: String(nextProfile.avatar) };
      updateAuthSession(nextSession);
      window.dispatchEvent(new Event('avatar_updated'));
    }
    
    return nextProfile;
  };

  const handleNavigate = (sectionName) => {
    if (!sectionName) return;
    const params = new URLSearchParams(searchParams);
    params.set('section', sectionName);
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const sectionProps = {
    overview: {
      overviewStats,
      todaySession: overviewSession,
      quickTasks,
      notifications,
      onNavigate: handleNavigate,
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
      displayRows,
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
      onExportExcel: () => {
        if (!timesheetData) return;
        try {
          const anchorDateObj = typeof anchorDate === 'string' ? new Date(anchorDate) : anchorDate;
          const month = anchorDateObj.getMonth() + 1;
          const year = anchorDateObj.getFullYear();
          let titleText = periodType === 'week' ? `Bảng công Tuần / ${year}` : `Bảng công Tháng ${month} / ${year}`;
          const empName = profile?.fullName || session?.email || '--';
          const deptName = profile?.department || 'Tất cả';
          const empId = profile?.employeeId || session?.userID || 'EMP';
          const fileName = `timesheet-${empId}-${periodType}-${month}-${year}.xls`;

          let htmlContent = `
          <html xmlns:x="urn:schemas-microsoft-com:office:excel">
            <head>
              <meta charset="utf-8">
              <style>
                .title { font-size: 18pt; font-weight: bold; text-align: center; height: 30pt; vertical-align: middle; }
                .meta-label { font-weight: bold; text-align: left; }
                .meta-value { text-align: left; }
                th { background-color: #e2e8f0; font-weight: bold; border: 1px solid #cbd5e1; }
                td { border: 1px solid #cbd5e1; vertical-align: middle; }
              </style>
            </head>
            <body>
              <table>
                <tr><td colspan="6" class="title">${titleText}</td></tr>
                <tr><td colspan="2" class="meta-label">Nhân viên:</td><td colspan="4" class="meta-value">${empName}</td></tr>
                <tr><td colspan="2" class="meta-label">Phòng ban:</td><td colspan="4" class="meta-value">${deptName}</td></tr>
                <tr><td colspan="2" class="meta-label">Thời gian:</td><td colspan="4" class="meta-value">${timesheetData.period.startKey} - ${timesheetData.period.endKey}</td></tr>
                <tr><td colspan="6"></td></tr>
                <tr>
                  <th>Ngày</th>
                  <th>Giờ vào</th>
                  <th>Giờ ra</th>
                  <th>Tổng giờ</th>
                  <th>Trạng thái</th>
                  <th>Cảnh báo</th>
                </tr>`;

          displayRows.forEach(row => {
            const warnings = (row.warnings || []).map(w => w.label || w).join(' | ');
            htmlContent += `
                <tr>
                  <td>${row.date}</td>
                  <td>${row.checkInTime || '--'}</td>
                  <td>${row.checkOutTime || '--'}</td>
                  <td>${row.totalHours || 0}</td>
                  <td>${row.status || '--'}</td>
                  <td>${warnings}</td>
                </tr>`;
          });

          htmlContent += `
              </table>
            </body>
          </html>`;

          const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        } catch (error) {
          console.error(error);
          alert('Không thể xuất Excel. Vui lòng thử lại.');
        }
      },
      onExportPdf: () => {
        if (!timesheetData) return;
        try {
          // Determine dynamic title based on periodType
          let title = `Bảng công - ${timesheetData.period.label}`;
          const anchorDateObj = typeof anchorDate === 'string' ? new Date(anchorDate) : anchorDate;
          const year = anchorDateObj.getFullYear();
          if (periodType === 'week') {
            title = `Bảng công Tuần / ${year}`;
          } else if (periodType === 'month' || periodType === 'last_month') {
            title = `Bảng công Tháng ${anchorDateObj.getMonth() + 1} / ${year}`;
          }

          const mappedRows = displayRows.map(row => ({
            ...row,
            checkIn: row.checkInTime,
            checkOut: row.checkOutTime,
            workDate: row.date,
            employeeName: profile?.fullName || session?.email || '--',
            departmentName: profile?.department || 'Tất cả'
          }));

          exportTimesheetReportPdf({
            title,
            filters: {
              employeeId: profile?.fullName || session?.email || '--',
              departmentId: profile?.department || 'Tất cả',
              fromDate: timesheetData.period.startKey,
              toDate: timesheetData.period.endKey,
            },
            rows: mappedRows,
            summary: {
              totalRecords: displayRows.length,
              totalEmployees: 1,
              totalHours: displayRows.reduce((acc, row) => acc + (row.totalHours || 0), 0),
              warningRecords: displayRows.filter(row => row.warnings && row.warnings.length > 0).length,
              pending: 0,
              submitted: timesheetData.summary.status === 'Submitted' ? 1 : 0,
              approved: timesheetData.summary.status === 'Approved' ? 1 : 0,
              rejected: timesheetData.summary.status === 'Rejected' ? 1 : 0,
              missingOut: displayRows.filter(row => !row.checkOutTime).length,
              byStatus: {
                [timesheetData.summary.status]: 1
              }
            }
          });
        } catch (error) {
          console.error(error);
          alert('Không thể xuất PDF. Vui lòng thử lại.');
        }
      },
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
      onUploadAvatar: handleUploadAvatar,
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
