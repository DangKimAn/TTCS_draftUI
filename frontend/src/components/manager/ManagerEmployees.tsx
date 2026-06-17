import React, { useState, useMemo } from 'react';
import { FiSearch, FiEye } from 'react-icons/fi';
import { FixedSizeList as List } from 'react-window';
import { StatusBadge } from './SharedComponents';
import EmployeeDetailPanel from './EmployeeDetailPanel';
import { formatTimeFromIso } from '../../utils/timeUtils';

interface ManagerEmployeesProps {
  employees: any[];
  timesheets: any[];
  leaveRequests: any[];
  departments: any[];
}

const EmployeeRowItem = React.memo(({ index, data, style }: { index: number, data: any, style: React.CSSProperties }) => {
  const { visibleEmployees, selectedEmployeeId, setSelectedEmployeeId, getDepartmentName } = data;
  const employee = visibleEmployees[index];
  const isSelected = selectedEmployeeId === employee.id;

  return (
    <div
      style={style}
      className={`flex items-center hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 ${isSelected ? 'bg-blue-50/40' : ''}`}
    >
      <div className="flex-1 px-4 py-4 font-bold text-sm text-slate-800 truncate" style={{ flexBasis: '180px' }}>{employee.fullName}</div>
      <div className="flex-1 px-4 py-4 text-sm text-slate-600 font-medium truncate" style={{ flexBasis: '220px' }}>{employee.email}</div>
      <div className="flex-1 px-4 py-4 text-sm text-slate-600 font-medium truncate" style={{ flexBasis: '160px' }}>{getDepartmentName(employee.departmentId)}</div>
      <div className="flex-1 px-4 py-4" style={{ flexBasis: '120px' }}>
        <StatusBadge status={employee.status} />
      </div>
      <div className="flex-1 px-4 py-4 text-sm text-slate-800 font-black truncate" style={{ flexBasis: '120px' }}>{employee.leaveBalance} ngày</div>
      <div className="flex-1 px-4 py-4 text-sm text-slate-800 font-black truncate" style={{ flexBasis: '120px' }}>{(employee.monthlyHours || 0).toFixed(1)}h</div>
      <div className="flex-1 px-4 py-4" style={{ flexBasis: '120px' }}>
        <button
          onClick={() => setSelectedEmployeeId(employee.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 text-slate-600 font-bold text-xs border border-slate-200 hover:bg-slate-100 transition-all"
        >
          <FiEye /> Chi tiết
        </button>
      </div>
    </div>
  );
});

const EmployeeMobileCard = React.memo(({
  employee,
  isSelected,
  getDepartmentName,
  onSelect,
}: {
  employee: any;
  isSelected: boolean;
  getDepartmentName: (id: string) => string;
  onSelect: (id: string) => void;
}) => (
  <article className={`manager-mobile-card${isSelected ? ' is-selected' : ''}`}>
    <div className="manager-mobile-card__header">
      <div>
        <strong>{employee.fullName}</strong>
        <span>{employee.email}</span>
      </div>
      <StatusBadge status={employee.status} />
    </div>

    <div className="manager-mobile-card__grid">
      <div>
        <span>Phòng ban</span>
        <strong>{getDepartmentName(employee.departmentId)}</strong>
      </div>
      <div>
        <span>Số dư phép</span>
        <strong>{employee.leaveBalance} ngày</strong>
      </div>
      <div>
        <span>Giờ tháng này</span>
        <strong>{(employee.monthlyHours || 0).toFixed(1)}h</strong>
      </div>
    </div>

    <button
      type="button"
      onClick={() => onSelect(employee.id)}
      className="manager-mobile-card__button"
    >
      <FiEye /> Chi tiết
    </button>
  </article>
));

const ManagerEmployees: React.FC<ManagerEmployeesProps> = ({
  employees,
  timesheets,
  leaveRequests,
  departments,
}) => {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(employees[0]?.id || '');

  const visibleEmployees = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return employees.filter((employee) => {
      const matchesSearch =
        !normalizedQuery ||
        employee.fullName.toLowerCase().includes(normalizedQuery) ||
        employee.email.toLowerCase().includes(normalizedQuery);
      const matchesStatus = statusFilter === 'all' || employee.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [employees, query, statusFilter]);

  const selectedEmployee = useMemo(() => 
    employees.find((employee) => employee.id === selectedEmployeeId) ||
    visibleEmployees[0] ||
    null
  , [employees, selectedEmployeeId, visibleEmployees]);

  const recentTimesheets = useMemo(() => {
    if (!selectedEmployee) return [];
    
    const employeeTimesheet = timesheets.find((ts) => ts.employeeId === selectedEmployee.id);
    if (!employeeTimesheet) return [];

    const sourceRecords =
      Array.isArray(employeeTimesheet.records) && employeeTimesheet.records.length > 0
        ? employeeTimesheet.records
        : Array.isArray(employeeTimesheet.entries) && employeeTimesheet.entries.length > 0
          ? employeeTimesheet.entries
          : Array.isArray(employeeTimesheet.rows) && employeeTimesheet.rows.length > 0
            ? employeeTimesheet.rows
            : employeeTimesheet.workDate || employeeTimesheet.date
              ? [employeeTimesheet]
              : [];

    return [...sourceRecords]
      .sort((a, b) => new Date(b.date || b.workDate).getTime() - new Date(a.date || a.workDate).getTime())
      .slice(0, 4)
      .map((record) => ({
        ...record,
        id: record.id || record.timesheetEntryID,
        workDate: record.date || record.workDate,
        checkIn: record.checkInTime || formatTimeFromIso(record.checkIn) || record.checkIn || '',
        checkOut: record.checkOutTime || formatTimeFromIso(record.checkOut) || record.checkOut || '',
        totalHours: record.totalHours ?? 0,
      }));
  }, [selectedEmployee, timesheets]);

  const recentLeaves = useMemo(() => selectedEmployee
    ? leaveRequests
        .filter((request) => request.employeeId === selectedEmployee.id)
        .sort((a, b) => b.startDate.localeCompare(a.startDate))
        .slice(0, 4)
    : []
  , [selectedEmployee, leaveRequests]);

  const getDepartmentName = (id: string) => departments.find((d) => d.id === id)?.name || '--';

  const rowHeight = 72;
  const listHeight = Math.min(visibleEmployees.length * rowHeight, 600);

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Team</span>
        <h1 className="text-3xl font-black text-slate-800 m-0">Nhân sự phụ trách</h1>
        <p className="text-slate-500 m-0 text-sm max-w-3xl">Danh sách nhân viên thuộc phạm vi quản lý trực tiếp.</p>
      </div>

      <div className="manager-responsive-panel p-6 rounded-[28px] bg-white border border-slate-200 shadow-sm flex flex-col gap-6">
        <div className="manager-toolbar flex items-center justify-between gap-4 flex-wrap">
          <div className="relative w-full max-w-md manager-toolbar__search">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo tên hoặc email..."
              className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all"
            />
          </div>
          <div className="manager-toolbar__filters flex gap-2">
            {['all', 'Active', 'Inactive'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {status === 'all' ? 'Tất cả' : status}
              </button>
            ))}
          </div>
        </div>

        <div className="manager-desktop-table overflow-x-auto -mx-6">
          <div className="min-w-[1200px]">
            {/* Header */}
            <div className="flex bg-slate-50/50 border-y border-slate-100">
              <div className="flex-1 px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider" style={{ flexBasis: '180px' }}>Họ tên</div>
              <div className="flex-1 px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider" style={{ flexBasis: '220px' }}>Email</div>
              <div className="flex-1 px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider" style={{ flexBasis: '160px' }}>Phòng ban</div>
              <div className="flex-1 px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider" style={{ flexBasis: '120px' }}>Trạng thái</div>
              <div className="flex-1 px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider" style={{ flexBasis: '120px' }}>Số dư phép</div>
              <div className="flex-1 px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider" style={{ flexBasis: '120px' }}>Giờ tháng này</div>
              <div className="flex-1 px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider" style={{ flexBasis: '120px' }}>Hành động</div>
            </div>

            {/* Body */}
            {visibleEmployees.length > 0 ? (
              <List
                height={listHeight}
                itemCount={visibleEmployees.length}
                itemSize={rowHeight}
                width="100%"
                itemData={{
                  visibleEmployees,
                  selectedEmployeeId,
                  setSelectedEmployeeId,
                  getDepartmentName,
                }}
              >
                {EmployeeRowItem}
              </List>
            ) : (
              <div className="px-4 py-12 text-center text-slate-400 text-sm font-medium italic">Không tìm thấy nhân viên phù hợp.</div>
            )}
          </div>
        </div>

        <div className="manager-mobile-list">
          {visibleEmployees.length > 0 ? (
            visibleEmployees.map((employee) => (
              <EmployeeMobileCard
                key={employee.id}
                employee={employee}
                isSelected={selectedEmployee?.id === employee.id}
                getDepartmentName={getDepartmentName}
                onSelect={setSelectedEmployeeId}
              />
            ))
          ) : (
            <div className="manager-mobile-empty">Không tìm thấy nhân viên phù hợp.</div>
          )}
        </div>
      </div>

      <EmployeeDetailPanel
        employee={selectedEmployee}
        departments={departments}
        timesheets={recentTimesheets}
        leaveRequests={recentLeaves}
      />
    </section>
  );
};

export default ManagerEmployees;
