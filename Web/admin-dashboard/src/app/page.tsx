"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import * as XLSX from 'xlsx';

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const EarningsTrendGraph = ({ data }: { data: { date: string; amount: number; count: number }[] }) => {
  const width = 1120;
  const height = 360;

  const monthsList = React.useMemo(() => {
    const monthsMap: { [key: string]: { label: string; year: number; month: number } } = {};
    data.forEach(item => {
      const parts = item.date.split('/');
      if (parts.length === 3) {
        const m = parseInt(parts[1]);
        const y = parseInt(parts[2]);
        const key = `${y}-${m.toString().padStart(2, '0')}`;
        const label = `${MONTH_NAMES[m - 1]} ${y}`;
        monthsMap[key] = { label, year: y, month: m };
      }
    });
    return Object.keys(monthsMap)
      .sort()
      .map(key => ({ key, ...monthsMap[key] }));
  }, [data]);

  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('');

  useEffect(() => {
    if (monthsList.length > 0 && !selectedMonthKey) {
      setSelectedMonthKey(monthsList[monthsList.length - 1].key);
    }
  }, [monthsList, selectedMonthKey]);

  const filteredData = React.useMemo(() => {
    if (!selectedMonthKey) return [];
    const [targetYear, targetMonth] = selectedMonthKey.split('-').map(Number);
    return data.filter(item => {
      const parts = item.date.split('/');
      if (parts.length === 3) {
        return parseInt(parts[1]) === targetMonth && parseInt(parts[2]) === targetYear;
      }
      return false;
    });
  }, [data, selectedMonthKey]);

  const first = filteredData[0] || { date: '-', amount: 0, count: 0 };
  const peak = filteredData.reduce((best, item) => item.amount > best.amount ? item : best, first);
  const latest = filteredData[filteredData.length - 1] || first;
  const total = filteredData.reduce((sum, item) => sum + item.amount, 0);
  const totalOrders = filteredData.reduce((sum, item) => sum + (item.count || 0), 0);

  const hexPath = (x: number, y: number) => (
    'M ' + x + ' ' + (y - 34) +
    ' L ' + (x + 30) + ' ' + (y - 17) +
    ' L ' + (x + 30) + ' ' + (y + 17) +
    ' L ' + x + ' ' + (y + 34) +
    ' L ' + (x - 30) + ' ' + (y + 17) +
    ' L ' + (x - 30) + ' ' + (y - 17) + ' Z'
  );

  const milestoneNodes = [
    {
      step: '1',
      icon: 'M7 8h10M7 12h7M6 18V6a2 2 0 0 1 2-2h8l2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2Z',
      title: 'First recorded',
      amount: first.amount,
      date: first.date,
      x: 125,
      y: 205,
      textX: 78,
      textY: 96
    },
    {
      step: '2',
      icon: 'M7 17V9M12 17V5M17 17v-6',
      title: 'Peak collection',
      amount: peak.amount,
      date: peak.date,
      x: 560,
      y: 86,
      textX: 430,
      textY: 242
    },
    {
      step: '3',
      icon: 'M7 8h10v10H7zM9 11h6M9 14h4',
      title: 'Latest day',
      amount: latest.amount,
      date: latest.date,
      x: 960,
      y: 156,
      textX: 820,
      textY: 242
    }
  ];

  const exportMonthReport = () => {
    try {
      const activeLabel = monthsList.find(m => m.key === selectedMonthKey)?.label || 'Month';
      const excelData = filteredData.map(item => ({
        'Date': item.date,
        'Daily Revenue (INR)': item.amount,
        'Orders Volume': item.count,
        'Average Order Value': item.count > 0 ? Math.round(item.amount / item.count) : 0
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Monthly Overview");
      XLSX.writeFile(wb, `Earnings_Report_${activeLabel.replace(' ', '_')}.xlsx`);
    } catch (e) {
      alert("Failed to export month report: " + String(e));
    }
  };

  return (
    <div className="glass p-5 sm:p-8 lg:p-10 relative mb-8 overflow-hidden rounded-3xl border border-black/5 bg-white/40">
      
      {/* Monthly Selector Scrollbar */}
      <div className="flex gap-2 overflow-x-auto pb-4 pt-1 px-1 no-scrollbar mb-6 border-b border-black/5">
        {monthsList.map(month => (
          <button
            key={month.key}
            onClick={() => setSelectedMonthKey(month.key)}
            className={`px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap border ${
              selectedMonthKey === month.key
                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-[1.02]'
                : 'bg-white/70 text-text-secondary border-black/5 hover:bg-white/90'
            }`}
          >
            {month.label}
          </button>
        ))}
      </div>

      <div className="pointer-events-none absolute right-10 top-20 hidden text-[104px] font-black leading-none text-slate-900/[0.035] lg:block">
        {totalOrders}
      </div>

      <div className="mb-5 text-center">
        <div className="mb-2 flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-600">
          <span className="h-px w-7 bg-cyan-500/70"></span>
          Laundry Basket
          <span className="h-px w-7 bg-cyan-500/70"></span>
        </div>
        <h3 className="text-2xl font-black tracking-tight text-text-primary sm:text-4xl">Earnings process.</h3>
      </div>

      {filteredData.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-black/10 bg-white/70 py-12 text-center text-xs font-black uppercase tracking-widest text-text-secondary">
          No earning data available for this month
        </div>
      ) : (
        <>
          <div className="relative overflow-x-auto overflow-y-hidden pb-2">
            <svg viewBox={'0 0 ' + width + ' ' + height} className="min-w-[860px] overflow-visible sm:min-w-0 sm:w-full" aria-label="Earnings process graph">
              <defs>
                <filter id="processNodeShadow" x="-70%" y="-70%" width="240%" height="240%">
                  <feDropShadow dx="0" dy="16" stdDeviation="14" floodColor="#38bdf8" floodOpacity="0.22" />
                </filter>
                <linearGradient id="processLine" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#0284c7" />
                  <stop offset="55%" stopColor="#0ea5e9" />
                  <stop offset="100%" stopColor="#0369a1" />
                </linearGradient>
              </defs>

              {/* Curvy background curve */}
              <path
                d="M 50 188 C 160 230, 285 236, 390 168 C 470 116, 477 50, 560 86 C 690 140, 650 236, 790 205 C 875 186, 875 120, 960 156 C 1015 180, 1038 122, 1080 140"
                fill="none"
                stroke="#0f172a"
                strokeOpacity="0.045"
                strokeWidth="14"
                strokeLinecap="round"
              />
              <path
                d="M 50 188 C 160 230, 285 236, 390 168 C 470 116, 477 50, 560 86 C 690 140, 650 236, 790 205 C 875 186, 875 120, 960 156 C 1015 180, 1038 122, 1080 140"
                fill="none"
                stroke="url(#processLine)"
                strokeWidth="4"
                strokeLinecap="round"
              />

              {/* Elegant large milestone numbers in background */}
              <text x="210" y="270" textAnchor="middle" className="fill-slate-900/[0.015] text-[180px] font-black pointer-events-none select-none">1</text>
              <text x="610" y="150" textAnchor="middle" className="fill-slate-900/[0.025] text-[180px] font-black pointer-events-none select-none">2</text>
              <text x="910" y="200" textAnchor="middle" className="fill-slate-900/[0.02] text-[180px] font-black pointer-events-none select-none">3</text>
              <text x="1060" y="110" textAnchor="middle" className="fill-slate-900/[0.02] text-[160px] font-black pointer-events-none select-none">56</text>

              {milestoneNodes.map(node => (
                <g key={node.step}>
                  <foreignObject x={node.textX} y={node.textY} width="250" height="105">
                    <div className="px-1 select-none pointer-events-none">
                      <div className="text-[18px] font-black leading-tight text-slate-950">{node.title}</div>
                      <div className="mt-2 text-[13px] font-bold leading-snug text-slate-500">
                        ₹{node.amount.toLocaleString('en-IN')} on {node.date}
                      </div>
                    </div>
                  </foreignObject>
                  <g filter="url(#processNodeShadow)" className="cursor-pointer">
                    <path d={hexPath(node.x, node.y)} fill="white" />
                    <path d={hexPath(node.x, node.y)} fill="#ffffff" stroke="#e0f2fe" strokeWidth="2" />
                    <path d={node.icon} transform={'translate(' + (node.x - 12) + ' ' + (node.y - 12) + ')'} fill="none" stroke="#0ea5e9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </g>
                </g>
              ))}

              <line x1="48" y1="328" x2="1082" y2="328" stroke="#cbd5e1" strokeWidth="1" />
              <text x="48" y="352" className="fill-cyan-700 text-[13px] font-black">2026 essentials.</text>
              <text x="1082" y="352" textAnchor="end" className="fill-slate-500 text-[13px] font-black">
                Total ₹{total.toLocaleString('en-IN')}
              </text>
            </svg>
          </div>

          {/* Detail-Oriented Daily Breakdown Ledger */}
          <div className="mt-8 pt-6 border-t border-black/5">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-5">
              <div>
                <h4 className="text-lg font-black tracking-tight text-text-primary">Daily Breakdown Ledger</h4>
                <p className="text-xs text-text-secondary font-bold uppercase tracking-wide">Detailed daily revenue, order volume, and dynamic performance metrics</p>
              </div>
              <button 
                onClick={exportMonthReport}
                className="btn-primary flex items-center justify-center gap-2 py-2.5 px-5 text-xs font-bold shadow-md shadow-primary/10 self-start sm:self-auto"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                Export Month Report
              </button>
            </div>

            <div className="max-h-[300px] overflow-y-auto rounded-3xl border border-black/5 bg-white/50 scrollbar-thin">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-black/5 text-[10px] font-black uppercase text-slate-500 tracking-wider select-none">
                    <th className="p-4">Date</th>
                    <th className="p-4">Daily Revenue</th>
                    <th className="p-4 text-center">Orders Volume</th>
                    <th className="p-4 text-right">Average Order Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {filteredData.slice().reverse().map((item, idx) => {
                    const aov = item.count > 0 ? (item.amount / item.count).toFixed(0) : '0';
                    const pctOfPeak = peak.amount > 0 ? (item.amount / peak.amount) * 100 : 0;
                    return (
                      <tr key={idx} className="text-xs hover:bg-white/80 transition-all font-bold text-text-primary">
                        <td className="p-4 flex items-center gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400/80 animate-pulse"></span>
                          {item.date}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <span className="w-16 font-extrabold">₹{item.amount.toLocaleString('en-IN')}</span>
                            <div className="w-28 h-1.5 rounded-full bg-slate-100/80 overflow-hidden hidden sm:block">
                              <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" style={{ width: `${pctOfPeak}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-center text-primary font-black">{item.count} orders</td>
                        <td className="p-4 text-right text-text-secondary font-semibold">₹{Number(aov).toLocaleString('en-IN')} / order</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// SVG-based premium responsive earning graph with interactive tooltips
const EarningGraph = ({ data }: { data: { date: string; amount: number }[] }) => {
  if (data.length === 0) {
    return (
      <div className="glass p-8 text-center text-text-secondary text-sm font-bold uppercase tracking-wider mb-8">
        No Earning Data Available
      </div>
    );
  }

  const maxVal = Math.max(...data.map(d => d.amount), 100);
  const minVal = Math.min(...data.map(d => d.amount), 0);
  const range = maxVal - minVal;

  const width = 800;
  const height = 200;
  const paddingLeft = 60;
  const paddingRight = 40;
  const paddingTop = 20;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const points = data.map((d, index) => {
    const x = paddingLeft + (index / Math.max(data.length - 1, 1)) * chartWidth;
    const y = paddingTop + chartHeight - ((d.amount - minVal) / range) * chartHeight;
    return { x, y, ...d };
  });

  const pathD = points.length > 0 
    ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
    : '';

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`
    : '';

  return (
    <div className="glass p-6 mb-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-primary">Earning Trend</h3>
          <p className="text-[10px] text-text-secondary uppercase font-bold">Daily order volume & earnings graph</p>
        </div>
        <div className="text-right">
          <span className="text-xs font-black text-primary px-3 py-1 rounded-full bg-primary/10">
            Peak: ₹{maxVal.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="relative w-full h-[200px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
            const y = paddingTop + chartHeight * r;
            const val = maxVal - range * r;
            return (
              <g key={i}>
                <line 
                  x1={paddingLeft} 
                  y1={y} 
                  x2={width - paddingRight} 
                  y2={y} 
                  stroke="rgba(0,0,0,0.05)" 
                  strokeWidth="1" 
                  strokeDasharray="4 4"
                />
                <text 
                  x={paddingLeft - 10} 
                  y={y + 4} 
                  textAnchor="end" 
                  className="fill-text-secondary text-[10px] font-black"
                >
                  ₹{Math.round(val)}
                </text>
              </g>
            );
          })}

          {areaD && <path d={areaD} fill="url(#chartGradient)" />}

          {pathD && (
            <path 
              d={pathD} 
              fill="none" 
              stroke="rgb(59, 130, 246)" 
              strokeWidth="3" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          )}

          {points.map((p, i) => (
            <g key={i} className="group cursor-pointer">
              <circle 
                cx={p.x} 
                cy={p.y} 
                r="5" 
                fill="white" 
                stroke="rgb(59, 130, 246)" 
                strokeWidth="3"
              />
              <circle 
                cx={p.x} 
                cy={p.y} 
                r="10" 
                fill="rgb(59, 130, 246)" 
                className="opacity-0 hover:opacity-20 transition-opacity"
              />
              <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <rect 
                  x={p.x - 50} 
                  y={p.y - 35} 
                  width="100" 
                  height="26" 
                  rx="6" 
                  fill="rgb(17, 24, 39)"
                />
                <text 
                  x={p.x} 
                  y={p.y - 18} 
                  textAnchor="middle" 
                  fill="white" 
                  className="text-[9px] font-bold"
                >
                  {p.date}: ₹{p.amount}
                </text>
              </g>
            </g>
          ))}

          {points.map((p, i) => {
            const step = Math.ceil(points.length / 8);
            if (i % step !== 0) return null;
            return (
              <text 
                key={i} 
                x={p.x} 
                y={height - 10} 
                textAnchor="middle" 
                className="fill-text-secondary text-[9px] font-black uppercase tracking-wider"
              >
                {p.date}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

const API_BASE = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
  ? 'http://localhost:5000/api' 
  : '/api';

const SOCKET_BASE = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
  ? 'http://localhost:5000' 
  : '';

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'shops' | 'riders' | 'rates' | 'support' | 'inventory' | 'config' | 'business-stats'>('overview');
  const [activeStoreId, setActiveStoreId] = useState('all');
  const [activeDateFilter, setActiveDateFilter] = useState('');
  const [inventory, setInventory] = useState<any[]>([]);
  const [stockRequests, setStockRequests] = useState<any[]>([]);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [inventoryForm, setInventoryForm] = useState({ item: '', qty: '', unit: '' });
  const [stats, setStats] = useState<any>({ totalRevenue: 0, totalOrders: 0, activeOrders: 0, totalStores: 0 });
  const [orders, setOrders] = useState<any[]>([]);
  const dailyEarningsData = useMemo(() => {
    const dailyMap: { [date: string]: { amount: number; count: number } } = {};
    orders.forEach(o => {
      if (!o.timestamp || !o.total) return;
      const datePart = o.timestamp.split(',')[0].trim();
      if (!dailyMap[datePart]) {
        dailyMap[datePart] = { amount: 0, count: 0 };
      }
      dailyMap[datePart].amount += (o.total || 0);
      dailyMap[datePart].count += 1;
    });

    const sortedDates = Object.keys(dailyMap).sort((a, b) => {
      const [d1, m1, y1] = a.split('/').map(Number);
      const [d2, m2, y2] = b.split('/').map(Number);
      return new Date(y1, m1 - 1, d1).getTime() - new Date(y2, m2 - 1, d2).getTime();
    });

    return sortedDates.map(date => ({
      date,
      amount: dailyMap[date].amount,
      count: dailyMap[date].count
    }));
  }, [orders]);
  const [stores, setStores] = useState<any[]>([]);
  const [rates, setRates] = useState<any[]>([]);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [tickets, setTickets] = useState<any[]>([]);

  const [storeForm, setStoreForm] = useState({ name: '', address: '', user: '', pass: '', mapUrl: '', branchCode: '' });
  const [riders, setRiders] = useState<any[]>([]);
  const [showRiderModal, setShowRiderModal] = useState(false);
  const [riderForm, setRiderForm] = useState({ name: '', username: '', password: '', phone: '', storeId: '' });
  const [selectedRider, setSelectedRider] = useState<any>(null);
  const [riderMetrics, setRiderMetrics] = useState<any>(null);
  const [riderMetricsError, setRiderMetricsError] = useState<string | null>(null);
  const [showRateModal, setShowRateModal] = useState(false);
  const [editingRateItem, setEditingRateItem] = useState<string | null>(null);
  const [rateForm, setRateForm] = useState({ item: '', category: '', serviceType: '', price: 0 });
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [inventoryStoreFilter, setInventoryStoreFilter] = useState('GLOBAL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Category Manager State
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [manageCategoryName, setManageCategoryName] = useState('');
  const [manageCategoryNewName, setManageCategoryNewName] = useState('');

  const fetchInventory = async (storeId = inventoryStoreFilter) => {
    try {
      const token = localStorage.getItem('lb_auth_token');
      const res = await fetch(`${API_BASE}/inventory?storeId=${storeId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setInventory(await res.json());
    } catch (err) { console.error("Inventory fetch failed"); }
  };

  const fetchStockRequests = async () => {
    try {
      const token = localStorage.getItem('lb_auth_token');
      const res = await fetch(`${API_BASE}/stock-requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setStockRequests(await res.json());
    } catch (err) { console.error("Failed to fetch stock requests"); }
  };

  const handleUpdateStockRequest = async (id: string, status: 'Approved' | 'Rejected') => {
    try {
      const token = localStorage.getItem('lb_auth_token');
      const res = await fetch(`${API_BASE}/stock-requests/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        alert(`Request ${status} successfully!`);
        fetchStockRequests();
        fetchInventory(inventoryStoreFilter);
      } else {
        const err = await res.json();
        alert("Failed: " + err.error);
      }
    } catch (err) { alert("Error updating stock request"); }
  };

  const handleSaveInventory = async () => {
    try {
      const token = localStorage.getItem('lb_auth_token');
      const res = await fetch(`${API_BASE}/inventory`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...inventoryForm, storeId: inventoryStoreFilter })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Save failed");
      }
      setShowInventoryModal(false);
      setInventoryForm({ item: '', qty: '', unit: '' });
      fetchInventory(inventoryStoreFilter);
    } catch (err: any) { alert("Save failed: " + err.message); }
  };

  const handlePurge = async () => {
    if (!window.confirm("CRITICAL WARNING: This will permanently delete all orders, support tickets, and reset the order counter. This action CANNOT be undone. Are you absolutely sure?")) return;
    
    const doubleCheck = window.prompt("To confirm, type 'PURGE' in all caps:");
    if (doubleCheck !== 'PURGE') return;

    try {
      const token = localStorage.getItem('lb_auth_token');
      const res = await fetch(`${API_BASE}/purge`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert("System purged successfully. All test data has been cleared.");
        fetchData();
      } else {
        const err = await res.json();
        alert(`Purge failed: ${err.error}`);
      }
    } catch (err) { alert("System purge request failed"); }
  };

  useEffect(() => {
    const token = localStorage.getItem('lb_auth_token');
    const role = localStorage.getItem('lb_user_role');

    if (!token || role !== 'admin') {
      router.push('/login');
      return;
    }

    fetchData();
    fetchInventory();
    fetchStockRequests();

    const socket = io(SOCKET_BASE); // Connects to the backend server dynamically
    socket.emit('join_room', { role: 'admin' });

    const handleNewOrder = (data: any) => {
      fetchData(); // Refresh all stats and orders
      // Notification Sound
      const audio = new Audio('/admin/notification.mp3');
      audio.volume = 1.0;
      audio.play().catch(e => console.log("Audio play blocked"));
    };

    socket.on('new_order_received', handleNewOrder);

    socket.on('order_status_updated', () => fetchData());
    socket.on('order_updated', () => fetchData());
    socket.on('store_updated', () => fetchData());
    socket.on('stores_updated', () => fetchData());
    socket.on('inventory_updated', () => fetchInventory());
    socket.on('stock_requests_updated', () => fetchStockRequests());
    socket.on('new_stock_request', (data) => {
      fetchStockRequests();
      alert(data.message);
    });
    socket.on('rate_updated', () => fetchData());
    socket.on('rates_updated', () => fetchData());
    socket.on('new_ticket_raised', (data) => {
      fetchData();
      alert(data.message);
    });
    socket.on('tickets_updated', () => fetchData());

    return () => {
      socket.disconnect();
    };
  }, [activeTab]);

  useEffect(() => {
    setSearchQuery('');
  }, [activeTab]);

  const fetchData = async (storeFilter = activeStoreId, dateFilter = activeDateFilter) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('lb_auth_token');
      const authHeader = { 'Authorization': `Bearer ${token}` };

      if (activeTab === 'overview' || activeTab === 'business-stats') {
        const statsRes = await fetch(`${API_BASE}/analytics?storeId=${storeFilter}&date=${dateFilter}`, { headers: authHeader });
        if (statsRes.status === 401) { localStorage.clear(); window.location.href = "/admin/login"; return; }
        const statsData = await statsRes.json();
        if (!statsData.error) setStats(statsData);

        const ordersRes = await fetch(`${API_BASE}/orders?storeId=${storeFilter}&date=${dateFilter}`, { headers: authHeader });
        if (ordersRes.status === 401) { localStorage.clear(); window.location.href = "/admin/login"; return; }
        const ordersData = await ordersRes.json();
        if (Array.isArray(ordersData)) {
          setOrders(ordersData);
        }

        // Fetch stores to resolve branch names in the log
        const storesRes = await fetch(`${API_BASE}/stores`, { headers: authHeader });
        const storesData = await storesRes.json();
        if (Array.isArray(storesData)) setStores(storesData);
      }

      if (activeTab === 'shops' || activeTab === 'riders') {
        const storesRes = await fetch(`${API_BASE}/stores`, { headers: authHeader });
        if (storesRes.status === 401) { localStorage.clear(); window.location.href = "/admin/login"; return; }
        const storesData = await storesRes.json();
        if (Array.isArray(storesData)) setStores(storesData);
      }

      if (activeTab === 'rates') {
        const ratesRes = await fetch(`${API_BASE}/rates`);
        const ratesData = await ratesRes.json();
        if (Array.isArray(ratesData)) setRates(ratesData);
      }

      if (activeTab === 'riders') {
        const ridersRes = await fetch(`${API_BASE}/riders`, { headers: authHeader });
        if (ridersRes.status === 401) { localStorage.clear(); window.location.href = "/admin/login"; return; }
        const ridersData = await ridersRes.json();
        if (Array.isArray(ridersData)) setRiders(ridersData);
      }

      if (activeTab === 'support') {
        const ticketsRes = await fetch(`${API_BASE}/tickets`, { headers: authHeader });
        const ticketsData = await ticketsRes.json();
        if (Array.isArray(ticketsData)) setTickets(ticketsData);
      }
    } catch (err) {
      console.error("Data fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleStoreApproval = async (id: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('lb_auth_token');
      const res = await fetch(`${API_BASE}/stores/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ approved: !currentStatus })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }

      // Update local state immediately for better UX
      setStores(prev => prev.map(s => s.id === id ? { ...s, approved: !currentStatus } : s));

      fetchData(); // Sync with server
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleSaveStore = async () => {
    try {
      const token = localStorage.getItem('lb_auth_token');
      const method = editingStoreId ? 'PUT' : 'POST';
      const endpoint = editingStoreId ? `${API_BASE}/stores/${editingStoreId}` : `${API_BASE}/stores`;

      const trimmedForm = {
        name: storeForm.name.trim(),
        address: storeForm.address.trim(),
        user: storeForm.user.trim(),
        pass: storeForm.pass.trim(),
        mapUrl: storeForm.mapUrl.trim(),
        branchCode: storeForm.branchCode.trim().toUpperCase()
      };

      const payload = editingStoreId
        ? trimmedForm
        : { ...trimmedForm, id: `LBST-${Date.now().toString().slice(-3)}`, approved: true, nextOrderId: 1 };

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error saving store");
      }

      setShowStoreModal(false);
      setStoreForm({ name: '', address: '', user: '', pass: '', mapUrl: '', branchCode: '' });
      setEditingStoreId(null);
      fetchData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const deleteStore = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this branch? This cannot be undone.")) return;
    try {
      const token = localStorage.getItem('lb_auth_token');
      await fetch(`${API_BASE}/stores/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      alert("Error deleting store");
    }
  };

  const viewRiderMetrics = async (rider: any) => {
    setSelectedRider(rider);
    setRiderMetrics(null);
    setRiderMetricsError(null);
    try {
      const token = localStorage.getItem('lb_auth_token');
      const res = await fetch(`${API_BASE}/admin/riders/${rider.id}/metrics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setRiderMetrics(await res.json());
      } else {
        const err = await res.json();
        setRiderMetricsError(err.error || "Failed to load metrics");
      }
    } catch (e: any) {
      console.error(e);
      setRiderMetricsError("Failed to fetch metrics from server");
    }
  };

  const exportToExcel = async () => {
    try {
      const token = localStorage.getItem('lb_auth_token');
      const res = await fetch(`${API_BASE}/export/excel`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Global_Orders_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) { alert("Excel Export failed: " + err); }
  };

  const handleSaveRider = async () => {
    if (!riderForm.name || !riderForm.password || !riderForm.storeId) {
      alert("Please fill all required fields, including assigning a branch.");
      return;
    }
    try {
      const token = localStorage.getItem('lb_auth_token');
      const payload = {
        ...riderForm,
        status: 'Active'
      };

      const res = await fetch(`${API_BASE}/riders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error saving rider");
      }

      setShowRiderModal(false);
      setRiderForm({ name: '', username: '', password: '', phone: '', storeId: '' });
      fetchData();
    } catch (err: any) { alert("Error: " + err.message); }
  };

  const deleteRider = async (id: string) => {
    if (!window.confirm("Delete this rider?")) return;
    try {
      const token = localStorage.getItem('lb_auth_token');
      await fetch(`${API_BASE}/riders/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchData();
    } catch (err) { alert("Error deleting rider"); }
  };

  const seedPlatform = () => {
    const defaultRates = [
      { item: 'Shirt', category: 'Men', serviceType: 'Dry Clean', price: 90 },
      { item: 'T-Shirt', category: 'Men', serviceType: 'Wash & Iron', price: 60 },
      { item: 'Suit (2pc)', category: 'Men', serviceType: 'Dry Clean', price: 450 },
      { item: 'Saree (Plain)', category: 'Women', serviceType: 'Dry Clean', price: 250 },
      { item: 'Saree (Heavy)', category: 'Women', serviceType: 'Dry Clean', price: 450 },
      { item: 'Bedsheet (Double)', category: 'House Item', serviceType: 'Wash & Iron', price: 120 },
      { item: 'Shoes (Sports)', category: 'Shoes', serviceType: 'Shoe Cleaning', price: 299 }
    ];
    setRates(defaultRates);
  };

  const handleRateChange = (item: string, newPrice: string) => {
    const index = rates.findIndex(r => r.item === item);
    if (index !== -1) {
      const updated = [...rates];
      updated[index].price = parseFloat(newPrice) || 0;
      setRates(updated);
    }
  };

  const saveRatesToDB = async () => {
    try {
      const token = localStorage.getItem('lb_auth_token');
      await fetch(`${API_BASE}/rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(rates)
      });
      alert("Rates updated globally!");
    } catch (err) { alert("Error saving rates"); }
  };

  const handleSaveSingleRate = async () => {
    try {
      const token = localStorage.getItem('lb_auth_token');
      const method = editingRateItem ? 'PUT' : 'POST';
      const endpoint = editingRateItem ? `${API_BASE}/rates/${editingRateItem}` : `${API_BASE}/rates`;

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(rateForm)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error saving service");
      }

      setShowRateModal(false);
      fetchData();
    } catch (err: any) { alert("Error: " + err.message); }
  };

  const deleteRate = async (item: string) => {
    if (!window.confirm(`Delete ${item}?`)) return;
    try {
      const token = localStorage.getItem('lb_auth_token');
      await fetch(`${API_BASE}/rates/${item}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchData();
    } catch (err) { alert("Error deleting service"); }
  };

  const handleRenameCategory = async () => {
    if (!manageCategoryName || !manageCategoryNewName) return;
    try {
      const token = localStorage.getItem('lb_auth_token');
      const itemsToUpdate = rates.filter(r => r.category === manageCategoryName);
      
      for (const item of itemsToUpdate) {
        await fetch(`${API_BASE}/rates/${item.item}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ ...item, category: manageCategoryNewName })
        });
      }
      setShowCategoryManager(false);
      fetchData();
      alert(`Successfully renamed category to ${manageCategoryNewName}`);
    } catch (err) {
      alert("Error renaming category");
    }
  };

  const handleDeleteCategory = async () => {
    if (!manageCategoryName) return;
    if (!window.confirm(`WARNING: This will delete the entire "${manageCategoryName}" category and ALL services inside it. Continue?`)) return;
    try {
      const token = localStorage.getItem('lb_auth_token');
      const itemsToDelete = rates.filter(r => r.category === manageCategoryName);
      
      for (const item of itemsToDelete) {
        await fetch(`${API_BASE}/rates/${item.item}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
      setShowCategoryManager(false);
      fetchData();
      alert(`Successfully deleted category ${manageCategoryName}`);
    } catch (err) {
      alert("Error deleting category");
    }
  };

  const deleteBooking = async (id: string) => {
    if (!window.confirm("Delete this order?")) return;
    try {
      const token = localStorage.getItem('lb_auth_token');
      await fetch(`${API_BASE}/orders/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      alert("Order deleted successfully!");
      fetchData();
    } catch (err) { alert("Error deleting order"); }
  };

  const updateTicketStatus = async (id: string, status: string) => {
    try {
      const token = localStorage.getItem('lb_auth_token');
      await fetch(`${API_BASE}/tickets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      fetchData();
    } catch (err) { alert("Error updating ticket"); }
  };

  const mailToDeveloper = (ticket: any) => {
    const subject = encodeURIComponent(`[SUPPORT TICKET] ${ticket.id} - ${ticket.type}`);
    const body = encodeURIComponent(`Ticket ID: ${ticket.id}\nRaised By: ${ticket.storeName} (${ticket.raisedBy})\nType: ${ticket.type}\n\nDescription:\n${ticket.description}\n\nTimestamp: ${ticket.timestamp}`);
    window.location.href = `mailto:ethicalvirendra@gmail.com?subject=${subject}&body=${body}`;
  };

  const filteredOrders = orders
    .filter(o => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      const branchName = stores.find(s => s.id === o.storeId)?.name || 'Main Branch';
      const servicesMatch = o.services ? (Array.isArray(o.services) ? o.services.some((s: string) => s.toLowerCase().includes(query)) : String(o.services).toLowerCase().includes(query)) : false;
      return (
        (o.id && o.id.toLowerCase().includes(query)) ||
        (o.name && o.name.toLowerCase().includes(query)) ||
        (o.phone && o.phone.includes(query)) ||
        (o.status && o.status.toLowerCase().includes(query)) ||
        (branchName && branchName.toLowerCase().includes(query)) ||
        servicesMatch ||
        (o.total && String(o.total).includes(query)) ||
        (o.timestamp && String(o.timestamp).toLowerCase().includes(query))
      );
    })
    .sort((a: any, b: any) => {
      const dateA = a.order_date ? new Date(a.order_date).getTime() : 0;
      const dateB = b.order_date ? new Date(b.order_date).getTime() : 0;
      return dateB - dateA;
    });

  const filteredStores = stores.filter(store => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (store.name && store.name.toLowerCase().includes(query)) ||
      (store.address && store.address.toLowerCase().includes(query)) ||
      (store.manager && store.manager.toLowerCase().includes(query)) ||
      (store.branchCode && store.branchCode.toLowerCase().includes(query))
    );
  });

  const filteredRiders = riders.filter(rider => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (rider.name && rider.name.toLowerCase().includes(query)) ||
      (rider.id && rider.id.toLowerCase().includes(query)) ||
      (rider.phone && rider.phone.includes(query)) ||
      (rider.status && rider.status.toLowerCase().includes(query))
    );
  });

  const filteredRates = rates.filter(rate => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (rate.item && rate.item.toLowerCase().includes(query)) ||
      (rate.category && rate.category.toLowerCase().includes(query)) ||
      (rate.serviceType && rate.serviceType.toLowerCase().includes(query))
    );
  });

  const ratesToDisplay = filteredRates.filter(r => selectedCategory === 'All' || r.category === selectedCategory);

  const filteredInventory = inventory.filter(item => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (item.item && item.item.toLowerCase().includes(query)) ||
      (item.storeId && item.storeId.toLowerCase().includes(query)) ||
      (item.qty && item.qty.toString().includes(query))
    );
  });

  return (
    <div className="flex min-h-screen">
      <aside className="w-72 glass m-4 mr-0 p-8 flex flex-col gap-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 overflow-hidden bg-white">
            <img src="/admin/logo.png" alt="LB" className="w-full h-full object-contain p-1" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight">Global Admin</h1>
            <p className="text-[10px] text-text-secondary font-bold tracking-widest uppercase">Laundry Basket</p>
          </div>
        </div>

        <nav className="flex flex-col gap-2">
          <NavItem
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
            label="Master Log"
            active={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
          />
          <NavItem
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" /></svg>}
            label="Business Statistics"
            active={activeTab === 'business-stats'}
            onClick={() => setActiveTab('business-stats')}
          />
          <NavItem
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
            label="Branch Control"
            active={activeTab === 'shops'}
            onClick={() => setActiveTab('shops')}
          />
          <NavItem icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>} label="Inventory" active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} />
          <NavItem icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} label="Rate List" active={activeTab === 'rates'} onClick={() => setActiveTab('rates')} />
          <NavItem
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>}
            label="Rider Fleet"
            active={activeTab === 'riders'}
            onClick={() => setActiveTab('riders')}
          />
          <NavItem
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>}
            label="Support Center"
            active={activeTab === 'support'}
            onClick={() => setActiveTab('support')}
          />
          <NavItem
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
            label="System Config"
            active={activeTab === 'config'}
            onClick={() => setActiveTab('config')}
          />
        </nav>

        <div className="mt-auto flex flex-col gap-3">
          <button
            className="glass py-4 font-black text-red-500 hover:bg-red-500/10 transition-all rounded-2xl flex items-center justify-center gap-2"
            onClick={() => { localStorage.clear(); window.location.href = '/admin/login'; }}
          >
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 p-10 overflow-y-auto">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h2 className="text-4xl font-black tracking-tight text-text-primary">
              {activeTab === 'overview' && "Master Order Log"}
              {activeTab === 'shops' && "Branch Control"}
              {activeTab === 'rates' && "Rate List"}
              {activeTab === 'riders' && "Rider Fleet"}
              {activeTab === 'support' && "Support Center"}
              {activeTab === 'inventory' && "Inventory Control"}
              {activeTab === 'config' && "System Configuration"}
            </h2>
            <p className="text-text-secondary mt-2 font-medium">Platform-wide control and system integrity.</p>
          </div>
          <div className="flex items-center gap-4">
            {['overview', 'shops', 'riders', 'rates', 'inventory'].includes(activeTab) && (
              <div className="relative w-80 group">
                <input
                  type="text"
                  placeholder={
                    activeTab === 'overview' 
                      ? "Search all orders (ID, Name, Phone, Service, Price, Branch, Status, Date)..." 
                      : `Search ${activeTab === 'riders' ? 'Riders' : activeTab === 'shops' ? 'Branches' : activeTab === 'rates' ? 'Services' : 'Inventory'}...`
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/50 border border-black/5 rounded-full px-6 py-3 pl-12 outline-none focus:border-primary/30 focus:bg-white transition-all font-bold text-xs shadow-sm hover:shadow-md"
                />
                <svg className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            )}

            <button 
              className="glass px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest hover:bg-white/60 transition-all flex items-center gap-2" 
              onClick={exportToExcel}
            >
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Export Excel
            </button>
            {activeTab === 'shops' && <button className="btn-primary shadow-xl shadow-primary/20" onClick={() => { setEditingStoreId(null); setStoreForm({ name: '', address: '', user: '', pass: '', mapUrl: '', branchCode: '' }); setShowStoreModal(true); }}>Add New Branch</button>}
            {activeTab === 'riders' && <button className="btn-primary shadow-xl shadow-primary/20" onClick={() => { setRiderForm({ name: '', username: '', password: '', phone: '', storeId: '' }); setShowRiderModal(true); }}>Add New Rider</button>}
            {activeTab === 'rates' && (
              <div className="flex gap-2">
                <button className="glass font-bold px-4 hover:bg-white/40 rounded-xl text-xs uppercase" onClick={() => { setManageCategoryName(''); setManageCategoryNewName(''); setShowCategoryManager(true); }}>Manage Categories</button>
                <button className="btn-primary shadow-xl shadow-primary/20" onClick={() => { setEditingRateItem(null); setRateForm({ item: '', category: '', serviceType: '', price: 0 }); setShowRateModal(true); }}>Add New Service</button>
              </div>
            )}
            {activeTab === 'inventory' && <button className="btn-primary shadow-xl shadow-primary/20" onClick={() => setShowInventoryModal(true)}>Add Inventory Item</button>}
          </div>
        </header>

        {activeTab === 'overview' && (
          <>
            <div className="flex justify-between items-end mb-8">
              <div className="flex gap-4">
                <select 
                  className="glass px-4 py-2 text-xs font-black uppercase rounded-xl border-none outline-none"
                  onChange={(e) => fetchData(e.target.value, '')}
                >
                  <option value="all">All Branches</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <input 
                  type="date"
                  className="glass px-4 py-2 text-xs font-black uppercase rounded-xl border-none outline-none"
                  onChange={(e) => fetchData('all', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <StatCard label="Global Revenue" value={`₹${stats.totalRevenue.toLocaleString()}`} growth="+12%" color="blue" />
              <StatCard label="Total Orders" value={stats.totalOrders.toString()} growth="-14%" color="gray" />
              <StatCard label="Active Pickups" value={stats.activeOrders.toString()} growth="+2" color="blue" />
            </div>

            <EarningGraph data={dailyEarningsData} />

            {/* KPI Summary Strip */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="glass p-4 rounded-2xl">
                <p className="text-[9px] font-black uppercase tracking-widest text-primary mb-1">Total Orders</p>
                <p className="text-2xl font-black">{filteredOrders.length}</p>
              </div>
              <div className="glass p-4 rounded-2xl">
                <p className="text-[9px] font-black uppercase tracking-widest text-orange-500 mb-1">Pending Payments</p>
                <p className="text-2xl font-black text-orange-500">₹{filteredOrders.reduce((s: number, o: any) => s + (Number(o.pending_amount) || 0), 0).toLocaleString('en-IN')}</p>
              </div>
              <div className="glass p-4 rounded-2xl">
                <p className="text-[9px] font-black uppercase tracking-widest text-green-600 mb-1">Received Amount</p>
                <p className="text-2xl font-black text-green-600">₹{filteredOrders.reduce((s: number, o: any) => s + (Number(o.received_amount) || 0), 0).toLocaleString('en-IN')}</p>
              </div>
              <div className="glass p-4 rounded-2xl">
                <p className="text-[9px] font-black uppercase tracking-widest text-red-500 mb-1">High Risk Orders</p>
                <p className="text-2xl font-black text-red-500">{filteredOrders.filter((o: any) => o.payment_risk === 'HIGH RISK').length}</p>
              </div>
            </div>
            <div className="glass overflow-x-auto rounded-3xl border border-black/5">
              <table className="w-full text-left border-collapse">
                <thead>
                  {/* Group Header Row */}
                  <tr className="text-[8px] font-black uppercase tracking-widest">
                    <th colSpan={5} className="px-4 pt-4 pb-2 bg-blue-500/10 text-blue-700 border-r-2 border-white/60 text-center">👤 Customer Details</th>
                    <th colSpan={5} className="px-4 pt-4 pb-2 bg-violet-500/10 text-violet-700 border-r-2 border-white/60 text-center">📦 Order &amp; Item Details</th>
                    <th colSpan={1} className="px-4 pt-4 pb-2 bg-red-500/10 text-red-700 text-center">⚡ Actions</th>
                  </tr>
                  {/* Column Header Row */}
                  <tr className="border-b-2 border-black/5 text-[9px] font-black uppercase tracking-widest text-text-secondary">
                    <th className="px-4 py-3 whitespace-nowrap bg-blue-500/5">Customer ID</th>
                    <th className="px-4 py-3 whitespace-nowrap bg-blue-500/5">Branch</th>
                    <th className="px-4 py-3 whitespace-nowrap bg-blue-500/5">CX Name</th>
                    <th className="px-4 py-3 whitespace-nowrap bg-blue-500/5">Account Type</th>
                    <th className="px-4 py-3 whitespace-nowrap bg-blue-500/5 border-r border-black/8">Mobile No.</th>
                    <th className="px-4 py-3 whitespace-nowrap bg-violet-500/5">Order Date</th>
                    <th className="px-4 py-3 whitespace-nowrap bg-violet-500/5">Items Ordered</th>
                    <th className="px-4 py-3 whitespace-nowrap bg-violet-500/5">Qty</th>
                    <th className="px-4 py-3 whitespace-nowrap bg-violet-500/5">Service Type</th>
                    <th className="px-4 py-3 whitespace-nowrap bg-violet-500/5 border-r border-black/8">Status</th>
                    <th className="px-4 py-3 whitespace-nowrap bg-red-500/5">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={`skeleton-${i}`} className="border-b border-black/5 animate-pulse">
                        <td className="px-4 py-3"><div className="h-4 bg-black/10 rounded w-16"></div></td>
                        <td className="px-4 py-3"><div className="h-4 bg-black/10 rounded w-20"></div></td>
                        <td className="px-4 py-3"><div className="h-4 bg-black/10 rounded w-24"></div></td>
                        <td className="px-4 py-3"><div className="h-4 bg-black/10 rounded w-16"></div></td>
                        <td className="px-4 py-3"><div className="h-4 bg-black/10 rounded w-20"></div></td>
                        <td className="px-4 py-3"><div className="h-4 bg-black/10 rounded w-20"></div></td>
                        <td className="px-4 py-3"><div className="h-4 bg-black/10 rounded w-32"></div></td>
                        <td className="px-4 py-3"><div className="h-4 bg-black/10 rounded w-8"></div></td>
                        <td className="px-4 py-3"><div className="h-4 bg-black/10 rounded w-20"></div></td>
                        <td className="px-4 py-3"><div className="h-4 bg-black/10 rounded w-16"></div></td>
                        <td className="px-4 py-3"><div className="h-4 bg-black/10 rounded w-16"></div></td>
                      </tr>
                    ))
                  ) : filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-text-secondary font-bold uppercase tracking-wider text-xs">
                        No orders matching search query
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((o: any) => {
                      const cxId       = o.customer_id || o.id || '-';
                      const cxName     = o.customer_name || o.name || '-';
                      const mobile     = o.mobile_number || o.phone || '-';
                      const orderDate  = o.order_date || o.timestamp?.split(',')[0] || '-';
                      const items      = o.items_ordered || (Array.isArray(o.services) ? o.services.join(', ') : o.services) || '-';
                      const qty        = o.quantity ?? '-';
                      const service    = o.service_type || (Array.isArray(o.services) ? o.services[0] : o.services) || '-';
                      const branchName = stores.find((s: any) => s.id === o.storeId)?.name || 'Main Branch';
                      const cxType    = o.cx_type || (o.source === 'Business' ? 'Business' : 'Residential');
                      const cxTypeColors: Record<string, string> = {
                        'Residential': 'bg-green-500/15 text-green-700',
                        'Business':    'bg-blue-600/15 text-blue-700',
                      };
                      const cxBadgeClass = cxTypeColors[cxType] || cxTypeColors['Residential'];

                      const status = o.status || 'Pending';
                      const statusColors: Record<string, string> = {
                        'Delivered to Cx': 'bg-green-500/15 text-green-700 border border-green-500/20',
                        'Delivered':       'bg-green-500/15 text-green-700 border border-green-500/20',
                        'Completed':       'bg-green-500/15 text-green-700 border border-green-500/20',
                        'Processing':      'bg-blue-500/15 text-blue-700 border border-blue-500/20',
                        'Pending':         'bg-amber-500/15 text-amber-700 border border-amber-500/20',
                        'Pickup done':     'bg-purple-500/15 text-purple-700 border border-purple-500/20',
                      };
                      const statusBadgeClass = statusColors[status] || 'bg-black/5 text-text-secondary';

                      return (
                        <tr key={o.id} className="hover:bg-white/40 transition-colors text-[11px]">
                          {/* Customer Details */}
                          <td className="px-4 py-2.5 font-black text-primary whitespace-nowrap bg-blue-500/[0.02]">{cxId}</td>
                          <td className="px-4 py-2.5 whitespace-nowrap bg-blue-500/[0.02]">
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-lg uppercase bg-primary/10 text-primary">{branchName}</span>
                          </td>
                          <td className="px-4 py-2.5 font-bold whitespace-nowrap bg-blue-500/[0.02]">{cxName}</td>
                          <td className="px-4 py-2.5 whitespace-nowrap bg-blue-500/[0.02]">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase ${cxBadgeClass}`}>{cxType}</span>
                          </td>
                          <td className="px-4 py-2.5 text-text-secondary whitespace-nowrap bg-blue-500/[0.02] border-r border-black/5">{mobile}</td>
                          {/* Order Details */}
                          <td className="px-4 py-2.5 text-text-secondary whitespace-nowrap bg-violet-500/[0.02]">{orderDate}</td>
                          <td className="px-4 py-2.5 text-text-secondary max-w-[180px] truncate bg-violet-500/[0.02]" title={typeof items === 'string' ? items : ''}>{items}</td>
                          <td className="px-4 py-2.5 font-bold text-center bg-violet-500/[0.02]">{qty}</td>
                          <td className="px-4 py-2.5 text-text-secondary whitespace-nowrap bg-violet-500/[0.02]">{service}</td>
                          <td className="px-4 py-2.5 whitespace-nowrap bg-violet-500/[0.02] border-r border-black/5">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase ${statusBadgeClass}`}>{status === 'Delivered to Cx' ? 'Delivered' : status}</span>
                          </td>
                          {/* Actions */}
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <button className="text-red-500 font-bold text-xs hover:underline" onClick={() => deleteBooking(o.id)}>Delete</button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'business-stats' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            <div className="flex justify-between items-center bg-white/40 glass p-6 rounded-3xl border border-black/5 mb-6">
              <div>
                <h3 className="text-lg font-black tracking-tight text-text-primary">Branch Statistics Filter</h3>
                <p className="text-xs text-text-secondary">Filter earnings trend and breakdown metrics globally or by individual branches</p>
              </div>
              <div className="flex gap-4">
                <select 
                  className="glass px-5 py-3 text-xs font-black uppercase rounded-2xl border-none outline-none cursor-pointer text-primary bg-white/70 shadow-sm"
                  value={activeStoreId}
                  onChange={(e) => {
                    setActiveStoreId(e.target.value);
                    fetchData(e.target.value, activeDateFilter);
                  }}
                >
                  <option value="all">All Branches (Global)</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <input 
                  type="date"
                  className="glass px-5 py-3 text-xs font-black uppercase rounded-2xl border-none outline-none cursor-pointer text-primary bg-white/70 shadow-sm"
                  value={activeDateFilter}
                  onChange={(e) => {
                    setActiveDateFilter(e.target.value);
                    fetchData(activeStoreId, e.target.value);
                  }}
                />
              </div>
            </div>

            <EarningsTrendGraph data={dailyEarningsData} />
          </div>
        )}

        {activeTab === 'shops' && (
          <div className="glass overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-primary/5 text-[11px] font-black uppercase tracking-widest text-primary">
                <tr>
                  <th className="p-6">Branch Name</th>
                  <th className="p-6">Manager User</th>
                  <th className="p-6">Status</th>
                  <th className="p-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filteredStores.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-text-secondary font-bold uppercase tracking-wider text-xs">
                      No branches matching search query
                    </td>
                  </tr>
                ) : (
                  filteredStores.map(store => (
                    <tr key={store.id} className="hover:bg-white/40 transition-colors">
                      <td className="p-6">
                        <div className="font-bold">{store.name}</div>
                        <div className="text-[10px] text-text-secondary">{store.address}</div>
                        {store.mapUrl && (
                          <a href={store.mapUrl} target="_blank" className="text-[9px] text-primary font-black uppercase hover:underline mt-1 block">📍 View on Map</a>
                        )}
                      </td>
                      <td className="p-6 text-sm font-medium">{store.manager}</td>
                      <td className="p-6">
                        <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase ${store.approved ? 'bg-green-500/10 text-green-600' : 'bg-orange-500/10 text-orange-600'}`}>
                          {store.approved ? 'Active' : 'Pending'}
                        </span>
                      </td>
                      <td className="p-6">
                        <div className="flex gap-4">
                          <button 
                            className="text-primary font-black text-[10px] uppercase tracking-widest" 
                            onClick={() => { 
                              setEditingStoreId(store.id); 
                              setStoreForm({ 
                                name: store.name, 
                                address: store.location || '', 
                                user: store.manager || '', 
                                pass: '', 
                                mapUrl: store.mapUrl || '', 
                                branchCode: store.branchCode || '' 
                              }); 
                              setShowStoreModal(true); 
                            }}
                          >
                            Edit
                          </button>
                          <button className="text-red-500 font-black text-[10px] uppercase tracking-widest" onClick={() => deleteStore(store.id)}>Remove Branch</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center px-2">
              <div className="flex gap-4">
                <select 
                  className="glass px-4 py-2 text-xs font-black uppercase rounded-xl border-none outline-none"
                  value={inventoryStoreFilter}
                  onChange={(e) => {
                    setInventoryStoreFilter(e.target.value);
                    fetchInventory(e.target.value);
                  }}
                >
                  <option value="GLOBAL">Global Warehouse</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">
                Viewing inventory for: <span className="text-primary">{inventoryStoreFilter === 'GLOBAL' ? 'Main Warehouse' : stores.find(s => s.id === inventoryStoreFilter)?.name}</span>
              </p>
            </div>
            <div className="glass overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-primary/5 text-[11px] font-black uppercase tracking-widest text-primary">
                  <tr>
                    <th className="p-6">Material Item</th>
                    <th className="p-6">Quantity</th>
                    <th className="p-6">Store ID</th>
                    <th className="p-6">Last Updated</th>
                    <th className="p-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {filteredInventory.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-text-secondary font-bold uppercase tracking-wider text-xs">
                        No inventory records matching search query or branch
                      </td>
                    </tr>
                  ) : (
                    filteredInventory.map((item, idx) => (
                      <tr key={idx} className="hover:bg-white/40 transition-colors">
                        <td className="p-6 font-bold uppercase">{item.item}</td>
                        <td className="p-6 font-black text-primary text-lg">{item.quantity} {item.unit}</td>
                        <td className="p-6"><span className="text-[10px] font-black px-2 py-1 rounded-md bg-primary/10 text-primary">{item.storeId}</span></td>
                        <td className="p-6 text-xs text-text-secondary font-medium">{item.lastUpdated}</td>
                        <td className="p-6">
                          <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase ${item.quantity > 5 ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                            {item.quantity > 5 ? 'In Stock' : 'Low Stock'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Branch Stock Requests Section */}
            <div className="pt-10 border-t border-black/5">
              <div className="flex justify-between items-center px-2 mb-6">
                <div>
                  <h3 className="text-2xl font-black text-text-primary">Branch Stock Requests</h3>
                  <p className="text-[10px] font-black uppercase text-text-secondary tracking-widest mt-1">Pending and historical inventory requests from store managers</p>
                </div>
                <div className="flex gap-2 bg-purple-500/10 px-4 py-2 rounded-xl border border-purple-500/20">
                  <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-purple-600">Pending Approval: {stockRequests.filter(r => r.status === 'Pending').length}</span>
                </div>
              </div>

              <div className="glass overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-primary/5 text-[11px] font-black uppercase tracking-widest text-primary">
                    <tr>
                      <th className="p-6">Request ID</th>
                      <th className="p-6">Branch</th>
                      <th className="p-6">Item</th>
                      <th className="p-6">Quantity</th>
                      <th className="p-6">Notes</th>
                      <th className="p-6">Status</th>
                      <th className="p-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {stockRequests.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-text-secondary font-bold uppercase tracking-wider text-xs">
                          No stock requests found
                        </td>
                      </tr>
                    ) : (
                      stockRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-white/40 transition-colors">
                          <td className="p-6 font-black text-sm text-primary">{req.id}</td>
                          <td className="p-6 font-bold text-sm text-text-primary uppercase">{req.storeName}</td>
                          <td className="p-6 font-bold text-sm text-text-primary uppercase">{req.item}</td>
                          <td className="p-6 font-black text-primary text-sm">
                            {req.quantity} <span className="text-xs text-text-secondary uppercase">{req.unit}</span>
                          </td>
                          <td className="p-6 text-xs text-text-secondary max-w-xs truncate">{req.notes || <span className="opacity-40">-</span>}</td>
                          <td className="p-6">
                            <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase ${
                              req.status === 'Approved'
                                ? 'bg-green-500/10 text-green-600'
                                : req.status === 'Rejected'
                                ? 'bg-red-500/10 text-red-600'
                                : 'bg-orange-500/10 text-orange-600 animate-pulse'
                            }`}>
                              {req.status}
                            </span>
                          </td>
                          <td className="p-6">
                            {req.status === 'Pending' ? (
                              <div className="flex gap-2 justify-center">
                                <button
                                  className="bg-green-500 hover:bg-green-600 text-white font-black text-[9px] uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-sm"
                                  onClick={() => handleUpdateStockRequest(req.id, 'Approved')}
                                >
                                  ✅ Approve
                                </button>
                                <button
                                  className="bg-red-500 hover:bg-red-600 text-white font-black text-[9px] uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-sm"
                                  onClick={() => handleUpdateStockRequest(req.id, 'Rejected')}
                                >
                                  ❌ Reject
                                </button>
                              </div>
                            ) : (
                              <div className="text-center text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                                Processed
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'riders' && (
          <div className="glass overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-primary/5 text-[11px] font-black uppercase tracking-widest text-primary">
                <tr>
                  <th className="p-6">Rider Name</th>
                  <th className="p-6">Assigned Branch</th>
                  <th className="p-6">ID / Phone</th>
                  <th className="p-6">Status</th>
                  <th className="p-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filteredRiders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-text-secondary font-bold uppercase tracking-wider text-xs">
                      No riders matching search query
                    </td>
                  </tr>
                ) : (
                  filteredRiders.map(rider => {
                    const branch = stores.find(s => s.id === rider.storeId);
                    return (
                      <tr key={rider.id} className="hover:bg-white/40 transition-colors">
                        <td className="p-6">
                          <div className="flex items-center gap-3">
                            <img
                              src={rider.profilePicture || `https://api.dicebear.com/7.x/avataaars/png?seed=${rider.name}&backgroundColor=b6e3f4,c0aede,d1d4f9`}
                              alt={rider.name}
                              className="w-8 h-8 rounded-full object-cover border-2 border-primary/20 shadow-sm"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/png?seed=${rider.name}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
                              }}
                            />
                            <div className="font-bold">{rider.name}</div>
                          </div>
                        </td>
                        <td className="p-6">
                          <span className="text-xs font-bold text-primary uppercase">
                            {branch ? branch.name : 'Unknown Branch'} {branch?.branchCode ? `(${branch.branchCode})` : ''}
                          </span>
                        </td>
                        <td className="p-6">
                          <div className="text-xs font-black text-primary">{rider.id}</div>
                          <div className="text-[10px] text-text-secondary">{rider.phone}</div>
                        </td>
                        <td className="p-6">
                          <span className="text-[10px] font-black px-2 py-1 rounded-full uppercase bg-green-500/10 text-green-600">
                            {rider.status}
                          </span>
                        </td>
                        <td className="p-6">
                          <div className="flex gap-4">
                            <button className="text-blue-500 font-black text-[10px] uppercase tracking-widest" onClick={() => viewRiderMetrics(rider)}>View Stats</button>
                            <button className="text-red-500 font-black text-[10px] uppercase tracking-widest" onClick={() => deleteRider(rider.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Rider Metrics Modal */}
        {selectedRider && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
            <div className="glass-card w-full max-w-2xl p-8 shadow-2xl relative">
              <button 
                className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 rounded-full w-8 h-8 flex items-center justify-center"
                onClick={() => setSelectedRider(null)}
              >
                ✕
              </button>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-3xl font-black text-primary">{selectedRider.name}</h3>
                  <p className="text-text-secondary font-bold uppercase tracking-widest text-xs mt-1">{selectedRider.id} • {selectedRider.phone}</p>
                </div>
                <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase ${selectedRider.status === 'Active' || selectedRider.status === 'Online' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                  {selectedRider.status === 'Active' || selectedRider.status === 'Online' ? '🟢 Active' : '🔴 Inactive'}
                </span>
              </div>
              
              {!riderMetrics ? (
                riderMetricsError ? (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-bold p-6 rounded-3xl text-center">
                    ⚠️ {riderMetricsError}
                  </div>
                ) : (
                  <div className="text-center p-10 text-text-secondary font-black animate-pulse">Loading Metrics...</div>
                )
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/40 rounded-3xl p-6 border border-black/5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1">Current Status</p>
                      <p className={`text-xl font-black ${riderMetrics.currentStatus === 'On Duty' ? 'text-orange-500' : 'text-green-500'}`}>
                        {riderMetrics.currentStatus}
                      </p>
                    </div>
                    <div className="bg-white/40 rounded-3xl p-6 border border-black/5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1">Incentive Earned (₹4/Task)</p>
                      <p className="text-3xl font-black text-primary">₹{riderMetrics.incentiveEarned}</p>
                    </div>
                    <div className="bg-white/40 rounded-3xl p-6 border border-black/5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1">Tasks Completed</p>
                      <p className="text-3xl font-black text-text-primary">{riderMetrics.tasksCompleted}</p>
                    </div>
                    <div className="bg-white/40 rounded-3xl p-6 border border-black/5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1">Active / Pending Tasks</p>
                      <p className="text-3xl font-black text-orange-500">{riderMetrics.activeTasks}</p>
                    </div>
                  </div>
                  {riderMetrics.location && 
                   riderMetrics.location.lat !== undefined && 
                   riderMetrics.location.lat !== null && 
                   riderMetrics.location.lng !== undefined && 
                   riderMetrics.location.lng !== null && 
                   !isNaN(Number(riderMetrics.location.lat)) && 
                   !isNaN(Number(riderMetrics.location.lng)) ? (
                    <div className="mt-4 bg-white/40 rounded-3xl p-6 border border-black/5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2">Current Location</p>
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-bold text-text-primary">
                          {Number(riderMetrics.location.lat).toFixed(5)}, {Number(riderMetrics.location.lng).toFixed(5)}
                        </p>
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${Number(riderMetrics.location.lat)},${Number(riderMetrics.location.lng)}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2 rounded-xl text-xs font-black uppercase transition-colors"
                        >
                          View on Map 📍
                        </a>
                      </div>
                      <p className="text-[10px] text-text-secondary mt-2">Last Updated: {riderMetrics.location.lastUpdated || 'Unknown'}</p>
                    </div>
                  ) : (
                    <div className="mt-4 bg-white/40 rounded-3xl p-6 border border-black/5 text-center text-text-secondary text-xs font-bold uppercase tracking-widest">
                      Location Data Unavailable
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'support' && (
          <div className="flex flex-col gap-10">
            <div className="flex flex-col gap-6">
              <div className="flex justify-between items-center px-2">
                <h3 className="text-2xl font-black text-text-primary">Active Complaints ({tickets.length})</h3>
                <div className="flex gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Real-time Monitor</span>
                </div>
              </div>

                {tickets.length === 0 && (
                  <div className="glass p-20 text-center text-text-secondary font-black uppercase tracking-widest text-xs border-dashed border-2 border-black/5">
                    No active support tickets found
                  </div>
                )}

                <div className="flex flex-col gap-4">
                  {tickets.map(t => (
                    <div key={t.id} className="glass-card p-8 border-white/40 hover:scale-[1.01] transition-transform">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-black text-lg text-primary">{t.id}</span>
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-primary/10 text-primary uppercase">{t.type}</span>
                          </div>
                          <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">
                            From: <span className="text-text-primary">{t.storeName}</span> · {t.timestamp}
                          </p>
                        </div>
                        <select 
                          value={t.status}
                          onChange={(e) => updateTicketStatus(t.id, e.target.value)}
                          className={`text-[10px] font-black uppercase rounded-full px-4 py-1.5 outline-none border ${t.status === 'Open' ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' : 'bg-green-500/10 text-green-600 border-green-500/20'}`}
                        >
                          <option value="Open">Open</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                      </div>
                      
                      <div className="bg-white/40 rounded-2xl p-6 border border-black/5 mb-6">
                        <p className="text-sm font-medium leading-relaxed text-text-primary">{t.description}</p>
                      </div>

                      <div className="flex gap-4">
                        <button 
                          className="flex-1 btn-primary py-3 text-[10px] tracking-widest shadow-lg shadow-primary/10"
                          onClick={() => mailToDeveloper(t)}
                        >
                          Mail To Developer
                        </button>
                        <button 
                          className="flex-1 glass py-3 text-[10px] tracking-widest font-black text-text-secondary hover:text-primary"
                          onClick={() => updateTicketStatus(t.id, 'Resolved')}
                        >
                          Mark Resolved
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
        )}
        {activeTab === 'rates' && (
          <div className="glass p-10">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-black">Pricing Matrix</h3>
                <div className="flex gap-2 mt-4 flex-wrap">
                  {['All', ...Array.from(new Set(rates.map(r => r.category).filter(Boolean)))].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === cat ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/40 text-text-secondary hover:bg-white/60'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button className="glass py-2 px-4 text-xs font-black uppercase" onClick={seedPlatform}>Reset & Seed</button>
                <button className="btn-primary py-2 px-6 text-sm" onClick={saveRatesToDB}>Save All Changes</button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ratesToDisplay.length === 0 && <p className="text-text-secondary font-bold text-xs uppercase tracking-wider py-10 text-center col-span-full">No items found.</p>}
              {ratesToDisplay.map((rate, index) => (
                <div key={index} className="flex flex-col p-6 bg-white/40 rounded-3xl border border-black/5 hover:border-primary/20 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-[9px] font-black uppercase text-primary tracking-widest block mb-1">{rate.serviceType} • {rate.category}</span>
                      <h4 className="font-bold text-lg">{rate.item}</h4>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingRateItem(rate.item); setRateForm(rate); setShowRateModal(true); }} className="p-2 hover:bg-primary/10 rounded-full text-primary">✏️</button>
                      <button onClick={() => deleteRate(rate.item)} className="p-2 hover:bg-red-500/10 rounded-full text-red-500">🗑️</button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-black/5">
                    <span className="text-text-secondary text-xs font-bold font-mono">BASE PRICE</span>
                    <div className="flex items-center gap-2">
                      <span className="text-primary font-black">₹</span>
                      <input
                        type="number"
                        value={rate.price}
                        onChange={(e) => handleRateChange(rate.item, e.target.value)}
                        className="w-20 bg-transparent text-right font-black outline-none border-b border-transparent focus:border-primary/30 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Rider Modal */}
      {showRiderModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-8 shadow-2xl">
            <h3 className="text-2xl font-black mb-6 text-primary">Onboard New Rider</h3>
            <div className="space-y-4">
              <div className="form-group">
                <label className="text-[10px] font-black uppercase text-text-secondary">Assign to Branch</label>
                <select 
                  value={riderForm.storeId} 
                  onChange={e => setRiderForm({ ...riderForm, storeId: e.target.value })} 
                  className="w-full bg-white/50 border border-black/5 rounded-xl px-4 py-3 outline-none"
                >
                  <option value="">-- Select Branch --</option>
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>{store.name} ({store.branchCode})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="text-[10px] font-black uppercase text-text-secondary">Full Name</label>
                <input type="text" value={riderForm.name} onChange={e => setRiderForm({ ...riderForm, name: e.target.value })} className="w-full bg-white/50 border border-black/5 rounded-xl px-4 py-3" placeholder="Rahul Rider" />
              </div>
              <div className="form-group">
                <label className="text-[10px] font-black uppercase text-text-secondary">Assigned ID (Username)</label>
                <div className="w-full bg-black/5 border border-black/5 rounded-xl px-4 py-3 text-text-secondary text-sm font-medium">
                  Auto-generated (LBBPL + Branch Code + R#)
                </div>
              </div>
              <div className="form-group">
                <label className="text-[10px] font-black uppercase text-text-secondary">Phone Number</label>
                <input type="text" value={riderForm.phone} onChange={e => setRiderForm({ ...riderForm, phone: e.target.value })} className="w-full bg-white/50 border border-black/5 rounded-xl px-4 py-3" placeholder="9876543210" />
              </div>
              <div className="form-group">
                <label className="text-[10px] font-black uppercase text-text-secondary">Password</label>
                <input type="password" value={riderForm.password} onChange={e => setRiderForm({ ...riderForm, password: e.target.value })} className="w-full bg-white/50 border border-black/5 rounded-xl px-4 py-3" placeholder="••••••••" />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button className="btn-primary flex-1 py-4" onClick={handleSaveRider}>Confirm Onboarding</button>
              <button className="px-6 py-4 font-bold text-text-secondary" onClick={() => setShowRiderModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Modal */}
      {showInventoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <div className="glass-card w-full max-w-md p-8 shadow-2xl">
            <h3 className="text-2xl font-black mb-6 text-primary">Add Inventory Item</h3>
            <div className="space-y-4">
              <div className="form-group">
                <label className="text-[10px] font-black uppercase text-text-secondary">Item Name</label>
                <input type="text" value={inventoryForm.item} onChange={e => setInventoryForm({ ...inventoryForm, item: e.target.value })} className="w-full bg-white/50 border border-black/5 rounded-xl px-4 py-3" placeholder="e.g. Detergent Liquid" />
              </div>
              <div className="flex gap-4">
                <div className="form-group flex-1">
                  <label className="text-[10px] font-black uppercase text-text-secondary">Quantity</label>
                  <input type="text" value={inventoryForm.qty} onChange={e => setInventoryForm({ ...inventoryForm, qty: e.target.value })} className="w-full bg-white/50 border border-black/5 rounded-xl px-4 py-3" placeholder="50" />
                </div>
                <div className="form-group flex-1">
                  <label className="text-[10px] font-black uppercase text-text-secondary">Unit</label>
                  <input type="text" value={inventoryForm.unit} onChange={e => setInventoryForm({ ...inventoryForm, unit: e.target.value })} className="w-full bg-white/50 border border-black/5 rounded-xl px-4 py-3" placeholder="Kg / Ltr" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button className="btn-primary flex-1 py-4" onClick={handleSaveInventory}>Save Item</button>
              <button className="px-6 py-4 font-bold text-text-secondary" onClick={() => setShowInventoryModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Store Modal */}
      {showStoreModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[100] flex items-center justify-center p-6 overflow-y-auto">
          <div className="glass-card w-full max-w-md p-8 shadow-2xl my-auto">
            <h3 className="text-2xl font-black mb-6 text-primary">{editingStoreId ? 'Edit Branch' : 'Add New Branch'}</h3>
            <div className="space-y-4">
              <div className="form-group">
                <label className="text-[10px] font-black uppercase text-text-secondary">Branch Name</label>
                <input type="text" value={storeForm.name} onChange={e => setStoreForm({ ...storeForm, name: e.target.value })} className="w-full bg-white/50 border border-black/5 rounded-xl px-4 py-3" />
              </div>
              <div className="form-group">
                <label className="text-[10px] font-black uppercase text-text-secondary">Branch Code (Unique)</label>
                <input type="text" value={storeForm.branchCode} onChange={e => setStoreForm({ ...storeForm, branchCode: e.target.value.toUpperCase() })} className="w-full bg-white/50 border border-black/5 rounded-xl px-4 py-3" placeholder="e.g. BK, AN, IND" />
              </div>
              <div className="form-group">
                <label className="text-[10px] font-black uppercase text-text-secondary">Address</label>
                <input type="text" value={storeForm.address} onChange={e => setStoreForm({ ...storeForm, address: e.target.value })} className="w-full bg-white/50 border border-black/5 rounded-xl px-4 py-3" />
              </div>
              <div className="form-group">
                <label className="text-[10px] font-black uppercase text-text-secondary">Maps URL (Optional)</label>
                <input type="text" value={storeForm.mapUrl} onChange={e => setStoreForm({ ...storeForm, mapUrl: e.target.value })} className="w-full bg-white/50 border border-black/5 rounded-xl px-4 py-3" placeholder="https://goo.gl/maps/..." />
              </div>
              {!editingStoreId && (
                <>
                  <div className="form-group">
                    <label className="text-[10px] font-black uppercase text-text-secondary">Manager Username</label>
                    <input type="text" value={storeForm.user} onChange={e => setStoreForm({ ...storeForm, user: e.target.value })} className="w-full bg-white/50 border border-black/5 rounded-xl px-4 py-3" />
                  </div>
                  <div className="form-group">
                    <label className="text-[10px] font-black uppercase text-text-secondary">Manager Password</label>
                    <input type="password" value={storeForm.pass} onChange={e => setStoreForm({ ...storeForm, pass: e.target.value })} className="w-full bg-white/50 border border-black/5 rounded-xl px-4 py-3" />
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-3 mt-8">
              <button className="btn-primary flex-1 py-4" onClick={handleSaveStore}>Save Branch</button>
              <button className="px-6 py-4 font-bold text-text-secondary" onClick={() => setShowStoreModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Rate Modal */}
      {showRateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <div className="glass-card w-full max-w-md p-8 shadow-2xl">
            <h3 className="text-2xl font-black mb-6 text-primary">{editingRateItem ? 'Modify Service' : 'Add New Service'}</h3>
            <div className="space-y-4">
              <div className="form-group">
                <label className="text-[10px] font-black uppercase text-text-secondary">Service Name</label>
                <input type="text" value={rateForm.item} onChange={e => setRateForm({ ...rateForm, item: e.target.value })} className="w-full bg-white/50 border border-black/5 rounded-xl px-4 py-3" placeholder="e.g. Wedding Saree" />
              </div>
              <div className="form-group">
                <label className="text-[10px] font-black uppercase text-text-secondary">Service Type</label>
                <input type="text" list="serviceTypes" value={rateForm.serviceType} onChange={e => setRateForm({ ...rateForm, serviceType: e.target.value })} className="w-full bg-white/50 border border-black/5 rounded-xl px-4 py-3" placeholder="Select or type new service" />
                <datalist id="serviceTypes">
                  <option value="Dry Clean" />
                  <option value="Wash & Iron" />
                  <option value="Wash Only" />
                  <option value="Steam Iron" />
                  <option value="Shoe Cleaning" />
                  <option value="Combo of pairs" />
                </datalist>
              </div>
              <div className="form-group">
                <label className="text-[10px] font-black uppercase text-text-secondary">Customer Category</label>
                <input type="text" list="categories" value={rateForm.category} onChange={e => setRateForm({ ...rateForm, category: e.target.value })} className="w-full bg-white/50 border border-black/5 rounded-xl px-4 py-3" placeholder="Select or type new category" />
                <datalist id="categories">
                  <option value="Men" />
                  <option value="Women" />
                  <option value="Shoes" />
                  <option value="House Item" />
                </datalist>
              </div>
              <div className="form-group">
                <label className="text-[10px] font-black uppercase text-text-secondary">Base Price (₹)</label>
                <input type="number" value={rateForm.price} onChange={e => setRateForm({ ...rateForm, price: parseFloat(e.target.value) || 0 })} className="w-full bg-white/50 border border-black/5 rounded-xl px-4 py-3" />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button className="btn-primary flex-1 py-4" onClick={handleSaveSingleRate}>Save Service</button>
              <button className="px-6 py-4 font-bold text-text-secondary" onClick={() => setShowRateModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Category Manager Modal */}
      {showCategoryManager && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <div className="glass-card w-full max-w-md p-8 shadow-2xl">
            <h3 className="text-2xl font-black mb-6 text-primary">Manage Categories</h3>
            <div className="space-y-4">
              <div className="form-group">
                <label className="text-[10px] font-black uppercase text-text-secondary">Select Category to Edit/Delete</label>
                <select 
                  className="w-full bg-white/50 border border-black/5 rounded-xl px-4 py-3 outline-none"
                  value={manageCategoryName}
                  onChange={(e) => setManageCategoryName(e.target.value)}
                >
                  <option value="">-- Select Category --</option>
                  {Array.from(new Set(rates.map(r => r.category).filter(Boolean))).map(cat => (
                    <option key={cat as string} value={cat as string}>{cat as string}</option>
                  ))}
                </select>
              </div>

              {manageCategoryName && (
                <div className="form-group mt-4 pt-4 border-t border-black/10">
                  <label className="text-[10px] font-black uppercase text-text-secondary">Rename Category To</label>
                  <input 
                    type="text" 
                    value={manageCategoryNewName} 
                    onChange={e => setManageCategoryNewName(e.target.value)} 
                    className="w-full bg-white/50 border border-black/5 rounded-xl px-4 py-3" 
                    placeholder={`e.g. New name for ${manageCategoryName}`} 
                  />
                  <div className="flex gap-2 mt-3">
                    <button className="bg-blue-500 text-white font-black uppercase tracking-widest text-[10px] px-4 py-2 rounded-lg hover:bg-blue-600 transition-all flex-1" onClick={handleRenameCategory}>Rename</button>
                    <button className="bg-red-500/10 text-red-500 font-black uppercase tracking-widest text-[10px] px-4 py-2 rounded-lg hover:bg-red-500 hover:text-white transition-all flex-1" onClick={handleDeleteCategory}>Delete Category</button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-8 pt-4">
              <button className="w-full px-6 py-4 font-bold text-text-secondary glass rounded-xl hover:bg-white/60" onClick={() => setShowCategoryManager(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>

  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-4 px-6 py-4 rounded-2xl cursor-pointer transition-all duration-300 ${active ? 'bg-primary text-white shadow-xl shadow-primary/30' : 'hover:bg-white/10 text-text-secondary hover:text-text-primary'}`}
    >
      <div className={`${active ? 'text-white' : 'opacity-70'}`}>{icon}</div>
      <span className="font-bold text-sm tracking-tight">{label}</span>
    </div>
  );
}

function StatCard({ label, value, growth, color }: { label: string, value: string, growth: string, color: 'blue' | 'gray' }) {
  return (
    <div className="glass-card p-8 flex flex-col gap-6">
      <p className="text-[10px] text-text-secondary font-black uppercase tracking-[2px]">{label}</p>
      <div className="flex items-end justify-between">
        <h4 className="text-5xl font-black text-text-primary tracking-tighter">{value}</h4>
        <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl ${color === 'blue' ? 'bg-blue-500/10 text-blue-600' : 'bg-green-500/10 text-green-600'}`}>
          {growth}
        </span>
      </div>
    </div>
  );
}
