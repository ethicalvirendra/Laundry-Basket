import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Calendar, 
  Clock, 
  Check, 
  X, 
  AlertCircle,
  HelpCircle,
  FileClock,
  Sparkles,
  Search,
  User
} from 'lucide-react';

// Initial Mock Leave Requests
const initialLeaves = [
  { id: 1, name: 'Akhilesh Jatav', role: 'Pressman', type: 'Sick Leave', dates: 'June 01 - June 02', duration: '2 days', reason: 'Severe viral fever, advised bed rest.', status: 'Pending' },
  { id: 2, name: 'Neeraj Singh Parihar', role: 'VP', type: 'Casual Leave', dates: 'June 04 - June 05', duration: '2 days', reason: 'Attending family wedding out of city.', status: 'Pending' },
  { id: 3, name: 'Keshav Sahu', role: 'Rider', type: 'Privilege Leave', dates: 'June 10 - June 14', duration: '5 days', reason: 'Annual travel to home town.', status: 'Pending' },
  // History archives
  { id: 4, name: 'Bhupendra Sarathe', role: 'Rider', type: 'Casual Leave', dates: 'May 12 - May 13', duration: '2 days', reason: 'Personal emergency work at bank.', status: 'Approved' },
  { id: 5, name: 'Raju', role: 'Pressman', type: 'Sick Leave', dates: 'May 04', duration: '1 day', reason: 'Doctor checkup dental extraction.', status: 'Approved' },
  { id: 6, name: 'Kunal Sahu', role: 'Rider', type: 'Casual Leave', dates: 'May 20', duration: '1 day', reason: 'RTO vehicle verification registration.', status: 'Rejected' },
];

interface LeaveApprovalsProps {
  leavesList: any[];
  setLeavesList: React.Dispatch<React.SetStateAction<any[]>>;
}

