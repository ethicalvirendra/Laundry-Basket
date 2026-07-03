import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Fingerprint,
  MapPin,
  Clock,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Navigation,
  Table2,
  Calendar,
  Timer,
  Users,
  User,
  Locate,
  ShieldCheck,
  ShieldX,
  LogIn,
  LogOut
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────
type AttendanceStatus = 'Present' | 'Late' | 'Absent' | 'Half Day' | 'On Leave' | 'Week Off';

interface AttendanceRecord {
  employeeId: number;
  employeeName: string;
  role: string;
  date: string;        // YYYY-MM-DD
  clockIn: string | null;
  clockOut: string | null;
  hoursWorked: number;
  status: AttendanceStatus;
}

interface Props {
  viewMode: 'admin' | 'employee';
  currentUser: any;
  staffList: any[];
  clockLogs: any[];
  setClockLogs: (val: any) => void;
}

// ── Constants ──────────────────────────────────────────────────────────
const HUBS = [
  { name: 'Workshop (Karond)', lat: 23.292861, lng: 77.477806 },
  { name: 'Ayodhya Nagar Store', lat: 23.270129, lng: 77.472889 },
  { name: 'Bawdiya Kalan Store', lat: 23.185278, lng: 77.441000 }
];
const GEOFENCE_RADIUS_M = 100;

const STATUS_STYLES: Record<AttendanceStatus, { bg: string; text: string; border: string; dot: string }> = {
  'Present':   { bg: 'bg-emerald-500/10', text: 'text-emerald-700', border: 'border-emerald-500/20', dot: 'bg-emerald-500' },
  'Late':      { bg: 'bg-amber-500/10',   text: 'text-amber-700',   border: 'border-amber-500/20',   dot: 'bg-amber-500'   },
  'Absent':    { bg: 'bg-rose-500/10',     text: 'text-rose-700',     border: 'border-rose-500/20',     dot: 'bg-rose-500'     },
  'Half Day':  { bg: 'bg-orange-500/10',   text: 'text-orange-700',   border: 'border-orange-500/20',   dot: 'bg-orange-500'   },
  'On Leave':  { bg: 'bg-violet-500/10',   text: 'text-violet-700',   border: 'border-violet-500/20',   dot: 'bg-violet-500'   },
  'Week Off':  { bg: 'bg-slate-400/10',    text: 'text-slate-500',    border: 'border-slate-400/20',    dot: 'bg-slate-400'    },
};

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_HEADERS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

