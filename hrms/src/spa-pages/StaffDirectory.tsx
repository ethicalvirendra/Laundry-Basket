import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Phone, 
  Mail, 
  Briefcase, 
  IndianRupee, 
  TrendingUp, 
  X,
  CheckCircle,
  Filter,
  Trash2,
  Key,
  Lock
} from 'lucide-react';

interface StaffDirectoryProps {
  staffList: any[];
  setStaffList: React.Dispatch<React.SetStateAction<any[]>>;
  employeePasswords: Record<string, string>;
  setEmployeePasswords: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export default function StaffDirectory({ 
  staffList, 
  setStaffList, 
  employeePasswords, 
  setEmployeePasswords 
}: StaffDirectoryProps) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);

  // Reset password states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedEmpForPass, setSelectedEmpForPass] = useState<any>(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<boolean>(false);

  const hashPassword = async (password: string) => {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    const pass = newPasswordVal.trim();
    if (pass.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }

    try {
      const hashed = await hashPassword(pass);
      setEmployeePasswords(prev => {
        const updated = { ...prev };
        if (selectedEmpForPass.empId) {
          updated[selectedEmpForPass.empId] = hashed;
        }
        updated[selectedEmpForPass.email.toLowerCase()] = hashed;
        return updated;
      });
      setPasswordSuccess(true);
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess(false);
        setSelectedEmpForPass(null);
        setNewPasswordVal('');
      }, 1500);
    } catch (err) {
      setPasswordError('An error occurred while resetting the password.');
    }
  };
  
  // Form states
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newDept, setNewDept] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newSalary, setNewSalary] = useState('');
  const [newIncentive, setNewIncentive] = useState('');

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone || !newEmail || !newRole || !newDept) return;

    // Sanitize string inputs to prevent simple markup injection/XSS
    const sanitizeString = (str: string) => {
      return str.replace(/[<>]/g, '').trim();
    };

    const sanitizedName = sanitizeString(newName);
    const sanitizedRole = sanitizeString(newRole);
    const sanitizedDept = sanitizeString(newDept);
    const sanitizedEmail = sanitizeString(newEmail).toLowerCase();
    const sanitizedPhone = sanitizeString(newPhone);

    const nextId = staffList.length > 0 ? Math.max(...staffList.map(e => e.id)) + 1 : 1;
    const nextEmpId = `LBBPL${String(nextId).padStart(3, '0')}`;
    const newEmp = {
      id: nextId,
      empId: nextEmpId,
      name: sanitizedName,
      role: sanitizedRole,
      dept: sanitizedDept,
      email: sanitizedEmail,
      phone: sanitizedPhone,
      status: 'Active',
      salary: Number(newSalary) || 12000,
      incentive: Number(newIncentive) || 0,
      joinDate: new Date().toISOString().split('T')[0]
    };

    setStaffList([newEmp, ...staffList]);
    setShowAddModal(false);
    
    // Clear states
    setNewName('');
    setNewRole('');
    setNewDept('');
    setNewEmail('');
    setNewPhone('');
    setNewSalary('');
    setNewIncentive('');
  };

  const handleDeleteEmployee = (id: number) => {
    setStaffList(staffList.filter(emp => emp.id !== id));
  };

  // Filter and sort staff list designation-wise with custom top-5 priority
  const rolePriority: Record<string, number> = {
    'ceo': 1,
    'vp': 2,
    'president': 3,
    'mis': 4,
    'software developer': 5,
    'developer': 5
  };

  const getRolePriority = (role: string) => {
    const normalized = role.toLowerCase().trim();
    return rolePriority[normalized] || 999;
  };

  const filteredStaff = staffList.filter(emp => {
    const empCode = emp.empId || `LBBPL${String(emp.id).padStart(3, '0')}`;
    const matchesSearch = emp.name.toLowerCase().includes(search.toLowerCase()) || 
                          emp.email.toLowerCase().includes(search.toLowerCase()) ||
                          emp.phone.includes(search) ||
                          empCode.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'All' || emp.role === roleFilter;
    return matchesSearch && matchesRole;
  }).sort((a, b) => {
    const priorityA = getRolePriority(a.role);
    const priorityB = getRolePriority(b.role);
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // Tie-breaker 1: Alphabetical by role name
    const roleCompare = a.role.localeCompare(b.role);
    if (roleCompare !== 0) return roleCompare;
    
    // Tie-breaker 2: Alphabetical by employee name
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Search & Filter Controls */}
      <div className="glass-panel p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by name, email, phone..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs glass-input"
          />
        </div>

        {/* Filter & Actions */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/70 border border-slate-200/50 text-xs text-slate-700">
            <Filter className="w-4 h-4 text-[#1A6FDB]" />
            <select 
              value={roleFilter} 
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-transparent text-slate-700 outline-none font-bold cursor-pointer"
            >
              <option value="All" className="bg-white">All Roles</option>
              {[...new Set(staffList.map(s => s.role))].filter(Boolean).sort().map(role => (
                <option key={role} value={role} className="bg-white">{role}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={() => setShowAddModal(true)}
            className="glass-button glass-button-primary flex items-center gap-2 px-5 py-2.5 text-xs font-bold whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4 text-white" />
            <span>Onboard Employee</span>
          </button>
        </div>

      </div>

      {/* Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredStaff.map((emp) => (
          <div 
            key={emp.id} 
            className="glass-panel p-5 relative overflow-hidden group hover:border-[#1A6FDB]/30 transition-all flex flex-col justify-between"
          >
            {/* Design accents */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#1A6FDB]/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />

            {/* Profile & Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-4 border-b border-slate-200/40 pb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-slate-200/50 overflow-hidden flex items-center justify-center font-bold text-lg text-slate-800">
                  {emp.profilePhoto ? (
                    <img src={emp.profilePhoto} alt={emp.name} className="w-full h-full object-cover" />
                  ) : (
                    emp.name.split(' ').map((n: string) => n[0]).join('')
                  )}
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-800 text-base leading-tight group-hover:text-[#1A6FDB] transition-colors flex items-center gap-2 flex-wrap">
                    <span>{emp.name}</span>
                    <span className="text-[10px] font-mono text-slate-400 font-normal bg-slate-100 border border-slate-200/40 px-1 py-0.5 rounded">
                      {emp.empId || `LBBPL${String(emp.id).padStart(3, '0')}`}
                    </span>
                  </h4>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200/40 text-[10px] font-bold text-slate-600">
                      {emp.role}
                    </span>
                    <span className={`w-2 h-2 rounded-full ${
                      emp.status === 'Active' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-amber-500'
                    }`} title={emp.status} />
                  </div>
                </div>
              </div>

              {/* Staff Details */}
              <div className="space-y-2.5 text-xs text-slate-650 font-bold">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-slate-500" />
                  <span>{emp.dept} department</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-500" />
                  <a href={`mailto:${emp.email}`} className="hover:text-[#1A6FDB] hover:underline transition-all text-slate-600 font-bold">{emp.email}</a>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-500" />
                  <span>{emp.phone}</span>
                </div>
                <div className="border-t border-slate-200/40 pt-3 mt-1.5">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Base Salary</span>
                    <span className="text-slate-800 font-extrabold flex items-center gap-0.5 mt-0.5">
                      <IndianRupee className="w-3.5 h-3.5 text-slate-700" />
                      {emp.salary.toLocaleString()} / month
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between border-t border-slate-200/40 pt-4 mt-4">
              <span className="text-[10px] text-slate-400 font-bold">
                Joined: {emp.joinDate} 
                <span className="text-[#1A6FDB] ml-1 font-extrabold">
                  (AON: {(() => {
                    if (!emp.joinDate) return 0;
                    const start = new Date(emp.joinDate);
                    const today = new Date();
                    start.setHours(0, 0, 0, 0);
                    today.setHours(0, 0, 0, 0);
                    const diff = today.getTime() - start.getTime();
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                    return days < 0 ? 0 : days;
                  })()} Days)
                </span>
              </span>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => {
                    setSelectedEmpForPass(emp);
                    setNewPasswordVal('');
                    setPasswordError(null);
                    setPasswordSuccess(false);
                    setShowPasswordModal(true);
                  }}
                  className="p-2 text-slate-400 hover:text-[#1A6FDB] hover:bg-[#1A6FDB]/5 rounded-lg cursor-pointer transition-all"
                  title="Reset Employee Password"
                >
                  <Key className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDeleteEmployee(emp.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-500/5 rounded-lg cursor-pointer transition-all"
                  title="Decommission Staff"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* Elegant Add Employee Drawer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-lg p-6 border border-white/70 relative shadow-2xl bg-white/95">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200/40 pb-3.5 mb-5">
              <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#1A6FDB]" />
                Onboard New Staff Member
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-450 hover:text-slate-800 cursor-pointer transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddEmployee} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                  <input 
                    type="text" 
                    required
                    pattern="^[a-zA-Z\s.-]{2,50}$"
                    title="Name must contain only letters, spaces, hyphens, and periods, and be between 2 and 50 characters."
                    placeholder="e.g. Sarvesh Baroka" 
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs glass-input bg-white/70"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Mobile Number</label>
                  <input 
                    type="text" 
                    required
                    pattern="^\+?[0-9\s-]{10,15}$"
                    title="Phone number must be a valid number between 10 and 15 digits (spaces/hyphens allowed)."
                    placeholder="e.g. +91 98765 43210" 
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs glass-input bg-white/70"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Email Address</label>
                  <input 
                    type="email" 
                    required
                    placeholder="e.g. name@laundrybasket.com" 
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs glass-input bg-white/70"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Role</label>
                  <input 
                    type="text" 
                    required
                    pattern="^[a-zA-Z\s.-]{2,50}$"
                    title="Role must contain only letters, spaces, and hyphens, and be between 2 and 50 characters."
                    placeholder="e.g. Rider, Store Manager, Ironing Specialist" 
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs glass-input bg-white/70"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Department</label>
                  <input 
                    type="text" 
                    required
                    pattern="^[a-zA-Z\s.-]{2,50}$"
                    title="Department must contain only letters, spaces, and hyphens, and be between 2 and 50 characters."
                    placeholder="e.g. Logistics, Operations, Management" 
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs glass-input bg-white/70"
                  />
                </div>

                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Base Salary (₹/mo)</label>
                  <input 
                    type="number" 
                    min="0"
                    max="1000000"
                    placeholder="e.g. 15000" 
                    value={newSalary}
                    onChange={(e) => setNewSalary(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs glass-input bg-white/70"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200/40 pt-4 mt-6">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="px-4.5 py-2.5 text-xs font-bold text-slate-650 glass-button bg-white/50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 text-xs font-bold text-white glass-button glass-button-primary"
                >
                  Onboard & Save
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showPasswordModal && selectedEmpForPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-sm p-6 border border-white/70 relative shadow-2xl bg-white/95">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200/40 pb-3 mb-4">
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#1A6FDB]" />
                Change Password for {selectedEmpForPass.name}
              </h3>
              <button 
                onClick={() => setShowPasswordModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-450 hover:text-slate-800 cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {passwordError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-bold animate-pulse">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold">
                Password updated successfully!
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 block">New Password</label>
                <input 
                  type="text" 
                  required
                  placeholder="Enter new password (min 6 chars)" 
                  value={newPasswordVal}
                  onChange={(e) => setNewPasswordVal(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs glass-input bg-white/70 font-semibold"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200/40 pt-4 mt-4">
                <button 
                  type="button" 
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-650 glass-button bg-white/50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4.5 py-2 text-[10px] font-black uppercase tracking-wider text-white glass-button glass-button-primary"
                >
                  Save Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
