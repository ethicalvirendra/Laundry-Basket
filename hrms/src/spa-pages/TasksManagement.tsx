import React, { useState } from 'react';
import { 
  ClipboardList, 
  CheckCircle, 
  Clock, 
  Plus, 
  User, 
  Calendar, 
  X, 
  AlertCircle,
  FileText
} from 'lucide-react';

export interface Task {
  id: number;
  employeeName: string;
  role: string;
  taskTitle: string;
  taskDesc: string;
  assignedDate: string;
  status: 'Pending' | 'Completed';
  completionReport?: string;
  completedAt?: string;
}

interface TasksManagementProps {
  tasksList: Task[];
  setTasksList: React.Dispatch<React.SetStateAction<Task[]>>;
  staffList: any[];
}

export default function TasksManagement({ tasksList, setTasksList, staffList }: TasksManagementProps) {
  const [activeSegment, setActiveSegment] = useState<'active' | 'completed'>('active');
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);

  // Form states for assigning a task
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [taskTitle, setTaskTitle] = useState<string>('');
  const [taskDesc, setTaskDesc] = useState<string>('');
  const [assignedDate, setAssignedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAssignTask = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedStaffId) {
      setErrorMsg('Please select an employee.');
      return;
    }
    if (!taskTitle.trim() || !taskDesc.trim()) {
      setErrorMsg('Please enter both a task title and description.');
      return;
    }

    const employee = staffList.find(emp => emp.id === Number(selectedStaffId));
    if (!employee) {
      setErrorMsg('Invalid employee selected.');
      return;
    }

    const newTask: Task = {
      id: Date.now(),
      employeeName: employee.name,
      role: employee.role,
      taskTitle: taskTitle.trim(),
      taskDesc: taskDesc.trim(),
      assignedDate,
      status: 'Pending'
    };

    setTasksList(prev => [newTask, ...prev]);
    
    // Reset form states
    setTaskTitle('');
    setTaskDesc('');
    setSelectedStaffId('');
    setShowAssignModal(false);
  };

  const handleDeleteTask = (id: number) => {
    setTasksList(prev => prev.filter(t => t.id !== id));
  };

  const activeTasks = tasksList.filter(t => t.status === 'Pending');
  const completedTasks = tasksList.filter(t => t.status === 'Completed');

  // Stats Calculations
  const totalTasks = tasksList.length;
  const completedCount = completedTasks.length;
  const pendingCount = activeTasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Tasks Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total */}
        <div className="glass-panel p-5 space-y-2">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Tasks Assigned</p>
          <h3 className="text-3xl font-extrabold text-[#1A6FDB]">{totalTasks}</h3>
          <p className="text-xs text-slate-500 font-bold">Today's operations list</p>
        </div>

        {/* Metric 2: Completed */}
        <div className="glass-panel p-5 space-y-2">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Completed Tasks</p>
          <h3 className="text-3xl font-extrabold text-emerald-600 glow-text-success">{completedCount}</h3>
          <p className="text-xs text-slate-500 font-bold">Reports submitted</p>
        </div>

        {/* Metric 3: Pending */}
        <div className="glass-panel p-5 space-y-2">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Pending Action</p>
          <h3 className="text-3xl font-extrabold text-amber-600 glow-text-warning">{pendingCount}</h3>
          <p className="text-xs text-slate-500 font-bold">Awaiting completion</p>
        </div>

        {/* Metric 4: Rate */}
        <div className="glass-panel p-5 space-y-2">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Completion Rate</p>
          <h3 className="text-3xl font-extrabold text-slate-800">{completionRate}%</h3>
          <div className="w-full bg-slate-200/50 rounded-full h-1.5 mt-2 overflow-hidden">
            <div 
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" 
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Action Header and Segment selectors */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 border-b border-slate-200/40 pb-1">
        <div className="flex border-b border-transparent">
          <button
            onClick={() => setActiveSegment('active')}
            className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeSegment === 'active'
                ? 'border-[#1A6FDB] text-[#1A6FDB] bg-white/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Active Tasks ({activeTasks.length})
          </button>
          <button
            onClick={() => setActiveSegment('completed')}
            className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeSegment === 'completed'
                ? 'border-[#1A6FDB] text-[#1A6FDB] bg-white/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Completed Archive ({completedTasks.length})
          </button>
        </div>

        <button
          onClick={() => setShowAssignModal(true)}
          className="px-4 py-2.5 text-xs font-bold text-white glass-button glass-button-primary flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Assign New Task</span>
        </button>
      </div>

      {/* List / Board rendering */}
      <div className="space-y-4">
        {activeSegment === 'active' ? (
          /* Active Pending Tasks Queue */
          activeTasks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-in">
              {activeTasks.map((task) => (
                <div 
                  key={task.id} 
                  className="glass-panel p-5 flex flex-col justify-between space-y-4 border-l-4 border-amber-500 hover:border-[#1A6FDB]/30 hover:bg-white/70 transition-all"
                >
                  <div className="space-y-3.5">
                    {/* Header info */}
                    <div className="flex items-center justify-between border-b border-slate-200/40 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#1A6FDB]/10 flex items-center justify-center font-bold text-xs text-[#1A6FDB] border border-[#1A6FDB]/20">
                          {task.employeeName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-850 leading-tight">{task.employeeName}</h4>
                          <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wide block mt-0.5">{task.role}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 text-[8.5px] font-extrabold bg-amber-500/10 text-amber-700 border border-amber-500/20 rounded-full uppercase flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        Pending
                      </span>
                    </div>

                    {/* Task Title & Desc */}
                    <div className="space-y-2">
                      <h5 className="text-sm font-extrabold text-slate-800 leading-tight">{task.taskTitle}</h5>
                      <p className="text-xs text-slate-600 leading-relaxed font-semibold">{task.taskDesc}</p>
                    </div>

                    {/* Date badge */}
                    <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500 font-bold">
                      <Calendar className="w-3.5 h-3.5 text-[#1A6FDB]" />
                      <span>Assigned: {task.assignedDate}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end pt-3 border-t border-slate-200/40">
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="px-3 py-1.5 text-[10px] font-extrabold text-rose-600 hover:text-rose-700 hover:bg-rose-500/5 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      Cancel Task
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center glass-panel border-dashed border-slate-200/40 flex flex-col items-center justify-center bg-white/10">
              <ClipboardList className="w-10 h-10 text-slate-400 mb-2" />
              <p className="text-sm font-bold text-slate-400">No active tasks currently assigned today.</p>
            </div>
          )
        ) : (
          /* Completed Task Archive */
          completedTasks.length > 0 ? (
            <div className="glass-panel overflow-hidden border border-slate-200/40 animate-fade-in">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/40 bg-slate-50/50 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                      <th className="py-4 px-5">Staff Member</th>
                      <th className="py-4 px-5">Task Summary</th>
                      <th className="py-4 px-5">Completion Date & Time</th>
                      <th className="py-4 px-5">Completion Report</th>
                      <th className="py-4 px-5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-755">
                    {completedTasks.map((task) => (
                      <tr key={task.id} className="hover:bg-white/40 transition-all">
                        {/* Column 1: Staff */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-105 border border-slate-200/50 flex items-center justify-center font-bold text-xs text-slate-700 bg-gradient-to-br from-white to-slate-50">
                              {task.employeeName.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800 leading-tight">{task.employeeName}</p>
                              <span className="text-[8.5px] font-bold text-slate-450 uppercase tracking-wide mt-0.5 block">{task.role}</span>
                            </div>
                          </div>
                        </td>

                        {/* Column 2: Task details */}
                        <td className="py-4 px-5">
                          <p className="text-xs font-bold text-slate-800">{task.taskTitle}</p>
                          <p className="text-[10px] text-slate-450 font-medium truncate max-w-[200px] mt-0.5" title={task.taskDesc}>
                            {task.taskDesc}
                          </p>
                        </td>

                        {/* Column 3: Completed Time */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-1 text-slate-800">
                            <Clock className="w-3.5 h-3.5 text-emerald-500" />
                            <span>{task.assignedDate} • {task.completedAt || '--:--'}</span>
                          </div>
                        </td>

                        {/* Column 4: Report text */}
                        <td className="py-4 px-5 max-w-[320px]">
                          <div className="flex items-start gap-1.5 bg-emerald-500/5 border border-emerald-500/10 p-2.5 rounded-lg text-emerald-800 leading-relaxed font-semibold italic text-[11px] whitespace-pre-wrap">
                            <FileText className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <span>"{task.completionReport || 'No report submitted.'}"</span>
                          </div>
                        </td>

                        {/* Column 5: Status badge */}
                        <td className="py-4 px-5 text-right">
                          <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-full text-[9px] font-extrabold uppercase flex items-center gap-1 justify-end w-fit ml-auto">
                            <CheckCircle className="w-3 h-3 text-emerald-500" />
                            Verified
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center glass-panel border-dashed border-slate-200/40 flex flex-col items-center justify-center bg-white/10">
              <CheckCircle className="w-10 h-10 text-slate-400 mb-2" />
              <p className="text-sm font-bold text-slate-400">No completed tasks in the archives yet.</p>
            </div>
          ))}
      </div>

      {/* Task Assignment Modal Overlay */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-md p-6 border border-white/70 relative shadow-2xl bg-white/95">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200/40 pb-3.5 mb-5">
              <h3 className="text-lg font-extrabold text-slate-850 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-[#1A6FDB]" />
                Assign Operational Task
              </h3>
              <button 
                onClick={() => setShowAssignModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-450 hover:text-slate-800 cursor-pointer transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Notification */}
            {errorMsg && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAssignTask} className="space-y-4">
              {/* Select Employee */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Assignee Staff Member</label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs glass-input bg-white cursor-pointer font-bold text-slate-755 outline-none"
                >
                  <option value="" className="text-slate-400">-- Select Employee --</option>
                  {staffList.map(emp => (
                    <option key={emp.id} value={emp.id} className="text-slate-800 font-bold">
                      {emp.name} ({emp.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Task Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Task Title / Subject</label>
                <input
                  type="text"
                  placeholder="e.g. Clean washing bay filters"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs glass-input bg-white font-bold text-slate-755"
                />
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Assigned Date</label>
                <input
                  type="date"
                  value={assignedDate}
                  onChange={(e) => setAssignedDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs glass-input bg-white/70 font-bold text-slate-755"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Instructions / Details</label>
                <textarea
                  placeholder="Describe step-by-step instructions for the task..."
                  rows={4}
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs glass-input bg-white/70 font-semibold text-slate-755"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200/40 mt-5">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white glass-button glass-button-primary flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Assign Task</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