// ── Helpers ────────────────────────────────────────────────────────────
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000; // Earth radius in meters
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmt12(h: number, m: number): string {
  const period = h >= 12 ? 'PM' : 'AM';
  const dh = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${dh.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
}

function dateParts(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

function fmtDateLabel(iso: string): string {
  const { d, m } = dateParts(iso);
  return `${d.toString().padStart(2, '0')} ${MONTH_NAMES[m - 1].slice(0, 3)}`;
}

// ── Mock Data Generator ────────────────────────────────────────────────
function buildMockData(staffList: any[]): AttendanceRecord[] {
  return [];
}

// ── Calendar helpers ───────────────────────────────────────────────────
function getCalendarGrid(month: number, year: number): (number | null)[] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let startDay = first.getDay() - 1;          // Mon=0 … Sun=6
  if (startDay < 0) startDay = 6;

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// ════════════════════════════════════════════════════════════════════════
// ██  COMPONENT
// ════════════════════════════════════════════════════════════════════════
export default function AttendanceManagement({ viewMode, currentUser, staffList, clockLogs, setClockLogs }: Props) {

  // ── State ────────────────────────────────────────────────────────────
  const [currentMonth, setCurrentMonth] = useState(5);  // June (0-indexed)
  const [currentYear, setCurrentYear]   = useState(2026);
  const [activeView, setActiveView]     = useState<'log' | 'calendar'>('log');
  const [searchQuery, setSearchQuery]   = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedEmpId, setSelectedEmpId] = useState<number | null>(null);

  // GPS states (employee view)
  const [gpsState, setGpsState] = useState<'idle' | 'locating' | 'in-range' | 'out-of-range'>('idle');
  const [distanceM, setDistanceM] = useState<number | null>(null);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockInStamp, setClockInStamp] = useState<string | null>(null);
  const [clockOutStamp, setClockOutStamp] = useState<string | null>(null);

  // Attendance data (mapped from real-time database logs)
  const attendanceData = useMemo(() => {
    return clockLogs.map((log: any) => ({
      employeeId: log.employeeId || 0,
      employeeName: log.employeeName || log.name || '',
      role: log.role || '',
      date: log.date || new Date(Number(log.id)).toISOString().split('T')[0],
      clockIn: log.clockIn && log.clockIn !== '--:--' ? log.clockIn : null,
      clockOut: log.clockOut && log.clockOut !== '--:--' ? log.clockOut : null,
      hoursWorked: log.hoursWorked || 0,
      status: log.status as AttendanceStatus
    }));
  }, [clockLogs]);

  // Synchronize clock-in/out stamps with active database records
  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayRecord = clockLogs.find(log => 
      (log.employeeName === currentUser?.name || log.employeeId === currentUser?.id) && 
      log.date === todayStr
    );
    if (todayRecord) {
      setIsClockedIn(true);
      setClockInStamp(todayRecord.clockIn);
      if (todayRecord.clockOut && todayRecord.clockOut !== '--:--') {
        setIsClockedIn(false);
        setClockOutStamp(todayRecord.clockOut);
      }
    } else {
      setIsClockedIn(false);
      setClockInStamp(null);
      setClockOutStamp(null);
    }
  }, [clockLogs, currentUser]);

  // ── Derived / computed ───────────────────────────────────────────────
  const isEmployee = viewMode === 'employee';

  const targetHub = currentUser?.dept?.toLowerCase() === 'workshop' ? HUBS[0] : HUBS[1];

  const filteredRecords = useMemo(() => {
    let recs = attendanceData.filter(r => {
      // Only current month/year
      const { y, m } = dateParts(r.date);
      return y === currentYear && m - 1 === currentMonth;
    });

    // Employee sees only their own
    if (isEmployee) {
      recs = recs.filter(r => r.employeeId === currentUser?.id);
    } else if (selectedEmpId !== null) {
      recs = recs.filter(r => r.employeeId === selectedEmpId);
    }

    // Search (admin)
    if (!isEmployee && searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      recs = recs.filter(r => 
        r.employeeName.toLowerCase().includes(q) ||
        r.role.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== 'All') {
      recs = recs.filter(r => r.status === statusFilter);
    }

    return recs;
  }, [attendanceData, currentMonth, currentYear, isEmployee, currentUser, selectedEmpId, searchQuery, statusFilter]);

  // Sort records: newest date first, then employee name
  const sortedRecords = useMemo(() =>
    [...filteredRecords].sort((a, b) => b.date.localeCompare(a.date) || a.employeeName.localeCompare(b.employeeName)),
  [filteredRecords]);

  // Summary counters for filtered set
  const summary = useMemo(() => {
    const counts: Record<AttendanceStatus, number> = {
      'Present': 0, 'Late': 0, 'Absent': 0, 'Half Day': 0, 'On Leave': 0, 'Week Off': 0,
    };
    filteredRecords.forEach(r => { counts[r.status]++; });
    return counts;
  }, [filteredRecords]);

  // Calendar cells
  const calendarCells = useMemo(() => getCalendarGrid(currentMonth, currentYear), [currentMonth, currentYear]);

  // ── GPS Handlers ─────────────────────────────────────────────────────
  const handleCheckLocation = useCallback(() => {
    setGpsState('locating');
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          let minDistance = haversineDistance(pos.coords.latitude, pos.coords.longitude, HUBS[0].lat, HUBS[0].lng);

          for (let i = 1; i < HUBS.length; i++) {
            const dist = haversineDistance(pos.coords.latitude, pos.coords.longitude, HUBS[i].lat, HUBS[i].lng);
            if (dist < minDistance) {
              minDistance = dist;
            }
          }

          setDistanceM(Math.round(minDistance));
          setGpsState(minDistance <= GEOFENCE_RADIUS_M ? 'in-range' : 'out-of-range');
        },
        (error) => {
          const isHRAdmin = currentUser?.email?.toLowerCase() === 'hr@laundrybasket.com';
          if (isHRAdmin) {
            // Fallback: simulate in-range for demo
            setDistanceM(42);
            setGpsState('in-range');
          } else {
            setDistanceM(null);
            setGpsState('out-of-range');
            alert(`Failed to acquire GPS location: ${error.message}. Please enable location permissions and try again.`);
          }
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      const isHRAdmin = currentUser?.email?.toLowerCase() === 'hr@laundrybasket.com';
      if (isHRAdmin) {
        setDistanceM(42);
        setGpsState('in-range');
      } else {
        setDistanceM(null);
        setGpsState('out-of-range');
        alert('Geolocation is not supported by your browser.');
      }
    }
  }, [currentUser]);

  const handleSimulateInRange = useCallback(() => {
    setDistanceM(42);
    setGpsState('in-range');
  }, []);

  const handleClockIn = useCallback(() => {
    const now = new Date();
    const stamp = fmt12(now.getHours(), now.getMinutes());
    setClockInStamp(stamp);
    setIsClockedIn(true);

    const todayStr = now.toISOString().split('T')[0];
    const isLate = (now.getHours() > 10 || (now.getHours() === 10 && now.getMinutes() > 5));

    const newLog = {
      id: Date.now(),
      employeeId: currentUser?.id || 0,
      employeeName: currentUser?.name || '',
      role: currentUser?.role || '',
      clockIn: stamp,
      clockOut: '--:--',
      hoursWorked: 0,
      date: todayStr,
      status: isLate ? 'Late' : 'Present',
      style: isLate ? 'text-amber-700 border-amber-500/20 bg-amber-500/5' : 'text-emerald-600 border-emerald-500/20 bg-emerald-500/5'
    };

    setClockLogs((prev: any[]) => {
      const filtered = prev.filter((log: any) => !(log.employeeName === currentUser?.name && log.date === todayStr));
      return [newLog, ...filtered];
    });
  }, [currentUser, setClockLogs]);

  const handleClockOut = useCallback(() => {
    const now = new Date();
    const stamp = fmt12(now.getHours(), now.getMinutes());
    setClockOutStamp(stamp);
    setIsClockedIn(false);

    const todayStr = now.toISOString().split('T')[0];

    setClockLogs((prev: any[]) => {
      return prev.map((log: any) => {
        if ((log.employeeName === currentUser?.name || log.employeeId === currentUser?.id) && log.date === todayStr) {
          const hours = +(((now.getHours() * 60 + now.getMinutes()) - 10 * 60) / 60).toFixed(1);
          return {
            ...log,
            clockOut: stamp,
            hoursWorked: Math.max(0, hours)
          };
        }
        return log;
      });
    });
  }, [currentUser, setClockLogs]);

  // Export report as CSV (compatible with Excel)
  const handleExportCSV = useCallback(() => {
    const headers = ['Date', 'Employee ID', 'Name', 'Role', 'Clock In', 'Clock Out', 'Hours Worked', 'Status'];
    const rows = sortedRecords.map(r => [
      r.date,
      `LBBPL${String(r.employeeId).padStart(3, '0')}`,
      r.employeeName,
      r.role,
      r.clockIn || '--:--',
      r.clockOut || '--:--',
      r.hoursWorked,
      r.status
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.map(val => `"${val}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Attendance_Report_${MONTH_NAMES[currentMonth]}_${currentYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [sortedRecords, currentMonth, currentYear]);

  // Month nav
  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  // Get records for a specific calendar day
  const getRecordsForDay = (day: number) => {
    const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    let recs = attendanceData.filter(r => r.date === dateStr);
    if (isEmployee) recs = recs.filter(r => r.employeeId === currentUser?.id);
    else if (selectedEmpId !== null) recs = recs.filter(r => r.employeeId === selectedEmpId);
    return recs;
  };

  const todayStr = '2026-06-11';

  // ════════════════════════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Month Navigator + Title ─────────────────────────────────── */}
      <div className="glass-panel p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1A6FDB] to-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Fingerprint className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-800">{isEmployee ? 'My Attendance' : 'Attendance Management'}</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              {isEmployee ? 'Track your clock-in records' : `${staffList.length} employees · ${MONTH_NAMES[currentMonth]} ${currentYear}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 rounded-lg glass-button hover:bg-white/60 cursor-pointer transition-all">
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <span className="px-4 py-2 rounded-xl bg-white/70 border border-slate-200/50 text-sm font-extrabold text-slate-800 min-w-[160px] text-center">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </span>
          <button onClick={nextMonth} className="p-2 rounded-lg glass-button hover:bg-white/60 cursor-pointer transition-all">
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>

      {/* ── Summary Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {(Object.keys(STATUS_STYLES) as AttendanceStatus[]).map(status => {
          const s = STATUS_STYLES[status];
          const count = summary[status];
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? 'All' : status)}
              className={`glass-panel p-3.5 flex flex-col items-center gap-1.5 cursor-pointer transition-all hover:scale-[1.03] active:scale-[0.98] ${
                statusFilter === status ? 'ring-2 ring-[#1A6FDB]/40 shadow-lg' : ''
              }`}
            >
              <div className={`w-8 h-8 rounded-lg ${s.bg} ${s.border} border flex items-center justify-center`}>
                <div className={`w-3 h-3 rounded-full ${s.dot}`} />
              </div>
              <span className="text-xl font-black text-slate-800">{count}</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${s.text}`}>{status}</span>
            </button>
          );
        })}
      </div>

      {/* ── GPS Clock-In Panel (Employee Only) ──────────────────────── */}
      {isEmployee && (
        <div className="glass-panel p-5 border-l-4 border-[#1A6FDB]">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-[#1A6FDB]" />
            <h3 className="text-sm font-extrabold text-slate-800">GPS Attendance · Geofenced Clock-In / Out</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Office Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-slate-600 font-bold">
                <Navigation className="w-3.5 h-3.5 text-[#1A6FDB]" />
                <span>{targetHub.name}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <Locate className="w-3.5 h-3.5" />
                <span>Geofence Radius: {GEOFENCE_RADIUS_M}m</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                <span>Lat {targetHub.lat.toFixed(6)}° · Lng {targetHub.lng.toFixed(6)}°</span>
              </div>
            </div>

            {/* Location Status */}
            <div className="flex flex-col items-center justify-center gap-2">
              {gpsState === 'idle' && (
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={handleCheckLocation}
                    className="glass-button glass-button-primary px-5 py-2.5 text-xs font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <Locate className="w-4 h-4 text-white" />
                    <span>Check My Location</span>
                  </button>
                  {currentUser?.email?.toLowerCase() === 'hr@laundrybasket.com' && (
                    <button
                      onClick={handleSimulateInRange}
                      className="text-[10px] text-blue-500 hover:text-blue-700 underline cursor-pointer font-bold"
                    >
                      Simulate In-Range (Demo)
                    </button>
                  )}
                </div>
              )}
              {gpsState === 'locating' && (
                <div className="flex items-center gap-2 text-xs text-[#1A6FDB] font-bold animate-pulse">
                  <Locate className="w-4 h-4 animate-spin" />
                  <span>Acquiring GPS signal…</span>
                </div>
              )}
              {gpsState === 'in-range' && (
                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-extrabold text-emerald-700">In Range · {distanceM}m from office</span>
                  </div>
                  <span className="text-[10px] text-emerald-600 font-bold">✓ You can clock in / out</span>
                </div>
              )}
              {gpsState === 'out-of-range' && (
                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                    <ShieldX className="w-4 h-4 text-rose-600" />
                    <span className="text-xs font-extrabold text-rose-700">Out of Range · {distanceM}m away</span>
                  </div>
                  <span className="text-[10px] text-rose-500 font-bold">Move within {GEOFENCE_RADIUS_M}m of office to clock in</span>
                </div>
              )}
            </div>

            {/* Clock In/Out Buttons */}
            <div className="flex flex-col items-center justify-center gap-2">
              {!isClockedIn && !clockOutStamp && (
                <button
                  onClick={handleClockIn}
                  disabled={gpsState !== 'in-range'}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-extrabold transition-all ${
                    gpsState === 'in-range'
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 cursor-pointer hover:shadow-xl active:scale-[0.97]'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/50'
                  }`}
                >
                  <LogIn className="w-4 h-4" />
                  <span>CLOCK IN</span>
                </button>
              )}
              {isClockedIn && (
                <>
                  <div className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Clocked in at {clockInStamp}
                  </div>
                  <button
                    onClick={handleClockOut}
                    disabled={gpsState !== 'in-range'}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-extrabold transition-all ${
                      gpsState === 'in-range'
                        ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-lg shadow-rose-500/25 cursor-pointer hover:shadow-xl active:scale-[0.97]'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/50'
                    }`}
                  >
                    <LogOut className="w-4 h-4" />
                    <span>CLOCK OUT</span>
                  </button>
                </>
              )}
              {clockOutStamp && !isClockedIn && (
                <div className="flex flex-col items-center gap-1 text-xs font-bold text-slate-600">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  <span>Shift complete</span>
                  <span className="text-[10px] text-slate-400">{clockInStamp} → {clockOutStamp}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── View Toggle + Filters Row ───────────────────────────────── */}
      <div className="glass-panel p-3 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* View Toggle */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100/60 border border-slate-200/40">
          <button
            onClick={() => setActiveView('log')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeView === 'log' ? 'bg-white text-[#1A6FDB] shadow-sm border border-slate-200/30' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Table2 className="w-3.5 h-3.5" />
            <span>Daily Log</span>
          </button>
          <button
            onClick={() => setActiveView('calendar')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeView === 'calendar' ? 'bg-white text-[#1A6FDB] shadow-sm border border-slate-200/30' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Calendar</span>
          </button>
        </div>

        {/* Search & Status Filter */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          {!isEmployee && (
            <>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/50 rounded-xl cursor-pointer shadow-sm transition-colors"
                title="Download Excel / CSV Report"
              >
                <Table2 className="w-3.5 h-3.5 text-emerald-605" />
                <span>Export Report</span>
              </button>
              <div className="relative flex-1 md:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search employee..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-xs glass-input"
                />
              </div>
            </>
          )}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/70 border border-slate-200/50 text-xs text-slate-700">
            <Filter className="w-4 h-4 text-[#1A6FDB]" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-transparent text-slate-700 outline-none font-bold cursor-pointer"
            >
              <option value="All">All Status</option>
              {(Object.keys(STATUS_STYLES) as AttendanceStatus[]).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Employee Filter Chips (Admin only) ──────────────────────── */}
      {!isEmployee && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedEmpId(null)}
            className={`px-3.5 py-1.5 rounded-full text-[11px] font-extrabold transition-all cursor-pointer border ${
              selectedEmpId === null
                ? 'bg-[#1A6FDB] text-white border-[#1A6FDB] shadow-md shadow-blue-500/20'
                : 'bg-white/70 text-slate-600 border-slate-200/50 hover:bg-white hover:border-slate-300'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Users className="w-3 h-3" />
              All Employees
            </span>
          </button>
          {staffList.map(emp => (
            <button
              key={emp.id}
              onClick={() => setSelectedEmpId(selectedEmpId === emp.id ? null : emp.id)}
              className={`px-3.5 py-1.5 rounded-full text-[11px] font-extrabold transition-all cursor-pointer border ${
                selectedEmpId === emp.id
                  ? 'bg-[#1A6FDB] text-white border-[#1A6FDB] shadow-md shadow-blue-500/20'
                  : 'bg-white/70 text-slate-600 border-slate-200/50 hover:bg-white hover:border-slate-300'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <User className="w-3 h-3" />
                {emp.name.split(' ')[0]}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── DAILY LOG VIEW ──────────────────────────────────────────── */}
      {activeView === 'log' && (
        <div className="glass-panel overflow-hidden">
          {/* Table Header */}
          <div className={`grid ${isEmployee ? 'grid-cols-5' : 'grid-cols-6'} gap-px bg-slate-100/80 border-b border-slate-200/50 text-[10px] font-black uppercase tracking-wider text-slate-500`}>
            {!isEmployee && <div className="px-4 py-3 bg-white/50">Employee</div>}
            <div className="px-4 py-3 bg-white/50">Date</div>
            <div className="px-4 py-3 bg-white/50">Clock In</div>
            <div className="px-4 py-3 bg-white/50">Clock Out</div>
            <div className="px-4 py-3 bg-white/50">Hours</div>
            <div className="px-4 py-3 bg-white/50">Status</div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-slate-100/80 max-h-[480px] overflow-y-auto">
            {sortedRecords.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Fingerprint className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm font-bold">No attendance records found</p>
                <p className="text-xs mt-1">Adjust filters or select a different month</p>
              </div>
            )}
            {sortedRecords.map((rec, idx) => {
              const st = STATUS_STYLES[rec.status];
              const isToday = rec.date === todayStr;
              return (
                <div
                  key={`${rec.employeeId}-${rec.date}-${idx}`}
                  className={`grid ${isEmployee ? 'grid-cols-5' : 'grid-cols-6'} gap-px items-center text-xs transition-colors ${
                    isToday ? 'bg-blue-50/40' : 'hover:bg-slate-50/60'
                  }`}
                >
                  {!isEmployee && (
                    <div className="px-4 py-3.5 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-100 to-blue-50 border border-slate-200/50 flex items-center justify-center text-[10px] font-extrabold text-[#1A6FDB] flex-shrink-0">
                        {rec.employeeName.split(' ').map((n: string) => n[0]).join('')}
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-bold text-slate-800 truncate">{rec.employeeName}</p>
                        <p className="text-[10px] text-slate-400 font-medium truncate">{rec.role}</p>
                      </div>
                    </div>
                  )}
                  <div className="px-4 py-3.5">
                    <span className={`font-bold ${isToday ? 'text-[#1A6FDB]' : 'text-slate-700'}`}>
                      {fmtDateLabel(rec.date)}
                    </span>
                    {isToday && <span className="ml-1.5 text-[9px] font-bold text-[#1A6FDB] bg-blue-500/10 px-1.5 py-0.5 rounded-md border border-blue-500/20">TODAY</span>}
                  </div>
                  <div className="px-4 py-3.5 font-mono font-bold text-slate-700">
                    {rec.clockIn || <span className="text-slate-300">--:--</span>}
                  </div>
                  <div className="px-4 py-3.5 font-mono font-bold text-slate-700">
                    {rec.clockOut || <span className="text-slate-300">--:--</span>}
                  </div>
                  <div className="px-4 py-3.5 font-extrabold text-slate-700">
                    {rec.hoursWorked > 0 ? `${rec.hoursWorked}h` : <span className="text-slate-300">—</span>}
                  </div>
                  <div className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider ${st.bg} ${st.text} ${st.border} border`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                      {rec.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Table Footer with record count */}
          <div className="px-4 py-3 bg-slate-50/60 border-t border-slate-200/50 text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center justify-between">
            <span>Showing {sortedRecords.length} record{sortedRecords.length !== 1 ? 's' : ''}</span>
            <span>{MONTH_NAMES[currentMonth]} {currentYear}</span>
          </div>
        </div>
      )}

      {/* ── CALENDAR VIEW ───────────────────────────────────────────── */}
      {activeView === 'calendar' && (
        <div className="glass-panel overflow-hidden">
          {/* Day-of-week header */}
          <div className="grid grid-cols-7 gap-px bg-slate-100/80 border-b border-slate-200/50">
            {DAY_HEADERS.map(day => (
              <div key={day} className={`px-2 py-2.5 text-center text-[10px] font-black uppercase tracking-wider bg-white/50 ${
                day === 'Sun' ? 'text-rose-500' : day === 'Sat' ? 'text-amber-600' : 'text-slate-500'
              }`}>
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px bg-slate-100/60">
            {calendarCells.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="min-h-[90px] bg-slate-50/40" />;
              }

              const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
              const isToday = dateStr === todayStr;
              const dayRecords = getRecordsForDay(day);
              const isFuture = day > 11 && currentMonth === 5 && currentYear === 2026;
              const dayDow = new Date(currentYear, currentMonth, day).getDay();
              const isSunday = dayDow === 0;
              const isSaturday = dayDow === 6;

              return (
                <div
                  key={`day-${day}`}
                  className={`min-h-[90px] p-2 transition-colors relative ${
                    isToday
                      ? 'bg-blue-50/50 ring-2 ring-inset ring-[#1A6FDB]/20'
                      : isFuture
                        ? 'bg-slate-50/30'
                        : isSunday
                          ? 'bg-rose-50/30'
                          : 'bg-white/60 hover:bg-white/80'
                  }`}
                >
                  {/* Day number */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-sm font-extrabold ${
                      isToday
                        ? 'w-7 h-7 rounded-full bg-[#1A6FDB] text-white flex items-center justify-center text-xs'
                        : isSunday
                          ? 'text-rose-400'
                          : isSaturday
                            ? 'text-amber-600'
                            : 'text-slate-700'
                    }`}>
                      {day}
                    </span>
                    {isToday && <span className="text-[8px] font-black text-[#1A6FDB] uppercase">Today</span>}
                  </div>

                  {/* Records visualization */}
                  {isFuture ? (
                    <span className="text-[9px] text-slate-300 font-bold">—</span>
                  ) : dayRecords.length === 0 && !isSunday ? (
                    <span className="text-[9px] text-slate-300 font-bold">No data</span>
                  ) : (
                    <div className="space-y-1">
                      {/* If showing all employees (admin, no selection): show dots */}
                      {!isEmployee && selectedEmpId === null ? (
                        <div className="flex flex-wrap gap-1">
                          {dayRecords.map((rec, ri) => {
                            const st = STATUS_STYLES[rec.status];
                            return (
                              <div
                                key={ri}
                                title={`${rec.employeeName}: ${rec.status}`}
                                className={`w-3 h-3 rounded-full ${st.dot} border-2 border-white shadow-sm cursor-default`}
                              />
                            );
                          })}
                        </div>
                      ) : (
                        /* Single employee: show status label */
                        dayRecords.map((rec, ri) => {
                          const st = STATUS_STYLES[rec.status];
                          return (
                            <div key={ri} className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${st.bg} ${st.text} truncate`}>
                              {rec.status}
                              {rec.clockIn && <span className="ml-1 opacity-70">{rec.clockIn}</span>}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Calendar Legend */}
          <div className="px-4 py-3 bg-slate-50/60 border-t border-slate-200/50 flex flex-wrap items-center gap-4">
            {(Object.keys(STATUS_STYLES) as AttendanceStatus[]).map(status => {
              const s = STATUS_STYLES[status];
              return (
                <div key={status} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                  <div className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
                  <span>{status}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
