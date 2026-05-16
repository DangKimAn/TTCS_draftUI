import React, { useState, useMemo } from 'react';
import { FiSearch, FiEye } from 'react-icons/fi';
import { FixedSizeList as List } from 'react-window';
import { StatusBadge } from './SharedComponents';
import EmployeeDetailPanel from './EmployeeDetailPanel';

interface ManagerEmployeesProps {
  employees: any[];
  timesheets: any[];
  leaveRequests: any[];
  departments: any[];
}

const EmployeeRowItem = React.memo(({ index, data, style }: any) => {
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
      <div className="flex-1 px-4 py-4 text-sm text-slate-600 font-medium truncate" style={{ flexBasis: '140px' }}>{employee.title}</div>
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

  const recentTimesheets = useMemo(() => selectedEmployee
    ? timesheets
        .filter((timesheet) => timesheet.employeeId === selectedEmployee.id)
        .sort((a, b) => b.workDate.localeCompare(a.workDate))
        .slice(0, 4)
    : []
  , [selectedEmployee, timesheets]);

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

      <div className="p-6 rounded-[28px] bg-white border border-slate-200 shadow-sm flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="relative w-full max-w-md">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo tên hoặc email..."
              className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all"
            />
          </div>
          <div className="flex gap-2">
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

        <div className="overflow-x-auto -mx-6">
          <div className="min-w-[1200px]">
            {/* Header */}
            <div className="flex bg-slate-50/50 border-y border-slate-100">
              <div className="flex-1 px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider" style={{ flexBasis: '180px' }}>Họ tên</div>
              <div className="flex-1 px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider" style={{ flexBasis: '220px' }}>Email</div>
              <div className="flex-1 px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider" style={{ flexBasis: '160px' }}>Phòng ban</div>
              <div className="flex-1 px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider" style={{ flexBasis: '140px' }}>Chức vụ</div>
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
