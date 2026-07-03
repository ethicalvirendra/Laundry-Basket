import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  CalendarDays, 
  CircleDollarSign, 
  FileSpreadsheet, 
  LogOut,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Shield,
  UserCheck,
  ClipboardList,
  User,
  Fingerprint,
  Key
} from 'lucide-react';
import logoImg from '../assets/logo.png';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  viewMode: 'admin' | 'employee';
  setViewMode: React.Dispatch<React.SetStateAction<'admin' | 'employee'>>;
  pendingLeavesCount: number;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  currentUser: any;
  onLogout: () => void;
  onChangePasswordClick?: () => void;
}

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  collapsed, 
  setCollapsed,
  viewMode,
  setViewMode,
  pendingLeavesCount,
  mobileOpen,
  setMobileOpen,
  currentUser,
  onLogout,
  onChangePasswordClick
}: SidebarProps) {
  
  interface MenuItem {
    id: string;
    label: string;
    icon: React.ComponentType<any>;
    badge?: number;
  }

  // Menu items depend on selected viewMode
  const adminMenuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'staff', label: 'Staff Directory', icon: Users },
    { id: 'shifts', label: 'Shift Planner', icon: CalendarDays },
    { id: 'payroll', label: 'Payroll Sheets', icon: CircleDollarSign },
    { id: 'leaves', label: 'Leave Requests', icon: FileSpreadsheet, badge: pendingLeavesCount },
    { id: 'tasks', label: 'Daily Tasks', icon: ClipboardList },
    { id: 'attendance', label: 'Attendance', icon: Fingerprint },
  ];

  const employeeMenuItems: MenuItem[] = [
    { id: 'emp-dashboard', label: 'My Workspace', icon: LayoutDashboard },
    { id: 'emp-shifts', label: 'My Shifts', icon: CalendarDays },
    { id: 'emp-payroll', label: 'My Payslips', icon: CircleDollarSign },
    { id: 'emp-leaves', label: 'Apply for Leave', icon: FileSpreadsheet },
    { id: 'emp-tasks', label: 'My Tasks', icon: ClipboardList },
    { id: 'emp-attendance', label: 'My Attendance', icon: Fingerprint },
    { id: 'emp-profile', label: 'Profile', icon: User },
  ];

  const menuItems = viewMode === 'admin' ? adminMenuItems : employeeMenuItems;

  return (
    <aside 
      className={`glass-panel fixed z-50 flex flex-col justify-between transition-all duration-300 w-68 top-0 bottom-0 left-0 !rounded-none !rounded-r-3xl !border-y-0 !border-l-0 shadow-2xl ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      } md:top-4 md:bottom-4 md:left-4 md:translate-x-0 md:!rounded-3xl md:!border md:border-white/40 ${
        collapsed ? 'md:w-20' : 'md:w-68'
      }`}
    >
      {/* Sidebar Header */}
      <div>
        <div className="p-5 flex items-center justify-between border-b border-slate-200/40 relative">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-lg bg-white/80 backdrop-blur-md flex items-center justify-center border border-white/50 shadow-md flex-shrink-0">
              <img src={logoImg} alt="Laundry Basket Logo" className="w-7 h-7 object-contain" />
            </div>
            {!collapsed && (
              <span className="font-bold text-lg bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900 bg-clip-text text-transparent whitespace-nowrap">
                HRMS
              </span>
            )}
          </div>
          
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full glass-panel hidden md:flex items-center justify-center border border-slate-200/50 hover:border-[#1A6FDB]/40 text-slate-500 hover:text-slate-800 cursor-pointer transition-all"
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>

          {/* Mobile Close/Dismiss Trigger */}
          <button 
            onClick={() => setMobileOpen(false)}
            className="p-1 rounded-lg hover:bg-slate-100/50 text-slate-450 hover:text-slate-800 md:hidden cursor-pointer transition-all"
            title="Close Drawer"
          >
            <ChevronLeft className="w-5 h-5 text-[#1A6FDB]" />
          </button>
        </div>

        {/* Workspace Switching Toggle Widget */}
        {!collapsed && currentUser?.email?.toLowerCase() === 'hr@laundrybasket.com' && (
          <div className="p-3 mx-2 mt-4 rounded-2xl bg-slate-100/50 border border-slate-200/30 flex p-1 relative shadow-inner">
            <button
              onClick={() => {
                setViewMode('admin');
                setActiveTab('dashboard');
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10.5px] font-extrabold uppercase rounded-xl transition-all cursor-pointer ${
                viewMode === 'admin'
                  ? 'bg-white text-[#1A6FDB] shadow-sm border border-slate-200/30'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
            <button
              onClick={() => {
                setViewMode('employee');
                setActiveTab('emp-dashboard');
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10.5px] font-extrabold uppercase rounded-xl transition-all cursor-pointer ${
                viewMode === 'employee'
                  ? 'bg-white text-[#1A6FDB] shadow-sm border border-slate-200/30'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Staff</span>
            </button>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="p-3 space-y-1.5 mt-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl transition-all duration-200 group relative overflow-hidden cursor-pointer ${
                  isActive 
                    ? 'bg-[#1A6FDB]/8 text-[#1A6FDB] border-l-4 border-[#1A6FDB] shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/40 border-l-4 border-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110 duration-200 ${
                  isActive ? 'text-[#1A6FDB]' : 'text-slate-500 group-hover:text-slate-800'
                }`} />
                
                {!collapsed && (
                  <span className="font-bold text-[14.5px] whitespace-nowrap">
                    {item.label}
                  </span>
                )}

                {item.badge && !collapsed && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-0.5 text-[10px] font-bold bg-pink-500/10 text-pink-600 border border-pink-500/20 rounded-full animate-bounce">
                    {item.badge}
                  </span>
                )}
                
                {/* Active glow dot for collapsed */}
                {isActive && collapsed && (
                  <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-[#1A6FDB]" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer / User Profile */}
      <div className="p-3 border-t border-slate-200/40">
        <div className={`flex items-center gap-3 p-2.5 rounded-xl bg-white/50 border border-slate-200/40 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200/50 overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-[#1A6FDB] bg-gradient-to-br from-white to-blue-50">
            {currentUser?.profilePhoto ? (
              <img src={currentUser.profilePhoto} alt={currentUser.name} className="w-full h-full object-cover" />
            ) : (
              currentUser?.name ? currentUser.name.split(' ').map((n: string) => n[0]).join('') : 'U'
            )}
          </div>
          {!collapsed && (
            <div className="overflow-hidden flex-1">
              <p className="text-[14px] font-bold text-slate-800 leading-tight truncate">
                {currentUser?.name || 'User'}
              </p>
              <p className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
                {currentUser?.email || ''}
              </p>
            </div>
          )}
        </div>
        
        {onChangePasswordClick && (
          <button 
            onClick={onChangePasswordClick}
            className={`w-full flex items-center justify-center gap-2 mt-2 py-2 px-3 text-xs text-[#1A6FDB] hover:text-[#1A6FDB]/80 rounded-lg hover:bg-[#1A6FDB]/5 cursor-pointer transition-all duration-200 ${collapsed ? 'h-9 w-9 p-0 mx-auto' : ''}`}
            title="Change Password"
          >
            <Key className="w-4 h-4" />
            {!collapsed && <span className="font-bold">Change Password</span>}
          </button>
        )}

        <button 
          onClick={onLogout}
          className={`w-full flex items-center justify-center gap-2 mt-1 py-2 px-3 text-xs text-rose-600 hover:text-rose-700 rounded-lg hover:bg-rose-500/5 cursor-pointer transition-all duration-200 ${collapsed ? 'h-9 w-9 p-0 mx-auto' : ''}`}
          title="Sign Out"
        >
          <LogOut className="w-4.5 h-4.5" />
          {!collapsed && <span className="font-bold">Logout System</span>}
        </button>
      </div>
    </aside>
  );
}
