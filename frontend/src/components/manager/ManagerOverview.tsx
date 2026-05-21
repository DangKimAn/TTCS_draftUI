import React from 'react';
import { FiClock, FiCalendar, FiUsers, FiAlertTriangle } from 'react-icons/fi';
import { formatDate } from '../../utils/dateUtils';

import ManagerStatsCard from './ManagerStatsCard';

interface ManagerOverviewProps {
  currentManager: any;
  employees: any[];
  timesheets: any[];
  leaveRequests: any[];
  departments: any[];
  onOpenSection: (section: string, highlightId?: string) => void;
}

const ManagerOverview: React.FC<ManagerOverviewProps> = ({
  currentManager,
  employees,
  timesheets,
  leaveRequests,
  departments,
  onOpenSection,
}) => {
  const isTimesheetReviewable = (t: any) => ['Submitted', 'Pending'].includes(t.status);
  const pendingTimesheets = timesheets.filter(isTimesheetReviewable);
  const pendingLeaves = leaveRequests.filter((r) => r.status === 'Pending');
  const warningTimesheets = timesheets.filter((t) => t.warnings?.length > 0);
  const primaryDepartment = departments[0]?.name || 'Phòng ban trực thuộc';

  const getEmployeeName = (empId: string) => employees.find((e) => e.id === empId)?.fullName || 'Nhan vien';

  const todayTasks = [
    ...pendingTimesheets.map((t) => ({
      id: t.id,
      type: 'timesheet',
      label: `Bảng công ${t.code}`,
      meta: `${getEmployeeName(t.employeeId)} | ${formatDate(t.workDate)}`,
      section: 'timesheet-approvals',
      tone: t.warnings?.length ? 'warning' : 'info',
    })),
    ...pendingLeaves.map((r) => ({
      id: r.id,
      type: 'leave',
      label: `Đơn nghỉ ${r.code}`,
      meta: `${getEmployeeName(r.employeeId)} | ${r.totalDays} ngày`,
      section: 'leave-approvals',
      tone: 'warning',
    })),
  ].slice(0, 6);

  const stats = [
    {
      icon: FiClock,
      label: 'Bảng công chờ duyệt',
      value: pendingTimesheets.length,
      note: 'Trong phạm vi quản lý.',
      accent: 'blue' as const,
      sectionKey: 'timesheet-approvals',
    },
    {
      icon: FiCalendar,
      label: 'Đơn nghỉ chờ duyệt',
      value: pendingLeaves.length,
      note: 'Nhân viên trực thuộc.',
      accent: 'amber' as const,
      sectionKey: 'leave-approvals',
    },
    {
      icon: FiUsers,
      label: 'Nhân viên trực thuộc',
      value: employees.length,
      note: primaryDepartment,
      accent: 'emerald' as const,
      sectionKey: 'team',
    },
    {
      icon: FiAlertTriangle,
      label: 'Cảnh báo bất thường',
      value: warningTimesheets.length,
      note: 'Miss Out, đi muộn...',
      accent: 'rose' as const,
      sectionKey: 'timesheet-reports',
    },
  ];

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Manager Workspace</span>
        <h1 className="text-3xl font-black text-slate-800 m-0">Tổng quan Manager</h1>
        <p className="text-slate-500 m-0 text-sm max-w-3xl">Theo dõi nhanh bảng công, đơn nghỉ phép và nhân sự thuộc phạm vi quản lý của {currentManager.name}.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <ManagerStatsCard
            key={stat.label}
            icon={stat.icon}
            label={stat.label}
            value={stat.value}
            note={stat.note}
            accent={stat.accent}
            onClick={() => onOpenSection(stat.sectionKey)}
          />
        ))}
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="p-6 rounded-[24px] bg-white border border-slate-200 shadow-sm flex flex-col gap-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Hôm nay</span>
                <h2 className="text-xl font-bold text-slate-800 m-0">Việc cần xử lý</h2>
              </div>
              <div className="flex gap-2">
                <button onClick={() => onOpenSection('timesheet-approvals')} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 text-slate-600 font-bold text-sm border border-slate-200 hover:bg-slate-100 transition-all">
                  <FiClock /> Bảng công
                </button>
                <button onClick={() => onOpenSection('leave-approvals')} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all">
                  <FiCalendar /> Đơn nghỉ
                </button>
              </div>
            </div>

            <div className="flex flex-col divide-y divide-slate-100">
              {todayTasks.length > 0 ? (
                todayTasks.map((task) => (
                  <div key={`${task.type}-${task.id}`} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${task.type === 'timesheet' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                          {task.type}
                        </span>
                        <strong className="text-slate-800 text-sm truncate">{task.label}</strong>
                      </div>
                      <span className="text-xs text-slate-400 truncate">{task.meta}</span>
                    </div>
                    <button
                      onClick={() => onOpenSection(task.section, task.id)}
                      className="px-4 py-1.5 rounded-lg bg-slate-50 text-slate-600 font-bold text-xs border border-slate-200 hover:bg-slate-100 transition-all"
                    >
                      Xử lý
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-slate-400 text-sm font-medium italic">Không có dữ liệu để xử lý hôm nay.</div>
              )}
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-6">
          <div className="p-6 rounded-[24px] bg-white border border-slate-200 shadow-sm flex flex-col gap-6">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Phạm vi</span>
              <h2 className="text-xl font-bold text-slate-800 m-0">Dữ liệu đang xem</h2>
            </div>
            <div className="flex flex-col gap-4">
              {[
                { label: 'Manager hiện tại', value: currentManager.name },
                { label: 'Phòng ban', value: primaryDepartment },
                { label: 'ID nhân viên', value: currentManager.managedEmployeeIds.join(', ') || 'Theo phong ban' },
              ].map((item) => (
                <div key={item.label} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{item.label}</span>
                  <strong className="text-sm text-slate-800">{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default ManagerOverview;
