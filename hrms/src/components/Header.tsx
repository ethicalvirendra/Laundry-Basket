import React, { useState, useEffect } from 'react';
import { Bell, Search, Sparkles, Wifi, MoreVertical } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setMobileOpen: (open: boolean) => void;
}

export default function Header({ activeTab, setMobileOpen }: HeaderProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'HR Analytics';
      case 'staff': return 'Staff Directory';
      case 'shifts': return 'Shift Planner';
      case 'payroll': return 'Payroll & Comm.';
      case 'leaves': return 'Leave Requests';
      case 'tasks': return 'Daily Tasks';
      case 'attendance': return 'Attendance Management';
      case 'emp-dashboard': return 'My Workspace';
      case 'emp-shifts': return 'My Shifts';
      case 'emp-payroll': return 'My Earnings';
      case 'emp-leaves': return 'Time-Off';
      case 'emp-tasks': return 'My Tasks';
      case 'emp-attendance': return 'My Attendance';
      case 'emp-profile': return 'My Profile';
      default: return 'HRMS Portal';
    }
  };

  const getSubtitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Real-time staff metrics & summaries.';
      case 'staff': return 'Manage profiles, roles, and contacts.';
      case 'shifts': return 'Schedule weekly roster shifts.';
      case 'payroll': return 'View and disburse employee payroll sheets.';
      case 'leaves': return 'Review employee time-off requests.';
      case 'tasks': return 'Assign and monitor employee completion reports.';
      case 'attendance': return 'Track GPS-verified attendance across all employees.';
      case 'emp-dashboard': return 'Overview of your workspace and metrics.';
      case 'emp-shifts': return 'Check your shift schedules.';
      case 'emp-payroll': return 'Verify and download your monthly salary slips.';
      case 'emp-leaves': return 'Submit and track leaves.';
      case 'emp-tasks': return 'Submit and track your daily work reports.';
      case 'emp-attendance': return 'Your clock-in records and attendance history.';
      case 'emp-profile': return 'Access your profile, salary details, payslips, bank details, and offer letter.';
      default: return 'Laundry Basket staff administration.';
    }
  };

  return (
    <header className="glass-panel w-full p-4 mb-6 border border-white/50 flex items-center justify-between relative">
      {/* Title Area & Mobile Sidebar Ellipsis Toggler */}
      <div className="flex items-center gap-3 overflow-hidden mr-2">
        <button 
          onClick={() => setMobileOpen(true)}
          className="p-2.5 rounded-xl glass-button text-slate-500 hover:text-slate-850 md:hidden cursor-pointer flex-shrink-0 hover:border-[#1A6FDB]/30 hover:bg-white/50"
          title="Access Menu"
        >
          <MoreVertical className="w-5 h-5 text-[#1A6FDB]" />
        </button>
        <div className="overflow-hidden">
          <h1 className="text-base md:text-xl font-extrabold text-slate-800 flex items-center gap-1.5 leading-tight truncate">
            {getTitle()}
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block flex-shrink-0" title="System Online" />
          </h1>
          <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 font-bold truncate hidden sm:block">{getSubtitle()}</p>
        </div>
      </div>

      {/* Widget controls for desktop (md and above) */}
      <div className="hidden md:flex items-center gap-3">
        {/* Real-time Clock Widget */}
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white/60 border border-slate-200/50 font-bold text-xs text-slate-700">
          <Sparkles className="w-4 h-4 text-[#1A6FDB] animate-spin" style={{ animationDuration: '4s' }} />
          <span>
            {time.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-[#1A6FDB] font-mono tracking-wider font-extrabold">
            {time.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Quick search..." 
            className="w-[150px] focus:w-[200px] pl-9 pr-4 py-2 text-xs glass-input transition-all"
          />
        </div>

        {/* Notifications and status */}
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-xl glass-button text-slate-500 hover:text-slate-800 relative cursor-pointer">
            <Bell className="w-4.5 h-4.5" />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#1A6FDB] animate-pulse" />
          </button>
          
          <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-xs font-bold">
            <Wifi className="w-3.5 h-3.5" />
            <span>Online</span>
          </div>
        </div>
      </div>
    </header>
  );
}
