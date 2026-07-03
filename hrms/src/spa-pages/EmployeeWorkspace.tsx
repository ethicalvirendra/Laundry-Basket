import React, { useState } from 'react';
import { 
  UserCheck, 
  Clock, 
  IndianRupee, 
  Send, 
  Calendar, 
  Sparkles, 
  CheckCircle, 
  FileClock, 
  Briefcase,
  AlertCircle,
  MapPin,
  Navigation,
  Lock,
  Unlock,
  AlertTriangle,
  ClipboardList,
  FileText,
  Printer,
  FileSpreadsheet,
  Camera,
  Upload,
  Trash2,
  Eye,
  Check,
  File,
  FileCheck
} from 'lucide-react';
import logoImg from '../assets/logo.png';

interface EmployeeWorkspaceProps {
  staffList: any[];
  setStaffList: React.Dispatch<React.SetStateAction<any[]>>;
  shifts: Record<string, any[]>;
  payrollList: any[];
  leavesList: any[];
  setLeavesList: React.Dispatch<React.SetStateAction<any[]>>;
  activeSubTab: string;
  clockLogs: any[];
  setClockLogs: React.Dispatch<React.SetStateAction<any[]>>;
  tasksList: any[];
  setTasksList: React.Dispatch<React.SetStateAction<any[]>>;
  currentUser: any;
  setCurrentUser: React.Dispatch<React.SetStateAction<any>>;
  employeePasswords?: Record<string, string>;
  setEmployeePasswords?: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export default function EmployeeWorkspace({ 
  staffList, 
  setStaffList,
  shifts, 
  payrollList, 
  leavesList, 
  setLeavesList,
  activeSubTab,
  clockLogs,
  setClockLogs,
  tasksList,
  setTasksList,
  currentUser,
  setCurrentUser,
  employeePasswords = {},
  setEmployeePasswords
}: EmployeeWorkspaceProps) {
  // Active logged in employee simulator state
  const [activeEmployeeId, setActiveEmployeeId] = useState<number>(currentUser?.id || 1);

  // Document Preview Modal states
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);
  const [previewDocTitle, setPreviewDocTitle] = useState<string>('');

  // Profile tab inner navigation states (must be top-level per Rules of Hooks)
  const [docTab, setDocTab] = useState<'offer' | 'payslips' | 'documents'>('offer');
  const [selectedPayslipMonth, setSelectedPayslipMonth] = useState<string>('May 2026');

  // Bank Details Editing States
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [editBankName, setEditBankName] = useState('');
  const [editBankAcc, setEditBankAcc] = useState('');
  const [editBankIfsc, setEditBankIfsc] = useState('');
  const [editBankHolder, setEditBankHolder] = useState('');
  const [editUpiId, setEditUpiId] = useState('');

  // Offer Letter Editing States
  const [isEditingOffer, setIsEditingOffer] = useState(false);
  const [editOfferRole, setEditOfferRole] = useState('');
  const [editOfferJoinDate, setEditOfferJoinDate] = useState('');
  const [editOfferDept, setEditOfferDept] = useState('');
  const [editOfferSalary, setEditOfferSalary] = useState<number>(12000);

  // Payslip / Salary Slip Editing States
  const [isEditingPayslip, setIsEditingPayslip] = useState(false);
  const [editPayslipSalary, setEditPayslipSalary] = useState<number>(12000);
  const [editPayslipPaidDays, setEditPayslipPaidDays] = useState<number>(30);
  const [editPayslipBonus, setEditPayslipBonus] = useState<number>(0);

  // Inline password change states
  const [inlineCurrentPass, setInlineCurrentPass] = useState<string>('');
  const [inlineNewPass, setInlineNewPass] = useState<string>('');
  const [inlineConfirmPass, setInlineConfirmPass] = useState<string>('');
  const [inlinePasswordError, setInlinePasswordError] = useState<string | null>(null);
  const [inlinePasswordSuccess, setInlinePasswordSuccess] = useState<boolean>(false);

