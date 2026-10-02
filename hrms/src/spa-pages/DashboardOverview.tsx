import React from 'react';
import { 
  Users, 
  UserCheck, 
  FileClock, 
  PiggyBank, 
  TrendingUp, 
  ArrowUpRight, 
  ChevronRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

// Mock data for attendance history
const attendanceData = [
  { name: 'Mon', attendance: 92, target: 95 },
  { name: 'Tue', attendance: 94, target: 95 },
  { name: 'Wed', attendance: 98, target: 95 },
  { name: 'Thu', attendance: 96, target: 95 },
  { name: 'Fri', attendance: 95, target: 95 },
  { name: 'Sat', attendance: 88, target: 95 },
  { name: 'Sun', attendance: 91, target: 95 },
];

// Mock recent activities
const recentActivities = [
  { id: 1, type: 'clock-in', staff: 'Bhupendra Sarathe (Rider)', details: 'Clocked in at Central Hub (08:58 AM)', time: '10 mins ago', status: 'success' },
  { id: 2, type: 'leave', staff: 'Neeraj Singh Parihar (VP)', details: 'Submitted Casual Leave (June 4th - 5th)', time: '1 hour ago', status: 'warning' },
  { id: 3, type: 'payroll', staff: 'System Admin', details: 'Generated May 2026 payroll worksheets', time: '3 hours ago', status: 'info' },
  { id: 4, type: 'status', staff: 'Keshav Sahu (Rider)', details: 'Assigned to South Store Morning Shift', time: '5 hours ago', status: 'cyan' },
];

interface DashboardOverviewProps {
  setActiveTab: (tab: string) => void;
  staffList: any[];
  payrollList: any[];
  leavesList: any[];
}

export default function DashboardOverview({ setActiveTab, staffList, payrollList, leavesList }: DashboardOverviewProps) {
  // Dynamic stats calculations
  const totalStaff = staffList.length;
  
  // Calculate attendance dynamically — handles both DB (startDate/endDate) and legacy (dates string) formats
  const todayStr = new Date().toISOString().split('T')[0];
  const onLeaveToday = leavesList.filter(l => {
    if (l.status !== 'Approved') return false;
    if (l.startDate && l.endDate) {
      // DB format: compare ISO date strings directly
      return l.startDate <= todayStr && todayStr <= l.endDate;
    }
    // Legacy local format: approximate by checking the month string
    if (l.dates) {
      const currentMonthName = new Date().toLocaleString('en-US', { month: 'long' }).toLowerCase();
      return l.dates.toLowerCase().includes(currentMonthName);
    }
    return false;
  }).length;
  const presentCount = Math.max(0, totalStaff - onLeaveToday);
  const attendanceRate = totalStaff > 0 ? ((presentCount / totalStaff) * 100).toFixed(1) : '100';

  // Calculate pending requests count
  const pendingLeavesCount = leavesList.filter(l => l.status === 'Pending').length;

  // Calculate total monthly base payroll pool
  const totalBasePool = staffList.reduce((acc, emp) => acc + emp.salary, 0);

  // Department-wise Salary Breakdown
  const deptSalaries = staffList.reduce((acc: Record<string, number>, emp) => {
    const dept = emp.dept || 'MANAGEMENT';
    acc[dept] = (acc[dept] || 0) + emp.salary;
    return acc;
  }, {});

  const deptColors = ['#1A6FDB', '#06b6d4', '#ec4899', '#f59e0b', '#10b981', '#6366f1'];
  const deptSalaryData = Object.entries(deptSalaries).map(([name, salary], index) => ({
    name: name.replace('Softwere ', '').replace('SERVICE AND ', 'S&D '),
    salary,
    color: deptColors[index % deptColors.length]
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Stat Card 1: Total Staff */}
        <div className="glass-panel glass-panel-hover glass-card-primary p-5 flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Active Staff</p>
            <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight">{totalStaff}</h3>
            <p className="text-xs text-[#1A6FDB] font-bold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+3 new this month</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[#1A6FDB] shadow-inner">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Stat Card 2: Attendance Rate */}
        <div className="glass-panel glass-panel-hover glass-card-cyan p-5 flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Today's Attendance</p>
            <h3 className="text-3xl font-extrabold text-cyan-600 tracking-tight">{attendanceRate}%</h3>
            <p className="text-xs text-slate-600 font-semibold">{presentCount} / {totalStaff} staff present</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-600">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Stat Card 3: Pending Leaves */}
        <div className="glass-panel glass-panel-hover glass-card-pink p-5 flex items-center justify-between cursor-pointer" onClick={() => setActiveTab('leaves')}>
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pending Requests</p>
            <h3 className="text-3xl font-extrabold text-pink-600 tracking-tight">{pendingLeavesCount}</h3>
            <p className="text-xs text-pink-600 font-bold flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 animate-bounce" />
              <span>Action required today</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-600">
            <FileClock className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        {/* Stat Card 4: Monthly Payroll Pool */}
        <div className="glass-panel glass-panel-hover glass-card-warning p-5 flex items-center justify-between cursor-pointer" onClick={() => setActiveTab('payroll')}>
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Monthly Payroll Pool</p>
            <h3 className="text-3xl font-extrabold text-amber-600 tracking-tight">₹{totalBasePool.toLocaleString()}</h3>
            <p className="text-xs text-emerald-600 font-bold flex items-center gap-1">
              <span>Ready for disbursement</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
            <PiggyBank className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Weekly Attendance Trends */}
        <div className="glass-panel p-5 lg:col-span-7 flex flex-col justify-between min-h-[350px]">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200/40 pb-3 mb-4">
              <h3 className="text-sm md:text-base font-extrabold text-slate-800 flex items-center gap-2">
                <UserCheck className="w-4.5 h-4.5 text-[#1A6FDB]" />
                Weekly Attendance Pattern (%)
              </h3>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 px-2.5 py-0.5 rounded-full bg-white/50 border border-slate-200/50">
                Last 7 Days
              </span>
            </div>
          </div>
          
          <div className="flex-1 w-full h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendanceData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1A6FDB" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#1A6FDB" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis domain={[70, 100]} stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    background: 'rgba(255, 255, 255, 0.95)', 
                    border: '1px solid rgba(0,0,0,0.06)', 
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#0f172a',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.05)'
                  }} 
                />
                <Area type="monotone" dataKey="attendance" name="Attendance" stroke="#1A6FDB" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAttendance)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department-wise Payroll */}
        <div className="glass-panel p-5 lg:col-span-5 flex flex-col justify-between min-h-[350px]">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200/40 pb-3 mb-4">
              <h3 className="text-sm md:text-base font-extrabold text-slate-800 flex items-center gap-2">
                <PiggyBank className="w-4.5 h-4.5 text-cyan-600" />
                Department Payroll Breakdown
              </h3>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 px-2.5 py-0.5 rounded-full bg-white/50 border border-slate-200/50">
                Monthly Pool
              </span>
            </div>
          </div>

          <div className="flex-1 w-full h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptSalaryData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.01)' }}
                  contentStyle={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid rgba(0,0,0,0.06)',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#0f172a',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.05)'
                  }}
                  formatter={(value) => [`₹${value}`, 'Payroll Pool']}
                />
                <Bar dataKey="salary" radius={[6, 6, 0, 0]}>
                  {deptSalaryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Bottom Grid: Recent Activity & Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Recent Activities */}
        <div className="glass-panel p-5 lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/40 pb-3">
            <h3 className="text-sm md:text-base font-extrabold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-4.5 h-4.5 text-emerald-600" />
              Live Activity Log
            </h3>
            <button className="text-xs text-[#1A6FDB] hover:text-blue-700 font-bold flex items-center gap-0.5 cursor-pointer">
              <span>View all</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3.5">
            {recentActivities.map((act) => {
              let statusClass = 'bg-slate-100 border-slate-200 text-slate-700';
              if (act.status === 'success') statusClass = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600';
              if (act.status === 'warning') statusClass = 'bg-amber-500/10 border-amber-500/20 text-amber-700';
              if (act.status === 'info') statusClass = 'bg-purple-500/10 border-purple-500/20 text-purple-600';
              if (act.status === 'cyan') statusClass = 'bg-cyan-500/10 border-cyan-500/20 text-cyan-600';

              return (
                <div key={act.id} className="flex items-start justify-between gap-4 p-3.5 rounded-xl bg-white/40 border border-slate-200/30 hover:bg-white/70 transition-all">
                  <div className="flex items-start gap-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${statusClass} mt-0.5 flex-shrink-0`}>
                      {act.type}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-slate-800 leading-tight">{act.staff}</p>
                      <p className="text-xs text-slate-500 mt-1 font-semibold">{act.details}</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 font-mono whitespace-nowrap">{act.time}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Command Centre */}
        <div className="glass-panel p-5 lg:col-span-4 flex flex-col justify-between space-y-4">
          <div className="border-b border-slate-200/40 pb-3">
            <h3 className="text-sm md:text-base font-extrabold text-slate-800 flex items-center gap-2">
              <Zap className="w-4.5 h-4.5 text-amber-500" />
              Administrative Actions
            </h3>
          </div>

          <div className="space-y-2.5 flex-1 flex flex-col justify-center">
            <button 
              onClick={() => setActiveTab('staff')}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-purple-500/5 border border-purple-500/15 hover:bg-purple-500/10 cursor-pointer text-left group transition-all"
            >
              <div>
                <p className="text-xs uppercase font-extrabold text-purple-700">Staff Portal</p>
                <p className="text-[11px] text-slate-500 mt-0.5 font-bold">Add, onboard, or modify staff</p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-purple-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>

            <button 
              onClick={() => setActiveTab('shifts')}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-cyan-500/5 border border-cyan-500/15 hover:bg-cyan-500/10 cursor-pointer text-left group transition-all"
            >
              <div>
                <p className="text-xs uppercase font-extrabold text-cyan-700">Assign Shifts</p>
                <p className="text-[11px] text-slate-500 mt-0.5 font-bold">Plan schedule for coming week</p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-cyan-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>

            <button 
              onClick={() => setActiveTab('payroll')}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/15 hover:bg-amber-500/10 cursor-pointer text-left group transition-all"
            >
              <div>
                <p className="text-xs uppercase font-extrabold text-amber-700">Manage Payroll</p>
                <p className="text-[11px] text-slate-500 mt-0.5 font-bold">Verify worksheets & disburse salaries</p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-amber-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
