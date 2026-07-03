import React, { useState } from 'react';
import { 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Plus, 
  User, 
  Sparkles,
  UserCheck,
  CheckCircle,
  X
} from 'lucide-react';

// Mock weekly shifts allocation
const initialWeeklyShifts = {
  Mon: [
    { id: 1, staff: 'Bhupendra Sarathe', role: 'Rider', type: 'Morning (08 AM - 04 PM)' },
    { id: 2, staff: 'Neeraj Singh Parihar', role: 'VP', type: 'Morning (09 AM - 06 PM)' },
    { id: 3, staff: 'Akhilesh Jatav', role: 'Pressman', type: 'Morning (09 AM - 05 PM)' },
  ],
  Tue: [
    { id: 4, staff: 'Keshav Sahu', role: 'Rider', type: 'Morning (08 AM - 04 PM)' },
    { id: 5, staff: 'Neeraj Singh Parihar', role: 'VP', type: 'Morning (09 AM - 06 PM)' },
    { id: 6, staff: 'Man', role: 'Washing Executive', type: 'Morning (08 AM - 04 PM)' },
  ],
  Wed: [
    { id: 7, staff: 'Bhupendra Sarathe', role: 'Rider', type: 'Morning (08 AM - 04 PM)' },
    { id: 8, staff: 'Keshav Sahu', role: 'Rider', type: 'Evening (04 PM - 10 PM)' },
    { id: 9, staff: 'Akhilesh Jatav', role: 'Pressman', type: 'Morning (09 AM - 05 PM)' },
  ],
  Thu: [
    { id: 10, staff: 'Naresh Bansal', role: 'Rider', type: 'Morning (08 AM - 04 PM)' },
    { id: 11, staff: 'Neeraj Singh Parihar', role: 'VP', type: 'Morning (09 AM - 06 PM)' },
    { id: 12, staff: 'Man', role: 'Washing Executive', type: 'Morning (08 AM - 04 PM)' },
  ],
  Fri: [
    { id: 13, staff: 'Bhupendra Sarathe', role: 'Rider', type: 'Morning (08 AM - 04 PM)' },
    { id: 14, staff: 'Keshav Sahu', role: 'Rider', type: 'Morning (08 AM - 04 PM)' },
    { id: 15, staff: 'Akhilesh Jatav', role: 'Pressman', type: 'Morning (09 AM - 05 PM)' },
  ],
  Sat: [
    { id: 16, staff: 'Naresh Bansal', role: 'Rider', type: 'Morning (08 AM - 04 PM)' },
    { id: 17, staff: 'Man', role: 'Washing Executive', type: 'Morning (08 AM - 04 PM)' },
  ],
  Sun: [
    { id: 18, staff: 'Bhupendra Sarathe', role: 'Rider', type: 'Morning (08 AM - 04 PM)' },
  ],
};

interface ShiftSchedulerProps {
  shifts: Record<string, Array<{ id: number; staff: string; role: string; type: string }>>;
  setShifts: React.Dispatch<React.SetStateAction<Record<string, Array<{ id: number; staff: string; role: string; type: string }>>>>;
  clockLogs: any[];
  setClockLogs: React.Dispatch<React.SetStateAction<any[]>>;
}