  const hashPassword = async (password: string) => {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleInlinePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setInlinePasswordError(null);
    setInlinePasswordSuccess(false);

    const cur = inlineCurrentPass.trim();
    const nxt = inlineNewPass.trim();
    const conf = inlineConfirmPass.trim();

    if (!cur || !nxt || !conf) {
      setInlinePasswordError('All fields are required.');
      return;
    }

    if (nxt.length < 6) {
      setInlinePasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (nxt !== conf) {
      setInlinePasswordError('New passwords do not match.');
      return;
    }

    if (nxt === '1234' || nxt === 'LBBPL1234') {
      setInlinePasswordError('New password cannot be the same as the default temporary password.');
      return;
    }

    try {
      const currentHash = await hashPassword(cur);
      const emailKey = currentEmployee.email.toLowerCase();
      
      const TEMP_PASSWORD_HASH = 'c06711838b266b83db308ce664591886c1db5a6682defc68fd0e1754e021d848';
      const DEFAULT_PASSWORD_HASH = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4'; // '1234'
      let isValidCurrent = false;

      if (emailKey === 'hr@laundrybasket.com') {
        const storedHash = employeePasswords[emailKey];
        if (storedHash) {
          isValidCurrent = (currentHash === storedHash);
        } else {
          isValidCurrent = (currentHash === TEMP_PASSWORD_HASH || currentHash === DEFAULT_PASSWORD_HASH || currentHash === 'b1cfb6a12530eb73708d70df82ccb5774e1d5ebc98ef2e22f2fdcd42e1289196');
        }
      } else {
        const storedHash = employeePasswords[currentEmployee.empId] || employeePasswords[emailKey];
        if (storedHash) {
          isValidCurrent = (currentHash === storedHash);
        } else {
          isValidCurrent = (currentHash === TEMP_PASSWORD_HASH || currentHash === DEFAULT_PASSWORD_HASH);
        }
      }

      if (!isValidCurrent) {
        setInlinePasswordError('Incorrect current password.');
        return;
      }

      const newHash = await hashPassword(nxt);
      if (setEmployeePasswords) {
        setEmployeePasswords(prev => {
          const updated = { ...prev };
          if (currentEmployee.empId) {
            updated[currentEmployee.empId] = newHash;
          }
          updated[emailKey] = newHash;
          return updated;
        });
      }

      setInlinePasswordSuccess(true);
      setInlineCurrentPass('');
      setInlineNewPass('');
      setInlineConfirmPass('');
      
      setTimeout(() => {
        setInlinePasswordSuccess(false);
      }, 3000);

    } catch (err) {
      setInlinePasswordError('An error occurred while changing your password.');
    }
  };

  // Retrieve selected simulated employee profile
  const isHRAdmin = currentUser?.email?.toLowerCase() === 'hr@laundrybasket.com';
  const currentEmployee = isHRAdmin
    ? (staffList.find(emp => emp.id === activeEmployeeId) || staffList[0])
    : currentUser;

  // Document Upload Helpers
  const handleDocumentUpload = (file: File, docType: string) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      
      // Update staffList
      setStaffList(prev => prev.map(emp => {
        if (emp.id === currentEmployee.id) {
          return {
            ...emp,
            [docType]: dataUrl,
            [`${docType}Name`]: file.name
          };
        }
        return emp;
      }));

      // Update currentUser
      setCurrentUser((prev: any) => {
        if (prev && prev.id === currentEmployee.id) {
          return {
            ...prev,
            [docType]: dataUrl,
            [`${docType}Name`]: file.name
          };
        }
        return prev;
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDocumentDelete = (docType: string) => {
    // Update staffList
    setStaffList(prev => prev.map(emp => {
      if (emp.id === currentEmployee.id) {
        const updated = { ...emp };
        delete updated[docType];
        delete updated[`${docType}Name`];
        return updated;
      }
      return emp;
    }));

    // Update currentUser
    setCurrentUser((prev: any) => {
      if (prev && prev.id === currentEmployee.id) {
        const updated = { ...prev };
        delete updated[docType];
        delete updated[`${docType}Name`];
        return updated;
      }
      return prev;
    });
  };

  const handleEditBankClick = () => {
    setEditBankName(currentEmployee.bankName || '');
    setEditBankAcc(currentEmployee.bankAcc || '');
    setEditBankIfsc(currentEmployee.bankIfsc || '');
    setEditBankHolder(currentEmployee.bankHolder || '');
    setEditUpiId(currentEmployee.upiId || '');
    setIsEditingBank(true);
  };

  const handleSaveBank = () => {
    setStaffList(prev => prev.map(emp => {
      if (emp.id === currentEmployee.id) {
        return {
          ...emp,
          bankName: editBankName,
          bankAcc: editBankAcc,
          bankIfsc: editBankIfsc,
          bankHolder: editBankHolder,
          upiId: editUpiId
        };
      }
      return emp;
    }));

    setCurrentUser((prev: any) => {
      if (prev && prev.id === currentEmployee.id) {
        return {
          ...prev,
          bankName: editBankName,
          bankAcc: editBankAcc,
          bankIfsc: editBankIfsc,
          bankHolder: editBankHolder,
          upiId: editUpiId
        };
      }
      return prev;
    });

    setIsEditingBank(false);
  };

  const handleEditOfferClick = () => {
    setEditOfferRole(currentEmployee.role || '');
    setEditOfferJoinDate(currentEmployee.joinDate || '');
    setEditOfferDept(currentEmployee.dept || '');
    setEditOfferSalary(currentEmployee.salary || 12000);
    setIsEditingOffer(true);
  };

  const handleSaveOffer = () => {
    setStaffList(prev => prev.map(emp => {
      if (emp.id === currentEmployee.id) {
        return {
          ...emp,
          role: editOfferRole,
          joinDate: editOfferJoinDate,
          dept: editOfferDept,
          salary: editOfferSalary
        };
      }
      return emp;
    }));

    setCurrentUser((prev: any) => {
      if (prev && prev.id === currentEmployee.id) {
        return {
          ...prev,
          role: editOfferRole,
          joinDate: editOfferJoinDate,
          dept: editOfferDept,
          salary: editOfferSalary
        };
      }
      return prev;
    });

    setIsEditingOffer(false);
  };

  const handleEditPayslipClick = () => {
    setEditPayslipSalary(currentEmployee.salary || 12000);
    setEditPayslipPaidDays(currentEmployee.paidDays !== undefined ? currentEmployee.paidDays : 30);
    setEditPayslipBonus(currentEmployee.bonus !== undefined ? currentEmployee.bonus : (currentEmployee.role === 'Store Manager' ? 3500 : 0));
    setIsEditingPayslip(true);
  };

  const handleSavePayslip = () => {
    setStaffList(prev => prev.map(emp => {
      if (emp.id === currentEmployee.id) {
        return {
          ...emp,
          salary: editPayslipSalary,
          paidDays: editPayslipPaidDays,
          bonus: editPayslipBonus
        };
      }
      return emp;
    }));

    setCurrentUser((prev: any) => {
      if (prev && prev.id === currentEmployee.id) {
        return {
          ...prev,
          salary: editPayslipSalary,
          paidDays: editPayslipPaidDays,
          bonus: editPayslipBonus
        };
      }
      return prev;
    });

    setIsEditingPayslip(false);
  };

  // Location Check-In States
  const [gpsSimMode, setGpsSimMode] = useState<string>(
    currentUser?.email?.toLowerCase() === 'hr@laundrybasket.com' ? 'simulate-inside' : 'browser'
  );
  const [checkingIn, setCheckingIn] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsSuccess, setGpsSuccess] = useState<string | null>(null);
  const [calculatedDist, setCalculatedDist] = useState<number | null>(null);

  // Authorized Hub Locations
  const HUBS = [
    { name: 'Workshop (Karond)', lat: 23.292861, lng: 77.477806 },
    { name: 'Ayodhya Nagar Store', lat: 23.270129, lng: 77.472889 },
    { name: 'Bawdiya Kalan Store', lat: 23.185278, lng: 77.441000 }
  ];

  // Map employee to their default assigned hub based on department
  const assignedHub = currentEmployee.dept?.toLowerCase() === 'workshop' ? HUBS[0] : HUBS[1];

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // Radius of the Earth in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
  };

  const handleClockIn = () => {
    setCheckingIn(true);
    setGpsError(null);
    setGpsSuccess(null);
    setCalculatedDist(null);

    const executeCheckIn = (userLat: number, userLng: number) => {
      // Find the closest authorized hub
      let closestHub = HUBS[0];
      let minDistance = calculateDistance(userLat, userLng, HUBS[0].lat, HUBS[0].lng);

      for (let i = 1; i < HUBS.length; i++) {
        const dist = calculateDistance(userLat, userLng, HUBS[i].lat, HUBS[i].lng);
        if (dist < minDistance) {
          minDistance = dist;
          closestHub = HUBS[i];
        }
      }

      setCalculatedDist(Math.round(minDistance));

      if (minDistance <= 100) {
        // Successful check-in!
        const now = new Date();
        let hours = now.getHours();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const clockInTime = `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;

        const isLate = (now.getHours() > 10 || (now.getHours() === 10 && now.getMinutes() > 5));

        const newLog = {
          id: Date.now(),
          employeeId: currentEmployee.id || 0,
          employeeName: currentEmployee.name,
          role: currentEmployee.role,
          clockIn: clockInTime,
          clockOut: '--:--',
          hoursWorked: 0,
          date: now.toISOString().split('T')[0],
          status: isLate ? 'Late' : 'Present',
          style: isLate ? 'text-amber-700 border-amber-500/20 bg-amber-500/5' : 'text-emerald-600 border-emerald-500/20 bg-emerald-500/5',
          distance: Math.round(minDistance)
        };

        setClockLogs((prev: any[]) => [newLog, ...prev]);
        setGpsSuccess(`Attendance marked present! You are inside the geofence at ${closestHub.name} (Distance: ${Math.round(minDistance)}m).`);
      } else {
        // Failed check-in
        setGpsError(`Check-In Blocked! You are ${Math.round(minDistance)}m away from the nearest authorized hub (${closestHub.name}). You must be within 100m.`);
      }
      setCheckingIn(false);
    };

    const effectiveGpsSimMode = isHRAdmin ? gpsSimMode : 'browser';

    if (effectiveGpsSimMode === 'browser') {
      if (!navigator.geolocation) {
        setGpsError('Geolocation is not supported by your browser.');
        setCheckingIn(false);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          executeCheckIn(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          setGpsError(`Failed to retrieve device location: ${error.message}.${isHRAdmin ? ' Please use simulation mode for testing.' : ''}`);
          setCheckingIn(false);
        },
        { enableHighAccuracy: true }
      );
    } else if (effectiveGpsSimMode === 'simulate-inside') {
      // Simulate close (inside the employee's assigned hub)
      setTimeout(() => {
        executeCheckIn(assignedHub.lat, assignedHub.lng);
      }, 800);
    } else if (effectiveGpsSimMode === 'simulate-workshop') {
      // Simulate at Workshop (Karond)
      setTimeout(() => {
        executeCheckIn(23.292861, 77.477806);
      }, 800);
    } else if (effectiveGpsSimMode === 'simulate-ayodhya') {
      // Simulate at Ayodhya Nagar Store
      setTimeout(() => {
        executeCheckIn(23.270129, 77.472889);
      }, 800);
    } else if (effectiveGpsSimMode === 'simulate-bawdiya') {
      // Simulate at Bawdiya Kalan Store
      setTimeout(() => {
        executeCheckIn(23.185278, 77.441000);
      }, 800);
    } else if (effectiveGpsSimMode === 'simulate-outside') {
      // Simulate outside geofence (e.g. Bhopal Board Office Square)
      setTimeout(() => {
        executeCheckIn(23.2323, 77.4318);
      }, 800);
    }
  };

  // Find if checked in today
  const todayLog = clockLogs.find(
    log => log.name.toLowerCase() === currentEmployee.name.toLowerCase()
  );

  // Find payroll details dynamically by name matching
  const myPayroll = payrollList.find(p => p.name.toLowerCase() === currentEmployee.name.toLowerCase()) || {
    deliveries: currentEmployee.role === 'Rider' ? 124 : currentEmployee.role === 'Ironing Specialist' ? 320 : 0,
    rate: currentEmployee.incentive || 0,
    paidStatus: 'Pending'
  };

  const totalIncentives = myPayroll.deliveries * myPayroll.rate;
  const isManager = currentEmployee.role === 'Store Manager';
  const performanceBonus = isManager ? 3500 : 0;
  const netEarnings = currentEmployee.salary + totalIncentives + performanceBonus;

  // Form states for leave request
  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Form states for daily tasks reports
  const [reportingTaskId, setReportingTaskId] = useState<number | null>(null);
  const [completionText, setCompletionText] = useState<string>('');
  const [showTaskSuccess, setShowTaskSuccess] = useState<boolean>(false);

  const handleSubmitReport = (taskId: number) => {
    if (!completionText.trim()) return;

    const now = new Date();
    let hours = now.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;

    setTasksList(prev => prev.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          status: 'Completed',
          completionReport: completionText.trim(),
          completedAt: timeStr
        };
      }
      return t;
    }));

    setCompletionText('');
    setReportingTaskId(null);
    setShowTaskSuccess(true);
    setTimeout(() => {
      setShowTaskSuccess(false);
    }, 4000);
  };

  const handleApplyLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason) return;

    // Build dates string
    const formatDates = `${startDate} - ${endDate}`;
    
    // Calculate difference in days
    const diffTime = Math.abs(new Date(endDate).getTime() - new Date(startDate).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const newRequest = {
      id: Date.now(),
      name: currentEmployee.name,
      role: currentEmployee.role,
      type: leaveType,
      dates: formatDates,
      duration: `${diffDays} day${diffDays > 1 ? 's' : ''}`,
      reason: reason,
      status: 'Pending'
    };

    setLeavesList(prev => [newRequest, ...prev]);
    setShowSuccess(true);
    setReason('');
    setStartDate('');
    setEndDate('');
    
    setTimeout(() => {
      setShowSuccess(false);
    }, 4000);
  };

  // Get personal shifts dynamically by searching shift database
  const getMyShifts = () => {
    const myShifts: Array<{ day: string; type: string }> = [];
    Object.entries(shifts).forEach(([day, list]) => {
      const match = list.find(s => s.staff.toLowerCase().includes(currentEmployee.name.toLowerCase()));
      if (match) {
        myShifts.push({ day, type: match.type });
      }
    });
    return myShifts;
  };

  const myShiftsList = getMyShifts();

  // Get real shifts completed in current month (June 2026)
  const getRealShiftsCompleted = () => {
    const currentMonthStr = new Date().toISOString().slice(0, 7); // e.g., "2026-06"
    return clockLogs.filter((log: any) => 
      (log.employeeName === currentEmployee.name || log.name === currentEmployee.name || log.employeeId === currentEmployee.id) && 
      log.date && log.date.startsWith(currentMonthStr) && 
      (log.status === 'On Time' || log.status === 'Late' || log.status === 'Present')
    ).length;
  };

  const completedShiftsCount = getRealShiftsCompleted();
  const attendanceRate = completedShiftsCount > 0 ? ((completedShiftsCount / 28) * 100).toFixed(1) : '0.0';
  const currentMonthLabel = new Date().toLocaleString('default', { month: 'long' });

  // Get personal leaves history dynamically
  const myLeavesHistory = leavesList.filter(l => l.name.toLowerCase().includes(currentEmployee.name.toLowerCase()));

  // Render Sub Tabs
  if (activeSubTab === 'dashboard') {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Multi-Role Switcher Simulator */}
        {isHRAdmin && (
          <div className="glass-panel p-4 bg-white/40 border border-white/50 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="text-center sm:text-left">
              <span className="text-[10px] uppercase font-black text-[#1A6FDB] tracking-widest">Multi-Role Workspace Simulator</span>
              <p className="text-xs text-slate-650 font-bold mt-1">Review the Staff Workspace as Manager, Ironer, Washer, or Rider:</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200/40 text-xs font-bold text-slate-700 w-full sm:w-auto justify-center">
              <span className="text-slate-400">Viewing As:</span>
              <select
                value={currentEmployee?.id || activeEmployeeId}
                onChange={(e) => {
                  const newId = Number(e.target.value);
                  setActiveEmployeeId(newId);
                }}
                className="bg-transparent text-slate-800 outline-none font-extrabold cursor-pointer w-full sm:w-auto"
              >
                {staffList.map(emp => (
                  <option key={emp.id} value={emp.id} className="bg-white text-slate-800 font-bold">
                    {emp.name} ({emp.role})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Profile Card banner */}
        <div className="glass-panel p-5 bg-gradient-to-r from-blue-500/10 via-[#1A6FDB]/5 to-transparent flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-slate-200/50 flex items-center justify-center font-bold text-xl text-[#1A6FDB] bg-white shadow-sm flex-shrink-0 overflow-hidden">
              {currentEmployee.profilePhoto ? (
                <img src={currentEmployee.profilePhoto} alt={currentEmployee.name} className="w-full h-full object-cover" />
              ) : (
                currentEmployee.name.split(' ').map((n: string) => n[0]).join('')
              )}
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-800 leading-tight">Welcome back, {currentEmployee.name}!</h3>
              <p className="text-xs text-slate-500 mt-1 font-bold flex items-center gap-2">
                <Briefcase className="w-3.5 h-3.5 text-[#1A6FDB]" />
                <span>{currentEmployee.role} • {currentEmployee.dept} Department</span>
              </p>
            </div>
          </div>
          {todayLog ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-xs font-bold">
              <UserCheck className="w-4 h-4 text-emerald-500" />
              <span>Checked In ({todayLog.clockIn}){todayLog.distance ? ` • ${todayLog.distance}m` : ''}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 text-rose-650 border border-rose-500/20 text-xs font-bold animate-pulse">
              <AlertCircle className="w-4 h-4 text-rose-500" />
              <span>Not Clocked In</span>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: Attendance shifts */}
          <div className="glass-panel p-5 glass-card-primary">
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Shifts Completed ({currentMonthLabel})</p>
            <h4 className="text-2xl font-extrabold text-slate-800 mt-2">
              {completedShiftsCount} / 28
            </h4>
            <p className="text-xs text-[#1A6FDB] font-bold mt-1">
              {attendanceRate}% attendance rate
            </p>
          </div>

          {/* Card 2: Earnings summary */}
          <div className="glass-panel p-5 glass-card-success">
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Net Monthly Earnings</p>
            <h4 className="text-2xl font-extrabold text-emerald-600 mt-2">₹{netEarnings.toLocaleString()}</h4>
            <p className="text-xs text-emerald-600 font-bold mt-1">Status: {myPayroll.paidStatus || 'Paid'}</p>
          </div>
        </div>

        {/* Geofenced Attendance Clock-In Widget */}
        <div className="glass-panel p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/40 pb-3">
            <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <MapPin className="w-4.5 h-4.5 text-[#1A6FDB]" />
              Geofenced Attendance Clock-In
            </h4>
            <span className="text-[10px] bg-[#1A6FDB]/10 text-[#1A6FDB] font-extrabold px-2.5 py-1 rounded-full border border-[#1A6FDB]/20 uppercase tracking-wider">
              100-Meter Geofence Limit
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Left Column: Office Coordinates & Simulator Settings */}
            <div className="space-y-4">
              <div className="space-y-2 text-xs text-slate-650 font-bold bg-white/40 p-4 rounded-xl border border-slate-200/30">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                  <span className="text-slate-500 font-bold uppercase tracking-wide text-[10px]">Authorized Hub Locations</span>
                  <span className="text-emerald-600 font-extrabold">Active</span>
                </div>
                {HUBS.map(hub => (
                  <div key={hub.name} className="flex justify-between items-center py-1 border-b border-slate-100/30 last:border-0">
                    <span className="text-slate-700 font-extrabold">{hub.name}:</span>
                    <span className="font-mono text-slate-500 text-[10.5px]">{hub.lat.toFixed(6)}° N, {hub.lng.toFixed(6)}° E</span>
                  </div>
                ))}
                <div className="flex justify-between items-center py-1.5 mt-1 border-t border-slate-200/40">
                  <span>Authorized Radius:</span>
                  <span className="text-[#1A6FDB] font-extrabold">100 Meters (Any Hub)</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span>Your Default Hub:</span>
                  <span className="text-slate-700 font-extrabold">{assignedHub.name}</span>
                </div>
              </div>

              {/* Simulator Selector */}
              {isHRAdmin && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 block ml-1">Location Source Mode</label>
                  <div className="relative animate-fade-in">
                    <select
                      value={gpsSimMode}
                      onChange={(e) => {
                        setGpsSimMode(e.target.value);
                        setGpsError(null);
                        setGpsSuccess(null);
                        setCalculatedDist(null);
                      }}
                      className="w-full px-3.5 py-2.5 text-xs glass-input bg-white cursor-pointer font-bold text-slate-755 outline-none"
                    >
                      <option value="simulate-inside">📍 Sim Default Hub Desk (Inside Geofence)</option>
                      <option value="simulate-workshop">🏭 Sim Workshop - Karond (Inside Geofence)</option>
                      <option value="simulate-ayodhya">🏬 Sim Ayodhya Nagar Store (Inside Geofence)</option>
                      <option value="simulate-bawdiya">🏬 Sim Bawdiya Kalan Store (Inside Geofence)</option>
                      <option value="simulate-outside">🚗 Sim Bhopal Board Office (Outside Geofence)</option>
                      <option value="browser">🛰️ Live Browser GPS (Requires Real coordinates)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Distance Check & Action Button */}
            <div className="flex flex-col justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200/40 min-h-[180px]">
              <div>
                <span className="text-[10px] text-slate-450 uppercase font-extrabold tracking-wider">Geofence Status</span>
                <div className="mt-2.5">
                  {todayLog ? (
                    <div className="flex items-start gap-2 text-emerald-600 font-bold text-xs leading-relaxed bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl animate-fade-in">
                      <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5 animate-pulse" />
                      <div>
                        <p className="font-extrabold">Attendance Marked Present</p>
                        <p className="text-[10px] text-emerald-555 mt-1">Clock In: {todayLog.clockIn} {todayLog.distance ? ` • Distance: ${todayLog.distance}m` : ''}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 text-amber-700 font-bold text-xs leading-relaxed bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl animate-pulse">
                      <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-extrabold">Geofence Locked</p>
                        <p className="text-[10px] text-amber-600 mt-1">Please stand within 100 meters of any authorized Hub to check in.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2.5 mt-4">
                {gpsError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-[11px] font-bold flex items-center gap-2 animate-fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    <span>{gpsError}</span>
                  </div>
                )}
                {gpsSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-650 text-[11px] font-bold flex items-center gap-2 animate-fade-in">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>{gpsSuccess}</span>
                  </div>
                )}

                {!todayLog && (
                  <button
                    type="button"
                    onClick={handleClockIn}
                    disabled={checkingIn}
                    className="w-full py-3 px-5 text-xs font-bold text-white glass-button glass-button-primary flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Navigation className={`w-4 h-4 text-white ${checkingIn ? 'animate-spin' : ''}`} />
                    <span>{checkingIn ? 'Verifying GPS Coordinates...' : 'Mark Attendance (Clock-In)'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Shifts and History */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Shifts */}
          <div className="glass-panel p-5 space-y-4">
            <h4 className="text-sm font-extrabold text-slate-800 border-b border-slate-200/40 pb-2 flex items-center gap-2">
              <Calendar className="w-4.5 h-4.5 text-[#1A6FDB]" />
              My Roster Shifts This Week
            </h4>
            
            <div className="space-y-2.5">
              {myShiftsList.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between p-3.5 rounded-xl bg-white/40 border border-slate-200/30">
                  <span className="font-extrabold text-slate-800 uppercase text-xs tracking-wider">{s.day}day</span>
                  <span className="text-xs text-slate-660 font-bold flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200/30">
                    <Clock className="w-3.5 h-3.5 text-[#1A6FDB]" />
                    {s.type}
                  </span>
                </div>
              ))}

              {myShiftsList.length === 0 && (
                <div className="p-8 text-center bg-white/10 rounded-xl border border-dashed border-slate-200/40">
                  <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 italic">No scheduled shifts assigned to you this week.</p>
                </div>
              )}
            </div>
          </div>

          {/* Leave approvals status */}
          <div className="glass-panel p-5 space-y-4">
            <h4 className="text-sm font-extrabold text-slate-800 border-b border-slate-200/40 pb-2 flex items-center gap-2">
              <FileClock className="w-4.5 h-4.5 text-pink-500" />
              My Leave Request Statuses
            </h4>

            <div className="space-y-2.5 max-h-[220px] overflow-y-auto">
              {myLeavesHistory.map((l) => {
                let badge = 'bg-slate-100 border-slate-200 text-slate-550';
                if (l.status === 'Approved') badge = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600';
                if (l.status === 'Rejected') badge = 'bg-rose-500/10 border-rose-500/20 text-rose-600';
                if (l.status === 'Pending') badge = 'bg-amber-500/10 border-amber-500/20 text-amber-700 animate-pulse';

                return (
                  <div key={l.id} className="flex items-center justify-between p-3 rounded-xl bg-white/40 border border-slate-200/30 animate-fade-in">
                    <div>
                      <p className="text-xs font-bold text-slate-800 leading-tight">{l.type}</p>
                      <p className="text-[10px] text-slate-450 mt-1 font-bold">{l.dates} ({l.duration})</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${badge}`}>
                      {l.status}
                    </span>
                  </div>
                );
              })}

              {myLeavesHistory.length === 0 && (
                <div className="p-8 text-center bg-white/10 rounded-xl border border-dashed border-slate-200/40">
                  <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-450 italic">You have not submitted any leave applications.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeSubTab === 'shifts') {
    return (
      <div className="glass-panel p-5 space-y-5 animate-fade-in">
        {/* Multi-Role Switcher Simulator */}
        {isHRAdmin && (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/40 flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Simulation Mode:</span>
            <span className="text-[#1A6FDB] font-extrabold">{currentEmployee.name} ({currentEmployee.role})</span>
          </div>
        )}

        <h4 className="text-sm font-extrabold text-slate-800 border-b border-slate-200/40 pb-2 flex items-center gap-2">
          <Calendar className="w-4.5 h-4.5 text-[#1A6FDB]" />
          My Personal Shift Scheduler
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3.5">
            <p className="text-xs text-slate-500 font-bold leading-relaxed">
              Your weekly rosters are planned in advance by the Admin HR team. If you need shift adjustment approvals, swaps, or have conflicts, please contact your store supervisor.
            </p>
            <div className="p-3.5 rounded-xl bg-[#1A6FDB]/5 border border-[#1A6FDB]/15 text-xs text-[#1A6FDB] font-bold flex items-start gap-2">
              <Sparkles className="w-4.5 h-4.5 text-[#1A6FDB] flex-shrink-0 mt-0.5" />
              <span>You are scheduled for a total of {myShiftsList.length} work shifts this calendar week. Please ensure you clock-in before 09:05 AM to avoid late penalty adjustments.</span>
            </div>
          </div>

          <div className="space-y-2.5">
            {myShiftsList.map((s, idx) => (
              <div key={idx} className="flex items-center justify-between p-3.5 rounded-xl bg-white/40 border border-slate-200/30">
                <span className="font-extrabold text-slate-850 text-xs tracking-wider">{s.day}day</span>
                <span className="text-xs text-slate-650 font-bold flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200/30">
                  <Clock className="w-3.5 h-3.5 text-[#1A6FDB]" />
                  {s.type}
                </span>
              </div>
            ))}

            {myShiftsList.length === 0 && (
              <p className="text-xs text-slate-400 italic text-center py-8">No weekly shifts assigned.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (activeSubTab === 'payroll') {
    const isRider = currentEmployee.role === 'Rider';
    const isSpecialist = currentEmployee.role === 'Ironing Specialist';
    const isWashing = currentEmployee.role === 'Washing Operator';

    return (
      <div className="glass-panel p-5 space-y-5 animate-fade-in">
        {/* Multi-Role Switcher Simulator */}
        {isHRAdmin && (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/40 flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Simulation Mode:</span>
            <span className="text-[#1A6FDB] font-extrabold">{currentEmployee.name} ({currentEmployee.role})</span>
          </div>
        )}

        <h4 className="text-sm font-extrabold text-slate-800 border-b border-slate-200/40 pb-2 flex items-center gap-2">
          <IndianRupee className="w-4.5 h-4.5 text-[#1A6FDB]" />
          My Earnings Summary & Pay Worksheet
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-4">
            <h5 className="text-xs uppercase font-extrabold text-slate-400 tracking-wider">Salary Breakdown (May 2026)</h5>
            
            <div className="space-y-3 font-semibold text-xs text-slate-700">
              <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                <span>Base Fixed Salary ({currentEmployee.role})</span>
                <span className="text-slate-850 font-extrabold">₹{currentEmployee.salary.toLocaleString()}</span>
              </div>

              {isRider && (
                <>
                  <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                    <span>Completed Deliveries</span>
                    <span className="text-slate-850 font-extrabold">{myPayroll.deliveries} orders</span>
                  </div>
                  <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                    <span>Delivery Incentives (₹{currentEmployee.incentive}/order)</span>
                    <span className="text-cyan-600 font-extrabold">₹{totalIncentives.toLocaleString()}</span>
                  </div>
                </>
              )}

              {isSpecialist && (
                <>
                  <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                    <span>Garments Ironed</span>
                    <span className="text-slate-850 font-extrabold">320 garments</span>
                  </div>
                  <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                    <span>Ironing Incentives (₹{currentEmployee.incentive}/garment)</span>
                    <span className="text-cyan-600 font-extrabold">₹{totalIncentives.toLocaleString()}</span>
                  </div>
                </>
              )}

              {isWashing && (
                <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                  <span>Washing Batch Incentives</span>
                  <span className="text-cyan-600 font-extrabold">₹0 (Included in base salary)</span>
                </div>
              )}

              {isManager && (
                <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                  <span>Store Performance Bonus</span>
                  <span className="text-emerald-600 font-extrabold">₹{performanceBonus.toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between items-center py-3 border-b-2 border-slate-200 text-sm font-extrabold text-slate-850">
                <span>Grand Total Net Earnings</span>
                <span className="text-[#1A6FDB] font-black">₹{netEarnings.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/40 flex flex-col justify-between space-y-4">
            <div>
              <span className="text-[10px] text-slate-450 uppercase font-extrabold">Payout Disbursal Status</span>
              <div className="flex items-center gap-2 mt-2">
                <span className={`px-3 py-1 rounded-full text-xs font-black border ${
                  myPayroll.paidStatus === 'Paid' 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' 
                    : myPayroll.paidStatus === 'Processing'
                    ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-600 animate-pulse'
                    : 'bg-amber-500/10 border-amber-500/20 text-amber-700'
                }`}>
                  {myPayroll.paidStatus || 'Paid'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-3 font-semibold leading-relaxed">
                Worksheet pay records are generated automatically on the 30th of each calendar month. Disbursed salaries are directly credited to your configured Bank Account.
              </p>
            </div>
            
            <div className="border-t border-slate-200/40 pt-3 flex items-center justify-between text-[10px] text-slate-450 font-bold uppercase">
              <span>Account No: ************{isManager ? '8371' : isSpecialist ? '2039' : '9482'}</span>
              <span>May payslip worksheets</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeSubTab === 'leaves') {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Multi-Role Switcher Simulator */}
        {isHRAdmin && (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/40 flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Simulation Mode:</span>
            <span className="text-[#1A6FDB] font-extrabold">{currentEmployee.name} ({currentEmployee.role})</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Leave request form */}
          <div className="glass-panel p-5 lg:col-span-7 space-y-4">
            <h4 className="text-sm font-extrabold text-slate-800 border-b border-slate-200/40 pb-2 flex items-center gap-2">
              <Send className="w-4.5 h-4.5 text-[#1A6FDB]" />
              Apply for Time-Off / Leave
            </h4>

            {showSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 text-xs font-bold flex items-center gap-2 animate-bounce">
                <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <span>Application Submitted Successfully! Switching modes will show this in the Admin Review Queue.</span>
              </div>
            )}

            <form onSubmit={handleApplyLeave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Leave Category</label>
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs glass-input bg-white cursor-pointer"
                  >
                    <option value="Casual Leave">Casual Leave</option>
                    <option value="Sick Leave">Sick Leave</option>
                    <option value="Privilege Leave">Privilege Leave</option>
                    <option value="Compensatory Off">Compensatory Off</option>
                  </select>
                </div>

                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Applicant</label>
                  <input
                    type="text"
                    readOnly
                    value={`${currentEmployee.name} (${currentEmployee.role})`}
                    className="w-full px-3.5 py-2.5 text-xs glass-input opacity-70 bg-slate-100/50 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs glass-input bg-white/70"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs glass-input bg-white/70"
                  />
                </div>

                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Reason description</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Provide details about your time-off request..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs glass-input bg-white/70"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-200/40 mt-4">
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white glass-button glass-button-primary flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4 text-white" />
                  <span>Submit Leave Request</span>
                </button>
              </div>
            </form>
          </div>

          {/* Leave list statuses */}
          <div className="glass-panel p-5 lg:col-span-5 space-y-4">
            <h4 className="text-sm font-extrabold text-slate-800 border-b border-slate-200/40 pb-2 flex items-center gap-2">
              <FileClock className="w-4.5 h-4.5 text-pink-500" />
              My Active Applications
            </h4>

            <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
              {myLeavesHistory.map((l) => {
                let badge = 'bg-slate-100 border-slate-200 text-slate-550';
                if (l.status === 'Approved') badge = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600';
                if (l.status === 'Rejected') badge = 'bg-rose-500/10 border-rose-500/20 text-rose-600';
                if (l.status === 'Pending') badge = 'bg-amber-500/10 border-amber-500/20 text-amber-700 animate-pulse';

                return (
                  <div key={l.id} className="p-3.5 rounded-xl bg-white/40 border border-slate-200/30 hover:bg-white/70 transition-all space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-bold text-slate-850">{l.type}</p>
                        <p className="text-[10px] text-slate-450 font-bold mt-0.5">{l.dates} • {l.duration}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${badge}`}>
                        {l.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 italic bg-white/30 p-2 rounded-lg border border-slate-200/20 leading-relaxed font-semibold">
                      "{l.reason}"
                    </div>
                  </div>
                );
              })}

              {myLeavesHistory.length === 0 && (
                <div className="p-8 text-center flex flex-col items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-slate-400 mb-2" />
                  <p className="text-xs font-bold text-slate-450 italic">No historical leave logs available.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeSubTab === 'tasks') {
    const myTasks = tasksList.filter(
      t => t.employeeName.toLowerCase() === currentEmployee.name.toLowerCase()
    );
    const pendingMyTasks = myTasks.filter(t => t.status === 'Pending');
    const completedMyTasks = myTasks.filter(t => t.status === 'Completed');

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Multi-Role Switcher Simulator */}
        {isHRAdmin && (
          <div className="glass-panel p-4 bg-white/40 border border-white/50 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="text-center sm:text-left">
              <span className="text-[10px] uppercase font-black text-[#1A6FDB] tracking-widest">Multi-Role Workspace Simulator</span>
              <p className="text-xs text-slate-650 font-bold mt-1">Review the Staff Workspace as Manager, Ironer, Washer, or Rider:</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200/40 text-xs font-bold text-slate-700 w-full sm:w-auto justify-center">
              <span className="text-slate-400">Viewing As:</span>
              <select
                value={currentEmployee?.id || activeEmployeeId}
                onChange={(e) => {
                  const newId = Number(e.target.value);
                  setActiveEmployeeId(newId);
                }}
                className="bg-transparent text-slate-800 outline-none font-extrabold cursor-pointer w-full sm:w-auto"
              >
                {staffList.map(emp => (
                  <option key={emp.id} value={emp.id} className="bg-white text-slate-800 font-bold">
                    {emp.name} ({emp.role})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Success toast */}
        {showTaskSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 text-xs font-bold flex items-center gap-2 animate-bounce">
            <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <span>Completion Report Submitted! The HR/Admin will see this updated in real-time.</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Active Tasks Column */}
          <div className="glass-panel p-5 lg:col-span-7 space-y-4">
            <h4 className="text-sm font-extrabold text-slate-800 border-b border-slate-200/40 pb-2 flex items-center gap-2">
              <ClipboardList className="w-4.5 h-4.5 text-[#1A6FDB]" />
              My Operational Tasks Today ({pendingMyTasks.length})
            </h4>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {pendingMyTasks.map((task) => (
                <div 
                  key={task.id} 
                  className="p-4 rounded-xl bg-white/40 border border-slate-200/30 hover:bg-white/70 transition-all space-y-3"
                >
                  <div>
                    <h5 className="text-sm font-extrabold text-slate-800 leading-tight">{task.taskTitle}</h5>
                    <p className="text-[10px] text-slate-450 mt-1 font-bold">Assigned Date: {task.assignedDate}</p>
                    <p className="text-xs text-slate-650 leading-relaxed font-semibold mt-2 bg-slate-100/30 p-2.5 rounded-lg border border-slate-200/20">
                      {task.taskDesc}
                    </p>
                  </div>

                  {/* Submit completion drawer section */}
                  {reportingTaskId === task.id ? (
                    <div className="pt-3 border-t border-slate-200/40 space-y-3 animate-fade-in">
                      <label className="text-[10px] font-black uppercase text-slate-500 block">Completion Report / Notes</label>
                      <textarea
                        required
                        rows={3}
                        placeholder="Detail the work done, outcomes, or notes for HR review..."
                        value={completionText}
                        onChange={(e) => setCompletionText(e.target.value)}
                        className="w-full px-3 py-2 text-xs glass-input bg-white font-semibold text-slate-755"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setReportingTaskId(null);
                            setCompletionText('');
                          }}
                          className="px-3 py-1.5 text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSubmitReport(task.id)}
                          className="px-4 py-1.5 text-[10px] font-bold text-white glass-button glass-button-primary flex items-center gap-1 cursor-pointer"
                        >
                          <Send className="w-3 h-3 text-white" />
                          <span>Submit Completion</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => {
                          setReportingTaskId(task.id);
                          setCompletionText('');
                        }}
                        className="px-4.5 py-2 text-xs font-bold text-white glass-button glass-button-primary flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-white" />
                        <span>Submit Completion Report</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {pendingMyTasks.length === 0 && (
                <div className="p-8 text-center bg-white/10 rounded-xl border border-dashed border-slate-200/40">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 animate-bounce" />
                  <p className="text-xs font-bold text-slate-450 italic">All caught up! You have no pending tasks assigned today.</p>
                </div>
              )}
            </div>
          </div>

          {/* Completed History Column */}
          <div className="glass-panel p-5 lg:col-span-5 space-y-4">
            <h4 className="text-sm font-extrabold text-slate-800 border-b border-slate-200/40 pb-2 flex items-center gap-2">
              <CheckCircle className="w-4.5 h-4.5 text-emerald-500" />
              Completed Tasks History ({completedMyTasks.length})
            </h4>

            <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
              {completedMyTasks.map((task) => (
                <div 
                  key={task.id} 
                  className="p-3.5 rounded-xl bg-white/40 border border-slate-200/30 hover:bg-white/70 transition-all space-y-2.5"
                >
                  <div className="flex justify-between items-start">
                    <h5 className="text-xs font-bold text-slate-850 leading-tight">{task.taskTitle}</h5>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-[8px] font-extrabold text-emerald-600 uppercase flex items-center gap-0.5">
                      <CheckCircle className="w-2 h-2 text-emerald-500" />
                      Completed
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-450 font-bold">Closed at: {task.assignedDate} • {task.completedAt || '--:--'}</p>
                  
                  <div className="bg-slate-50 border border-slate-200/20 p-2.5 rounded-lg space-y-1.5">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Instructions</p>
                    <p className="text-[10.5px] text-slate-500 font-semibold leading-relaxed">{task.taskDesc}</p>
                  </div>

                  <div className="bg-emerald-500/5 border border-emerald-500/10 p-2.5 rounded-lg space-y-1.5">
                    <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      Completion Report
                    </p>
                    <p className="text-[10.5px] text-emerald-700 italic font-semibold leading-relaxed">
                      "{task.completionReport || 'No report notes.'}"
                    </p>
                  </div>
                </div>
              ))}

              {completedMyTasks.length === 0 && (
                <div className="p-8 text-center flex flex-col items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-slate-400 mb-2" />
                  <p className="text-xs font-bold text-slate-450 italic">No tasks completed in this workspace session.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeSubTab === 'profile') {
    // docTab and selectedPayslipMonth are declared at component top level

    // AON (Age of Network) calculation helper
    const calculateAON = (joinDate: string): number => {
      if (!joinDate) return 0;
      const start = new Date(joinDate);
      const today = new Date();
      start.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      const diffTime = today.getTime() - start.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays < 0 ? 0 : diffDays;
    };

    // Number to Indian Rupee Words converter
    const numberToWords = (num: number): string => {
      const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
      const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
      
      if ((num = Math.round(num)) === 0) return 'zero';
      
      let str = '';
      
      const thousands = Math.floor(num / 1000);
      if (thousands > 0) {
        if (thousands < 20) {
          str += a[thousands] + 'thousand ';
        } else {
          str += b[Math.floor(thousands / 10)] + (thousands % 10 !== 0 ? '-' + a[thousands % 10] : '') + ' thousand ';
        }
      }
      
      const remainder = num % 1000;
      const hundreds = Math.floor(remainder / 100);
      if (hundreds > 0) {
        str += a[hundreds] + 'hundred ';
      }
      
      const tens = remainder % 100;
      if (tens > 0) {
        if (str !== '') str += 'and ';
        if (tens < 20) {
          str += a[tens];
        } else {
          str += b[Math.floor(tens / 10)] + (tens % 10 !== 0 ? '-' + a[tens % 10] : '');
        }
      }
      
      return str.trim() + ' rupees only';
    };

    const capitalizeWords = (str: string): string => {
      return str.replace(/\b\w/g, c => c.toUpperCase());
    };

    // Calculate dynamic payroll stats for selected payslip month
    const performanceBonusVal = currentEmployee.bonus !== undefined 
      ? currentEmployee.bonus 
      : (currentEmployee.role === 'Store Manager' ? 3500 : 0);
    
    const baseSalary = currentEmployee.salary;
    const paidDays = currentEmployee.paidDays !== undefined ? currentEmployee.paidDays : 30;
    
    // Pro-rate salary based on paid days worked (out of 30 days)
    const proratedSalary = Math.round((baseSalary * paidDays) / 30);
    const grossEarnings = proratedSalary + performanceBonusVal;
    
    // No PF and no PT deductions
    const pfDeduction = 0;
    const ptDeduction = 0;
    const totalDeductionsVal = 0;
    
    const netPayoutVal = grossEarnings;
    const netPayoutWords = capitalizeWords(numberToWords(netPayoutVal));

    return (
      <div className="space-y-6 animate-fade-in print:p-0 print:space-y-0">
        {/* Multi-Role Switcher Simulator - Hidden during print */}
        {isHRAdmin && (
          <div className="glass-panel p-4 bg-white/40 border border-white/50 flex flex-col sm:flex-row justify-between items-center gap-3 print:hidden">
            <div className="text-center sm:text-left">
              <span className="text-[10px] uppercase font-black text-[#1A6FDB] tracking-widest">Multi-Role Workspace Simulator</span>
              <p className="text-xs text-slate-650 font-bold mt-1">Review the Staff Workspace as Manager, Ironer, Washer, or Rider:</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200/40 text-xs font-bold text-slate-700 w-full sm:w-auto justify-center">
              <span className="text-slate-400">Viewing As:</span>
              <select
                value={currentEmployee?.id || activeEmployeeId}
                onChange={(e) => {
                  const newId = Number(e.target.value);
                  setActiveEmployeeId(newId);
                }}
                className="bg-transparent text-slate-805 outline-none font-extrabold cursor-pointer w-full sm:w-auto"
              >
                {staffList.map(emp => (
                  <option key={emp.id} value={emp.id} className="bg-white text-slate-800 font-bold">
                    {emp.name} ({emp.role})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Profile info & Bank info (Hidden during print if printing document) */}
          <div className="lg:col-span-4 space-y-6 print:hidden">
            {/* Profile Card */}
            <div className="glass-panel p-5 space-y-4 text-center">
              <div className="relative w-20 h-20 mx-auto group">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/10 to-[#1A6FDB]/20 border-2 border-white/80 shadow-md flex items-center justify-center font-extrabold text-2xl text-[#1A6FDB] bg-white overflow-hidden">
                  {currentEmployee.profilePhoto ? (
                    <img src={currentEmployee.profilePhoto} alt={currentEmployee.name} className="w-full h-full object-cover" />
                  ) : (
                    currentEmployee.name.split(' ').map((n: string) => n[0]).join('')
                  )}
                </div>
                {/* Camera upload overlay */}
                <label className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity duration-200 text-white select-none">
                  <Camera className="w-5 h-5 text-white animate-pulse" />
                  <span className="text-[8px] font-black uppercase tracking-wider mt-1">Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleDocumentUpload(e.target.files[0], 'profilePhoto');
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>
              <div>
                <h3 className="text-base font-black text-slate-850">{currentEmployee.name}</h3>
                <span className="text-[9.5px] uppercase font-black tracking-widest text-[#1A6FDB] block mt-1">
                  {currentEmployee.role}
                </span>
                <span className="text-[10px] font-bold text-slate-400 block mt-0.5">
                  Dept: {currentEmployee.dept}
                </span>
                {!currentEmployee.profilePhoto ? (
                  <label className="text-[10px] font-black text-[#1A6FDB] hover:text-blue-700 uppercase tracking-wider mt-2.5 cursor-pointer block mx-auto hover:underline select-none">
                    <span>Upload Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleDocumentUpload(e.target.files[0], 'profilePhoto');
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleDocumentDelete('profilePhoto')}
                    className="text-[9px] font-black text-rose-500 hover:text-rose-600 uppercase tracking-wider mt-2.5 cursor-pointer block mx-auto hover:underline"
                  >
                    Remove Photo
                  </button>
                )}
              </div>
              <div className="pt-3.5 border-t border-slate-200/40 text-left text-xs font-bold text-slate-700 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Employee ID:</span>
                  <span className="text-slate-800 font-mono font-bold">{currentEmployee.empId || `LBBPL${String(currentEmployee.id).padStart(3, '0')}`}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Joining Date:</span>
                  <span className="text-slate-800">{currentEmployee.joinDate}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Tenure (AON):</span>
                  <span className="text-[#1A6FDB] font-extrabold">{calculateAON(currentEmployee.joinDate)} Days</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Mobile Phone:</span>
                  <span className="text-slate-800 font-mono font-bold">{currentEmployee.phone}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Work Email:</span>
                  <span className="text-slate-850 truncate max-w-[150px]" title={currentEmployee.email}>{currentEmployee.email}</span>
                </div>
              </div>
            </div>

            {/* Salary Details Card */}
            <div className="glass-panel p-5 space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider border-b border-slate-200/40 pb-2 flex items-center gap-1.5">
                <IndianRupee className="w-4 h-4 text-[#1A6FDB]" />
                Salary Details
              </h4>
              <div className="text-xs font-bold text-slate-700 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Fixed Base Salary:</span>
                  <span className="text-slate-800 font-extrabold">₹{currentEmployee.salary.toLocaleString()} / month</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-200/40 pt-3.5 mt-2 bg-slate-50/50 p-2.5 rounded-xl">
                  <span className="text-slate-500 font-black">Net Fixed Payout:</span>
                  <span className="text-[#1A6FDB] text-sm font-black">₹{currentEmployee.salary.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Bank Details Card */}
            <div className="glass-panel p-5 space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider border-b border-slate-200/40 pb-2 flex items-center justify-between gap-1.5">
                <span>💵 Banking Details</span>
                {!isEditingBank && (
                  <button 
                    onClick={handleEditBankClick}
                    className="text-[10px] text-[#1A6FDB] hover:underline font-extrabold cursor-pointer"
                  >
                    Edit Details
                  </button>
                )}
              </h4>
              
              {isEditingBank ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-450 uppercase font-black">Bank Name</label>
                    <input 
                      type="text" 
                      value={editBankName} 
                      onChange={(e) => setEditBankName(e.target.value)}
                      className="w-full px-3 py-2 text-xs glass-input"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-450 uppercase font-black">Account Number</label>
                    <input 
                      type="text" 
                      value={editBankAcc} 
                      onChange={(e) => setEditBankAcc(e.target.value)}
                      className="w-full px-3 py-2 text-xs glass-input"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-450 uppercase font-black">IFSC Routing Code</label>
                    <input 
                      type="text" 
                      value={editBankIfsc} 
                      onChange={(e) => setEditBankIfsc(e.target.value)}
                      className="w-full px-3 py-2 text-xs glass-input"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-450 uppercase font-black">Account Holder</label>
                    <input 
                      type="text" 
                      value={editBankHolder} 
                      onChange={(e) => setEditBankHolder(e.target.value)}
                      className="w-full px-3 py-2 text-xs glass-input"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-450 uppercase font-black">UPI ID</label>
                    <input 
                      type="text" 
                      value={editUpiId} 
                      onChange={(e) => setEditUpiId(e.target.value)}
                      className="w-full px-3 py-2 text-xs glass-input"
                      placeholder="e.g. employee@upi"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button 
                      onClick={handleSaveBank}
                      className="px-3.5 py-2 text-[10.5px] font-bold text-white bg-[#1A6FDB] rounded-xl hover:bg-blue-600 cursor-pointer"
                    >
                      Save
                    </button>
                    <button 
                      onClick={() => setIsEditingBank(false)}
                      className="px-3.5 py-2 text-[10.5px] font-bold text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs font-bold text-slate-700 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Bank Name:</span>
                    <span className="text-slate-800 font-extrabold">{currentEmployee.bankName || 'HDFC Bank'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Account Number:</span>
                    <span className="text-slate-800 font-mono text-[11px] font-black">{currentEmployee.bankAcc || '************9482'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">IFSC Routing Code:</span>
                    <span className="text-slate-800 font-mono font-black">{currentEmployee.bankIfsc || 'HDFC0001245'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Account Holder:</span>
                    <span className="text-slate-800">{currentEmployee.bankHolder || currentEmployee.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">UPI ID:</span>
                    <span className="text-slate-800 font-mono font-black">{currentEmployee.upiId || 'Not Configured'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Account Type:</span>
                    <span className="text-emerald-600 bg-emerald-500/5 px-2 py-0.5 border border-emerald-500/10 rounded-md text-[9px] uppercase font-extrabold">Salary Account</span>
                  </div>

                {/* Passbook Uploader block */}
                <div className="border-t border-slate-200/40 pt-3.5 mt-2 space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider block">Bank Passbook</span>
                  {currentEmployee.bankPassbook ? (
                    <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-500/5 border border-emerald-500/15 text-[11px] font-bold">
                      <div className="flex items-center gap-1.5 overflow-hidden mr-2">
                        <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        <span className="text-slate-700 truncate" title={currentEmployee.bankPassbookName || 'Passbook Document'}>
                          {currentEmployee.bankPassbookName || 'passbook.png'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewDocUrl(currentEmployee.bankPassbook);
                            setPreviewDocTitle('Bank Passbook - ' + currentEmployee.name);
                          }}
                          className="p-1 hover:bg-slate-200/40 text-slate-500 hover:text-slate-700 rounded transition-colors cursor-pointer"
                          title="Preview Passbook"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDocumentDelete('bankPassbook')}
                          className="p-1 hover:bg-rose-500/10 text-rose-500 hover:text-rose-600 rounded transition-colors cursor-pointer"
                          title="Delete Passbook"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center p-3 rounded-xl border border-dashed border-slate-300 hover:border-[#1A6FDB]/50 bg-white/20 hover:bg-[#1A6FDB]/5 transition-all cursor-pointer text-center select-none group">
                      <Upload className="w-4 h-4 text-slate-400 group-hover:text-[#1A6FDB] transition-colors mb-1" />
                      <span className="text-[9px] font-black text-slate-500 group-hover:text-slate-700 uppercase tracking-wide">Upload Passbook</span>
                      <span className="text-[8px] text-slate-400">PDF or Image (Max 5MB)</span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleDocumentUpload(e.target.files[0], 'bankPassbook');
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            )}
          </div>

            {/* Inline Change Password Card */}
            <div className="glass-panel p-5 space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider border-b border-slate-200/40 pb-2 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-[#1A6FDB]" />
                Security & Password
              </h4>
              <form onSubmit={handleInlinePasswordChange} className="space-y-3">
                {inlinePasswordError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-[10px] font-bold">
                    {inlinePasswordError}
                  </div>
                )}
                {inlinePasswordSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[10px] font-bold">
                    Password updated successfully!
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Current Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Current password"
                    value={inlineCurrentPass}
                    onChange={(e) => setInlineCurrentPass(e.target.value)}
                    className="w-full px-3 py-2 text-xs glass-input bg-white/70 text-slate-800 font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="New password (min 6)"
                    value={inlineNewPass}
                    onChange={(e) => setInlineNewPass(e.target.value)}
                    className="w-full px-3 py-2 text-xs glass-input bg-white/70 text-slate-800 font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Confirm Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Confirm new password"
                    value={inlineConfirmPass}
                    onChange={(e) => setInlineConfirmPass(e.target.value)}
                    className="w-full px-3 py-2 text-xs glass-input bg-white/70 text-slate-800 font-semibold"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 px-3 mt-1 rounded-xl text-[10px] font-black text-white bg-gradient-to-r from-blue-600 to-[#1A6FDB] hover:from-blue-500 hover:to-blue-600 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-[#1A6FDB]/10"
                >
                  Change Password
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT COLUMN: Document tabs, Offer Letter Viewer, Payslip Viewer */}
          <div className="lg:col-span-8 space-y-4 print:col-span-12 print:w-full">
            {/* Tab Selectors - Hidden during print */}
            <div className="flex border-b border-slate-200/40 print:hidden">
              <button
                type="button"
                onClick={() => setDocTab('offer')}
                className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                  docTab === 'offer'
                    ? 'border-[#1A6FDB] text-[#1A6FDB] bg-white/50'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Offer Letter</span>
              </button>
              <button
                type="button"
                onClick={() => setDocTab('payslips')}
                className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                  docTab === 'payslips'
                    ? 'border-[#1A6FDB] text-[#1A6FDB] bg-white/50'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Salary Slips / Payslips</span>
              </button>
              <button
                type="button"
                onClick={() => setDocTab('documents')}
                className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                  docTab === 'documents'
                    ? 'border-[#1A6FDB] text-[#1A6FDB] bg-white/50'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileCheck className="w-4 h-4" />
                <span>Required Documents</span>
              </button>
            </div>

            {/* Offer Letter document */}
            {docTab === 'offer' && (
              <div className="space-y-4 print:p-0">
                <div className="flex justify-between items-center border-b border-slate-200/40 pb-3 print:hidden">
                  <span className="text-[10px] text-slate-450 uppercase font-black tracking-wider">Employment Contract Documents</span>
                  <div className="flex gap-2">
                    {isHRAdmin && !isEditingOffer && (
                      <button 
                        onClick={handleEditOfferClick}
                        className="px-3.5 py-2 text-[10.5px] font-bold text-[#1A6FDB] border border-blue-200 bg-blue-500/5 hover:bg-blue-500/10 rounded-xl cursor-pointer flex items-center gap-1.5 transition-all animate-fade-in"
                      >
                        <span>Edit Offer details</span>
                      </button>
                    )}
                    <button 
                      onClick={() => window.print()}
                      className="px-3.5 py-2 text-[10.5px] font-bold text-slate-600 border border-slate-200 hover:text-slate-800 hover:bg-slate-50 rounded-xl cursor-pointer flex items-center gap-1.5 transition-all"
                    >
                      <Printer className="w-3.5 h-3.5 text-[#1A6FDB]" />
                      <span>Print Offer Letter</span>
                    </button>
                  </div>
                </div>

                {isHRAdmin && isEditingOffer && (
                  <div className="glass-panel p-5 space-y-4 max-w-2xl mx-auto print:hidden animate-fade-in">
                    <h4 className="text-xs font-black uppercase text-slate-850 border-b border-slate-200 pb-2">Edit Offer Contract Details</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-450 uppercase font-black">Designation / Role</label>
                        <input 
                          type="text" 
                          value={editOfferRole} 
                          onChange={(e) => setEditOfferRole(e.target.value)}
                          className="w-full px-3 py-2 text-xs glass-input"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-450 uppercase font-black">Joining Date</label>
                        <input 
                          type="text" 
                          value={editOfferJoinDate} 
                          onChange={(e) => setEditOfferJoinDate(e.target.value)}
                          className="w-full px-3 py-2 text-xs glass-input"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-450 uppercase font-black">Department</label>
                        <input 
                          type="text" 
                          value={editOfferDept} 
                          onChange={(e) => setEditOfferDept(e.target.value)}
                          className="w-full px-3 py-2 text-xs glass-input"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-450 uppercase font-black">Monthly Base Salary</label>
                        <input 
                          type="number" 
                          value={editOfferSalary} 
                          onChange={(e) => setEditOfferSalary(Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs glass-input"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2 border-t border-slate-200">
                      <button 
                        onClick={handleSaveOffer}
                        className="px-3.5 py-2 text-[10.5px] font-bold text-white bg-[#1A6FDB] rounded-xl hover:bg-blue-600 cursor-pointer"
                      >
                        Save Contract Details
                      </button>
                      <button 
                        onClick={() => setIsEditingOffer(false)}
                        className="px-3.5 py-2 text-[10.5px] font-bold text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Printable Document Area */}
                <div className="bg-white text-slate-800 border border-slate-200 shadow-sm p-6 sm:p-10 rounded-2xl max-w-2xl mx-auto space-y-6 font-serif relative overflow-hidden print:border-0 print:shadow-none print:p-0">
                  {/* Watermark logo */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
                    <img src={logoImg} alt="Watermark Logo" className="w-80 h-80 object-contain grayscale" />
                  </div>

                  {/* Letterhead */}
                  <div className="border-b-2 border-slate-905 pb-4 flex justify-between items-end">
                    <div className="space-y-1">
                      <h2 className="text-xl font-black font-sans uppercase tracking-tight text-slate-900 leading-tight">
                        Laundry Basket Unicorn Inc.
                      </h2>
                      <p className="text-[9.5px] font-bold font-sans text-slate-500 uppercase tracking-widest leading-none">
                        Premium Laundry, Ironing & Logistical Operations
                      </p>
                      <p className="text-[9px] font-sans text-slate-400 leading-none mt-1">
                        Ahmedabad Central Hub, Off Ashram Road, Ahmedabad, Gujarat, India - 380009
                      </p>
                    </div>
                    <div className="text-right font-sans text-[10px] text-slate-450 leading-tight">
                      <p>www.laundrybasketunicorn.com</p>
                      <p className="mt-0.5">hrms@laundrybasket.com</p>
                    </div>
                  </div>

                  {/* Date and Address */}
                  <div className="flex justify-between items-start text-xs font-sans font-bold text-slate-700">
                    <div>
                      <p>Date: {currentEmployee.joinDate}</p>
                      <p className="mt-1">Ref: LBU-HRD-OFFER-${currentEmployee.empId || `LBBPL${String(currentEmployee.id).padStart(3, '0')}`}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-slate-850">TO EMPLOYEE:</p>
                      <p className="text-slate-900">{currentEmployee.name}</p>
                      <p className="font-normal font-sans text-slate-500">Emp ID: {currentEmployee.empId || `LBBPL${String(currentEmployee.id).padStart(3, '0')}`}</p>
                    </div>
                  </div>

                  {/* Subject */}
                  <div className="text-center py-2.5 bg-slate-50 rounded-xl border border-slate-200/50">
                    <p className="font-sans font-black text-slate-900 text-xs tracking-wider uppercase">
                      Subject: Letter of Employment & Official Offer Details
                    </p>
                  </div>

                  {/* Salutation & Body */}
                  <div className="space-y-4 text-xs sm:text-[13px] leading-relaxed text-slate-800">
                    <p>Dear {currentEmployee.name},</p>
                    <p>
                      We are pleased to offer you employment at Laundry Basket Unicorn Inc. in the position of <strong>{currentEmployee.role}</strong>. Your employment will begin on <strong>{currentEmployee.joinDate}</strong>, and you will be deployed to our <strong>{currentEmployee.dept}</strong> department located at our Ahmedabad Central Hub operations center.
                    </p>
                    <p>
                      In your capacity as a {currentEmployee.role}, you will be responsible for executing day-to-day operations aligned with department standards. You will report directly to the Store Supervisor and operation managers.
                    </p>
                    <p>
                      <strong>Compensation Details:</strong>
                      <br />
                      Your fixed base monthly salary will be <strong>₹{currentEmployee.salary.toLocaleString()}</strong>. Salaries are calculated and disbursed directly to your Salary Account on the 30th of each calendar month.
                    </p>
                    <p>
                      <strong>Leaves & Working Hours:</strong>
                      <br />
                      You will work in accordance with the schedules assigned to you in the weekly Shift Planner. You are eligible for standard leave policies (Casual Leaves & Sick Leaves) subject to supervisor approval.
                    </p>
                    <p>
                      Please sign and return the duplicate copy of this offer letter as a token of your acceptance of these terms.
                    </p>
                  </div>

                  {/* Signatures */}
                  <div className="pt-8 border-t border-slate-100 flex justify-between items-end font-sans">
                    <div className="space-y-1">
                      <div className="w-24 h-8 flex items-center justify-center bg-gradient-to-r from-blue-500/5 to-cyan-500/5 border border-dashed border-slate-200 rounded text-[10px] text-slate-400 italic">
                        [Acceptance Sign]
                      </div>
                      <p className="text-[10px] font-black text-slate-800">{currentEmployee.name}</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider leading-none">Employee Signature</p>
                    </div>

                    <div className="text-right space-y-1">
                      <div className="w-28 h-8 flex items-center justify-end pr-2 text-indigo-755 font-signature text-sm font-semibold select-none leading-none">
                        Priya Patel
                      </div>
                      <p className="text-[10px] font-black text-slate-800">Priya Patel</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider leading-none">HR Director, Laundry Basket</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Payslips document */}
            {docTab === 'payslips' && (
              <div className="space-y-4 print:p-0">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200/40 pb-3 print:hidden">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-[10.5px] font-bold text-slate-500 whitespace-nowrap">Select Pay Cycle:</span>
                    <select
                      value={selectedPayslipMonth}
                      onChange={(e) => setSelectedPayslipMonth(e.target.value)}
                      className="px-3 py-1.5 text-xs glass-input bg-white cursor-pointer font-bold text-slate-800 outline-none border border-slate-200"
                    >
                      <option value="May 2026">May 2026</option>
                      <option value="April 2026">April 2026</option>
                    </select>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto justify-end">
                    {isHRAdmin && !isEditingPayslip && (
                      <button 
                        onClick={handleEditPayslipClick}
                        className="px-3.5 py-2 text-[10.5px] font-bold text-[#1A6FDB] border border-blue-200 bg-blue-500/5 hover:bg-blue-500/10 rounded-xl cursor-pointer flex items-center gap-1.5 transition-all animate-fade-in"
                      >
                        <span>Edit Salary Slip</span>
                      </button>
                    )}
                    <button 
                      onClick={() => window.print()}
                      className="px-3.5 py-2 text-[10.5px] font-bold text-slate-600 border border-slate-200 hover:text-slate-800 hover:bg-slate-50 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Printer className="w-3.5 h-3.5 text-[#1A6FDB]" />
                      <span>Print Payslip</span>
                    </button>
                  </div>
                </div>

                {isHRAdmin && isEditingPayslip && (
                  <div className="glass-panel p-5 space-y-4 max-w-2xl mx-auto print:hidden animate-fade-in">
                    <h4 className="text-xs font-black uppercase text-slate-855 border-b border-slate-200 pb-2">Edit Monthly Salary Slip</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-450 uppercase font-black">Base Salary</label>
                        <input 
                          type="number" 
                          value={editPayslipSalary} 
                          onChange={(e) => setEditPayslipSalary(Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs glass-input"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-450 uppercase font-black">Paid Days Worked</label>
                        <input 
                          type="number" 
                          value={editPayslipPaidDays} 
                          onChange={(e) => setEditPayslipPaidDays(Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs glass-input"
                          min="0"
                          max="31"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-450 uppercase font-black">Performance Bonus</label>
                        <input 
                          type="number" 
                          value={editPayslipBonus} 
                          onChange={(e) => setEditPayslipBonus(Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs glass-input"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2 border-t border-slate-200">
                      <button 
                        onClick={handleSavePayslip}
                        className="px-3.5 py-2 text-[10.5px] font-bold text-white bg-[#1A6FDB] rounded-xl hover:bg-blue-600 cursor-pointer"
                      >
                        Save Salary Slip
                      </button>
                      <button 
                        onClick={() => setIsEditingPayslip(false)}
                        className="px-3.5 py-2 text-[10.5px] font-bold text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Printable Payslip Sheet Area */}
                <div className="bg-white text-slate-800 border border-slate-200 shadow-sm p-6 sm:p-10 rounded-2xl max-w-2xl mx-auto space-y-6 font-sans print:border-0 print:shadow-none print:p-0">
                  {/* Payslip Header */}
                  <div className="text-center space-y-1.5 border-b border-slate-905 pb-4">
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-wide">
                      Laundry Basket Unicorn Inc.
                    </h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      Pay Slip for the month of {selectedPayslipMonth}
                    </p>
                  </div>

                  {/* Metadata Table */}
                  <div className="grid grid-cols-2 gap-4 text-xs border-b border-slate-200 pb-4 font-bold text-slate-700">
                    <div className="space-y-1.5">
                      <p><span className="text-slate-400">Employee Name:</span> <span className="text-slate-900 font-extrabold">{currentEmployee.name}</span></p>
                      <p><span className="text-slate-400">Designation / Role:</span> <span className="text-slate-800">{currentEmployee.role}</span></p>
                      <p><span className="text-slate-400">Department Name:</span> <span className="text-slate-800">{currentEmployee.dept}</span></p>
                    </div>
                    <div className="space-y-1.5 text-right sm:text-left sm:pl-6">
                      <p><span className="text-slate-400">Employee ID:</span> <span className="text-slate-800 font-mono">{currentEmployee.empId || `LBBPL${String(currentEmployee.id).padStart(3, '0')}`}</span></p>
                      <p><span className="text-slate-400">Paid Days Worked:</span> <span className="text-[#1A6FDB] font-extrabold">{paidDays} / 30 Days</span></p>
                      <p><span className="text-slate-400">Salary Bank A/c:</span> <span className="text-slate-800 font-mono">{currentEmployee.bankName || 'HDFC'} - {currentEmployee.bankAcc || '***9482'}</span></p>
                    </div>
                  </div>

                  {/* Earnings vs Deductions Table */}
                  <div className="border border-slate-300 rounded-xl overflow-hidden text-xs">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-300 text-[10px] uppercase font-black text-slate-500">
                          <th className="py-2.5 px-4 text-left border-r border-slate-300">Earnings Description</th>
                          <th className="py-2.5 px-4 text-right border-r border-slate-300">Amount (₹)</th>
                          <th className="py-2.5 px-4 text-left border-r border-slate-300">Deductions Description</th>
                          <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-bold text-slate-700">
                        <tr>
                          <td className="py-3 px-4 border-r border-slate-300 text-slate-800">Basic Fixed Salary (Prorated)</td>
                          <td className="py-3 px-4 text-right border-r border-slate-300 font-mono">₹{proratedSalary.toLocaleString()}</td>
                          <td className="py-3 px-4 border-r border-slate-300">Provident Fund (PF)</td>
                          <td className="py-3 px-4 text-right font-mono">₹0</td>
                        </tr>
                        <tr>
                          <td className="py-3 px-4 border-r border-slate-300 text-slate-800">Performance Bonuses</td>
                          <td className="py-3 px-4 text-right border-r border-slate-300 font-mono">₹{performanceBonusVal.toLocaleString()}</td>
                          <td className="py-3 px-4 border-r border-slate-300">Professional Tax (PT)</td>
                          <td className="py-3 px-4 text-right font-mono">₹0</td>
                        </tr>
                        {/* Summary totals */}
                        <tr className="bg-slate-50 border-t border-slate-300 font-black text-slate-900">
                          <td className="py-3 px-4 border-r border-slate-300">Gross Earnings</td>
                          <td className="py-3 px-4 text-right border-r border-slate-300 font-mono">₹{grossEarnings.toLocaleString()}</td>
                          <td className="py-3 px-4 border-r border-slate-300">Total Deductions</td>
                          <td className="py-3 px-4 text-right font-mono">₹0</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Net Payout Summary */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/65 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <div>
                      <p className="text-[10px] text-slate-450 uppercase font-black tracking-wider">Net Salary Disbursement</p>
                      <h4 className="text-xl font-extrabold text-[#1A6FDB] font-mono mt-1">₹{netPayoutVal.toLocaleString()}</h4>
                      <p className="text-[11px] text-slate-550 font-bold italic mt-2">
                        Words: {netPayoutWords}
                      </p>
                    </div>
                    <div className="sm:text-right text-xs font-bold text-slate-600">
                      <p>Payment Mode: Bank Transfer</p>
                      <p className="mt-1">Transaction Status: <span className="text-emerald-600 font-black uppercase">Disbursed (Paid)</span></p>
                      <p className="mt-1 font-mono text-[10px] text-slate-450">Ref: TXN-LBU-829420{currentEmployee.id}</p>
                    </div>
                  </div>

                  {/* Signature seals */}
                  <div className="pt-8 flex justify-between items-end text-xs font-bold text-slate-700 font-sans">
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Generated Autonomously</p>
                      <p className="mt-1">Laundry Basket HRMS Engine</p>
                    </div>
                    <div className="text-right">
                      <p className="text-indigo-755 font-signature text-sm font-semibold select-none pr-1">Priya Patel</p>
                      <p className="mt-1">Priya Patel (HR Manager)</p>
                      <p className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 leading-none">Authorized Signatory</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Required Documents Tab */}
            {docTab === 'documents' && (
              <div className="space-y-5 animate-fade-in print:hidden">
                <div className="border-b border-slate-200/40 pb-3">
                  <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                    <FileCheck className="w-4.5 h-4.5 text-[#1A6FDB]" />
                    KYC & Required Documents Registry
                  </h4>
                  <p className="text-[10px] text-slate-450 mt-0.5 font-bold">
                    Upload your identity and driver verification documents to ensure compliance.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card 1: Aadhaar Card */}
                  <div className="glass-panel p-4 flex flex-col justify-between hover:border-[#1A6FDB]/20 transition-all space-y-4">
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="text-xs font-black text-slate-800">Aadhaar Card</h5>
                          <p className="text-[9.5px] text-slate-455 mt-0.5">Front and back scan copy of your official UIDAI Aadhaar Card.</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${
                          currentEmployee.docAadhaar 
                            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600' 
                            : 'bg-rose-500/10 border-rose-500/25 text-rose-650'
                        }`}>
                          {currentEmployee.docAadhaar ? 'Uploaded' : 'Not Uploaded'}
                        </span>
                      </div>

                      {/* Display name/thumbnail if uploaded */}
                      {currentEmployee.docAadhaar && (
                        <div className="mt-3 p-2 rounded-xl bg-slate-50 border border-slate-200/50 flex items-center gap-2">
                          {currentEmployee.docAadhaar.startsWith('data:image/') ? (
                            <img src={currentEmployee.docAadhaar} alt="Aadhaar Preview" className="w-10 h-10 object-cover rounded-lg border border-slate-200 flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 flex-shrink-0">
                              <File className="w-5 h-5" />
                            </div>
                          )}
                          <span className="text-[11px] font-bold text-slate-600 truncate flex-1" title={currentEmployee.docAadhaarName}>
                            {currentEmployee.docAadhaarName || 'aadhaar_card.png'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/40">
                      {currentEmployee.docAadhaar ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewDocUrl(currentEmployee.docAadhaar);
                              setPreviewDocTitle('Aadhaar Card - ' + currentEmployee.name);
                            }}
                            className="px-3 py-1.5 text-[10px] font-black text-slate-650 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDocumentDelete('docAadhaar')}
                            className="px-3 py-1.5 text-[10px] font-black text-rose-550 bg-rose-500/5 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer flex items-center gap-1 border border-rose-500/15"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </>
                      ) : (
                        <label className="px-4.5 py-2 text-[10.5px] font-bold text-white glass-button glass-button-primary flex items-center gap-1.5 cursor-pointer">
                          <Upload className="w-3.5 h-3.5 text-white" />
                          <span>Upload Aadhaar</span>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleDocumentUpload(e.target.files[0], 'docAadhaar');
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Card 2: PAN Card */}
                  <div className="glass-panel p-4 flex flex-col justify-between hover:border-[#1A6FDB]/20 transition-all space-y-4">
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="text-xs font-black text-slate-800">PAN Card</h5>
                          <p className="text-[9.5px] text-slate-455 mt-0.5">Laminated PAN card copy for income tax and identity verification.</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${
                          currentEmployee.docPan 
                            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600' 
                            : 'bg-rose-500/10 border-rose-500/25 text-rose-650'
                        }`}>
                          {currentEmployee.docPan ? 'Uploaded' : 'Not Uploaded'}
                        </span>
                      </div>

                      {/* Display name/thumbnail if uploaded */}
                      {currentEmployee.docPan && (
                        <div className="mt-3 p-2 rounded-xl bg-slate-50 border border-slate-200/50 flex items-center gap-2">
                          {currentEmployee.docPan.startsWith('data:image/') ? (
                            <img src={currentEmployee.docPan} alt="PAN Preview" className="w-10 h-10 object-cover rounded-lg border border-slate-200 flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 flex-shrink-0">
                              <File className="w-5 h-5" />
                            </div>
                          )}
                          <span className="text-[11px] font-bold text-slate-655 truncate flex-1" title={currentEmployee.docPanName}>
                            {currentEmployee.docPanName || 'pan_card.png'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/40">
                      {currentEmployee.docPan ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewDocUrl(currentEmployee.docPan);
                              setPreviewDocTitle('PAN Card - ' + currentEmployee.name);
                            }}
                            className="px-3 py-1.5 text-[10px] font-black text-slate-650 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDocumentDelete('docPan')}
                            className="px-3 py-1.5 text-[10px] font-black text-rose-550 bg-rose-500/5 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer flex items-center gap-1 border border-rose-500/15"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </>
                      ) : (
                        <label className="px-4.5 py-2 text-[10.5px] font-bold text-white glass-button glass-button-primary flex items-center gap-1.5 cursor-pointer">
                          <Upload className="w-3.5 h-3.5 text-white" />
                          <span>Upload PAN</span>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleDocumentUpload(e.target.files[0], 'docPan');
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Card 3: Driver's License (Only for Rider role) */}
                  {currentEmployee.role === 'Rider' && (
                    <div className="glass-panel p-4 flex flex-col justify-between hover:border-[#1A6FDB]/20 transition-all space-y-4 md:col-span-2">
                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="text-xs font-black text-slate-800">Driver's License</h5>
                            <p className="text-[9.5px] text-slate-455 mt-0.5">Valid commercial or private transport vehicle driver's license (Front & Back).</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${
                            currentEmployee.docLicense 
                              ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600' 
                              : 'bg-rose-500/10 border-rose-500/25 text-rose-650'
                          }`}>
                            {currentEmployee.docLicense ? 'Uploaded' : 'Not Uploaded'}
                          </span>
                        </div>

                        {/* Display name/thumbnail if uploaded */}
                        {currentEmployee.docLicense && (
                          <div className="mt-3 p-2 rounded-xl bg-slate-50 border border-slate-200/50 flex items-center gap-2">
                            {currentEmployee.docLicense.startsWith('data:image/') ? (
                              <img src={currentEmployee.docLicense} alt="License Preview" className="w-10 h-10 object-cover rounded-lg border border-slate-200 flex-shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 flex-shrink-0">
                                <File className="w-5 h-5" />
                              </div>
                            )}
                            <span className="text-[11px] font-bold text-slate-650 truncate flex-1" title={currentEmployee.docLicenseName}>
                              {currentEmployee.docLicenseName || 'drivers_license.png'}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/40">
                        {currentEmployee.docLicense ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewDocUrl(currentEmployee.docLicense);
                                setPreviewDocTitle('Driver\'s License - ' + currentEmployee.name);
                              }}
                              className="px-3 py-1.5 text-[10px] font-black text-slate-650 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Preview</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDocumentDelete('docLicense')}
                              className="px-3 py-1.5 text-[10px] font-black text-rose-550 bg-rose-500/5 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer flex items-center gap-1 border border-rose-500/15"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </>
                        ) : (
                          <label className="px-4.5 py-2 text-[10.5px] font-bold text-white glass-button glass-button-primary flex items-center gap-1.5 cursor-pointer">
                            <Upload className="w-3.5 h-3.5 text-white" />
                            <span>Upload License</span>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleDocumentUpload(e.target.files[0], 'docLicense');
                                }
                              }}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Document Preview Modal */}
        {previewDocUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in print:hidden">
            <div className="relative w-full max-w-3xl glass-panel bg-white border border-slate-250 shadow-2xl p-5 flex flex-col max-h-[85vh]">
              {/* Header */}
              <div className="flex justify-between items-center border-b border-slate-205 pb-3 mb-4 flex-shrink-0">
                <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider truncate">{previewDocTitle}</h4>
                <button
                  type="button"
                  onClick={() => setPreviewDocUrl(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 text-[10px] font-black uppercase tracking-wider cursor-pointer transition-colors"
                >
                  Close Preview
                </button>
              </div>

              {/* Content body */}
              <div className="flex-1 overflow-auto bg-slate-50 rounded-xl p-3 flex items-center justify-center min-h-[300px] border border-slate-200/50">
                {previewDocUrl.startsWith('data:application/pdf') ? (
                  <iframe src={previewDocUrl} className="w-full h-[60vh] rounded-xl border border-slate-200 bg-white" title={previewDocTitle} />
                ) : (
                  <img src={previewDocUrl} alt={previewDocTitle} className="max-w-full max-h-[60vh] rounded-xl object-contain mx-auto shadow-md" />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
