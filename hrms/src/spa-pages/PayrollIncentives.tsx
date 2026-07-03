import React, { useState } from 'react';
import { 
  CircleDollarSign, 
  IndianRupee, 
  TrendingUp, 
  ShieldCheck, 
  HelpCircle, 
  ArrowUpRight,
  Download,
  CheckCircle,
  FileCheck2,
  Users,
  Search
} from 'lucide-react';

interface PayrollIncentivesProps {
  payrollList: any[];
  setPayrollList: React.Dispatch<React.SetStateAction<any[]>>;
}

export default function PayrollIncentives({ payrollList, setPayrollList }: PayrollIncentivesProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Calculate Totals
  const totalBase = payrollList.reduce((acc, emp) => acc + emp.base, 0);
  const grandTotal = totalBase;

  const handleDisbursePayroll = (id: number) => {
    setPayrollList(payrollList.map(emp => {
      if (emp.id === id) {
        return { ...emp, paidStatus: 'Paid' };
      }
      return emp;
    }));
  };

  const handleDisburseAll = () => {
    setPayrollList(payrollList.map(emp => ({ ...emp, paidStatus: 'Paid' })));
  };

  const filteredPayroll = payrollList.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || emp.paidStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Payroll Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Total Salary Pool */}
        <div className="glass-panel p-5 space-y-2.5">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Monthly Base Salaries</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-slate-800">₹{totalBase.toLocaleString()}</span>
            <span className="text-[10px] text-slate-450 font-bold">Fixed Pool</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 rounded-full w-[100%]" />
          </div>
        </div>

        {/* Total Payable */}
        <div className="glass-panel p-5 space-y-2.5 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 border-blue-500/20">
          <p className="text-[10px] uppercase font-bold text-[#1A6FDB] tracking-wider">Grand Total Net Payable</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-slate-850">₹{grandTotal.toLocaleString()}</span>
            <span className="text-[10px] text-[#1A6FDB] font-extrabold uppercase">Worksheet Ready</span>
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 font-bold">
            <span>June 2026</span>
            <span className="text-emerald-600 flex items-center gap-0.5 font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified
            </span>
          </div>
        </div>

      </div>

      {/* Roster Controls */}
      <div className="glass-panel p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by employee name..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs glass-input"
          />
        </div>

        {/* Actions & Filters */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-lg glass-input text-xs font-semibold bg-white cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Processing">Processing</option>
            <option value="Pending">Pending</option>
          </select>

          <button 
            onClick={handleDisburseAll}
            className="glass-button glass-button-primary flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold"
          >
            <CheckCircle className="w-4 h-4 text-white" />
            <span>Disburse All Salaries</span>
          </button>
        </div>

      </div>

      {/* Payroll worksheet directory */}
      <div className="glass-panel overflow-hidden border border-slate-200/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/40 bg-slate-50/50 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                <th className="py-4 px-5">Staff Member</th>
                <th className="py-4 px-5">Base Salary</th>
                <th className="py-4 px-5">Total Payable</th>
                <th className="py-4 px-5">Status</th>
                <th className="py-4 px-5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
              {filteredPayroll.map((emp) => {
                const total = emp.base;

                let statusBadge = 'bg-slate-100 border-slate-200 text-slate-500';
                if (emp.paidStatus === 'Paid') statusBadge = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600';
                if (emp.paidStatus === 'Processing') statusBadge = 'bg-cyan-500/10 border-cyan-500/20 text-cyan-600 animate-pulse';
                if (emp.paidStatus === 'Pending') statusBadge = 'bg-amber-500/10 border-amber-500/20 text-amber-700';

                return (
                  <tr key={emp.id} className="hover:bg-white/40 transition-all">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8.5 h-8.5 rounded-full bg-slate-105 border border-slate-200/50 flex items-center justify-center font-bold text-xs text-[#1A6FDB] bg-gradient-to-br from-white to-slate-50">
                          {emp.name.split(' ').map((n: string) => n[0]).join('')}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 leading-tight">{emp.name}</p>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-1 block">
                            {emp.role}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5 font-mono text-slate-800">₹{emp.base.toLocaleString()}</td>
                    <td className="py-4 px-5 font-mono font-extrabold text-slate-800">₹{total.toLocaleString()}</td>
                    <td className="py-4 px-5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge}`}>
                        {emp.paidStatus}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-center">
                      {emp.paidStatus !== 'Paid' ? (
                        <button
                          onClick={() => handleDisbursePayroll(emp.id)}
                          className="px-3.5 py-1.5 rounded-xl text-[10px] font-bold text-[#1A6FDB] bg-blue-500/10 border border-blue-500/25 hover:bg-blue-500/20 cursor-pointer transition-all"
                        >
                          Disburse
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500 flex items-center justify-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          Complete
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {filteredPayroll.length === 0 && (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <Users className="w-10 h-10 text-slate-450 mb-2" />
            <p className="text-sm font-bold text-slate-400">No matching payroll records found.</p>
          </div>
        )}
      </div>

    </div>
  );
}