export default function ShiftScheduler({ shifts, setShifts, clockLogs, setClockLogs }: ShiftSchedulerProps) {
  const [selectedDay, setSelectedDay] = useState<keyof typeof initialWeeklyShifts>('Mon');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignName, setAssignName] = useState('');
  const [assignRole, setAssignRole] = useState('Rider');
  const [assignType, setAssignType] = useState('Morning (08 AM - 04 PM)');

  const handleAssignShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignName) return;

    const newShift = {
      id: Date.now(),
      staff: assignName,
      role: assignRole,
      type: assignType
    };

    const currentShifts = shifts[selectedDay] || [];
    setShifts({
      ...shifts,
      [selectedDay]: [...currentShifts, newShift]
    });

    setShowAssignModal(false);
    setAssignName('');
  };

  const removeShift = (day: keyof typeof initialWeeklyShifts, id: number) => {
    setShifts({
      ...shifts,
      [day]: shifts[day].filter(s => s.id !== id)
    });
  };

  const daysOfWeek: Array<{ key: keyof typeof initialWeeklyShifts; label: string; date: string }> = [
    { key: 'Mon', label: 'Mon', date: 'June 01' },
    { key: 'Tue', label: 'Tue', date: 'June 02' },
    { key: 'Wed', label: 'Wed', date: 'June 03' },
    { key: 'Thu', label: 'Thu', date: 'June 04' },
    { key: 'Fri', label: 'Fri', date: 'June 05' },
    { key: 'Sat', label: 'Sat', date: 'June 06' },
    { key: 'Sun', label: 'Sun', date: 'June 07' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Calendar Roster Header */}
      <div className="glass-panel p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[#1A6FDB]">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 leading-tight">Weekly Planner</h3>
            <p className="text-xs text-slate-500 mt-0.5 font-bold">June 01, 2026 - June 07, 2026</p>
          </div>
        </div>

        <div className="flex items-center gap-3.5">
          <button className="p-2 rounded-lg glass-button text-slate-500 hover:text-slate-850 cursor-pointer transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">This Week</span>
          <button className="p-2 rounded-lg glass-button text-slate-500 hover:text-slate-850 cursor-pointer transition-all">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: Days Tab & List details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Days Roster Selector */}
        <div className="glass-panel p-4 lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/40 pb-3">
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4.5 h-4.5 text-[#1A6FDB]" />
              Roster Grid
            </h3>
            <button 
              onClick={() => setShowAssignModal(true)}
              className="glass-button glass-button-primary flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              <span>Allocate Shift</span>
            </button>
          </div>

          {/* Daily tabs */}
          <div className="flex flex-row overflow-x-auto md:grid md:grid-cols-7 gap-2 pb-2 md:pb-0">
            {daysOfWeek.map((day) => {
              const count = shifts[day.key]?.length || 0;
              const isSelected = selectedDay === day.key;
              
              return (
                <button
                  key={day.key}
                  onClick={() => setSelectedDay(day.key)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all cursor-pointer flex-shrink-0 w-[68px] md:w-auto ${
                    isSelected
                      ? 'bg-[#1A6FDB]/8 border-[#1A6FDB]/40 text-[#1A6FDB] shadow-sm'
                      : 'bg-white/40 border-slate-200/40 text-slate-500 hover:bg-white/70 hover:text-slate-800'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wide">{day.label}</span>
                  <span className="text-xs font-bold mt-1 font-mono">{day.date.split(' ')[1]}</span>
                  <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded-full mt-2 ${
                    isSelected ? 'bg-[#1A6FDB]/15 text-[#1A6FDB]' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Shift Details list for Selected Day */}
          <div className="space-y-3 mt-4">
            <h4 className="text-xs uppercase font-extrabold text-slate-400 tracking-wider">
              Shift details for {selectedDay}day, {daysOfWeek.find(d => d.key === selectedDay)?.date}
            </h4>
            
            <div className="space-y-2.5">
              {(shifts[selectedDay] || []).length > 0 ? (
                (shifts[selectedDay] || []).map((s) => (
                  <div 
                    key={s.id}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-white/40 border border-slate-200/30 hover:bg-white/70 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8.5 h-8.5 rounded-lg bg-slate-105 border border-slate-200/50 flex items-center justify-center text-slate-700 font-bold text-xs uppercase bg-gradient-to-br from-white to-slate-50">
                        {s.staff.substring(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 leading-tight">{s.staff}</p>
                        <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200/40 text-[9px] font-bold text-slate-500 mt-1">
                          {s.role}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-xs text-slate-600 font-bold flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200/30">
                        <Clock className="w-3.5 h-3.5 text-[#1A6FDB]" />
                        {s.type}
                      </span>
                      <button 
                        onClick={() => removeShift(selectedDay, s.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100/50 rounded-md cursor-pointer transition-all"
                        title="Remove allotment"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center glass-panel border-dashed border-slate-200/40 flex flex-col items-center justify-center bg-white/10">
                  <User className="w-8 h-8 text-slate-400 mb-2" />
                  <p className="text-xs font-bold text-slate-400">No shifts scheduled for this day.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Live Punch Clock logs */}
        <div className="glass-panel p-4 lg:col-span-4 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200/40 pb-3 mb-4">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <UserCheck className="w-4.5 h-4.5 text-[#1A6FDB] animate-pulse" />
                Today's Punch Log
              </h3>
              <span className="text-[10px] text-slate-450 font-mono font-bold">Live Sync</span>
            </div>

            <div className="space-y-3.5">
              {clockLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3.5 rounded-xl bg-white/40 border border-slate-200/30 hover:bg-white/70 transition-all">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-800 leading-tight">{log.name}</p>
                    <p className="text-[8.5px] uppercase font-bold text-slate-400 tracking-wide">{log.role}</p>
                  </div>
                  
                  <div className="flex items-center gap-2 text-right">
                    <div>
                      <p className="text-[11px] font-bold text-slate-850 font-mono leading-none">{log.clockIn}</p>
                      <p className="text-[8px] text-slate-400 font-bold mt-1">Clock In</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${log.style} ml-1`}>
                      {log.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200/40 flex items-center justify-between text-[11px] text-slate-400 font-bold">
            <span>Last sync: 2 mins ago</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
        </div>

      </div>

      {/* Elegant Allocate Shift Roster Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-md p-6 border border-white/70 relative shadow-2xl bg-white/95">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200/40 pb-3.5 mb-5">
              <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-[#1A6FDB]" />
                Allocate {selectedDay}day Shift
              </h3>
              <button 
                onClick={() => setShowAssignModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-450 hover:text-slate-800 cursor-pointer transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAssignShift} className="space-y-4">
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Staff Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Bhupendra Sarathe" 
                  value={assignName}
                  onChange={(e) => setAssignName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs glass-input bg-white/70"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Designation</label>
                <select 
                  value={assignRole}
                  onChange={(e) => setAssignRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs glass-input bg-white"
                >
                  <option value="Rider">Rider (Delivery)</option>
                  <option value="Store Manager">Store Manager</option>
                  <option value="Ironer">Ironing Specialist</option>
                  <option value="Washing">Washing Operator</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Shift Time Slots</label>
                <select 
                  value={assignType}
                  onChange={(e) => setAssignType(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs glass-input bg-white"
                >
                  <option value="Morning (08 AM - 04 PM)">Morning (08:00 AM - 04:00 PM)</option>
                  <option value="General (09 AM - 06 PM)">General Store (09:00 AM - 06:00 PM)</option>
                  <option value="Evening (04 PM - 10 PM)">Evening (04:00 PM - 10:00 PM)</option>
                  <option value="Night (10 PM - 06 AM)">Night (10:00 PM - 06:00 AM)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200/40 pt-4 mt-6">
                <button 
                  type="button" 
                  onClick={() => setShowAssignModal(false)}
                  className="px-4.5 py-2.5 text-xs font-bold text-slate-650 glass-button bg-white/50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 text-xs font-bold text-white glass-button glass-button-primary"
                >
                  Allocate Shift
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