export default function LeaveApprovals({ leavesList, setLeavesList }: LeaveApprovalsProps) {
  const [activeSegment, setActiveSegment] = useState<'pending' | 'history'>('pending');

  const handleReviewLeave = (id: number, status: 'Approved' | 'Rejected') => {
    setLeavesList(leavesList.map(item => {
      if (item.id === id) {
        return { ...item, status };
      }
      return item;
    }));
  };

  const pendingRequests = leavesList.filter(item => item.status === 'Pending');
  const historyRequests = leavesList.filter(item => item.status !== 'Pending');

  // Stats calculation
  const pendingCount = pendingRequests.length;

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Leave Metrics Counters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Metric 1 */}
        <div className="glass-panel p-5 space-y-2">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">On Leave Today</p>
          <h3 className="text-3xl font-extrabold text-[#1A6FDB] glow-text-purple">1</h3>
          <p className="text-xs text-slate-500 font-bold">Akhilesh Jatav (Workshop)</p>
        </div>

        {/* Metric 2 */}
        <div className="glass-panel p-5 space-y-2">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Pending Approvals</p>
          <h3 className="text-3xl font-extrabold text-amber-600 glow-text-cyan">{pendingCount}</h3>
          <p className="text-xs text-slate-500 font-bold">Awaiting action</p>
        </div>

        {/* Metric 3 */}
        <div className="glass-panel p-5 space-y-2">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Sick Leaves Approved</p>
          <h3 className="text-3xl font-extrabold text-slate-800">2</h3>
          <p className="text-xs text-slate-500 font-bold">This Calendar Month</p>
        </div>

        {/* Metric 4 */}
        <div className="glass-panel p-5 space-y-2">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Casual Leaves Approved</p>
          <h3 className="text-3xl font-extrabold text-slate-800">4</h3>
          <p className="text-xs text-slate-500 font-bold">Within quota limits</p>
        </div>

      </div>

      {/* Segment Selector Tabs */}
      <div className="flex border-b border-slate-200/40">
        <button
          onClick={() => setActiveSegment('pending')}
          className={`px-6 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeSegment === 'pending'
              ? 'border-[#1A6FDB] text-[#1A6FDB] bg-white/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Pending Review Queue ({pendingRequests.length})
        </button>
        <button
          onClick={() => setActiveSegment('history')}
          className={`px-6 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeSegment === 'history'
              ? 'border-[#1A6FDB] text-[#1A6FDB] bg-white/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          History Archives ({historyRequests.length})
        </button>
      </div>

      {/* Roster lists based on active segment */}
      <div className="space-y-4">
        {activeSegment === 'pending' ? (
          
          /* Pending requests queue */
          pendingRequests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {pendingRequests.map((req) => (
                <div 
                  key={req.id} 
                  className="glass-panel p-5 flex flex-col justify-between space-y-4 border-l-4 border-amber-500 hover:border-[#1A6FDB]/30 hover:bg-white/70"
                >
                  <div className="space-y-3.5">
                    {/* Header profile */}
                    <div className="flex items-center gap-3 border-b border-slate-200/40 pb-3">
                      <div className="w-9 h-9 rounded-full bg-slate-105 border border-slate-200/50 flex items-center justify-center font-bold text-xs text-[#1A6FDB] bg-gradient-to-br from-white to-slate-50">
                        {req.name.split(' ').map((n: string) => n[0]).join('')}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-800 leading-tight">{req.name}</h4>
                        <span className="text-[9px] font-bold text-slate-450 uppercase tracking-wide mt-1 block">
                          {req.role}
                        </span>
                      </div>
                    </div>

                    {/* Details and Dates */}
                    <div className="space-y-2 text-xs text-slate-650 font-bold">
                      <div className="flex items-center gap-2 font-bold">
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[9px] font-bold text-amber-700 uppercase">
                          {req.type}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="font-extrabold text-slate-800">{req.duration}</span>
                      </div>

                      <div className="flex items-center gap-2 mt-2 font-bold text-slate-700">
                        <Calendar className="w-3.5 h-3.5 text-[#1A6FDB]" />
                        <span>{req.dates}</span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-100/40 border border-slate-200/30 text-xs text-slate-550 italic font-semibold leading-relaxed">
                        "{req.reason}"
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex gap-2 border-t border-slate-200/40 pt-4">
                    <button
                      onClick={() => handleReviewLeave(req.id, 'Approved')}
                      className="flex-1 glass-button bg-emerald-500/10 border-emerald-500/25 text-emerald-600 hover:bg-emerald-500/20 flex items-center justify-center gap-1.5 py-2 text-xs font-bold cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleReviewLeave(req.id, 'Rejected')}
                      className="flex-1 glass-button bg-rose-500/10 border-rose-500/25 text-rose-600 hover:bg-rose-500/20 flex items-center justify-center gap-1.5 py-2 text-xs font-bold cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                  </div>

                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center glass-panel border-dashed border-slate-200/40 flex flex-col items-center justify-center bg-white/10">
              <FileClock className="w-10 h-10 text-slate-400 mb-2 animate-bounce" />
              <p className="text-sm font-bold text-slate-400">Roster clean! No pending leave requests to review.</p>
            </div>
          )

        ) : (
          
          /* History archives list */
          <div className="glass-panel overflow-hidden border border-slate-200/40">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/40 bg-slate-50/50 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                    <th className="py-4 px-5">Staff Member</th>
                    <th className="py-4 px-5">Leave Category</th>
                    <th className="py-4 px-5">Dates Scheduled</th>
                    <th className="py-4 px-5">Duration</th>
                    <th className="py-4 px-5">Reason Summary</th>
                    <th className="py-4 px-5 text-right">Review Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                  {historyRequests.map((req) => {
                    let statusLabel = 'bg-slate-100 border-slate-200 text-slate-500';
                    if (req.status === 'Approved') statusLabel = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600';
                    if (req.status === 'Rejected') statusLabel = 'bg-rose-500/10 border-rose-500/20 text-rose-600';

                    return (
                      <tr key={req.id} className="hover:bg-white/40 transition-all">
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-105 border border-slate-200/50 flex items-center justify-center font-bold text-xs text-slate-700 bg-gradient-to-br from-white to-slate-50">
                              {req.name.split(' ').map((n: string) => n[0]).join('')}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800 leading-tight">{req.name}</p>
                              <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wide mt-0.5 block">{req.role}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200/40 text-[9px] font-bold text-slate-500 uppercase">
                            {req.type}
                          </span>
                        </td>
                        <td className="py-4 px-5 font-bold text-slate-800">{req.dates}</td>
                        <td className="py-4 px-5">{req.duration}</td>
                        <td className="py-4 px-5 text-slate-500 italic text-[11px] max-w-[200px] truncate">"{req.reason}"</td>
                        <td className="py-4 px-5 text-right">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${statusLabel}`}>
                            {req.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {historyRequests.length === 0 && (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <User className="w-8 h-8 text-slate-400 mb-2" />
                <p className="text-sm font-bold text-slate-400">No historical leave logs available.</p>
              </div>
            )}
          </div>

        )}
      </div>

    </div>
  );
}
