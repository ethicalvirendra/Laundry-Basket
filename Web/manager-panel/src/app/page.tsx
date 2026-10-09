"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';

type InvoiceLineItem = {
  name: string;
  qty: number;
  rate: number;
  amount: number;
};

type InvoiceEstimate = {
  total: number;
  items: InvoiceLineItem[];
  estimated: boolean;
};

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import * as XLSX from 'xlsx';
import { PAYMENT_QR_BASE64 } from './paymentQrBase64';

// --- INITIALIZATION ---

const API_BASE = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000/api'
  : '/api';

const SOCKET_BASE = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000'
  : '';

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
    <div className="glass-card relative mb-8 overflow-hidden border-primary/10 bg-[#f8fafc]/90 p-5 shadow-2xl shadow-slate-200/70 sm:p-8 lg:p-10">
      
      {/* Monthly Selector Scrollbar */}
      <div className="flex gap-2 overflow-x-auto pb-4 pt-1 px-1 no-scrollbar mb-6 border-b border-primary/5">
        {monthsList.map(month => (
          <button
            key={month.key}
            onClick={() => setSelectedMonthKey(month.key)}
            className={`px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap border ${
              selectedMonthKey === month.key
                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-[1.02]'
                : 'bg-white/70 text-text-secondary border-primary/10 hover:bg-white/90'
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
        <div className="rounded-3xl border border-dashed border-primary/20 bg-white/70 py-12 text-center text-xs font-black uppercase tracking-widest text-text-secondary">
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
          <div className="mt-8 pt-6 border-t border-primary/10">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-5">
              <div>
                <h4 className="text-lg font-black tracking-tight text-text-primary">Daily Breakdown Ledger</h4>
                <p className="text-xs text-text-secondary">Detailed daily revenue, order volume, and dynamic performance metrics</p>
              </div>
              <button 
                onClick={exportMonthReport}
                className="btn-primary flex items-center justify-center gap-2 py-2 px-5 text-xs font-bold shadow-md shadow-primary/10 self-start sm:self-auto"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                Export Month Report
              </button>
            </div>

            <div className="max-h-[300px] overflow-y-auto rounded-3xl border border-primary/10 bg-white/50 scrollbar-thin">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-primary/10 text-[10px] font-black uppercase text-slate-500 tracking-wider select-none">
                    <th className="p-4">Date</th>
                    <th className="p-4">Daily Revenue</th>
                    <th className="p-4 text-center">Orders Volume</th>
                    <th className="p-4 text-right">Average Order Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/5">
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

export default function ManagerPanel() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [orderSummary, setOrderSummary] = useState({
    totalOrders: 0,
    pendingPayments: 0,
    receivedAmount: 0,
    highRiskOrders: 0
  });
  const dailyEarningsData = React.useMemo(() => {
    const dailyMap: { [date: string]: { amount: number; count: number } } = {};
    orders.forEach(o => {
      if (!o.timestamp || !Number(o.total)) return;
      const datePart = String(o.timestamp).split(',')[0].trim();
      if (!dailyMap[datePart]) {
        dailyMap[datePart] = { amount: 0, count: 0 };
      }
      dailyMap[datePart].amount += (Number(o.total) || 0);
      dailyMap[datePart].count += 1;
    });

    const toTime = (date: string) => {
      const [day, month, year] = date.split('/').map(Number);
      return new Date(year, month - 1, day).getTime();
    };

    return Object.keys(dailyMap)
      .sort((a, b) => toTime(a) - toTime(b))
      .map(date => ({ 
        date, 
        amount: dailyMap[date].amount,
        count: dailyMap[date].count 
      }));
  }, [orders]);
  const [loading, setLoading] = useState(true);
  const [showWalkinModal, setShowWalkinModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showWaModal, setShowWaModal] = useState(false);
  const [waModalOrder, setWaModalOrder] = useState<any>(null);
  const [showEODModal, setShowEODModal] = useState(false);
  const [isExportingEODPdf, setIsExportingEODPdf] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showEditOrderModal, setShowEditOrderModal] = useState(false);
  const [editOrderForm, setEditOrderForm] = useState<any>({
    id: '',
    name: '',
    phone: '',
    selectedServices: [],
    total: '0',
    totalMode: 'auto',
    adjustment: '',
    discount: '0',
    source: 'Walk-in',
    address: '',
    status: 'Pending',
    paymentStatus: 'Unpaid',
    assignedRiderId: '',
    searchQuery: '',
    cx_type: 'Residential',
    sourceSegment: 'RF',
    deliveryFee: '0',
    paidTo3rdPartyRider: false
  });
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('lb_manager_active_tab') || 'orders';
    }
    return 'orders';
  });
  const activeTabRef = useRef(activeTab);

  useEffect(() => {
    localStorage.setItem('lb_manager_active_tab', activeTab);
    activeTabRef.current = activeTab;
  }, [activeTab]);
  const [filterCat, setFilterCat] = useState('All');
  const [riders, setRiders] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [inventoryForm, setInventoryForm] = useState({ item: '', quantity: '', unit: '' });
  const [showStockRequestModal, setShowStockRequestModal] = useState(false);
  const [stockRequestForm, setStockRequestForm] = useState({ item: '', quantity: '', unit: 'kg', notes: '' });
  const [stockRequests, setStockRequests] = useState<any[]>([]);
  const [inventorySubTab, setInventorySubTab] = useState<'stock' | 'requests'>('stock');
  const [reviews, setReviews] = useState<any[]>([]);
  const [ticketForm, setTicketForm] = useState({ type: 'Rider Related', description: '' });
  const [notification, setNotification] = useState<any>(null);
  const notificationSound = typeof Audio !== 'undefined' ? () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); // Louder chime
    audio.volume = 1.0;
    audio.loop = true;
    audio.play().catch(e => console.warn("Autoplay blocked:", e));
    setTimeout(() => {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch (err) {}
    }, 10000); // Loop for exactly 10 seconds as requested
  } : null;
  const [isOffline, setIsOffline] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [riderSearch, setRiderSearch] = useState('');

  // Sub-filters for Kanban Columns
  const [pendingFilter, setPendingFilter] = useState<'All' | 'Pending' | 'Out for Pickup' | 'Pickup done' | 'Delivered at store'>('All');
  const [processingFilter, setProcessingFilter] = useState<'All' | 'Processing' | 'Washing' | 'Drying' | 'Ironing'>('All');
  const [readyFilter, setReadyFilter] = useState<'All' | 'Ready' | 'Out for Delivery' | 'Completed'>('All');

  // Pagination states for Order History
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit, setHistoryLimit] = useState(25);
  const [historySourceFilter, setHistorySourceFilter] = useState<'All' | 'NP' | 'SM' | 'RF' | 'WS' | 'AP'>('All');

  // Column filter states for Order History
  const [historyAccountTypeFilter, setHistoryAccountTypeFilter] = useState<string>('All');
  const [historyServiceFilter, setHistoryServiceFilter] = useState<string>('All');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('All');
  const [historyPaymentStatusFilter, setHistoryPaymentStatusFilter] = useState<string>('All');
  const [historyPaymentModeFilter, setHistoryPaymentModeFilter] = useState<string>('All');
  const [historyDeliveryFilter, setHistoryDeliveryFilter] = useState<string>('All');
  const [historyDateFilter, setHistoryDateFilter] = useState<string>('');

  // States for dedicated Source Analytics & Tracking Tab
  const [sourceTabActiveSource, setSourceTabActiveSource] = useState<'All' | 'NP' | 'SM' | 'RF' | 'WS' | 'AP'>('All');
  const [sourceTabSearch, setSourceTabSearch] = useState('');
  const [sourceTabPage, setSourceTabPage] = useState(1);
  const [sourceTabLimit, setSourceTabLimit] = useState(25);

  const trackEvent = (name: string, props?: any) => {
    console.log(`🔥 Analytics: ${name}`, props);
  };

  const logError = (msg: string, err?: any) => {
    console.error(`🚨 Error: ${msg}`, err);
    fetch(`${API_BASE}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level: 'ERROR',
        message: msg,
        details: err?.toString(),
        platform: 'web-manager',
        user: storeName
      })
    }).catch(() => { });
  };

  // Walk-in Form State
  const [walkinForm, setWalkinForm] = useState({
    name: '',
    phone: '',
    selectedServices: [] as { name: string, price: number, qty: number, isCustom?: boolean, description?: string }[],
    total: '0',
    totalMode: 'auto' as 'auto' | 'override' | 'adjustment',
    adjustment: '',
    timestamp: '',
    searchQuery: '',
    discount: '0',
    source: 'Walk-in',
    address: '',
    cx_type: 'Residential',
    sourceSegment: 'RF'
  });

  // Manual line inputs (manager-only): name, price, qty, type
  const [manualLine, setManualLine] = useState({ name: '', price: '', qty: 1, type: 'Product' as 'Product' | 'Service' });
  const userRole = typeof window !== 'undefined' ? localStorage.getItem('lb_user_role') : null;

  // Repeat Customer Search & Autofill State
  const [cxSearchQuery, setCxSearchQuery] = useState('');
  const [cxSuggestions, setCxSuggestions] = useState<any[]>([]);
  const [isSearchingCx, setIsSearchingCx] = useState(false);
  const [showCxDropdown, setShowCxDropdown] = useState(false);
  const [recentRepeatCustomers, setRecentRepeatCustomers] = useState<any[]>([]);
  const [selectedRepeatCustomer, setSelectedRepeatCustomer] = useState<any>(null);
  const [detectedCustomer, setDetectedCustomer] = useState<any>(null);

  const fetchRecentRepeatCustomers = async () => {
    try {
      const res = await fetch(`${API_BASE}/customers/search?limit=6`);
      if (res.ok) {
        const data = await res.json();
        setRecentRepeatCustomers(data.customers || []);
      }
    } catch (err) {
      console.warn("Failed to fetch recent repeat customers:", err);
    }
  };

  useEffect(() => {
    if (showWalkinModal) {
      fetchRecentRepeatCustomers();
    }
  }, [showWalkinModal]);

  useEffect(() => {
    if (!cxSearchQuery || cxSearchQuery.trim().length < 2) {
      setCxSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingCx(true);
      try {
        const res = await fetch(`${API_BASE}/customers/search?q=${encodeURIComponent(cxSearchQuery.trim())}&limit=8`);
        if (res.ok) {
          const data = await res.json();
          setCxSuggestions(data.customers || []);
          setShowCxDropdown(true);
        }
      } catch (err) {
        console.warn("Customer search failed:", err);
      } finally {
        setIsSearchingCx(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [cxSearchQuery]);

  // Live phone number lookup when typing 10 digits directly into Phone field
  useEffect(() => {
    const clean = (walkinForm.phone || '').replace(/\D/g, '').slice(-10);
    if (clean.length === 10 && (!selectedRepeatCustomer || selectedRepeatCustomer.phone !== clean)) {
      const timer = setTimeout(async () => {
        try {
          const res = await fetch(`${API_BASE}/customers/lookup?phone=${clean}`);
          if (res.ok) {
            const data = await res.json();
            if (data.found) {
              setDetectedCustomer({
                name: data.name,
                phone: data.phone,
                address: data.address,
                accountType: data.accountType,
                orderCount: data.pastOrders,
                lastOrderDate: data.lastOrderDate,
                isRepeat: data.isRepeat
              });
            } else {
              setDetectedCustomer(null);
            }
          }
        } catch (e) {
          console.warn("Phone lookup error:", e);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else if (clean.length < 10) {
      setDetectedCustomer(null);
    }
  }, [walkinForm.phone, selectedRepeatCustomer]);

  const selectCustomer = (cx: any) => {
    setSelectedRepeatCustomer(cx);
    const hasAddress = Boolean(cx.address && cx.address.trim() && cx.address !== 'Store Walk-in' && cx.address !== 'Self Pickup');
    setWalkinForm(prev => ({
      ...prev,
      name: cx.name || prev.name,
      phone: cx.phone || prev.phone,
      cx_type: cx.accountType || prev.cx_type || 'Residential',
      address: hasAddress ? cx.address : (prev.address || '')
    }));
    setShowCxDropdown(false);
    setCxSearchQuery('');
    setDetectedCustomer(null);
  };

  const recalcTotal = (services: { name: string, price: number, qty: number }[], discountPct: string, totalMode?: string, adjustment?: string, deliveryFee?: string | number) => {
    const subtotal = services.reduce((acc, curr) => acc + (curr.price * curr.qty), 0);
    const disc = parseFloat(discountPct) || 0;
    const fee = parseFloat(String(deliveryFee || '0')) || 0;
    let finalTotal = subtotal - (subtotal * disc / 100) + fee;

    if (totalMode === 'adjustment') {
      const adj = parseFloat(adjustment || '0') || 0;
      finalTotal += adj;
    }

    return Math.max(0, finalTotal).toFixed(0);
  };
  const [rates, setRates] = useState<any[]>([]);

  const dynamicCategories = React.useMemo(() => {
    const defaultCats = ['Men', 'Women', 'Shoes', 'House Item'];
    const allCatsFromRates = Array.from(new Set(rates.map((r: any) => r.category).filter(Boolean)));
    const allCats = Array.from(new Set([...defaultCats, ...allCatsFromRates])) as string[];

    const categoryCounts: Record<string, number> = {};
    allCats.forEach(c => categoryCounts[c] = 0);

    const itemToCategory: Record<string, string> = {};
    rates.forEach((r: any) => {
      if (r.item && r.category) {
        itemToCategory[r.item.toLowerCase()] = r.category;
      }
    });

    orders.forEach(o => {
      let servicesList = [];
      if (Array.isArray(o.services)) servicesList = o.services;
      else if (typeof o.services === 'string') servicesList = o.services.split(',');

      servicesList.forEach((s: any) => {
        let serviceStr = typeof s === 'string' ? s : s.name;
        if (!serviceStr) return;

        let matchName = '';
        const matchNoPrice = serviceStr.match(/(.*?)\s*\(₹/);
        if (matchNoPrice) matchName = matchNoPrice[1];
        else matchName = serviceStr.split(' x')[0];

        if (matchName.includes(':')) matchName = matchName.split(':')[1];
        matchName = matchName.replace(/\[Custom\]/ig, '').trim().toLowerCase();

        let cat = itemToCategory[matchName];
        if (!cat) {
          const matchedKey = Object.keys(itemToCategory).find(k => matchName.includes(k));
          if (matchedKey) cat = itemToCategory[matchedKey];
        }
        if (cat && categoryCounts[cat] !== undefined) categoryCounts[cat] += (s.qty || 1);
      });
    });

    return allCats.sort((a, b) => categoryCounts[b] - categoryCounts[a]);
  }, [orders, rates]);

  const [selectedWalkinCat, setSelectedWalkinCat] = useState('Men');

  useEffect(() => {
    if (dynamicCategories.length > 0 && !dynamicCategories.includes(selectedWalkinCat)) {
      setSelectedWalkinCat(dynamicCategories[0]);
    }
  }, [dynamicCategories, selectedWalkinCat]);

  const storeId = typeof window !== 'undefined' ? localStorage.getItem('lb_store_id') || "STORE101" : "STORE101";
  const storeName = typeof window !== 'undefined' ? localStorage.getItem('lb_user_name') || "Branch" : "Branch";
  const managerId = typeof window !== 'undefined' ? localStorage.getItem('lb_manager_username') || storeId : storeId;

  useEffect(() => {
    const token = localStorage.getItem('lb_auth_token');
    const role = localStorage.getItem('lb_user_role');

    if (!token || role !== 'manager') {
      router.push('/login');
      return;
    }

    fetchOrders();
    fetchRates();
    fetchRiders();
    fetchInventory();
    fetchReviews();
    fetchStockRequests();

    // --- REQUEST BROWSER NOTIFICATION PERMISSION ---
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }

    const socket = io(SOCKET_BASE); // Connects to the backend server dynamically
    socket.emit('join_room', { role: 'manager', storeId });

    const handleNewOrder = (data: any) => {
      setNotification(data);
      fetchOrders();
      if (notificationSound) notificationSound();

      // --- SHOW SYSTEM NOTIFICATION ---
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification("🧺 New Order Received!", {
          body: data.message || `Order ${data.order?.id || ''} has been placed.`,
          icon: 'https://cdn-icons-png.flaticon.com/512/9746/9746200.png'
        });
      }

      setTimeout(() => setNotification(null), 15000);
    };

    socket.on('new_order_received', handleNewOrder);
    socket.on('instant_alert', (data: any) => {
      handleNewOrder({
        message: data.body,
        order: { id: data.data?.orderId, total: data.data?.total || '0' }
      });
    });
    socket.on('order_status_updated', () => fetchOrders());
    socket.on('order_updated', () => fetchOrders());
    socket.on('rider_status_updated', () => fetchRiders());
    socket.on('rate_updated', () => fetchRates());
    socket.on('rates_updated', () => fetchRates());
    socket.on('inventory_updated', () => {
      fetchInventory();
    });
    socket.on('stock_requests_updated', () => {
      fetchStockRequests();
    });

    socket.on('store_updated', (updatedStore) => {
      if (updatedStore.id === storeId) {
        localStorage.setItem('lb_user_name', updatedStore.name);
        // Instant refresh of store name in UI
        window.location.reload();
      }
    });

    const interval = setInterval(() => {
      fetchOrders();
      if (activeTabRef.current === 'riders') fetchRiders();
    }, 30000); // Sockets handle live updates; slower polling keeps initial/history loading snappy.

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
      socket.disconnect();
    };
  }, []);

  const fetchRiders = async () => {
    try {
      const token = localStorage.getItem('lb_auth_token');
      const res = await fetch(`${API_BASE}/riders?storeId=${storeId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) { localStorage.clear(); window.location.href = '/manager/login'; return; }
      const data = await res.json();
      if (Array.isArray(data)) setRiders(data);
    } catch (err) { console.error("Riders fetch error:", err); }
  };

  const fetchInventory = async () => {
    try {
      const token = localStorage.getItem('lb_auth_token');
      const res = await fetch(`${API_BASE}/inventory?storeId=${storeId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) { localStorage.clear(); window.location.href = '/manager/login'; return; }
      const data = await res.json();
      if (Array.isArray(data)) setInventory(data);
    } catch (err) { console.error("Inventory fetch error:", err); }
  };

  const fetchStockRequests = async () => {
    try {
      const token = localStorage.getItem('lb_auth_token');
      const res = await fetch(`${API_BASE}/stock-requests?storeId=${storeId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) { localStorage.clear(); window.location.href = '/manager/login'; return; }
      const data = await res.json();
      if (Array.isArray(data)) setStockRequests(data);
    } catch (err) { console.error("Stock requests fetch error:", err); }
  };

  const handleSaveStockRequest = async () => {
    if (!stockRequestForm.item || !stockRequestForm.quantity) {
      alert("Item name and quantity are required.");
      return;
    }
    try {
      const token = localStorage.getItem('lb_auth_token');
      const res = await fetch(`${API_BASE}/stock-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          storeId,
          storeName,
          item: stockRequestForm.item,
          quantity: Number(stockRequestForm.quantity),
          unit: stockRequestForm.unit,
          notes: stockRequestForm.notes
        })
      });
      if (res.ok) {
        setShowStockRequestModal(false);
        setStockRequestForm({ item: '', quantity: '', unit: 'kg', notes: '' });
        fetchStockRequests();
        alert("Stock request submitted successfully to Admin!");
      } else {
        const err = await res.json();
        throw new Error(err.error || "Request failed");
      }
    } catch (err: any) {
      alert("Error requesting stock: " + err.message);
    }
  };

  const fetchReviews = async () => {
    try {
      const res = await fetch(`${API_BASE}/reviews/${storeId}`);
      const data = await res.json();
      if (Array.isArray(data)) setReviews(data);
    } catch (err) { console.error("Reviews fetch error:", err); }
  };

  const fetchRates = async () => {
    try {
      const res = await fetch(`${API_BASE}/rates`);
      const data = await res.json();
      if (Array.isArray(data)) setRates(data);
    } catch (err) { console.error("Rates fetch error:", err); }
  };

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('lb_auth_token');
      const res = await fetch(`${API_BASE}/orders/store/${storeId}?fast=1&limit=10000`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) { localStorage.clear(); window.location.href = '/manager/login'; return; }
      const data = await res.json();
      const calculateSummary = (orderList: any[], rawSummary?: any) => {
        let pending = 0;
        let received = 0;
        let highRisk = 0;
        orderList.forEach((o: any) => {
          const isRcv = String(o.paymentStatus || o.payment_status || '').toLowerCase().includes('received');
          const tot = Number(o.total || o.amount || 0);
          const p = (o.pending_amount !== undefined && o.pending_amount !== null && !isNaN(Number(o.pending_amount)))
            ? Number(o.pending_amount)
            : (isRcv ? 0 : tot);
          const r = (o.received_amount !== undefined && o.received_amount !== null && !isNaN(Number(o.received_amount)))
            ? Number(o.received_amount)
            : (isRcv ? tot : 0);
          pending += p;
          received += r;
          if (o.payment_risk === 'HIGH RISK' || (!isRcv && tot > 0)) highRisk++;
        });
        return {
          totalOrders: Number(rawSummary?.totalOrders || orderList.length),
          pendingPayments: pending,
          receivedAmount: received,
          highRiskOrders: Number(rawSummary?.highRiskOrders ?? highRisk)
        };
      };

      if (Array.isArray(data)) {
        setOrders(data);
        setOrderSummary(calculateSummary(data));
      } else if (Array.isArray(data.orders)) {
        setOrders(data.orders);
        setOrderSummary(calculateSummary(data.orders, data.summary));
      }
    } catch (err) {
      logError("Fetch Orders Failed", err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('lb_auth_token');
      await fetch(`${API_BASE}/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      fetchOrders();
    } catch (err) {
      logError("Update Status Failed", { orderId, newStatus, error: err });
    }
  };

  const updatePayment = async (order: any, paymentStatus: 'Pending' | 'Received', paymentMode?: string) => {
    try {
      const token = localStorage.getItem('lb_auth_token');
      const total = Number(order.total || 0);
      const nextMode = paymentMode || order.paymentMode || order.payment_mode || 'Cash';
      const receivedAmount = paymentStatus === 'Received' ? total : 0;
      const pendingAmount = paymentStatus === 'Received' ? 0 : total;
      const todayDateStr = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
      const todayMonthStr = new Date().toLocaleString('en-IN', { month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

      const payload = {
        paymentStatus,
        payment_status: paymentStatus,
        paymentMode: nextMode,
        payment_mode: nextMode,
        received_amount: receivedAmount,
        pending_amount: pendingAmount,
        received_date: paymentStatus === 'Received' ? todayDateStr : null,
        received_month: paymentStatus === 'Received' ? todayMonthStr : null,
        payment_risk: paymentStatus === 'Received' ? 'CLEAR' : 'HIGH RISK'
      };

      const res = await fetch(`${API_BASE}/orders/${order.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Payment update failed');
      }
      fetchOrders();
    } catch (err) {
      logError("Update Payment Failed", { orderId: order.id, paymentStatus, paymentMode, error: err });
      alert("Payment update failed. Please try again.");
    }
  };

  const verifyRider = async (id: string, internalId: string) => {
    try {
      const res = await fetch(`${API_BASE}/riders/${id}/verify`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('lb_auth_token')}`
        },
        body: JSON.stringify({ internalId })
      });
      if (res.ok) {
        alert("Rider Activated Successfully!");
        fetchRiders();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) { alert("Verification failed"); }
  };

  const toggleRiderStatus = async (riderId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Online' ? 'Offline' : 'Online';
    try {
      const token = localStorage.getItem('lb_auth_token');
      const res = await fetch(`${API_BASE}/riders/${riderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Status toggle failed");
      }
      fetchRiders();
    } catch (err: any) { alert("Error toggling status: " + err.message); }
  };

  const exportBranchExcel = async () => {
    try {
      const res = await fetch(`${API_BASE}/export/excel`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('lb_auth_token')}` }
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Branch_Report_${storeId}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) { alert("Export failed"); }
  };

  const exportTodayExcel = () => {
    try {
      const todayOrders = orders.filter(o => o.timestamp && o.timestamp.includes(new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })));

      const data = todayOrders.map(order => ({
        'Order ID': order.id,
        'Date': order.timestamp,
        'Customer Name': order.name,
        'Phone': order.phone,
        'Address': order.address,
        'Services': Array.isArray(order.services) ? order.services.join(', ') : order.services,
        'Total Amount': order.total,
        'Status': order.status
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Today Orders");
      XLSX.writeFile(wb, `Todays_Orders_${storeId}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      alert("Failed to export Excel.");
      console.error(err);
    }
  };

  const exportInventoryExcel = () => {
    try {
      if (!inventory || inventory.length === 0) {
        alert("No inventory records found to export.");
        return;
      }

      const generatedOn = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

      // 1. Stock Sheet
      const stockData = inventory.map((item, idx) => {
        const qty = Number(item.quantity) || 0;
        let status = 'In Stock';
        let alertLevel = 'Healthy Stock';
        if (qty <= 0) {
          status = 'Out of Stock';
          alertLevel = 'CRITICAL - Stock Empty';
        } else if (qty <= 10) {
          status = 'Low Stock';
          alertLevel = 'WARNING - Refill Required';
        }

        return {
          'S.No': idx + 1,
          'Branch Name': storeName || 'Main Branch',
          'Branch ID': storeId,
          'Material Item': item.item || 'N/A',
          'Current Quantity': qty,
          'Unit': item.unit || 'Units',
          'Stock Status': status,
          'Threshold Alert': alertLevel,
          'Last Updated': item.lastUpdated || 'N/A',
          'Report Generated At': generatedOn
        };
      });

      const wsStock = XLSX.utils.json_to_sheet(stockData);
      wsStock['!cols'] = [
        { wch: 6 },  // S.No
        { wch: 22 }, // Branch Name
        { wch: 14 }, // Branch ID
        { wch: 26 }, // Material Item
        { wch: 18 }, // Current Quantity
        { wch: 10 }, // Unit
        { wch: 14 }, // Stock Status
        { wch: 26 }, // Threshold Alert
        { wch: 24 }, // Last Updated
        { wch: 24 }  // Report Generated At
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsStock, "Inventory_Stock");

      // 2. Stock Requests Sheet
      if (stockRequests && stockRequests.length > 0) {
        const requestData = stockRequests.map((req, idx) => ({
          'S.No': idx + 1,
          'Request ID': req.id || `REQ-${idx + 1}`,
          'Branch Name': req.storeName || storeName || 'Main Branch',
          'Branch ID': req.storeId || storeId,
          'Requested Item': req.item || 'N/A',
          'Requested Quantity': Number(req.quantity) || 0,
          'Unit': req.unit || 'kg',
          'Approval Status': req.status || 'Pending',
          'Date Requested': req.createdAt || req.timestamp ? new Date(req.createdAt || req.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A',
          'Notes / Justification': req.notes || '-'
        }));

        const wsReq = XLSX.utils.json_to_sheet(requestData);
        wsReq['!cols'] = [
          { wch: 6 },  // S.No
          { wch: 16 }, // Request ID
          { wch: 22 }, // Branch Name
          { wch: 14 }, // Branch ID
          { wch: 26 }, // Requested Item
          { wch: 18 }, // Requested Quantity
          { wch: 10 }, // Unit
          { wch: 16 }, // Approval Status
          { wch: 24 }, // Date Requested
          { wch: 30 }  // Notes
        ];
        XLSX.utils.book_append_sheet(wb, wsReq, "Stock_Requests_History");
      }

      const cleanStoreName = (storeName || 'Branch').replace(/[^a-zA-Z0-9_-]/g, '_');
      const dateStr = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `Inventory_Report_${cleanStoreName}_${dateStr}.xlsx`);
    } catch (err) {
      console.error("Export Inventory error:", err);
      alert("Failed to export Inventory report: " + err);
    }
  };

  const exportEODGraphPDF = async () => {
    const reportElement = document.getElementById('eod-printable-report');
    if (!reportElement) return;
    setIsExportingEODPdf(true);
    try {
      const todayIsoStr = new Date().toISOString().split('T')[0];
      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc) => {
          const report = clonedDoc.getElementById('eod-printable-report');
          if (report) {
            const dummyCanvas = clonedDoc.createElement('canvas');
            dummyCanvas.width = dummyCanvas.height = 1;
            const ctx = dummyCanvas.getContext('2d');
            const toRgb = (colorStr: string) => {
              if (!colorStr || colorStr === 'transparent' || colorStr === 'inherit' || colorStr === 'initial') return colorStr;
              try {
                if (!ctx) return '#1e293b';
                ctx.fillStyle = '#000000';
                ctx.fillStyle = colorStr;
                return ctx.fillStyle;
              } catch (e) {
                return '#1e293b';
              }
            };

            const elements = report.querySelectorAll('*');
            elements.forEach((node) => {
              const el = node as HTMLElement;
              if (!el.style) return;
              const computed = clonedDoc.defaultView?.getComputedStyle(el);
              if (computed) {
                const colorProps = ['color', 'backgroundColor', 'borderColor', 'outlineColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor'] as const;
                colorProps.forEach((prop) => {
                  const val = (computed as any)[prop];
                  if (val && (val.includes('lab') || val.includes('oklch') || val.includes('color('))) {
                    (el.style as any)[prop] = toRgb(val);
                  }
                });
              }
            });
          }

          // Strip/replace modern color functions from all stylesheet tags and rules
          const styles = clonedDoc.querySelectorAll('style');
          styles.forEach(s => {
            if (s.textContent && (s.textContent.includes('lab(') || s.textContent.includes('oklch(') || s.textContent.includes('color('))) {
              s.textContent = s.textContent
                .replace(/lab\([^)]+\)/gi, '#1e293b')
                .replace(/oklch\([^)]+\)/gi, '#3b82f6')
                .replace(/color\([^)]+\)/gi, '#1e293b');
            }
          });
        }
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdfWidth = 800;
      const pdfHeight = canvas.height * (pdfWidth / canvas.width);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [pdfWidth, pdfHeight]
      });
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`EOD_Report_Graph_${storeId}_${todayIsoStr}.pdf`);
    } catch (e: any) {
      alert('Error generating EOD Graph PDF: ' + (e?.message || String(e)));
    } finally {
      setIsExportingEODPdf(false);
    }
  };

  const exportEODReport = () => {
    try {
      const todayDateStr = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
      const todayIsoStr = new Date().toISOString().split('T')[0];

      // Filter today's orders by timestamp, order_date, or received_date
      const todayOrders = orders.filter(o => {
        const ts = String(o.timestamp || o.order_date || '');
        const rcDate = String(o.received_date || '');
        return ts.includes(todayDateStr) || ts.includes(todayIsoStr) || rcDate === todayDateStr;
      });

      // Compute EOD stats
      const totalOrders = todayOrders.length;
      const totalRevenue = todayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      const receivedRevenue = todayOrders
        .filter(o => o.paymentStatus === 'Received' || o.payment_status === 'Received')
        .reduce((sum, o) => sum + (Number(o.received_amount !== undefined ? o.received_amount : o.total) || 0), 0);
      const pendingRevenue = Math.max(0, totalRevenue - receivedRevenue);

      const cashRevenue = todayOrders
        .filter(o => (o.paymentStatus === 'Received' || o.payment_status === 'Received') && (o.paymentMode === 'Cash' || o.payment_mode === 'Cash'))
        .reduce((sum, o) => sum + (Number(o.received_amount !== undefined ? o.received_amount : o.total) || 0), 0);

      const onlineRevenue = todayOrders
        .filter(o => (o.paymentStatus === 'Received' || o.payment_status === 'Received') && ((o.paymentMode && o.paymentMode !== 'Cash') || (o.payment_mode && o.payment_mode !== 'Cash')))
        .reduce((sum, o) => sum + (Number(o.received_amount !== undefined ? o.received_amount : o.total) || 0), 0);

      const deliveredCount = todayOrders.filter(o => ['delivered', 'delivered to cx', 'completed'].includes(String(o.status).toLowerCase())).length;
      const inProcessCount = todayOrders.filter(o => ['processing', 'washing', 'drying', 'ironing'].includes(String(o.status).toLowerCase())).length;
      const pendingCount = todayOrders.filter(o => ['pending', 'out for pickup', 'pickup done', 'delivered at store'].includes(String(o.status).toLowerCase())).length;

      const totalCollected = cashRevenue + onlineRevenue;
      const cashCollectedPct = totalCollected > 0 ? Math.round((cashRevenue / totalCollected) * 100) : 0;
      const onlineCollectedPct = totalCollected > 0 ? (100 - cashCollectedPct) : 0;

      // Repeat Customer Stats for Excel
      const custHistoryMap: Record<string, number> = {};
      orders.forEach(o => {
        const p = (o.phone || o.mobile_number || '').replace(/\D/g, '').slice(-10);
        if (p) custHistoryMap[p] = (custHistoryMap[p] || 0) + 1;
      });
      let repOrders = 0;
      let newOrders = 0;
      let repRev = 0;
      let newRev = 0;
      todayOrders.forEach(o => {
        const p = (o.phone || o.mobile_number || '').replace(/\D/g, '').slice(-10);
        if (o.isRepeatCustomer || (custHistoryMap[p] || 0) > 1) {
          repOrders++;
          repRev += (Number(o.total) || 0);
        } else {
          newOrders++;
          newRev += (Number(o.total) || 0);
        }
      });
      const repRate = totalOrders > 0 ? Math.round((repOrders / totalOrders) * 100) : 0;

      // Forecast for Excel
      const recDays = dailyEarningsData.slice(-7);
      const avgOrders = recDays.length > 0 ? (recDays.reduce((s, d) => s + d.count, 0) / recDays.length) : (totalOrders || 4);
      const avgRev = recDays.length > 0 ? (recDays.reduce((s, d) => s + d.amount, 0) / recDays.length) : (totalRevenue || 2000);
      const tomDay = (new Date().getDay() + 1) % 7;
      const dFactor = (tomDay === 0 || tomDay === 6) ? 1.25 : 1.05;
      const pOrdMin = Math.max(1, Math.round(avgOrders * 0.9 * dFactor));
      const pOrdMax = Math.max(pOrdMin + 2, Math.round(avgOrders * 1.35 * dFactor));
      const pRevMin = Math.round(avgRev * 0.9 * dFactor);
      const pRevMax = Math.round(avgRev * 1.35 * dFactor);

      // 1. Summary Sheet
      const summaryData = [
        { 'Metric': 'Store Name', 'Value': storeName },
        { 'Metric': 'Store ID', 'Value': storeId },
        { 'Metric': 'Report Date', 'Value': todayDateStr },
        { 'Metric': 'Generated At', 'Value': new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) },
        { 'Metric': '-------------------------', 'Value': '-------------------------' },
        { 'Metric': 'Total Orders Today', 'Value': totalOrders },
        { 'Metric': 'Orders Delivered / Completed', 'Value': deliveredCount },
        { 'Metric': 'Orders In Process', 'Value': inProcessCount },
        { 'Metric': 'Orders Pending / Pickup', 'Value': pendingCount },
        { 'Metric': '-------------------------', 'Value': '-------------------------' },
        { 'Metric': 'Total Day Revenue (₹)', 'Value': `₹${totalRevenue.toLocaleString('en-IN')}` },
        { 'Metric': 'Total Collected Revenue (₹)', 'Value': `₹${totalCollected.toLocaleString('en-IN')}` },
        { 'Metric': 'Total Cash Collected (₹)', 'Value': `₹${cashRevenue.toLocaleString('en-IN')}` },
        { 'Metric': 'Total Online / QR Collected (₹)', 'Value': `₹${onlineRevenue.toLocaleString('en-IN')}` },
        { 'Metric': 'Cash vs Online Ratio', 'Value': `${cashCollectedPct}% Cash / ${onlineCollectedPct}% Online` },
        { 'Metric': 'Total Pending Amount (₹)', 'Value': `₹${pendingRevenue.toLocaleString('en-IN')}` },
        { 'Metric': '-------------------------', 'Value': '-------------------------' },
        { 'Metric': 'Repeat Customer Rate', 'Value': `${repRate}% (${repOrders} repeat orders)` },
        { 'Metric': 'Repeat Customer Revenue (₹)', 'Value': `₹${repRev.toLocaleString('en-IN')}` },
        { 'Metric': 'New Customer Orders', 'Value': `${newOrders} (₹${newRev.toLocaleString('en-IN')})` },
        { 'Metric': '-------------------------', 'Value': '-------------------------' },
        { 'Metric': 'Predicted Orders Tomorrow', 'Value': `${pOrdMin} - ${pOrdMax} Orders` },
        { 'Metric': 'Projected Revenue Tomorrow', 'Value': `₹${pRevMin.toLocaleString('en-IN')} - ₹${pRevMax.toLocaleString('en-IN')}` },
      ];

      // 2. Orders Detail Sheet
      const ordersData = todayOrders.map((o, idx) => ({
        'S.No': idx + 1,
        'Order ID': o.id || o.customer_id,
        'Time': o.timestamp || o.order_date || '-',
        'Customer Name': o.name || o.customer_name || '-',
        'Phone': o.phone || o.mobile_number || '-',
        'Address': o.address || '-',
        'Services': Array.isArray(o.services) ? o.services.join(', ') : o.services || o.items_ordered || '-',
        'Total Amount (₹)': Number(o.total) || 0,
        'Delivery Charges (₹)': Number(o.deliveryFee || o.delivery_charges || 0),
        'Paid to 3rd Party Rider': o.paidTo3rdPartyRider ? 'Yes' : 'No',
        'Payment Status': o.paymentStatus || o.payment_status || 'Pending',
        'Payment Mode': o.paymentMode || o.payment_mode || '-',
        'Order Status': o.status || 'Pending',
        'Pickup Rider': o.assignedRiderId ? (riders.find(r => r.id === o.assignedRiderId)?.name || o.assignedRiderId) : '-',
        'Pickup Photo': o.pickupPhoto ? 'Uploaded' : 'No',
        'Delivery Photo': o.deliveryPhoto ? 'Uploaded' : 'No'
      }));

      const wb = XLSX.utils.book_new();
      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      const wsOrders = XLSX.utils.json_to_sheet(ordersData);

      XLSX.utils.book_append_sheet(wb, wsSummary, "EOD Summary");
      XLSX.utils.book_append_sheet(wb, wsOrders, "Today's Orders Detail");

      XLSX.writeFile(wb, `EOD_Report_${storeId}_${todayIsoStr}.xlsx`);
    } catch (err) {
      alert("Failed to export EOD Report.");
      console.error(err);
    }
  };

  const assignRider = async (orderId: string, riderId: string) => {
    try {
      const token = localStorage.getItem('lb_auth_token');
      await fetch(`${API_BASE}/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ assignedRiderId: riderId })
      });
      fetchOrders();
    } catch (err) {
      console.error("Assign error:", err);
    }
  };

  const handleStartEditOrder = (order: any) => {
    const servicesList = order.services ? (Array.isArray(order.services) ? order.services : String(order.services).split(',')) : [];
    const parsedServices = servicesList.map((s: string) => {
      const cleanStr = s.trim().replace(/^(Service:|Product:)\s*/, '');
      const parsed = parseServiceString(cleanStr);
      let price = parsed.rate;
      if ((!price || price === 0) && Number(order.total) > 0 && parsed.qty) {
        if (servicesList.length === 1) {
          price = Math.round(Number(order.total) / parsed.qty);
        }
      }
      return {
        name: parsed.name,
        price: price || 0,
        qty: parsed.qty,
        isCustom: s.toLowerCase().includes('[custom]'),
        description: s.includes(' - ') ? s.split(' - ')[1] : ''
      };
    });

    const itemsSum = parsedServices.reduce((acc: number, curr: any) => acc + (curr.price * curr.qty), 0);
    if (itemsSum === 0 && Number(order.total) > 0 && parsedServices.length > 0) {
      if (parsedServices.length === 1) {
        parsedServices[0].price = Math.round(Number(order.total) / (parsedServices[0].qty || 1));
      } else {
        parsedServices.forEach((curr: any) => {
          if (!curr.price) curr.price = 20;
        });
      }
    }

    setEditOrderForm({
      id: order.id,
      name: order.name || '',
      phone: order.phone || '',
      selectedServices: parsedServices,
      total: String(order.total || '0'),
      totalMode: order.totalMode || 'auto',
      adjustment: order.adjustment || '',
      discount: String(order.discount || '0'),
      source: order.source || 'Walk-in',
      address: order.address || '',
      status: order.status || 'Pending',
      paymentStatus: order.paymentStatus || 'Unpaid',
      assignedRiderId: order.assignedRiderId || '',
      searchQuery: '',
      cx_type: order.cx_type || (order.source === 'Business' ? 'Business' : 'Residential'),
      sourceSegment: order.sourceSegment || (order.source === 'WhatsApp' ? 'SM' : 'RF'),
      deliveryFee: String(order.deliveryFee ?? order.delivery_charges ?? '0'),
      paidTo3rdPartyRider: !!order.paidTo3rdPartyRider
    });
    setShowEditOrderModal(true);
  };

  const handleUpdateOrder = async () => {
    if (!editOrderForm.name || !editOrderForm.phone || editOrderForm.selectedServices.length === 0) {
      alert("Name, phone and at least one service are required.");
      return;
    }

    try {
      const token = localStorage.getItem('lb_auth_token');

      let finalTotal = parseFloat(editOrderForm.total) || 0;
      if (editOrderForm.totalMode === 'auto' || editOrderForm.totalMode === 'adjustment') {
        finalTotal = parseFloat(recalcTotal(editOrderForm.selectedServices, editOrderForm.discount, editOrderForm.totalMode, editOrderForm.adjustment, editOrderForm.deliveryFee)) || 0;
      }

      const subtotal = editOrderForm.selectedServices.reduce((acc: number, curr: any) => acc + curr.price * curr.qty, 0);
      const servicesDetails = editOrderForm.selectedServices.map((s: any) => {
        let serviceStr = `${s.name} x${s.qty} (₹${s.price * s.qty})`;
        if (s.isCustom) serviceStr += ' [Custom]';
        if (s.description) serviceStr += ` - ${s.description}`;
        return serviceStr;
      });

      const isRcv = String(editOrderForm.paymentStatus).toLowerCase().includes('received');
      const updatedOrder = {
        name: editOrderForm.name,
        customer_name: editOrderForm.name,
        phone: editOrderForm.phone,
        mobile_number: editOrderForm.phone,
        address: editOrderForm.address,
        services: servicesDetails,
        total: finalTotal,
        subtotal: subtotal,
        discount: editOrderForm.discount,
        deliveryFee: parseFloat(editOrderForm.deliveryFee || '0') || 0,
        paidTo3rdPartyRider: !!editOrderForm.paidTo3rdPartyRider,
        totalMode: editOrderForm.totalMode,
        adjustment: editOrderForm.adjustment,
        status: editOrderForm.status,
        paymentStatus: isRcv ? 'Received' : 'Pending',
        payment_status: isRcv ? 'Received' : 'Pending',
        pending_amount: isRcv ? 0 : finalTotal,
        received_amount: isRcv ? finalTotal : 0,
        assignedRiderId: editOrderForm.assignedRiderId || null,
        source: editOrderForm.source,
        sourceSegment: editOrderForm.sourceSegment || 'RF',
        cx_type: editOrderForm.cx_type
      };

      const res = await fetch(`${API_BASE}/orders/${editOrderForm.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(updatedOrder)
      });

      if (res.ok) {
        alert("Order updated successfully!");
        setShowEditOrderModal(false);
        fetchOrders();
      } else {
        const err = await res.json();
        throw new Error(err.error || "Update failed");
      }
    } catch (err: any) {
      alert("Error updating order: " + err.message);
    }
  };

  const handleSaveWalkin = async () => {
    if (!walkinForm.name || !walkinForm.phone || walkinForm.selectedServices.length === 0) {
      alert("Please fill all required fields and add at least one service.");
      return;
    }

    try {
      const token = localStorage.getItem('lb_auth_token');

      let finalTotal = parseFloat(walkinForm.total) || 0;

      if (walkinForm.totalMode === 'auto' || walkinForm.totalMode === 'adjustment') {
        finalTotal = parseFloat(recalcTotal(walkinForm.selectedServices, walkinForm.discount, walkinForm.totalMode, walkinForm.adjustment)) || 0;
      }

      const subtotal = walkinForm.selectedServices.reduce((acc, curr) => acc + curr.price * curr.qty, 0);
      const servicesDetails = walkinForm.selectedServices.map(s => {
        let serviceStr = `${s.name} x${s.qty} (₹${s.price * s.qty})`;
        if (s.isCustom) serviceStr += ' [Custom]';
        if (s.description) serviceStr += ` - ${s.description}`;
        return serviceStr;
      });

      const newOrder = {
        storeId,
        name: walkinForm.name,
        customer_name: walkinForm.name,
        phone: walkinForm.phone,
        mobile_number: walkinForm.phone,
        services: servicesDetails,
        itemSummary: walkinForm.source === 'WhatsApp' ? 'WhatsApp Order' : 'Walk-in Order',
        total: finalTotal,
        subtotal: subtotal,
        discount: walkinForm.discount,
        address: walkinForm.address || (walkinForm.source === 'WhatsApp' ? walkinForm.address : 'Store Walk-in'),
        status: walkinForm.source === 'Walk-in' ? 'Processing' : 'Pending',
        paymentStatus: 'Pending',
        payment_status: 'Pending',
        pending_amount: finalTotal,
        received_amount: 0,
        timestamp: walkinForm.timestamp || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        source: walkinForm.source,
        sourceSegment: walkinForm.sourceSegment || (walkinForm.source === 'WhatsApp' ? 'SM' : 'RF'),
        totalMode: walkinForm.totalMode,
        adjustment: walkinForm.adjustment,
        cx_type: walkinForm.cx_type || 'Residential'
      };

      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newOrder)
      });

      if (res.ok) {
        const createdOrder = await res.json();
        trackEvent('walkin_order_created', { total: newOrder.total, services: newOrder.services });
        setShowWalkinModal(false);
        setWalkinForm({ name: '', phone: '', selectedServices: [], total: '0', totalMode: 'auto', adjustment: '', timestamp: '', searchQuery: '', discount: '0', source: 'Walk-in', address: '', cx_type: 'Residential', sourceSegment: 'RF' });
        setSelectedRepeatCustomer(null);
        setDetectedCustomer(null);
        setCxSearchQuery('');
        setShowCxDropdown(false);
        fetchOrders();
        setSelectedOrder(createdOrder);
        setShowInvoiceModal(true);
      }
    } catch (err) {
      console.error("Error creating walk-in:", err);
      alert("Failed to create order");
    }
  };

  const addManualLine = () => {
    const name = (manualLine.name || '').trim();
    const price = parseFloat(String(manualLine.price)) || 0;
    const qty = parseInt(String(manualLine.qty)) || 1;
    if (!name) return alert('Please enter a name for the manual item');
    if (price <= 0) return alert('Please enter a valid price for the manual item');

    const newList = [...walkinForm.selectedServices];
    newList.push({ name: `${manualLine.type}: ${name}`, price: price, qty, isCustom: true, description: manualLine.type === 'Product' ? 'Manual product' : 'Manual service' });

    setWalkinForm({
      ...walkinForm,
      selectedServices: newList,
      total: recalcTotal(newList, walkinForm.discount, walkinForm.totalMode, walkinForm.adjustment)
    });

    setManualLine({ name: '', price: '', qty: 1, type: 'Product' });
  };

  const handleRaiseTicket = async () => {
    if (!ticketForm.description) return alert("Please describe the issue.");
    try {
      const res = await fetch(`${API_BASE}/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('lb_auth_token')}`
        },
        body: JSON.stringify({
          ...ticketForm,
          storeName,
          raisedBy: storeName
        })
      });
      if (res.ok) {
        alert("Ticket Raised Successfully! Admin will review it.");
        setTicketForm({ type: 'Rider Related', description: '' });
      }
    } catch (err) { alert("Failed to raise ticket."); }
  };


  const handleSaveInventory = async () => {
    if (!inventoryForm.item || !inventoryForm.quantity) return alert("Fill all fields");
    try {
      const token = localStorage.getItem('lb_auth_token');
      const res = await fetch(`${API_BASE}/inventory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(inventoryForm)
      });
      if (res.ok) {
        setShowInventoryModal(false);
        setInventoryForm({ item: '', quantity: '', unit: '' });
        fetchInventory();
      } else {
        const err = await res.json();
        throw new Error(err.error || "Save failed");
      }
    } catch (err: any) { alert("Error saving inventory: " + err.message); }
  };

  const handleImportExcel = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event: any) => {
      try {
        const bstr = event.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        const rows = data.slice(1); // Skip header
        let importedCount = 0;

        for (const columns of rows) {
          if (!columns || columns.length < 8) continue;

          // DATE (0), ORDER ID (1), CX NAME (2), MOBILE NUMBER (3), ITEMES (4), QTY. (5), Service (6), AMOUNT (7), CUSTUMER ADDRESS (8)
          const [date, orderId, name, phone, items, qty, service, amount, address] = columns;

          let formattedDate = date ? String(date) : new Date().toLocaleString('en-IN');
          // Handle Excel serial date numbers
          if (typeof date === 'number') {
            const excelDate = new Date(Math.round((date - 25569) * 86400 * 1000));
            formattedDate = excelDate.toLocaleString('en-IN');
          }

          const newOrder = {
            storeId,
            id: orderId ? String(orderId) : undefined,
            name: name ? String(name) : 'Unknown',
            phone: phone ? String(phone) : '',
            services: [`${service || ''} (${items || ''} x${qty || '1'})`],
            itemSummary: items ? String(items) : 'Imported Order',
            total: parseFloat(amount) || 0,
            address: address ? String(address) : 'Imported',
            status: 'Completed',
            timestamp: formattedDate,
            source: 'Excel Import'
          };

          try {
            const token = localStorage.getItem('lb_auth_token');
            await fetch(`${API_BASE}/orders`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify(newOrder)
            });
            importedCount++;
          } catch (err) {
            console.error("Import row failed:", err);
          }
        }
        alert(`Excel Import complete: ${importedCount} orders synchronized with cloud.`);
        fetchOrders();
      } catch (err) {
        console.error("Excel Parse Error:", err);
        alert("Failed to parse Excel file. Please ensure it's a valid .xlsx or .xls file.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const deleteRider = async (id: string) => {
    if (!window.confirm("Remove this rider?")) return;
    try {
      const token = localStorage.getItem('lb_auth_token');
      const res = await fetch(`${API_BASE}/riders/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error deleting rider");
      }
      fetchRiders();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const openWhatsAppOptions = (order: any) => {
    setWaModalOrder(order);
    setShowWaModal(true);
  };

  const shareOnWhatsapp = (order: any) => {
    const servicesList = Array.isArray(order.services)
      ? order.services.map((s: string) => `  • ${s}`).join('%0A')
      : String(order.services).split(',').map((s: string) => `  • ${s.trim()}`).join('%0A');
    const message =
      `🧺 *LAUNDRY BASKET — INVOICE*%0A` +
      `━━━━━━━━━━━━━━━━━━━━%0A` +
      `*Order ID:* ${order.id}%0A` +
      `*Branch:* ${storeName}%0A` +
      `*Date:* ${order.timestamp || new Date().toLocaleDateString('en-IN')}%0A` +
      `━━━━━━━━━━━━━━━━━━━━%0A` +
      `*Customer:* ${order.name}%0A` +
      `*Phone:* +91 ${order.phone}%0A` +
      `*Address:* ${order.address || 'Walk-in'}%0A` +
      `━━━━━━━━━━━━━━━━━━━━%0A` +
      `*Services:%0A*${servicesList}%0A` +
      `━━━━━━━━━━━━━━━━━━━━%0A` +
      `*Grand Total: ₹${order.total}*%0A` +
      `━━━━━━━━━━━━━━━━━━━━%0A` +
      `🔍 Track Order: https://www.laundrybasketunicorn.com/?track=${order.id}%0A%0A` +
      `✨ *Pocket Light. Kapde Bright.*%0A` +
      `_Thank you for choosing Laundry Basket! 🙏_`;
    window.open(`https://wa.me/91${order.phone}?text=${message}`, '_blank');
  };

  const shareReceivedConfirmation = (order: any) => {
    const serviceName = Array.isArray(order.services)
      ? order.services.join(', ')
      : (order.services || 'Laundry Service');

    const pickupDate = order.pickupDate || order.pickup_date || order.date || (order.timestamp ? String(order.timestamp).split(',')[0].trim() : new Date().toLocaleDateString('en-IN'));
    const expectedDelivery = order.deliveryDate || order.expected_delivery || 'Within 48-72 hrs';

    const message = encodeURIComponent(
`📦 *Laundry Basket – Order Confirmation*

Dear *${order.name || 'Valued Customer'}*,

Thank you for choosing *Laundry Basket*! 😊

Your order has been received successfully.

🆔 *Order ID:* ${order.id}
🧺 *Service:* ${serviceName}
📅 *Pickup Date:* ${pickupDate}
🚚 *Expected Delivery:* ${expectedDelivery}
✅ *Order Status:* Order Received

Our team has started processing your order. You'll receive updates as your order moves through each stage.

🔍 *Track Your Order:* https://www.laundrybasketunicorn.com/?track=${order.id}

✨ *Pocket Light. Kapde Bright.*
Thank you for trusting *Laundry Basket*. ❤️

*Team Laundry Basket* 🧺`
    );

    window.open(`https://wa.me/91${order.phone}?text=${message}`, '_blank');
  };

  const downloadPDF = async (order: any) => {
    const servicesList = Array.isArray(order.services)
      ? order.services
      : String(order.services).split(',').map((s: string) => s.trim());

    // Build a hidden off-screen div with the invoice HTML
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:-9999px;top:0;width:1100px;background:#fff;font-family:Arial, sans-serif;color:#000;';

    const parsedItems: InvoiceLineItem[] = servicesList.map((s: string) => parseServiceString(s));

    let computedSubtotal = parsedItems.reduce((acc: number, item: any) => acc + item.amount, 0);
    const parsedTotal = parseFloat(order.total) || 0;

    // Auto-fix for orders from App where items might not have price strings
    if (computedSubtotal === 0 && parsedTotal > 0 && parsedItems.length > 0) {
      const perItemAmount = Math.round(parsedTotal / parsedItems.length);
      parsedItems.forEach((item, index) => {
        if (index === parsedItems.length - 1) {
          item.amount = parsedTotal - (perItemAmount * (parsedItems.length - 1));
        } else {
          item.amount = perItemAmount;
        }
        item.rate = item.qty > 0 ? Math.round(item.amount / item.qty) : item.amount;
      });
      computedSubtotal = parsedTotal;
    }

    const subtotal = (order.subtotal && order.subtotal > 0) ? order.subtotal : computedSubtotal;
    const diff = subtotal - parsedTotal;

    let adjustmentRowPDF = '';
    if (diff > 0 && Math.abs(diff) > 0.01) {
      let label = 'DISCOUNT / ADJUSTMENT';
      if (order.discount && parseFloat(order.discount) > 0) {
        label = `DISCOUNT (${order.discount}%)`;
      } else if (order.totalMode === 'adjustment') {
        label = 'ADJUSTMENT';
      } else if (order.totalMode === 'override') {
        label = 'MANUAL OVERRIDE';
      }
      adjustmentRowPDF = `
        <div style="display: flex; justify-content: space-between; padding: 0 0 24px 0; margin-bottom: 20px;">
          <span style="font-size: 30px; font-weight: 700; color: #555;">${label}:</span>
          <span style="font-size: 30px; font-weight: 900; color: #222;">-Rs ${diff.toFixed(2)}</span>
        </div>`;
    } else if (diff < 0 && Math.abs(diff) > 0.01) {
      adjustmentRowPDF = `
        <div style="display: flex; justify-content: space-between; padding: 0 0 24px 0; margin-bottom: 20px;">
          <span style="font-size: 30px; font-weight: 700; color: #555;">EXTRA CHARGES:</span>
          <span style="font-size: 30px; font-weight: 900; color: #222;">+Rs ${Math.abs(diff).toFixed(2)}</span>
        </div>`;
    }

    container.innerHTML = `
      <div style="width:1100px; padding: 60px; background:#fff; color:#000; border: 2px solid #ddd; font-family: Verdana, Arial, sans-serif;">
        <div style="text-align: center; margin-bottom: 50px;">
          <div style="display: flex; justify-content: center; margin-bottom: 20px;">
            <img src="/manager/logo.png" style="height: 160px; object-contain: contain;" />
          </div>
          <h1 style="font-size: 56px; font-weight: 900; margin: 0; color: #000; letter-spacing: 2px;">LAUNDRY BASKET</h1>
          <p style="font-size: 28px; margin: 4px 0; font-weight: 700; color: #333;">Laundry & Dry Cleaning Service</p>
          <p style="font-size: 26px; margin: 4px 0; font-weight: 600;">Phone No. +91-9644254425</p>
          <div style="border-bottom: 4px solid #000; margin-top: 30px;"></div>
        </div>

        <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding: 20px 0; margin-bottom: 40px;">
          <span style="font-size: 28px; font-weight: 900;">ID: ${order.id}</span>
          <span style="font-size: 28px; font-weight: 900;">Date: ${order.timestamp?.split(',')[0] || new Date().toLocaleDateString('en-IN')}</span>
        </div>

        <div style="margin-bottom: 40px; border-bottom: 2px solid #000; padding-bottom: 24px;">
          <h2 style="font-size: 26px; font-weight: 900; text-transform: uppercase; margin: 0 0 16px 0; background: #f4f4f4; padding: 8px 16px; border-left: 8px solid #000;">CUSTOMER DETAILS</h2>
          <p style="font-size: 28px; margin: 8px 0; font-weight: 700;">Name: ${order.name}</p>
          <p style="font-size: 28px; margin: 8px 0; font-weight: 700;">Phone: +91 ${order.phone}</p>
          ${order.assignedRiderId ? `
            <p style="font-size: 28px; margin: 8px 0; font-weight: 700;">Rider ID: <span style="font-weight: 900; color: #000;">${order.assignedRiderId}</span></p>
          ` : ''}
        </div>

        <div style="margin-bottom: 40px; border-bottom: 2px solid #000; padding-bottom: 24px;">
          <h2 style="font-size: 26px; font-weight: 900; text-transform: uppercase; margin: 0 0 16px 0; background: #f4f4f4; padding: 8px 16px; border-left: 8px solid #000;">PICKUP</h2>
          <p style="font-size: 28px; margin: 8px 0; font-weight: 700;">${order.name}</p>
          <p style="font-size: 26px; margin: 8px 0; color: #444; font-weight: 500;">${order.address || 'Walk-in Store'}</p>
          <p style="font-size: 28px; font-weight: 900; margin: 16px 0 0 0;">Pickup: ${order.timestamp?.split(',')[0] || new Date().toLocaleDateString('en-IN')}</p>
        </div>

        <div style="margin-bottom: 40px; border-bottom: 2px solid #000; padding-bottom: 24px;">
          <h2 style="font-size: 26px; font-weight: 900; text-transform: uppercase; margin: 0 0 16px 0; background: #f4f4f4; padding: 8px 16px; border-left: 8px solid #000;">DELIVERY</h2>
          <p style="font-size: 28px; margin: 8px 0; font-weight: 700;">${order.name}</p>
          <p style="font-size: 26px; margin: 8px 0; color: #444; font-weight: 500;">${order.address || 'Walk-in Store'}</p>
          <p style="font-size: 28px; font-weight: 900; margin: 16px 0 0 0;">Delivery: ${order.timestamp?.split(',')[0] || new Date().toLocaleDateString('en-IN')}</p>
        </div>

        <h2 style="font-size: 26px; font-weight: 900; text-transform: uppercase; margin: 40px 0 16px 0;">ORDER ITEMS</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 50px;">
          <thead>
            <tr style="border-top: 2px solid #000; border-bottom: 2px solid #000;">
              <th style="text-align: left; font-size: 26px; padding: 20px 0; font-weight: 900;">Item</th>
              <th style="text-align: center; font-size: 26px; padding: 20px 0; font-weight: 900;">Qty</th>
              <th style="text-align: right; font-size: 26px; padding: 20px 0; font-weight: 900;">Rate</th>
              <th style="text-align: right; font-size: 26px; padding: 20px 0; font-weight: 900;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${parsedItems.map((item: any, idx: number) => `
              <tr style="border-bottom: 2px dashed #ccc;">
                <td style="font-size: 26px; padding: 24px 0; font-weight: 600;">${idx + 1}. ${item.name}</td>
                <td style="text-align: center; font-size: 26px; padding: 24px 0; font-weight: 700;">${item.qty}</td>
                <td style="text-align: right; font-size: 26px; padding: 24px 0; font-weight: 600;">${item.rate.toFixed(2)}</td>
                <td style="text-align: right; font-size: 26px; padding: 24px 0; font-weight: 800;">${item.amount.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="display: flex; justify-content: space-between; border-top: 2px solid #000; padding: 24px 0 10px 0; margin-bottom: 10px;">
          <span style="font-size: 30px; font-weight: 700;">Subtotal:</span>
          <span style="font-size: 30px; font-weight: 900;">Rs ${subtotal.toFixed(2)}</span>
        </div>
        ${adjustmentRowPDF}

        <div style="background: #000; color: #fff; padding: 30px 40px; display: flex; justify-content: space-between; align-items: center; border-radius: 8px;">
          <span style="font-size: 36px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">TOTAL PAYABLE:</span>
          <span style="font-size: 44px; font-weight: 900;">Rs ${order.total.toFixed(2)}</span>
        </div>

        <div style="margin-top: 36px; text-align: center; border: 2px dashed #cbd5e1; border-radius: 16px; padding: 24px; background: #f8fafc;">
          <div style="font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #1e293b; margin-bottom: 12px;">SCAN & PAY VIA UPI</div>
          <div style="display: flex; justify-content: center; align-items: center;">
            <img src="${PAYMENT_QR_BASE64}" style="width: 180px; height: 180px; object-fit: contain; border-radius: 12px; border: 1.5px solid #cbd5e1; background: #fff; padding: 6px;" />
          </div>
          <div style="font-size: 20px; font-weight: 700; color: #64748b; margin-top: 12px;">Accepting GPay, PhonePe, Paytm & all UPI Apps</div>
        </div>

        <div style="text-align: center; margin-top: 60px; font-size: 22px; font-weight: 700; color: #666; font-style: italic;">
          Thank you for choosing Laundry Basket! Visit again soon.
        </div>
      </div>
    `;

    document.body.appendChild(container);
    try {
      const canvas = await html2canvas(container, { scale: 1.5, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [1100, canvas.height / 1.5] });
      pdf.addImage(imgData, 'JPEG', 0, 0, 1100, canvas.height / 1.5);
      pdf.save(`Invoice-${order.id}.pdf`);
    } finally {
      document.body.removeChild(container);
    }
  };

  const parseServiceString = (s: string): InvoiceLineItem => {
    const sTrim = s.trim();
    let name = sTrim;
    let qty = 1;
    let rate = 0;
    let amount = 0;

    // Regex to capture: 1. Name, 2. Qty, 3. Amount, 4. Suffix (like [Custom])
    // It looks for "x<number> (₹<number>)"
    const matchX = sTrim.match(/(.*?)\s+x(\d+)\s*\(₹(\d+)\)(.*)/);
    if (matchX) {
      const baseName = matchX[1].trim();
      const suffix = matchX[4].trim();
      name = suffix ? `${baseName} ${suffix}` : baseName;
      qty = parseInt(matchX[2]) || 1;
      amount = parseInt(matchX[3]) || 0;
      rate = qty > 0 ? Math.round(amount / qty) : amount;
    } else {
      // Fallback for items without 'xQTY' part, e.g. "Dry Cleaning (₹300) [Custom]"
      const matchNoX = sTrim.match(/(.*?)\s*\(₹(\d+)\)(.*)/);
      if (matchNoX) {
        const baseName = matchNoX[1].trim();
        const suffix = matchNoX[3].trim();
        name = suffix ? `${baseName} ${suffix}` : baseName;
        qty = 1;
        amount = parseInt(matchNoX[2]) || 0;
        rate = amount;
      } else {
        // Final fallback for strings with no price in parenthesis
        // Check for format: "Laundry - Item (5 pcs)" or "Laundry - Item (5 pc)"
        const matchPcs = sTrim.match(/(.*?)\s*\((\d+)\s*pcs?\)/i);
        if (matchPcs) {
          name = matchPcs[1].trim();
          qty = parseInt(matchPcs[2]) || 1;
        } else {
          // Check for other numbers in parenthesis like "(5)"
          const matchNum = sTrim.match(/(.*?)\s*\((\d+)\)/);
          if (matchNum) {
            name = matchNum[1].trim();
            qty = parseInt(matchNum[2]) || 1;
          }
        }
      }
    }
    name = name.replace(/\[Custom\]/ig, '').trim();
    return { name, qty, rate, amount };
  };

  const normalizeRateText = (value: string) =>
    String(value || '')
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/\+/g, 'and')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

  const compactRateText = (value: string) => normalizeRateText(value).replace(/\s+/g, '');

  const normalizeImportedItemName = (value: string) => {
    const normalized = normalizeRateText(value);
    if (normalized === 'duet' || normalized === 'duvet') return 'duvet cover';
    if (normalized === 'bedsheet' || normalized === 'bed sheet') return 'bed sheet';
    if (normalized === 'cover') return 'pillow cover';
    if (normalized === 'pillow') return 'pillow cover';
    return normalized;
  };

  const parseImportedItemLines = (order: any) => {
    const raw = order.items_ordered || (Array.isArray(order.services) ? order.services.join('\n') : order.services) || '';
    return String(raw)
      .split(/\r?\n|,/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^(.+?)[\s-]+(\d+)\s*(?:pcs?)?$/i);
        return {
          rawName: match ? match[1].trim() : line.replace(/\(\d+\s*pcs?\)/i, '').trim(),
          qty: match ? parseInt(match[2], 10) || 1 : 1
        };
      });
  };

  const findRateForImportedItem = (rawName: string, serviceType: string) => {
    const itemNeedle = normalizeImportedItemName(rawName);
    const serviceNeedle = compactRateText(serviceType || 'Wash & Iron');

    const compatibleRates = rates.filter((rate: any) => {
      const rateService = compactRateText(rate.serviceType || '');
      return !serviceNeedle || rateService === serviceNeedle || rateService.includes(serviceNeedle) || serviceNeedle.includes(rateService);
    });

    const pool = compatibleRates.length > 0 ? compatibleRates : rates;
    return pool.find((rate: any) => normalizeRateText(rate.item || '') === itemNeedle)
      || pool.find((rate: any) => normalizeRateText(rate.item || '').includes(itemNeedle))
      || pool.find((rate: any) => itemNeedle.includes(normalizeRateText(rate.item || '')));
  };

  const getInvoiceEstimate = (order: any, parsedItems: InvoiceLineItem[]): InvoiceEstimate => {
    const parsedTotal = parseFloat(order.total) || 0;
    if (parsedTotal > 0) return { total: parsedTotal, items: parsedItems, estimated: false };

    const importedLines = parseImportedItemLines(order);
    if (importedLines.length === 0 || rates.length === 0) {
      return { total: 0, items: parsedItems, estimated: false };
    }

    const serviceType = order.service_type || (Array.isArray(order.services) ? order.services[0] : order.services) || 'Wash & Iron';
    const estimatedItems = importedLines.map(({ rawName, qty }) => {
      const rate = findRateForImportedItem(rawName, serviceType);
      const price = parseFloat(rate?.price) || 0;
      return {
        name: rawName,
        qty,
        rate: price,
        amount: price * qty
      };
    });
    const total = estimatedItems.reduce((sum, item) => sum + item.amount, 0);
    return total > 0 ? { total, items: estimatedItems, estimated: true } : { total: 0, items: parsedItems, estimated: false };
  };

  const printThermal = async (order: any) => {
    // Convert logo to Base64 to ensure visibility in about:blank
    let logoBase64 = '';
    try {
      // Try both common paths
      const paths = ['/logo.png', '/manager/logo.png', '/favicon.png'];
      for (const p of paths) {
        const resp = await fetch(p);
        if (resp.ok) {
          const blob = await resp.blob();
          logoBase64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          break;
        }
      }
    } catch (e) { console.error("Logo fetch failed", e); }

    // Use bundled Base64 payment QR to ensure 100% instant visibility in print dialog without network dependency
    const qrBase64 = PAYMENT_QR_BASE64;

    const servicesList = Array.isArray(order.services)
      ? order.services
      : String(order.services).split(',').map((s: string) => s.trim());
    const now = order.timestamp || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const parsedItems: InvoiceLineItem[] = servicesList.map((s: string) => parseServiceString(s));

    let computedSubtotal = parsedItems.reduce((acc: number, item: any) => acc + item.amount, 0);
    const parsedTotal = parseFloat(order.total) || 0;

    // Auto-fix for orders from App where items might not have price strings
    if (computedSubtotal === 0 && parsedTotal > 0 && parsedItems.length > 0) {
      parsedItems[0].amount = parsedTotal;
      parsedItems[0].rate = parsedTotal;
      computedSubtotal = parsedTotal;
    }

    const subtotal = (order.subtotal && order.subtotal > 0) ? order.subtotal : computedSubtotal;
    const diff = subtotal - parsedTotal;

    let adjustmentRow = '';
    if (diff > 0 && Math.abs(diff) > 0.01) {
      let label = 'DISCOUNT / ADJUSTMENT';
      if (order.discount && parseFloat(order.discount) > 0) {
        label = `DISCOUNT (${order.discount}%)`;
      } else if (order.totalMode === 'adjustment') {
        label = 'ADJUSTMENT';
      } else if (order.totalMode === 'override') {
        label = 'MANUAL OVERRIDE';
      }
      adjustmentRow = `<div class="row"><span>${label}</span><span class="bold">-₹${diff.toFixed(0)}</span></div>`;
    } else if (diff < 0 && Math.abs(diff) > 0.01) {
      adjustmentRow = `<div class="row"><span>EXTRA CHARGES</span><span class="bold">+₹${Math.abs(diff).toFixed(0)}</span></div>`;
    }

    const rows = parsedItems.map((item: any, idx: number) =>
      `<tr>
        <td style="padding:6px 0; font-size: 13px;">${idx + 1}. ${item.name}</td>
        <td style="padding:6px 0; text-align:center;">${item.qty}</td>
        <td style="padding:6px 0; text-align:right;">${item.rate}</td>
        <td style="padding:6px 0; text-align:right; font-weight: bold;">${item.amount}</td>
      </tr>`
    ).join('');

    const w = window.open('', '_blank', 'width=302,height=900,scrollbars=yes');
    if (!w) return;

    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Receipt-${order.id} (v6.0.0)</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { 
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
    font-size: 14px; 
    color: #000; 
    background: #fff; 
    width: 72mm; 
    padding: 12px; 
    margin: 0; 
    line-height: 1.4;
  }
  .center { text-align: center; }
  .bold { font-weight: 700; }
  .dash { border-top: 1px dashed #000; margin: 12px 0; }
  .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
  .row span:last-child { text-align: right; max-width: 60%; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  td, th { vertical-align: top; padding: 6px 0; }
  th { font-weight: 700; border-bottom: 1px solid #000; padding-bottom: 8px; }
  td { border-bottom: 1px dotted #ccc; }
  .total-box { border: 1px solid #000; padding: 10px; margin: 15px 0; display: flex; justify-content: space-between; font-size: 16px; align-items: center; }
  @media print { body { width: 72mm; margin: 0; padding: 10px; } }
</style></head><body>

  <div class="center" style="margin-bottom:15px;">
    ${logoBase64 ? `<img src="${logoBase64}" style="width:140px;height:auto;margin-bottom:8px;filter:grayscale(1) contrast(2);" alt="LB" />` : ''}
    <div style="font-size:14px; color: #333;">Ph: +91 96442 54425</div>
  </div>
  
  <div class="dash"></div>
  <div class="center bold" style="font-size: 15px; letter-spacing: 1px;">*** INVOICE / RECEIPT ***</div>
  <div class="dash"></div>

  <div class="row"><span>Order ID</span><span class="bold" style="font-size: 15px;">${order.id}</span></div>
  <div class="row"><span>Date</span><span>${now}</span></div>
  <div class="row"><span>Source</span><span>${order.source || 'Walk-in'}</span></div>
  ${order.assignedRiderId ? `<div class="row"><span>Rider ID</span><span class="bold">${order.assignedRiderId}</span></div>` : ''}
  
  <div class="dash"></div>
  <div class="bold" style="margin-bottom:4px; font-size: 14px;">CUSTOMER</div>
  <div style="margin-bottom: 2px;">${order.name}</div>
  <div style="margin-bottom: 2px;">+91 ${order.phone}</div>
  <div style="font-size:13px; color: #444;">${order.address || 'Store Walk-in'}</div>
  
  <div class="dash"></div>
  <div class="bold" style="margin-bottom:6px; font-size: 14px;">ORDER ITEMS</div>
  <table>
    <thead>
      <tr>
        <th style="text-align:left; width: 45%;">Item</th>
        <th style="text-align:center; width: 15%;">Qty</th>
        <th style="text-align:right; width: 15%;">Rate</th>
        <th style="text-align:right; width: 25%;">Amt</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="row" style="margin-top: 10px;"><span>SUBTOTAL</span><span class="bold">₹${subtotal}</span></div>
  ${adjustmentRow}

  <div class="total-box">
    <span class="bold">TOTAL</span>
    <span class="bold" style="font-size: 18px;">₹${order.total}</span>
  </div>

  <div class="dash"></div>
  <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 10px 0;">
    <!-- Left Side: Scan & Pay QR -->
    <div style="flex: 0 0 46%; text-align: center;">
      <div class="bold" style="font-size: 9.5px; letter-spacing: 0.3px; text-transform: uppercase; margin-bottom: 4px; white-space: nowrap;">SCAN & PAY VIA UPI</div>
      <div style="display:flex; justify-content:center; align-items:center; margin: 2px auto;">
        <img id="qr-img" src="${qrBase64}" style="width:105px;height:105px;object-fit:contain;border-radius:6px;border:1px solid #ccc;padding:2px;" alt="UPI QR" />
      </div>
      <div style="font-size: 8px; color: #444; margin-top: 3px; font-weight: 700; white-space: nowrap;">GPay • PhonePe • UPI</div>
    </div>

    <!-- Right Side: Track & Book / Download App from Play Store -->
    <div style="flex: 1; min-width: 0; background-color: #dcfce7; padding: 10px 6px; text-align: center; border-radius: 8px; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 125px; border: 1px solid #bbf7d0;">
      <div style="font-size: 10px; font-weight: 900; color: #166534; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 6px; line-height: 1.2;">
        TRACK &amp; BOOK EASILY
      </div>
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; font-weight: bold; font-size: 11px; color: #166534; line-height: 1.3;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#166534" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 2px;">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        <span>Download App from</span>
        <span style="font-size: 11.5px; font-weight: 900;">Play Store</span>
      </div>
    </div>
  </div>
  
  <div class="dash"></div>
  <div class="center" style="margin-top:15px; font-size: 13px;">
    <div class="bold" style="margin-bottom: 2px;">Thank you for choosing</div>
    <div class="bold" style="font-size: 15px; margin-bottom: 8px;">Laundry Basket!</div>
    <div style="font-size: 11px; color: #666;">*** CUSTOMER COPY ***</div>
  </div>

<script>(function(){var img=document.getElementById('qr-img');var done=false;function go(){if(done)return;done=true;setTimeout(function(){window.print();},300);}if(img&&img.complete&&img.naturalWidth>0){go();}else if(img){img.onload=go;img.onerror=go;setTimeout(go,1500);}else{setTimeout(go,800);}})();<\/script>
</body></html>`);
    w.document.close();
  };

  const categorizedOrders = React.useMemo(() => ({
    pending: orders.filter((o: any) => o.status && ['pending', 'out for pickup', 'pickup done', 'delivered at store'].includes(o.status.toLowerCase())),
    processing: orders.filter((o: any) => o.status && ['washing', 'drying', 'ironing', 'processing'].includes(o.status.toLowerCase())),
    ready: orders.filter((o: any) => o.status && ['ready', 'out for delivery'].includes(o.status.toLowerCase())),
    // History shows ALL orders - sorted by date descending
    history: [...orders].sort((a: any, b: any) => {
      const dateA = a.order_date ? new Date(a.order_date).getTime() : 0;
      const dateB = b.order_date ? new Date(b.order_date).getTime() : 0;
      return dateB - dateA;
    })
  }), [orders]);

  const filteredPending = categorizedOrders.pending.filter((o: any) => {
    if (pendingFilter === 'All') return true;
    return o.status && o.status.toLowerCase() === pendingFilter.toLowerCase();
  });

  const filteredProcessing = categorizedOrders.processing.filter((o: any) => {
    if (processingFilter === 'All') return true;
    return o.status && o.status.toLowerCase() === processingFilter.toLowerCase();
  });

  const filteredReady = categorizedOrders.ready.filter((o: any) => {
    if (readyFilter === 'All') return true;
    return o.status && o.status.toLowerCase() === readyFilter.toLowerCase();
  });

  return (
    <div className="flex flex-col min-h-screen">
      {isOffline && (
        <div className="bg-red-600 text-white py-2 px-4 flex items-center justify-center space-x-2 animate-bounce sticky top-0 z-[100] shadow-lg">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 4.243a5 5 0 01-7.072 0m0 0l2.829-2.829m-4.243-4.243a9 9 0 0112.728 0m0 0l-2.829 2.829" />
          </svg>
          <span className="font-black uppercase tracking-widest text-xs">Connection Lost: Real-time updates paused</span>
        </div>
      )}
      <div className="manager-shell flex flex-1">
        {/* Notification Popup */}
        {notification && (
          <div className="fixed top-4 right-4 left-4 sm:left-auto sm:top-6 sm:right-6 z-[100] animate-in fade-in slide-in-from-right-10 duration-500">
            <div className="glass-card p-6 border-primary/30 shadow-2xl bg-white/90 backdrop-blur-xl max-w-sm">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl animate-bounce">
                  🔔
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-black uppercase tracking-widest text-primary mb-1">New Order Received!</h4>
                  <p className="text-lg font-bold leading-tight mb-2">#{notification.order.id} — ₹{notification.order.total}</p>
                  <p className="text-xs text-text-secondary font-medium mb-4">{notification.message}</p>
                  <div className="flex gap-2">
                    <button
                      className="btn-primary py-2 px-4 text-[10px] rounded-xl"
                      onClick={() => { setSelectedOrder(notification.order); setShowInvoiceModal(true); setNotification(null); }}
                    >
                      View Order
                    </button>
                    <button
                      className="glass py-2 px-4 text-[10px] rounded-xl"
                      onClick={() => setNotification(null)}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sidebar */}
        <aside className="manager-sidebar w-64 glass m-4 mr-0 p-6 flex flex-col gap-8">
          <div className="manager-brand flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 overflow-hidden bg-white">
              <img
                src="/manager/logo.png"
                alt="LB"
                className="w-full h-full object-contain p-1"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  target.style.display = 'none';
                  const badge = target.parentElement?.querySelector('.lb-fallback-badge') as HTMLElement | null;
                  if (badge) badge.style.display = 'flex';
                }}
              />
              <span className="lb-fallback-badge hidden w-full h-full items-center justify-center text-xs font-black text-primary">LB</span>
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight leading-tight uppercase">Branch Manager</h1>
              <p className="text-[9px] text-text-secondary font-black uppercase tracking-widest">Laundry Basket</p>
              <p className="text-[8px] text-text-secondary font-medium tracking-widest opacity-60">Unit of Everika</p>
            </div>
          </div>

          <nav className="manager-nav flex flex-col gap-2">
            <NavItem
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>}
              label="Live Orders"
              active={activeTab === 'orders'}
              onClick={() => setActiveTab('orders')}
            />
            <NavItem
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
              label="Today's Orders"
              active={activeTab === 'today'}
              onClick={() => setActiveTab('today')}
            />

            <NavItem
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>}
              label="Rider Fleet"
              active={activeTab === 'riders'}
              onClick={() => setActiveTab('riders')}
            />
            <NavItem
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m3 5h2M9 11h2m3 4h2M9 15h2" /></svg>}
              label="Rate List"
              active={activeTab === 'rates'}
              onClick={() => setActiveTab('rates')}
            />
            <NavItem
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
              label="History & Earnings"
              active={activeTab === 'earnings'}
              onClick={() => setActiveTab('earnings')}
            />
            <NavItem
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>}
              label="Source Reports"
              active={activeTab === 'source-reports'}
              onClick={() => setActiveTab('source-reports')}
            />
            <NavItem
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" /></svg>}
              label="Business Statistics"
              active={activeTab === 'business-stats'}
              onClick={() => setActiveTab('business-stats')}
            />
            <NavItem
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
              label="Inventory"
              active={activeTab === 'inventory'}
              onClick={() => setActiveTab('inventory')}
            />
            <NavItem
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
              label="Support"
              active={activeTab === 'support'}
              onClick={() => setActiveTab('support')}
            />
            <NavItem
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>}
              label="Reviews"
              active={activeTab === 'reviews'}
              onClick={() => setActiveTab('reviews')}
            />
          </nav>

          <div className="manager-branch-card mt-auto glass-card p-4 bg-primary/10 border-primary/20">
            <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Active Branch</p>
            <p className="text-sm font-bold truncate">{storeName}</p>
            <button
              className="mt-3 w-full bg-white/60 py-2 font-black text-red-500 hover:bg-red-500/10 transition-all rounded-xl flex items-center justify-center gap-2 shadow-sm"
              onClick={() => { localStorage.clear(); window.location.href = '/manager/login'; }}
            >
              Logout 🚪
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="manager-main flex-1 p-8 overflow-y-auto min-w-0">
          <header className="manager-header flex justify-between items-center mb-10">
            <div>
              <h2 className="manager-page-title text-4xl font-black tracking-tight">
                {activeTab === 'source-reports' ? 'Source Reports & Marketing ROI' : 'Store Operations'}
              </h2>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                {activeTab === 'source-reports' ? (
                  <span className="bg-purple-500/10 text-purple-700 text-[10px] font-black px-2 py-1 rounded-full uppercase">Channel Attribution & Conversion Analytics</span>
                ) : (
                  <span className="bg-red-500/10 text-red-600 text-[10px] font-black px-2 py-1 rounded-full uppercase">{categorizedOrders.pending.length} Pending Pickups</span>
                )}
                <span className="text-text-secondary text-xs font-medium uppercase tracking-widest">Manager ID: {managerId}</span>
              </div>
            </div>
            <div className="manager-header-actions flex items-center gap-6">
              <div className="flex items-center gap-2 bg-green-500/10 px-4 py-2 rounded-xl border border-green-500/20">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-glow shadow-green-500/50"></span>
                <span className="text-[9px] font-black uppercase tracking-widest text-green-600">Cloud Sync Active</span>
              </div>
              {activeTab === 'earnings' && (
                <label className="glass px-6 py-4 rounded-2xl flex items-center gap-2 cursor-pointer hover:bg-white/60 transition-all">
                  <span className="text-xl">📊</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Import History (.xlsx)</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".xlsx, .xls"
                    onChange={handleImportExcel}
                  />
                </label>
              )}

              {activeTab === 'inventory' && (
                <div className="manager-action-group flex gap-3">
                  <button 
                    className="glass hover:bg-white/60 px-6 py-4 rounded-2xl flex items-center gap-2 text-text-primary font-black border border-black/5 shadow-sm transition-all"
                    onClick={exportInventoryExcel}
                    title="Export Detailed Inventory & Stock Request Report in Excel"
                  >
                    <span>📊</span> Export Excel Report
                  </button>
                  <button className="btn-primary bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 border-none shadow-lg shadow-indigo-500/25 px-6 py-4 rounded-2xl flex items-center gap-2 text-white font-black" onClick={() => {
                    setStockRequestForm({ item: '', quantity: '', unit: 'kg', notes: '' });
                    setShowStockRequestModal(true);
                  }}>
                    <span>📨</span> Request Stock
                  </button>
                  <button className="btn-primary shadow-lg shadow-primary/20 px-6 py-4 rounded-2xl flex items-center gap-2" onClick={() => {
                    setInventoryForm({ item: '', quantity: '', unit: '' });
                    setShowInventoryModal(true);
                  }}>
                    <span>+</span> Update Inventory
                  </button>
                </div>
              )}
              {(activeTab === 'orders' || activeTab === 'today') && (
                <button className="btn-primary shadow-lg shadow-primary/20 px-6 py-4 rounded-2xl flex items-center gap-2" onClick={() => setShowWalkinModal(true)}>
                  <span className="text-xl">+</span> Walk-in
                </button>
              )}
              <button 
                className="btn-primary bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 border-none shadow-lg shadow-emerald-500/20 px-5 py-4 rounded-2xl flex items-center gap-2 text-white font-black text-xs uppercase tracking-wider transition-all"
                onClick={() => setShowEODModal(true)}
                title="View & Export End of Day Graphic Report"
              >
                <span className="text-base">📊</span> Export EOD Report
              </button>
            </div>
          </header>

          {activeTab === 'orders' && (
            <div className="manager-kanban-grid grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              <KanbanColumn
                title="New Orders"
                count={filteredPending.length}
                color="orange"
                filterElement={
                  <div className="flex flex-wrap gap-1.5">
                    {(['All', 'Pending', 'Out for Pickup', 'Pickup done', 'Delivered at store'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setPendingFilter(f)}
                        className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${
                          pendingFilter === f
                            ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                            : 'bg-white/50 border-black/5 hover:border-orange-500/25 text-text-secondary'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                }
              >
                {filteredPending.map(o => (
                  <OrderCard
                    key={o.id}
                    order={o}
                    riders={riders}
                    onAssign={(rId: string) => assignRider(o.id, rId)}
                    onUpdate={(s: string) => updateStatus(o.id, s)}
                    onView={() => { setSelectedOrder(o); setShowInvoiceModal(true); }}
                    onPrint={() => printThermal(o)}
                    onPdf={() => downloadPDF(o)}
                    onWhatsApp={() => openWhatsAppOptions(o)}
                    onEdit={() => handleStartEditOrder(o)}
                  />
                ))}
              </KanbanColumn>

              <KanbanColumn
                title="In Process"
                count={filteredProcessing.length}
                color="blue"
                filterElement={
                  <div className="flex flex-wrap gap-1.5">
                    {(['All', 'Processing', 'Washing', 'Drying', 'Ironing'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setProcessingFilter(f)}
                        className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${
                          processingFilter === f
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white/50 border-black/5 hover:border-blue-600/25 text-text-secondary'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                }
              >
                {filteredProcessing.map(o => (
                  <OrderCard
                    key={o.id}
                    order={o}
                    riders={riders}
                    onAssign={(rId: string) => assignRider(o.id, rId)}
                    onUpdate={(s: string) => updateStatus(o.id, s)}
                    onView={() => { setSelectedOrder(o); setShowInvoiceModal(true); }}
                    onPrint={() => printThermal(o)}
                    onPdf={() => downloadPDF(o)}
                    onWhatsApp={() => openWhatsAppOptions(o)}
                    onEdit={() => handleStartEditOrder(o)}
                  />
                ))}
              </KanbanColumn>

              <KanbanColumn
                title="Ready / Delivery"
                count={filteredReady.length}
                color="blue"
                filterElement={
                  <div className="flex flex-wrap gap-1.5">
                    {(['All', 'Ready', 'Out for Delivery'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setReadyFilter(f)}
                        className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${
                          readyFilter === f
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white/50 border-black/5 hover:border-blue-600/25 text-text-secondary'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                }
              >
                {filteredReady.map(o => (
                  <OrderCard
                    key={o.id}
                    order={o}
                    riders={riders}
                    onAssign={(rId: string) => assignRider(o.id, rId)}
                    onUpdate={(s: string) => updateStatus(o.id, s)}
                    onView={() => { setSelectedOrder(o); setShowInvoiceModal(true); }}
                    onPrint={() => printThermal(o)}
                    onPdf={() => downloadPDF(o)}
                    onWhatsApp={() => openWhatsAppOptions(o)}
                    onEdit={() => handleStartEditOrder(o)}
                  />
                ))}
              </KanbanColumn>
            </div>
          )}

          {activeTab === 'earnings' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="manager-section-header flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-4xl font-black tracking-tight">Order History</h3>
                  <p className="text-text-secondary text-sm mt-1">All orders for this branch — live &amp; imported from Excel</p>
                </div>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Search orders (ID, Name, Phone, Items, Service, Status, Pickup Person...)" 
                    className="glass px-6 py-3 text-xs outline-none focus:border-primary/40 transition-all rounded-2xl w-96 max-w-full font-bold"
                    onChange={(e) => { setOrderSearch(e.target.value); setHistoryPage(1); }}
                  />
                </div>
              </div>

              {/* Summary KPI Strip */}
              {(() => {
                const historyOrders = categorizedOrders.history || [];
                const totalDeliveryCharges = historyOrders.reduce((sum: number, o: any) => sum + (Number(o.deliveryFee || o.delivery_charges || 0)), 0);
                const thirdPartyCount = historyOrders.filter((o: any) => !!o.paidTo3rdPartyRider).length;
                const thirdPartyCharges = historyOrders.reduce((sum: number, o: any) => o.paidTo3rdPartyRider ? sum + (Number(o.deliveryFee || o.delivery_charges || 0)) : sum, 0);

                return (
                  <div className="manager-kpi-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
                    <div className="glass-card p-3.5 border-primary/10">
                      <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary mb-1">Total Orders</p>
                      <p className="text-xl font-black text-text-primary">{orderSummary.totalOrders.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="glass-card p-3.5 border-orange-500/10">
                      <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary mb-1">Pending Payments</p>
                      <p className="text-xl font-black text-orange-500">₹{orderSummary.pendingPayments.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="glass-card p-3.5 border-green-500/10">
                      <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary mb-1">Received Amount</p>
                      <p className="text-xl font-black text-green-600">₹{orderSummary.receivedAmount.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="glass-card p-3.5 border-blue-500/10 bg-blue-500/[0.02]">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[9px] font-black uppercase tracking-widest text-blue-700">🚚 Delivery Charges</p>
                      </div>
                      <p className="text-xl font-black text-blue-700">₹{totalDeliveryCharges.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="glass-card p-3.5 border-purple-500/10 bg-purple-500/[0.02]">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[9px] font-black uppercase tracking-widest text-purple-700">🛵 Paid to 3rd Party</p>
                        <span className="text-[8px] font-black bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded-full">{thirdPartyCount} orders</span>
                      </div>
                      <p className="text-xl font-black text-purple-700">₹{thirdPartyCharges.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="glass-card p-3.5 border-red-500/10">
                      <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary mb-1">High Risk Orders</p>
                      <p className="text-xl font-black text-red-500">{orderSummary.highRiskOrders.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                );
              })()}

              {/* Marketing Acquisition Source Breakdown Strip */}
              {(() => {
                const historyOrders = categorizedOrders.history || [];
                const npCount = historyOrders.filter((o: any) => o.sourceSegment === 'NP').length;
                const smCount = historyOrders.filter((o: any) => o.sourceSegment === 'SM' || o.source === 'WhatsApp').length;
                const rfCount = historyOrders.filter((o: any) => o.sourceSegment === 'RF' || o.source === 'Walk-in').length;
                const wsCount = historyOrders.filter((o: any) => o.sourceSegment === 'WS' || o.source === 'Web' || o.source === 'Website').length;
                const apCount = historyOrders.filter((o: any) => o.sourceSegment === 'AP' || o.source === 'App').length;

                return (
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-white/40 glass p-3.5 rounded-2xl border border-black/5 mb-6">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-black uppercase text-text-secondary tracking-wider mr-1">📍 Source Tracking:</span>
                      <button
                        onClick={() => { setHistorySourceFilter('All'); setHistoryPage(1); }}
                        className={`text-[10px] font-black px-3 py-1.5 rounded-xl transition-all cursor-pointer border ${
                          historySourceFilter === 'All'
                            ? 'bg-primary text-white border-primary shadow-sm scale-105'
                            : 'bg-white/70 text-text-secondary hover:bg-white border-black/5'
                        }`}
                      >
                        All Sources ({historyOrders.length})
                      </button>
                      <button
                        onClick={() => { setHistorySourceFilter('NP'); setHistoryPage(1); }}
                        className={`text-[10px] font-black px-3 py-1.5 rounded-xl transition-all cursor-pointer border ${
                          historySourceFilter === 'NP'
                            ? 'bg-amber-500 text-white border-amber-600 shadow-sm scale-105'
                            : 'bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border-amber-500/30'
                        }`}
                      >
                        📰 NewsPaper NP ({npCount})
                      </button>
                      <button
                        onClick={() => { setHistorySourceFilter('SM'); setHistoryPage(1); }}
                        className={`text-[10px] font-black px-3 py-1.5 rounded-xl transition-all cursor-pointer border ${
                          historySourceFilter === 'SM'
                            ? 'bg-pink-600 text-white border-pink-700 shadow-sm scale-105'
                            : 'bg-pink-500/10 text-pink-700 hover:bg-pink-500/20 border-pink-500/30'
                        }`}
                      >
                        💬 Social/WA SM ({smCount})
                      </button>
                      <button
                        onClick={() => { setHistorySourceFilter('RF'); setHistoryPage(1); }}
                        className={`text-[10px] font-black px-3 py-1.5 rounded-xl transition-all cursor-pointer border ${
                          historySourceFilter === 'RF'
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm scale-105'
                            : 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 border-emerald-500/30'
                        }`}
                      >
                        🚶 Walk-in/Ref RF ({rfCount})
                      </button>
                      <button
                        onClick={() => { setHistorySourceFilter('WS'); setHistoryPage(1); }}
                        className={`text-[10px] font-black px-3 py-1.5 rounded-xl transition-all cursor-pointer border ${
                          historySourceFilter === 'WS'
                            ? 'bg-cyan-600 text-white border-cyan-700 shadow-sm scale-105'
                            : 'bg-cyan-500/10 text-cyan-700 hover:bg-cyan-500/20 border-cyan-500/30'
                        }`}
                      >
                        🌐 Website WS ({wsCount})
                      </button>
                      <button
                        onClick={() => { setHistorySourceFilter('AP'); setHistoryPage(1); }}
                        className={`text-[10px] font-black px-3 py-1.5 rounded-xl transition-all cursor-pointer border ${
                          historySourceFilter === 'AP'
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm scale-105'
                            : 'bg-indigo-500/10 text-indigo-700 hover:bg-indigo-500/20 border-indigo-500/30'
                        }`}
                      >
                        📱 Customer App AP ({apCount})
                      </button>
                    </div>
                    {/* Column Filters Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white/60 glass p-3.5 rounded-2xl border border-black/5 mb-4 shadow-xs">
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="text-[11px] font-black uppercase text-text-secondary tracking-wider flex items-center gap-1 mr-1">
                          🔍 Filters:
                        </span>

                        {/* Account Type Filter */}
                        <div className="flex items-center gap-1 bg-white/80 border border-black/10 rounded-xl px-2.5 py-1.5 shadow-xs">
                          <span className="text-[10px] font-bold text-text-secondary">Type:</span>
                          <select
                            value={historyAccountTypeFilter}
                            onChange={(e) => { setHistoryAccountTypeFilter(e.target.value); setHistoryPage(1); }}
                            className="bg-transparent text-[11px] font-black text-text-primary outline-none cursor-pointer"
                          >
                            <option value="All">All Types</option>
                            <option value="Residential">Residential</option>
                            <option value="Business">Business</option>
                          </select>
                        </div>

                        {/* Service Type Filter */}
                        <div className="flex items-center gap-1 bg-white/80 border border-black/10 rounded-xl px-2.5 py-1.5 shadow-xs">
                          <span className="text-[10px] font-bold text-text-secondary">Service:</span>
                          <select
                            value={historyServiceFilter}
                            onChange={(e) => { setHistoryServiceFilter(e.target.value); setHistoryPage(1); }}
                            className="bg-transparent text-[11px] font-black text-text-primary outline-none cursor-pointer"
                          >
                            <option value="All">All Services</option>
                            <option value="Wash & Iron">Wash & Iron</option>
                            <option value="Dry Clean">Dry Clean</option>
                            <option value="Steam Iron">Steam Iron / Ironing</option>
                            <option value="Wash Only">Wash Only</option>
                          </select>
                        </div>

                        {/* Status Filter */}
                        <div className="flex items-center gap-1 bg-white/80 border border-black/10 rounded-xl px-2.5 py-1.5 shadow-xs">
                          <span className="text-[10px] font-bold text-text-secondary">Status:</span>
                          <select
                            value={historyStatusFilter}
                            onChange={(e) => { setHistoryStatusFilter(e.target.value); setHistoryPage(1); }}
                            className="bg-transparent text-[11px] font-black text-text-primary outline-none cursor-pointer"
                          >
                            <option value="All">All Statuses</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Processing">Processing</option>
                            <option value="Pending">Pending</option>
                            <option value="Pickup done">Pickup Done</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </div>

                        {/* Payment Status Filter */}
                        <div className="flex items-center gap-1 bg-white/80 border border-black/10 rounded-xl px-2.5 py-1.5 shadow-xs">
                          <span className="text-[10px] font-bold text-text-secondary">Payment:</span>
                          <select
                            value={historyPaymentStatusFilter}
                            onChange={(e) => { setHistoryPaymentStatusFilter(e.target.value); setHistoryPage(1); }}
                            className="bg-transparent text-[11px] font-black text-text-primary outline-none cursor-pointer"
                          >
                            <option value="All">All Payments</option>
                            <option value="Received">Received</option>
                            <option value="Pending">Pending</option>
                          </select>
                        </div>

                        {/* Payment Mode Filter */}
                        <div className="flex items-center gap-1 bg-white/80 border border-black/10 rounded-xl px-2.5 py-1.5 shadow-xs">
                          <span className="text-[10px] font-bold text-text-secondary">Mode:</span>
                          <select
                            value={historyPaymentModeFilter}
                            onChange={(e) => { setHistoryPaymentModeFilter(e.target.value); setHistoryPage(1); }}
                            className="bg-transparent text-[11px] font-black text-text-primary outline-none cursor-pointer"
                          >
                            <option value="All">All Modes</option>
                            <option value="Cash">Cash</option>
                            <option value="Online QR">Online QR</option>
                            <option value="UPI">UPI</option>
                            <option value="Card">Card</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Not Set">Not Set</option>
                          </select>
                        </div>

                        {/* Delivery Charges / 3rd Party Filter */}
                        <div className="flex items-center gap-1 bg-white/80 border border-black/10 rounded-xl px-2.5 py-1.5 shadow-xs">
                          <span className="text-[10px] font-bold text-text-secondary">Delivery:</span>
                          <select
                            value={historyDeliveryFilter}
                            onChange={(e) => { setHistoryDeliveryFilter(e.target.value); setHistoryPage(1); }}
                            className="bg-transparent text-[11px] font-black text-text-primary outline-none cursor-pointer"
                          >
                            <option value="All">All Deliveries</option>
                            <option value="HasDelivery">With Delivery Charge</option>
                            <option value="ThirdParty">🛵 Paid to 3rd Party</option>
                            <option value="StorePickup">Free / No Delivery Charge</option>
                          </select>
                        </div>

                        {/* Order Date Filter */}
                        <div className="flex items-center gap-1 bg-white/80 border border-black/10 rounded-xl px-2.5 py-1.5 shadow-xs">
                          <span className="text-[10px] font-bold text-text-secondary">Date:</span>
                          <input
                            type="date"
                            value={historyDateFilter}
                            onChange={(e) => { setHistoryDateFilter(e.target.value); setHistoryPage(1); }}
                            className="bg-transparent text-[11px] font-black text-text-primary outline-none cursor-pointer"
                          />
                          {historyDateFilter && (
                            <button
                              onClick={() => { setHistoryDateFilter(''); setHistoryPage(1); }}
                              className="text-[10px] text-red-500 font-bold hover:text-red-700 ml-1"
                              title="Clear Date"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Clear All Column Filters */}
                      {(historyAccountTypeFilter !== 'All' || historyServiceFilter !== 'All' || historyStatusFilter !== 'All' || historyPaymentStatusFilter !== 'All' || historyPaymentModeFilter !== 'All' || historyDeliveryFilter !== 'All' || historyDateFilter !== '' || orderSearch !== '' || historySourceFilter !== 'All') && (
                        <button
                          onClick={() => {
                            setHistoryAccountTypeFilter('All');
                            setHistoryServiceFilter('All');
                            setHistoryStatusFilter('All');
                            setHistoryPaymentStatusFilter('All');
                            setHistoryPaymentModeFilter('All');
                            setHistoryDeliveryFilter('All');
                            setHistoryDateFilter('');
                            setOrderSearch('');
                            setHistorySourceFilter('All');
                            setHistoryPage(1);
                          }}
                          className="text-[11px] font-black text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1"
                        >
                          Reset All Filters ✕
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="glass overflow-x-auto rounded-3xl border border-black/5">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[8px] font-black uppercase tracking-widest">
                      <th colSpan={4} className="px-4 pt-4 pb-2 bg-blue-500/10 text-blue-700 border-r-2 border-white/60 text-center">👤 Customer Details</th>
                      <th colSpan={5} className="px-4 pt-4 pb-2 bg-violet-500/10 text-violet-700 border-r-2 border-white/60 text-center">📦 Order &amp; Item Details</th>
                      <th colSpan={4} className="px-4 pt-4 pb-2 bg-emerald-500/10 text-emerald-700 border-r-2 border-white/60 text-center">💳 Payment &amp; Amount</th>
                      <th colSpan={1} className="px-4 pt-4 pb-2 bg-red-500/10 text-red-700 text-center">⚡ Actions</th>
                    </tr>
                    <tr className="border-b-2 border-black/5 text-[9px] font-black uppercase tracking-widest text-text-secondary">
                      <th className="px-4 py-3 whitespace-nowrap bg-blue-500/5">Customer ID</th>
                      <th className="px-4 py-3 whitespace-nowrap bg-blue-500/5">CX Name</th>
                      <th className="px-4 py-3 whitespace-nowrap bg-blue-500/5">
                        <div className="flex items-center gap-1">
                          <span>Account Type</span>
                          <select
                            value={historyAccountTypeFilter}
                            onChange={(e) => { setHistoryAccountTypeFilter(e.target.value); setHistoryPage(1); }}
                            className="bg-white/80 border border-black/10 rounded px-1 py-0.5 text-[8.5px] font-black text-text-primary outline-none cursor-pointer"
                            title="Filter Account Type"
                          >
                            <option value="All">All</option>
                            <option value="Residential">Res</option>
                            <option value="Business">Biz</option>
                          </select>
                        </div>
                      </th>
                      <th className="px-4 py-3 whitespace-nowrap bg-blue-500/5 border-r border-black/8">Mobile No.</th>
                      <th className="px-4 py-3 whitespace-nowrap bg-violet-500/5">
                        <div className="flex items-center gap-1">
                          <span>Order Date</span>
                          {historyDateFilter && (
                            <span className="w-2 h-2 rounded-full bg-violet-600" title={`Filtered: ${historyDateFilter}`}></span>
                          )}
                        </div>
                      </th>
                      <th className="px-4 py-3 whitespace-nowrap bg-violet-500/5">Items Ordered</th>
                      <th className="px-4 py-3 whitespace-nowrap bg-violet-500/5">Qty</th>
                      <th className="px-4 py-3 whitespace-nowrap bg-violet-500/5">
                        <div className="flex items-center gap-1">
                          <span>Service Type</span>
                          <select
                            value={historyServiceFilter}
                            onChange={(e) => { setHistoryServiceFilter(e.target.value); setHistoryPage(1); }}
                            className="bg-white/80 border border-black/10 rounded px-1 py-0.5 text-[8.5px] font-black text-text-primary outline-none cursor-pointer max-w-[80px]"
                            title="Filter Service"
                          >
                            <option value="All">All</option>
                            <option value="Wash & Iron">Wash & Iron</option>
                            <option value="Dry Clean">Dry Clean</option>
                            <option value="Steam Iron">Ironing</option>
                            <option value="Wash Only">Wash Only</option>
                          </select>
                        </div>
                      </th>
                      <th className="px-4 py-3 whitespace-nowrap bg-violet-500/5 border-r border-black/8">
                        <div className="flex items-center gap-1">
                          <span>Status</span>
                          <select
                            value={historyStatusFilter}
                            onChange={(e) => { setHistoryStatusFilter(e.target.value); setHistoryPage(1); }}
                            className="bg-white/80 border border-black/10 rounded px-1 py-0.5 text-[8.5px] font-black text-text-primary outline-none cursor-pointer max-w-[80px]"
                            title="Filter Status"
                          >
                            <option value="All">All</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Processing">Processing</option>
                            <option value="Pending">Pending</option>
                            <option value="Pickup done">Pickup Done</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </div>
                      </th>
                      <th className="px-4 py-3 whitespace-nowrap bg-emerald-500/5">Total Amount</th>
                      <th className="px-4 py-3 whitespace-nowrap bg-emerald-500/5">
                        <div className="flex items-center gap-1">
                          <span>Delivery Fee</span>
                          <select
                            value={historyDeliveryFilter}
                            onChange={(e) => { setHistoryDeliveryFilter(e.target.value); setHistoryPage(1); }}
                            className="bg-white/80 border border-black/10 rounded px-1 py-0.5 text-[8.5px] font-black text-text-primary outline-none cursor-pointer max-w-[65px]"
                            title="Filter Delivery Charge"
                          >
                            <option value="All">All</option>
                            <option value="HasDelivery">₹ Fee</option>
                            <option value="ThirdParty">🛵 3rd Pty</option>
                            <option value="StorePickup">Free</option>
                          </select>
                        </div>
                      </th>
                      <th className="px-4 py-3 whitespace-nowrap bg-emerald-500/5">
                        <div className="flex items-center gap-1">
                          <span>Payment Status</span>
                          <select
                            value={historyPaymentStatusFilter}
                            onChange={(e) => { setHistoryPaymentStatusFilter(e.target.value); setHistoryPage(1); }}
                            className="bg-white/80 border border-black/10 rounded px-1 py-0.5 text-[8.5px] font-black text-text-primary outline-none cursor-pointer"
                            title="Filter Payment Status"
                          >
                            <option value="All">All</option>
                            <option value="Received">Received</option>
                            <option value="Pending">Pending</option>
                          </select>
                        </div>
                      </th>
                      <th className="px-4 py-3 whitespace-nowrap bg-emerald-500/5 border-r border-black/8">
                        <div className="flex items-center gap-1">
                          <span>Mode</span>
                          <select
                            value={historyPaymentModeFilter}
                            onChange={(e) => { setHistoryPaymentModeFilter(e.target.value); setHistoryPage(1); }}
                            className="bg-white/80 border border-black/10 rounded px-1 py-0.5 text-[8.5px] font-black text-text-primary outline-none cursor-pointer max-w-[70px]"
                            title="Filter Mode"
                          >
                            <option value="All">All</option>
                            <option value="Cash">Cash</option>
                            <option value="Online QR">Online QR</option>
                            <option value="UPI">UPI</option>
                            <option value="Card">Card</option>
                            <option value="Bank Transfer">Bank</option>
                            <option value="Not Set">Not Set</option>
                          </select>
                        </div>
                      </th>
                      <th className="px-4 py-3 whitespace-nowrap bg-red-500/5">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      if (loading) {
                        return Array.from({ length: 6 }).map((_, i) => (
                          <tr key={`skeleton-hist-${i}`} className="border-b border-black/5 animate-pulse">
                            <td className="px-4 py-3"><div className="h-4 bg-black/10 rounded w-16"></div></td>
                            <td className="px-4 py-3"><div className="h-4 bg-black/10 rounded w-24"></div></td>
                            <td className="px-4 py-3"><div className="h-4 bg-black/10 rounded w-16"></div></td>
                            <td className="px-4 py-3"><div className="h-4 bg-black/10 rounded w-20"></div></td>
                            <td className="px-4 py-3"><div className="h-4 bg-black/10 rounded w-20"></div></td>
                            <td className="px-4 py-3"><div className="h-4 bg-black/10 rounded w-32"></div></td>
                            <td className="px-4 py-3"><div className="h-4 bg-black/10 rounded w-8"></div></td>
                            <td className="px-4 py-3"><div className="h-4 bg-black/10 rounded w-20"></div></td>
                            <td className="px-4 py-3"><div className="h-4 bg-black/10 rounded w-16"></div></td>
                            <td className="px-4 py-3"><div className="h-4 bg-black/10 rounded w-16"></div></td>
                            <td className="px-4 py-3"><div className="h-4 bg-black/10 rounded w-20"></div></td>
                            <td className="px-4 py-3"><div className="h-4 bg-black/10 rounded w-24"></div></td>
                            <td className="px-4 py-3"><div className="h-4 bg-black/10 rounded w-20"></div></td>
                            <td className="px-4 py-3"><div className="h-4 bg-black/10 rounded w-16"></div></td>
                          </tr>
                        ));
                      }

                      const query = orderSearch.toLowerCase();
                      const filtered = categorizedOrders.history.filter((o: any) => {
                        // 1. Source Filter Check
                        if (historySourceFilter !== 'All') {
                          const seg = o.sourceSegment || (o.source === 'WhatsApp' ? 'SM' : o.source === 'App' ? 'AP' : o.source === 'Walk-in' ? 'RF' : o.source === 'Web' ? 'WS' : 'RF');
                          if (seg !== historySourceFilter) return false;
                        }

                        // 2. Account Type Filter Check
                        if (historyAccountTypeFilter !== 'All') {
                          const cxType = o.cx_type || (o.source === 'Business' ? 'Business' : 'Residential');
                          if (cxType.toLowerCase() !== historyAccountTypeFilter.toLowerCase()) return false;
                        }

                        // 3. Service Type Filter Check
                        if (historyServiceFilter !== 'All') {
                          const servStr = (o.service_type || (Array.isArray(o.services) ? o.services.join(' ') : String(o.services || ''))).toLowerCase();
                          if (historyServiceFilter === 'Wash & Iron') {
                            if (!servStr.includes('wash') || !servStr.includes('iron')) return false;
                          } else if (historyServiceFilter === 'Dry Clean') {
                            if (!servStr.includes('dry') && !servStr.includes('clean')) return false;
                          } else if (historyServiceFilter === 'Steam Iron') {
                            if (!servStr.includes('iron') && !servStr.includes('steam')) return false;
                          } else if (historyServiceFilter === 'Wash Only') {
                            if (!servStr.includes('wash')) return false;
                          } else if (!servStr.includes(historyServiceFilter.toLowerCase())) {
                            return false;
                          }
                        }

                        // 4. Status Filter Check
                        if (historyStatusFilter !== 'All') {
                          const st = (o.status || 'Pending').toLowerCase();
                          const targetSt = historyStatusFilter.toLowerCase();
                          if (targetSt === 'delivered') {
                            if (!st.includes('deliver') && !st.includes('complete')) return false;
                          } else if (!st.includes(targetSt)) {
                            return false;
                          }
                        }

                        // 5. Payment Status Filter Check
                        if (historyPaymentStatusFilter !== 'All') {
                          const rawPaySt = o.paymentStatus || o.payment_status || (Number(o.pending_amount || 0) > 0 ? 'Pending' : (Number(o.received_amount || 0) > 0 ? 'Received' : 'Pending'));
                          const paySt = String(rawPaySt).toLowerCase().includes('received') ? 'Received' : 'Pending';
                          if (paySt !== historyPaymentStatusFilter) return false;
                        }

                        // 6. Payment Mode Filter Check
                        if (historyPaymentModeFilter !== 'All') {
                          const rawPaySt = o.paymentStatus || o.payment_status || (Number(o.pending_amount || 0) > 0 ? 'Pending' : (Number(o.received_amount || 0) > 0 ? 'Received' : 'Pending'));
                          const paySt = String(rawPaySt).toLowerCase().includes('received') ? 'Received' : 'Pending';
                          const payMode = o.paymentMode || o.payment_mode || (paySt === 'Received' ? 'Cash' : 'Not Set');
                          if (payMode.toLowerCase() !== historyPaymentModeFilter.toLowerCase()) return false;
                        }

                        // 6b. Delivery Charges & 3rd Party Filter Check
                        if (historyDeliveryFilter !== 'All') {
                          const delFee = Number(o.deliveryFee || o.delivery_charges || 0);
                          const is3rdParty = !!o.paidTo3rdPartyRider;
                          if (historyDeliveryFilter === 'HasDelivery' && delFee <= 0) return false;
                          if (historyDeliveryFilter === 'ThirdParty' && !is3rdParty) return false;
                          if (historyDeliveryFilter === 'StorePickup' && delFee > 0) return false;
                        }

                        // 7. Order Date Filter Check
                        if (historyDateFilter) {
                          const oDate = String(o.order_date || (o.timestamp ? o.timestamp.split(',')[0] : '')).trim();
                          // Support YYYY-MM-DD input comparison against DD/MM/YYYY or YYYY-MM-DD or readable strings
                          let dateMatches = false;
                          if (oDate.includes(historyDateFilter)) {
                            dateMatches = true;
                          } else {
                            const [y, m, d] = historyDateFilter.split('-');
                            if (d && m && y) {
                              const dInt = parseInt(d, 10);
                              const mInt = parseInt(m, 10);
                              // e.g. 15/01/2026 or 15/1/2026 or 15-01-2026
                              const pattern1 = `${d}/${m}/${y}`;
                              const pattern2 = `${dInt}/${mInt}/${y}`;
                              const pattern3 = `${d}-${m}-${y}`;
                              if (oDate.includes(pattern1) || oDate.includes(pattern2) || oDate.includes(pattern3)) {
                                dateMatches = true;
                              }
                            }
                          }
                          if (!dateMatches) return false;
                        }

                        // 8. Query Search Check
                        if (!query) return true;
                        const servicesMatch = o.services ? (Array.isArray(o.services) ? o.services.some((s: string) => s.toLowerCase().includes(query)) : String(o.services).toLowerCase().includes(query)) : false;
                        return (
                          (o.id && o.id.toLowerCase().includes(query)) ||
                          (o.customer_id && o.customer_id.toLowerCase().includes(query)) ||
                          (o.customer_name && o.customer_name.toLowerCase().includes(query)) ||
                          (o.name && o.name.toLowerCase().includes(query)) ||
                          (o.phone && o.phone.includes(query)) ||
                          (o.mobile_number && String(o.mobile_number).includes(query)) ||
                          (o.items_ordered && o.items_ordered.toLowerCase().includes(query)) ||
                          (o.service_type && o.service_type.toLowerCase().includes(query)) ||
                          servicesMatch ||
                          (o.order_date && String(o.order_date).toLowerCase().includes(query)) ||
                          (o.status && o.status.toLowerCase().includes(query)) ||
                          (o.timestamp && String(o.timestamp).toLowerCase().includes(query)) ||
                          (o.source && String(o.source).toLowerCase().includes(query)) ||
                          (o.sourceSegment && String(o.sourceSegment).toLowerCase().includes(query))
                        );
                      });
                      if (filtered.length === 0) return (
                        <tr><td colSpan={14} className="px-4 py-16 text-center text-text-secondary font-black uppercase tracking-widest text-xs">No orders found matching your search</td></tr>
                      );

                      const totalRows = filtered.length;
                      const totalPages = Math.ceil(totalRows / historyLimit) || 1;
                      const currentPage = Math.min(historyPage, totalPages);
                      const startIndex = (currentPage - 1) * historyLimit;
                      const endIndex = startIndex + historyLimit;
                      const paginated = filtered.slice(startIndex, endIndex);

                      return paginated.map((o: any) => {
                        const cxId      = o.customer_id || o.id || '-';
                        const cxName    = o.customer_name || o.name || '-';
                        const mobile    = o.mobile_number || o.phone || '-';
                        const orderDate = o.order_date || (o.timestamp ? o.timestamp.split(',')[0] : '-');
                        const items     = o.items_ordered || (Array.isArray(o.services) ? o.services.join(', ') : o.services) || '-';
                        
                        // Parse quantity properly from services if quantity is not set
                        const qty = (() => {
                          if (o.quantity !== undefined && o.quantity !== null && o.quantity !== '' && o.quantity !== '-') return o.quantity;
                          if (Array.isArray(o.services)) {
                            let totalQ = 0;
                            for (const s of o.services) {
                              const match = String(s).match(/x\s*(\d+)/i);
                              if (match) totalQ += parseInt(match[1], 10);
                              else totalQ += 1;
                            }
                            return totalQ > 0 ? totalQ : '-';
                          }
                          return '-';
                        })();

                        // Format service type cleanly
                        const service = o.service_type || (() => {
                          if (!o.services) return '-';
                          const str = Array.isArray(o.services) ? o.services.join(', ') : String(o.services);
                          const types: string[] = [];
                          if (/dry\s*clean/i.test(str)) types.push('Dry Clean');
                          if (/wash\s*&\s*iron|wash\+iron/i.test(str)) types.push('Wash & Iron');
                          else if (/wash\s*only/i.test(str)) types.push('Wash Only');
                          else if (/wash/i.test(str) && !types.includes('Wash & Iron')) types.push('Wash');
                          if (/iron/i.test(str) && !types.includes('Wash & Iron')) types.push('Ironing');
                          return types.length > 0 ? types.join(', ') : (Array.isArray(o.services) ? o.services[0] : str);
                        })();

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
                        
                        const orderTotal = Number(o.total || o.amount || 0);
                        const rawPaymentStatus = o.paymentStatus || o.payment_status || (Number(o.pending_amount || 0) > 0 ? 'Pending' : (Number(o.received_amount || 0) > 0 ? 'Received' : 'Pending'));
                        const paymentStatus = String(rawPaymentStatus).toLowerCase().includes('received') ? 'Received' : 'Pending';
                        const paymentMode = o.paymentMode || o.payment_mode || (paymentStatus === 'Received' ? 'Cash' : 'Not Set');

                        const hasExplicitAmounts = (o.pending_amount !== undefined && o.pending_amount !== null && !isNaN(Number(o.pending_amount))) || (o.received_amount !== undefined && o.received_amount !== null && !isNaN(Number(o.received_amount)));
                        const pendingAmount = hasExplicitAmounts 
                          ? Number(o.pending_amount || 0) 
                          : (paymentStatus === 'Received' ? 0 : orderTotal);
                        const receivedAmount = hasExplicitAmounts 
                          ? Number(o.received_amount || 0) 
                          : (paymentStatus === 'Received' ? orderTotal : 0);

                        const paymentAmount = (option: 'Pending' | 'Received') => (
                          option === 'Pending' ? pendingAmount : receivedAmount
                        ).toLocaleString('en-IN');

                        return (
                          <tr key={o.id} className="border-b border-black/5 hover:bg-white/60 transition-colors text-[11px]">
                            <td className="px-4 py-2.5 font-black text-primary whitespace-nowrap bg-blue-500/[0.02]">{cxId}</td>
                            <td className="px-4 py-2.5 font-bold whitespace-nowrap bg-blue-500/[0.02]">{cxName}</td>
                            <td className="px-4 py-2.5 whitespace-nowrap bg-blue-500/[0.02]">
                              <div className="flex flex-col gap-1 items-start">
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase ${cxBadgeClass}`}>{cxType}</span>
                                {o.sourceSegment && (
                                  <span className={`text-[7.5px] font-black px-1.5 py-0.2 rounded uppercase border ${
                                    o.sourceSegment === 'NP' ? 'bg-amber-500/15 text-amber-700 border-amber-500/30' :
                                    o.sourceSegment === 'SM' ? 'bg-pink-500/15 text-pink-700 border-pink-500/30' :
                                    o.sourceSegment === 'RF' ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30' :
                                    o.sourceSegment === 'AP' ? 'bg-indigo-500/15 text-indigo-700 border-indigo-500/30' :
                                    'bg-cyan-500/15 text-cyan-700 border-cyan-500/30'
                                  }`}>
                                    {o.sourceSegment === 'NP' ? 'NP · NewsPaper' :
                                     o.sourceSegment === 'SM' ? 'SM · Social' :
                                     o.sourceSegment === 'RF' ? 'RF · Ref' :
                                     o.sourceSegment === 'WS' ? 'WS · Web' :
                                     o.sourceSegment === 'AP' ? 'AP · App' : o.sourceSegment}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-text-secondary whitespace-nowrap bg-blue-500/[0.02] border-r border-black/5">{mobile}</td>
                            <td className="px-4 py-2.5 text-text-secondary whitespace-nowrap bg-violet-500/[0.02]">{orderDate}</td>
                            <td className="px-4 py-2.5 text-text-secondary max-w-[180px] truncate bg-violet-500/[0.02]" title={typeof items === 'string' ? items : ''}>{items}</td>
                            <td className="px-4 py-2.5 font-bold text-center bg-violet-500/[0.02]">{qty}</td>
                            <td className="px-4 py-2.5 text-text-secondary whitespace-nowrap bg-violet-500/[0.02]">{service}</td>
                            <td className="px-4 py-2.5 whitespace-nowrap bg-violet-500/[0.02] border-r border-black/5">
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase ${statusBadgeClass}`}>{status === 'Delivered to Cx' ? 'Delivered' : status}</span>
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap bg-emerald-500/[0.02]">
                              <span className="text-xs font-black text-emerald-800 tracking-tight">₹{orderTotal.toLocaleString('en-IN')}</span>
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap bg-emerald-500/[0.02]">
                              <div className="flex flex-col gap-0.5 items-start">
                                {Number(o.deliveryFee || o.delivery_charges || 0) > 0 ? (
                                  <span className="text-xs font-black text-blue-700">
                                    ₹{Number(o.deliveryFee || o.delivery_charges).toLocaleString('en-IN')}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-gray-400">₹0</span>
                                )}
                                {o.paidTo3rdPartyRider && (
                                  <span className="text-[7.5px] font-black uppercase px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 border border-purple-200">
                                    🛵 3rd Party
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap bg-emerald-500/[0.02]">
                              <div className="inline-flex rounded-xl border border-black/5 bg-white/60 p-1">
                                {(['Pending', 'Received'] as const).map(option => (
                                  <button
                                    key={option}
                                    onClick={() => updatePayment(o, option)}
                                    className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                                      paymentStatus === option
                                        ? option === 'Received'
                                          ? 'bg-emerald-500 text-white shadow-sm'
                                          : 'bg-amber-500 text-white shadow-sm'
                                        : 'text-text-secondary hover:bg-white'
                                    }`}
                                  >
                                    <span>{option}</span>
                                    <span className={`ml-1 rounded-md px-1.5 py-0.5 ${
                                      paymentStatus === option ? 'bg-white/20 text-white' : 'bg-black/5 text-text-secondary'
                                    }`}>
                                      ₹{paymentAmount(option)}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap bg-emerald-500/[0.02] border-r border-black/5">
                              <select
                                value={paymentMode}
                                onChange={(e) => updatePayment(o, paymentStatus, e.target.value)}
                                className="bg-white/70 border border-black/5 rounded-xl px-3 py-2 text-[10px] font-black uppercase text-emerald-700 outline-none focus:border-emerald-400"
                              >
                                {['Cash', 'Online QR', 'UPI', 'Card', 'Bank Transfer', 'Not Set'].map(mode => (
                                  <option key={mode} value={mode}>{mode}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap bg-red-500/[0.01]">
                              <button className="text-blue-500 font-bold text-xs hover:underline uppercase tracking-wide mr-3" onClick={() => handleStartEditOrder(o)}>✏️ Edit</button>
                              <button className="text-primary font-bold text-xs hover:underline uppercase tracking-wide" onClick={() => { setSelectedOrder(o); setShowInvoiceModal(true); }}>👁️ Invoice</button>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {(() => {
                const query = orderSearch.toLowerCase();
                const filtered = categorizedOrders.history.filter((o: any) => {
                  // 1. Source Filter Check
                  if (historySourceFilter !== 'All') {
                    const seg = o.sourceSegment || (o.source === 'WhatsApp' ? 'SM' : o.source === 'App' ? 'AP' : o.source === 'Walk-in' ? 'RF' : o.source === 'Web' ? 'WS' : 'RF');
                    if (seg !== historySourceFilter) return false;
                  }

                  // 2. Account Type Filter Check
                  if (historyAccountTypeFilter !== 'All') {
                    const cxType = o.cx_type || (o.source === 'Business' ? 'Business' : 'Residential');
                    if (cxType.toLowerCase() !== historyAccountTypeFilter.toLowerCase()) return false;
                  }

                  // 3. Service Type Filter Check
                  if (historyServiceFilter !== 'All') {
                    const servStr = (o.service_type || (Array.isArray(o.services) ? o.services.join(' ') : String(o.services || ''))).toLowerCase();
                    if (historyServiceFilter === 'Wash & Iron') {
                      if (!servStr.includes('wash') || !servStr.includes('iron')) return false;
                    } else if (historyServiceFilter === 'Dry Clean') {
                      if (!servStr.includes('dry') && !servStr.includes('clean')) return false;
                    } else if (historyServiceFilter === 'Steam Iron') {
                      if (!servStr.includes('iron') && !servStr.includes('steam')) return false;
                    } else if (historyServiceFilter === 'Wash Only') {
                      if (!servStr.includes('wash')) return false;
                    } else if (!servStr.includes(historyServiceFilter.toLowerCase())) {
                      return false;
                    }
                  }

                  // 4. Status Filter Check
                  if (historyStatusFilter !== 'All') {
                    const st = (o.status || 'Pending').toLowerCase();
                    const targetSt = historyStatusFilter.toLowerCase();
                    if (targetSt === 'delivered') {
                      if (!st.includes('deliver') && !st.includes('complete')) return false;
                    } else if (!st.includes(targetSt)) {
                      return false;
                    }
                  }

                  // 5. Payment Status Filter Check
                  if (historyPaymentStatusFilter !== 'All') {
                    const rawPaySt = o.paymentStatus || o.payment_status || (Number(o.pending_amount || 0) > 0 ? 'Pending' : (Number(o.received_amount || 0) > 0 ? 'Received' : 'Pending'));
                    const paySt = String(rawPaySt).toLowerCase().includes('received') ? 'Received' : 'Pending';
                    if (paySt !== historyPaymentStatusFilter) return false;
                  }

                  // 6. Payment Mode Filter Check
                  if (historyPaymentModeFilter !== 'All') {
                    const rawPaySt = o.paymentStatus || o.payment_status || (Number(o.pending_amount || 0) > 0 ? 'Pending' : (Number(o.received_amount || 0) > 0 ? 'Received' : 'Pending'));
                    const paySt = String(rawPaySt).toLowerCase().includes('received') ? 'Received' : 'Pending';
                    const payMode = o.paymentMode || o.payment_mode || (paySt === 'Received' ? 'Cash' : 'Not Set');
                    if (payMode.toLowerCase() !== historyPaymentModeFilter.toLowerCase()) return false;
                  }

                  // 6b. Delivery Charges & 3rd Party Filter Check
                  if (historyDeliveryFilter !== 'All') {
                    const delFee = Number(o.deliveryFee || o.delivery_charges || 0);
                    const is3rdParty = !!o.paidTo3rdPartyRider;
                    if (historyDeliveryFilter === 'HasDelivery' && delFee <= 0) return false;
                    if (historyDeliveryFilter === 'ThirdParty' && !is3rdParty) return false;
                    if (historyDeliveryFilter === 'StorePickup' && delFee > 0) return false;
                  }

                  // 7. Order Date Filter Check
                  if (historyDateFilter) {
                    const oDate = String(o.order_date || (o.timestamp ? o.timestamp.split(',')[0] : '')).trim();
                    let dateMatches = false;
                    if (oDate.includes(historyDateFilter)) {
                      dateMatches = true;
                    } else {
                      const [y, m, d] = historyDateFilter.split('-');
                      if (d && m && y) {
                        const dInt = parseInt(d, 10);
                        const mInt = parseInt(m, 10);
                        const pattern1 = `${d}/${m}/${y}`;
                        const pattern2 = `${dInt}/${mInt}/${y}`;
                        const pattern3 = `${d}-${m}-${y}`;
                        if (oDate.includes(pattern1) || oDate.includes(pattern2) || oDate.includes(pattern3)) {
                          dateMatches = true;
                        }
                      }
                    }
                    if (!dateMatches) return false;
                  }

                  // 8. Query Search Check
                  if (!query) return true;
                  const servicesMatch = o.services ? (Array.isArray(o.services) ? o.services.some((s: string) => s.toLowerCase().includes(query)) : String(o.services).toLowerCase().includes(query)) : false;
                  return (
                    (o.id && o.id.toLowerCase().includes(query)) ||
                    (o.customer_id && o.customer_id.toLowerCase().includes(query)) ||
                    (o.customer_name && o.customer_name.toLowerCase().includes(query)) ||
                    (o.name && o.name.toLowerCase().includes(query)) ||
                    (o.phone && o.phone.includes(query)) ||
                    (o.mobile_number && String(o.mobile_number).includes(query)) ||
                    (o.items_ordered && o.items_ordered.toLowerCase().includes(query)) ||
                    (o.service_type && o.service_type.toLowerCase().includes(query)) ||
                    servicesMatch ||
                    (o.order_date && String(o.order_date).toLowerCase().includes(query)) ||
                    (o.status && o.status.toLowerCase().includes(query)) ||
                    (o.timestamp && String(o.timestamp).toLowerCase().includes(query)) ||
                    (o.source && String(o.source).toLowerCase().includes(query)) ||
                    (o.sourceSegment && String(o.sourceSegment).toLowerCase().includes(query))
                  );
                });
                const totalRows = filtered.length;
                if (totalRows === 0) return null;

                const totalPages = Math.ceil(totalRows / historyLimit) || 1;
                const currentPage = Math.min(historyPage, totalPages);
                const startRow = (currentPage - 1) * historyLimit + 1;
                const endRow = Math.min(currentPage * historyLimit, totalRows);

                // Generate smart page list: always show first, last, current, and surrounding pages
                const range: (number | string)[] = [];
                const delta = 1;
                for (let i = 1; i <= totalPages; i++) {
                  if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
                    range.push(i);
                  } else if (range[range.length - 1] !== '...') {
                    range.push('...');
                  }
                }

                return (
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 bg-white/40 border border-black/5 rounded-3xl p-5 backdrop-blur-md">
                    {/* Left: Info details */}
                    <div className="text-xs font-bold text-text-secondary">
                      Showing <span className="text-primary font-black">{startRow}</span> to <span className="text-primary font-black">{endRow}</span> of <span className="text-primary font-black">{totalRows.toLocaleString()}</span> orders
                    </div>

                    {/* Middle: Page navigation buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => setHistoryPage(1)}
                        disabled={currentPage === 1}
                        className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border border-black/5 bg-white/50 hover:bg-primary/10 hover:text-primary disabled:opacity-40 disabled:hover:bg-white/50 disabled:hover:text-text-secondary disabled:cursor-not-allowed text-primary"
                      >
                        First
                      </button>
                      <button
                        onClick={() => setHistoryPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border border-black/5 bg-white/50 hover:bg-primary/10 hover:text-primary disabled:opacity-40 disabled:hover:bg-white/50 disabled:hover:text-text-secondary disabled:cursor-not-allowed text-primary"
                      >
                        Prev
                      </button>

                      {range.map((p, idx) => {
                        if (p === '...') {
                          return (
                            <span key={`dots-${idx}`} className="px-2 text-text-secondary font-black">
                              ...
                            </span>
                          );
                        }
                        return (
                          <button
                            key={`page-${p}`}
                            onClick={() => setHistoryPage(p as number)}
                            className={`w-9 h-9 rounded-xl text-xs font-black transition-all border ${
                              currentPage === p
                                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105'
                                : 'bg-white/50 border-black/5 hover:border-primary/25 hover:bg-primary/5 text-text-secondary hover:text-primary'
                            }`}
                          >
                            {p}
                          </button>
                        );
                      })}

                      <button
                        onClick={() => setHistoryPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border border-black/5 bg-white/50 hover:bg-primary/10 hover:text-primary disabled:opacity-40 disabled:hover:bg-white/50 disabled:hover:text-text-secondary disabled:cursor-not-allowed text-primary"
                      >
                        Next
                      </button>
                      <button
                        onClick={() => setHistoryPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border border-black/5 bg-white/50 hover:bg-primary/10 hover:text-primary disabled:opacity-40 disabled:hover:bg-white/50 disabled:hover:text-text-secondary disabled:cursor-not-allowed text-primary"
                      >
                        Last
                      </button>
                    </div>

                    {/* Right: Limit Selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase text-text-secondary tracking-wider">Show</span>
                      <select
                        value={historyLimit}
                        onChange={(e) => {
                          setHistoryLimit(Number(e.target.value));
                          setHistoryPage(1);
                        }}
                        className="bg-white/50 border border-black/5 rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer focus:border-primary transition-colors text-primary"
                      >
                        {[10, 20, 25, 50, 100].map(val => (
                          <option key={val} value={val}>{val} rows</option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {activeTab === 'source-reports' && (() => {
            const allOrders = orders || [];
            
            // Channel definitions
            const channels = [
              { code: 'NP', name: 'NewsPaper Pamphlet', icon: '📰', color: 'amber', bg: 'bg-amber-500/10 text-amber-800 border-amber-500/30', border: 'border-amber-400' },
              { code: 'SM', name: 'Social Media / WhatsApp', icon: '💬', color: 'pink', bg: 'bg-pink-500/10 text-pink-800 border-pink-500/30', border: 'border-pink-400' },
              { code: 'RF', name: 'Reference / Walk-in / Referral', icon: '🚶', color: 'emerald', bg: 'bg-emerald-500/10 text-emerald-800 border-emerald-500/30', border: 'border-emerald-400' },
              { code: 'WS', name: 'Website Direct', icon: '🌐', color: 'cyan', bg: 'bg-cyan-500/10 text-cyan-800 border-cyan-500/30', border: 'border-cyan-400' },
              { code: 'AP', name: 'Customer Mobile App', icon: '📱', color: 'indigo', bg: 'bg-indigo-500/10 text-indigo-800 border-indigo-500/30', border: 'border-indigo-400' },
            ];

            // Helper to get normalized segment code
            const getOrderSeg = (o: any) => {
              if (o.sourceSegment) return o.sourceSegment;
              const src = String(o.source || '').toLowerCase();
              if (src.includes('whatsapp') || src.includes('social') || src.includes('sm')) return 'SM';
              if (src.includes('walk-in') || src.includes('walkin') || src.includes('ref')) return 'RF';
              if (src.includes('app') || src.includes('mobile')) return 'AP';
              if (src.includes('web')) return 'WS';
              if (src.includes('news') || src.includes('paper') || src.includes('np')) return 'NP';
              return 'RF';
            };

            // Totals
            const totalOrdersCount = allOrders.length || 1;
            const totalRevenue = allOrders.reduce((sum: number, o: any) => sum + (Number(o.total || o.amount || 0)), 0) || 1;

            // Channel aggregations
            const channelStats = channels.map(ch => {
              const matching = allOrders.filter((o: any) => getOrderSeg(o) === ch.code);
              const count = matching.length;
              const rev = matching.reduce((sum: number, o: any) => sum + (Number(o.total || o.amount || 0)), 0);
              const received = matching.reduce((sum: number, o: any) => sum + (Number(o.received_amount || 0)), 0);
              const pending = matching.reduce((sum: number, o: any) => sum + (Number(o.pending_amount || 0)), 0);
              const pctOrders = totalOrdersCount > 0 ? ((count / totalOrdersCount) * 100).toFixed(1) : '0';
              const pctRev = totalRevenue > 0 ? ((rev / totalRevenue) * 100).toFixed(1) : '0';
              const aov = count > 0 ? Math.round(rev / count) : 0;
              return { ...ch, count, rev, received, pending, pctOrders, pctRev, aov };
            });

            // Filter orders for table
            const query = sourceTabSearch.toLowerCase().trim();
            const filteredOrders = allOrders.filter((o: any) => {
              if (sourceTabActiveSource !== 'All') {
                if (getOrderSeg(o) !== sourceTabActiveSource) return false;
              }
              if (!query) return true;
              const servicesMatch = o.services ? (Array.isArray(o.services) ? o.services.some((s: string) => s.toLowerCase().includes(query)) : String(o.services).toLowerCase().includes(query)) : false;
              return (
                (o.id && o.id.toLowerCase().includes(query)) ||
                (o.customer_id && o.customer_id.toLowerCase().includes(query)) ||
                (o.customer_name && o.customer_name.toLowerCase().includes(query)) ||
                (o.name && o.name.toLowerCase().includes(query)) ||
                (o.phone && o.phone.includes(query)) ||
                (o.mobile_number && String(o.mobile_number).includes(query)) ||
                (o.items_ordered && o.items_ordered.toLowerCase().includes(query)) ||
                (o.service_type && o.service_type.toLowerCase().includes(query)) ||
                servicesMatch ||
                (o.order_date && String(o.order_date).toLowerCase().includes(query)) ||
                (o.status && o.status.toLowerCase().includes(query)) ||
                (o.timestamp && String(o.timestamp).toLowerCase().includes(query)) ||
                (o.source && String(o.source).toLowerCase().includes(query)) ||
                (o.sourceSegment && String(o.sourceSegment).toLowerCase().includes(query))
              );
            });

            // Pagination for source tab
            const totalRows = filteredOrders.length;
            const totalPages = Math.ceil(totalRows / sourceTabLimit) || 1;
            const currentPage = Math.min(sourceTabPage, totalPages);
            const startIndex = (currentPage - 1) * sourceTabLimit;
            const paginatedOrders = filteredOrders.slice(startIndex, startIndex + sourceTabLimit);

            return (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header Strip */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-700 text-[10px] font-black uppercase tracking-wider mb-2">
                      <span>🎯</span> Marketing Source Segmentation · 27 Sep Protocol
                    </div>
                    <h3 className="text-4xl font-black tracking-tight text-text-primary">Source Attribution Reports</h3>
                    <p className="text-text-secondary text-sm mt-1">
                      Track customer acquisition channels, conversion rates, and revenue ROI across Newspaper, Social Media, Referrals, Website &amp; App.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowEODModal(true)}
                      className="glass hover:bg-white/70 px-5 py-3 rounded-2xl flex items-center gap-2 text-xs font-black uppercase tracking-wider text-text-primary border border-black/5 shadow-sm transition-all"
                    >
                      <span>📊</span> Download EOD Excel
                    </button>
                  </div>
                </div>

                {/* 5 Channel Performance Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
                  {channelStats.map((ch) => {
                    const isSelected = sourceTabActiveSource === ch.code;
                    return (
                      <div
                        key={ch.code}
                        onClick={() => {
                          setSourceTabActiveSource(isSelected ? 'All' : ch.code as any);
                          setSourceTabPage(1);
                        }}
                        className={`glass-card p-5 cursor-pointer transition-all border ${
                          isSelected
                            ? 'ring-2 ring-primary border-primary shadow-lg scale-[1.02] bg-white'
                            : 'hover:shadow-md hover:scale-[1.01] border-black/5 bg-white/70'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-2xl">{ch.icon}</span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border uppercase ${ch.bg}`}>
                            {ch.code}
                          </span>
                        </div>
                        <p className="text-xs font-black text-text-primary truncate mb-1" title={ch.name}>{ch.name}</p>
                        <div className="flex items-baseline justify-between mt-2">
                          <span className="text-2xl font-black text-slate-900">{ch.count.toLocaleString('en-IN')}</span>
                          <span className="text-[10px] font-bold text-text-secondary">{ch.pctOrders}% of orders</span>
                        </div>
                        <div className="mt-3 pt-3 border-t border-black/5 flex items-center justify-between text-xs">
                          <span className="text-[10px] font-bold text-text-secondary uppercase">Revenue</span>
                          <span className="font-black text-emerald-700">₹{ch.rev.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[10px] text-text-secondary">
                          <span>AOV: ₹{ch.aov.toLocaleString('en-IN')}</span>
                          <span className="font-bold text-primary">{ch.pctRev}% Rev</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-white/60 glass p-4 rounded-3xl border border-black/5 mb-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-black uppercase text-text-secondary tracking-wider mr-1">Channel Filter:</span>
                    <button
                      onClick={() => { setSourceTabActiveSource('All'); setSourceTabPage(1); }}
                      className={`text-[10px] font-black px-3.5 py-2 rounded-xl transition-all cursor-pointer border ${
                        sourceTabActiveSource === 'All'
                          ? 'bg-primary text-white border-primary shadow-sm scale-105'
                          : 'bg-white/80 text-text-secondary hover:bg-white border-black/5'
                      }`}
                    >
                      All Channels ({allOrders.length})
                    </button>
                    {channels.map(ch => {
                      const count = allOrders.filter((o: any) => getOrderSeg(o) === ch.code).length;
                      const active = sourceTabActiveSource === ch.code;
                      return (
                        <button
                          key={ch.code}
                          onClick={() => { setSourceTabActiveSource(ch.code as any); setSourceTabPage(1); }}
                          className={`text-[10px] font-black px-3 py-2 rounded-xl transition-all cursor-pointer border ${
                            active
                              ? 'bg-slate-900 text-white border-slate-900 shadow-sm scale-105'
                              : 'bg-white/80 text-text-secondary hover:bg-white border-black/5'
                          }`}
                        >
                          {ch.icon} {ch.code} ({count})
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={sourceTabSearch}
                      onChange={(e) => { setSourceTabSearch(e.target.value); setSourceTabPage(1); }}
                      placeholder="Search within source orders (ID, Name, Phone)..."
                      className="glass px-5 py-2.5 text-xs outline-none focus:border-primary/40 transition-all rounded-2xl w-80 max-w-full font-bold bg-white/80"
                    />
                    {sourceTabSearch && (
                      <button
                        onClick={() => { setSourceTabSearch(''); setSourceTabPage(1); }}
                        className="text-xs font-bold text-red-500 hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Filtered Orders Table */}
                <div className="glass overflow-x-auto rounded-3xl border border-black/5 bg-white/40">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[8px] font-black uppercase tracking-widest">
                        <th colSpan={4} className="px-4 pt-4 pb-2 bg-blue-500/10 text-blue-700 border-r-2 border-white/60 text-center">👤 Customer Details</th>
                        <th colSpan={4} className="px-4 pt-4 pb-2 bg-purple-500/10 text-purple-700 border-r-2 border-white/60 text-center">📍 Source &amp; Order</th>
                        <th colSpan={3} className="px-4 pt-4 pb-2 bg-emerald-500/10 text-emerald-700 border-r-2 border-white/60 text-center">💳 Revenue &amp; Payment</th>
                        <th colSpan={1} className="px-4 pt-4 pb-2 bg-red-500/10 text-red-700 text-center">⚡ Actions</th>
                      </tr>
                      <tr className="border-b-2 border-black/5 text-[9px] font-black uppercase tracking-widest text-text-secondary">
                        <th className="px-4 py-3 whitespace-nowrap bg-blue-500/5">Customer ID</th>
                        <th className="px-4 py-3 whitespace-nowrap bg-blue-500/5">CX Name</th>
                        <th className="px-4 py-3 whitespace-nowrap bg-blue-500/5">Account Type</th>
                        <th className="px-4 py-3 whitespace-nowrap bg-blue-500/5 border-r border-black/8">Mobile No.</th>
                        <th className="px-4 py-3 whitespace-nowrap bg-purple-500/5">Marketing Source</th>
                        <th className="px-4 py-3 whitespace-nowrap bg-purple-500/5">Order Date</th>
                        <th className="px-4 py-3 whitespace-nowrap bg-purple-500/5">Items Ordered</th>
                        <th className="px-4 py-3 whitespace-nowrap bg-purple-500/5 border-r border-black/8">Status</th>
                        <th className="px-4 py-3 whitespace-nowrap bg-emerald-500/5">Total Amount</th>
                        <th className="px-4 py-3 whitespace-nowrap bg-emerald-500/5">Payment Status</th>
                        <th className="px-4 py-3 whitespace-nowrap bg-emerald-500/5 border-r border-black/8">Payment Mode</th>
                        <th className="px-4 py-3 whitespace-nowrap bg-red-500/5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {paginatedOrders.length === 0 ? (
                        <tr>
                          <td colSpan={12} className="px-4 py-16 text-center text-text-secondary font-black uppercase tracking-widest text-xs">
                            No orders found for the selected acquisition source
                          </td>
                        </tr>
                      ) : (
                        paginatedOrders.map((o: any) => {
                          const cxId = o.customer_id || o.id || '-';
                          const cxName = o.customer_name || o.name || '-';
                          const mobile = o.mobile_number || o.phone || '-';
                          const orderDate = o.order_date || (o.timestamp ? o.timestamp.split(',')[0] : '-');
                          const items = o.items_ordered || (Array.isArray(o.services) ? o.services.join(', ') : o.services) || '-';
                          const cxType = o.cx_type || (o.source === 'Business' ? 'Business' : 'Residential');
                          const status = o.status || 'Pending';
                          const orderTotal = Number(o.total || o.amount || 0);
                          const seg = getOrderSeg(o);
                          const segInfo = channels.find(c => c.code === seg) || { code: seg, name: 'Unknown', icon: '📍', bg: 'bg-gray-500/10 text-gray-700 border-gray-500/20' };

                          const rawPaymentStatus = o.paymentStatus || o.payment_status || (Number(o.pending_amount || 0) > 0 ? 'Pending' : (Number(o.received_amount || 0) > 0 ? 'Received' : 'Pending'));
                          const paymentStatus = String(rawPaymentStatus).toLowerCase().includes('received') ? 'Received' : 'Pending';
                          const paymentMode = o.paymentMode || o.payment_mode || (paymentStatus === 'Received' ? 'Cash' : 'Not Set');

                          return (
                            <tr key={`src-tab-${o.id}`} className="hover:bg-white/60 transition-colors text-[11px]">
                              <td className="px-4 py-2.5 font-black text-primary whitespace-nowrap bg-blue-500/[0.02]">{cxId}</td>
                              <td className="px-4 py-2.5 font-bold whitespace-nowrap bg-blue-500/[0.02]">{cxName}</td>
                              <td className="px-4 py-2.5 whitespace-nowrap bg-blue-500/[0.02]">
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase ${
                                  cxType === 'Business' ? 'bg-blue-600/15 text-blue-700' : 'bg-green-500/15 text-green-700'
                                }`}>
                                  {cxType}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-text-secondary whitespace-nowrap bg-blue-500/[0.02] border-r border-black/5">{mobile}</td>
                              <td className="px-4 py-2.5 whitespace-nowrap bg-purple-500/[0.02]">
                                <span className={`text-[9px] font-black px-2 py-1 rounded-md border uppercase inline-flex items-center gap-1 ${segInfo.bg}`}>
                                  <span>{segInfo.icon}</span> {segInfo.code} · {segInfo.name.split('/')[0].trim()}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-text-secondary whitespace-nowrap bg-purple-500/[0.02]">{orderDate}</td>
                              <td className="px-4 py-2.5 text-text-secondary max-w-[200px] truncate bg-purple-500/[0.02]" title={typeof items === 'string' ? items : ''}>{items}</td>
                              <td className="px-4 py-2.5 whitespace-nowrap bg-purple-500/[0.02] border-r border-black/5">
                                <span className="text-[9px] font-black px-2 py-0.5 rounded-md uppercase bg-primary/10 text-primary">
                                  {status}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 font-black whitespace-nowrap bg-emerald-500/[0.02]">₹{orderTotal.toLocaleString('en-IN')}</td>
                              <td className="px-4 py-2.5 whitespace-nowrap bg-emerald-500/[0.02]">
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase ${
                                  paymentStatus === 'Received' ? 'bg-emerald-500/15 text-emerald-700' : 'bg-amber-500/15 text-amber-700'
                                }`}>
                                  {paymentStatus}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 whitespace-nowrap bg-emerald-500/[0.02] border-r border-black/5 text-[10px] font-black uppercase text-emerald-700">
                                {paymentMode}
                              </td>
                              <td className="px-4 py-2.5 whitespace-nowrap bg-red-500/[0.01] text-center">
                                <button className="text-primary font-bold text-xs hover:underline uppercase tracking-wide mr-2" onClick={() => { setSelectedOrder(o); setShowInvoiceModal(true); }}>👁️ View</button>
                                <button className="text-blue-500 font-bold text-xs hover:underline uppercase tracking-wide" onClick={() => handleStartEditOrder(o)}>✏️ Edit</button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination footer */}
                {totalRows > 0 && (
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 px-2">
                    <span className="text-xs font-bold text-text-secondary">
                      Showing {startIndex + 1} to {Math.min(startIndex + sourceTabLimit, totalRows)} of {totalRows} orders
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSourceTabPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border border-black/5 bg-white/70 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        Prev
                      </button>
                      <span className="text-xs font-black px-3 py-1 bg-white rounded-xl border border-black/5">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setSourceTabPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border border-black/5 bg-white/70 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {activeTab === 'business-stats' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="manager-section-header mb-8">
                <h3 className="text-4xl font-black tracking-tight">Business Statistics</h3>
                <p className="text-text-secondary text-sm mt-1">Detailed store performance, monthly trends, and revenue insights</p>
              </div>
              <EarningsTrendGraph data={dailyEarningsData} />
            </div>
          )}

          {activeTab === 'today' && (() => {
            const todayDateStr = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
            const todayIsoStr = new Date().toISOString().split('T')[0];

            // Orders placed today OR orders where payment was received today
            const todayOrdersList = orders.filter((o: any) => {
              const ts = String(o.timestamp || o.order_date || '');
              const rcDate = String(o.received_date || '');
              return ts.includes(todayDateStr) || ts.includes(todayIsoStr) || rcDate === todayDateStr;
            });

            const totalOrdersCount = todayOrdersList.length;
            const totalRevenueToday = todayOrdersList.reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0);

            const receivedOrdersToday = todayOrdersList.filter((o: any) => o.paymentStatus === 'Received' || o.payment_status === 'Received');
            const totalReceivedToday = receivedOrdersToday.reduce((sum: number, o: any) => sum + (Number(o.received_amount !== undefined ? o.received_amount : o.total) || 0), 0);

            const cashReceivedToday = receivedOrdersToday
              .filter((o: any) => o.paymentMode === 'Cash' || o.payment_mode === 'Cash')
              .reduce((sum: number, o: any) => sum + (Number(o.received_amount !== undefined ? o.received_amount : o.total) || 0), 0);

            const onlineReceivedToday = receivedOrdersToday
              .filter((o: any) => (o.paymentMode && o.paymentMode !== 'Cash') || (o.payment_mode && o.payment_mode !== 'Cash'))
              .reduce((sum: number, o: any) => sum + (Number(o.received_amount !== undefined ? o.received_amount : o.total) || 0), 0);

            const pendingRevenueToday = Math.max(0, totalRevenueToday - totalReceivedToday);
            const pendingOrdersCount = todayOrdersList.filter((o: any) => o.paymentStatus !== 'Received' && o.payment_status !== 'Received').length;

            return (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                  <div>
                    <h3 className="text-4xl font-black tracking-tight">Today's Orders</h3>
                    <p className="text-text-secondary text-sm mt-1">Orders & payments for today ({todayDateStr})</p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      className="btn-primary bg-emerald-600 hover:bg-emerald-700 px-5 py-3 rounded-2xl flex items-center gap-2 shadow-lg text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
                      onClick={() => setShowEODModal(true)}
                      title="View & Export Complete End of Day Graphic Report"
                    >
                      <span className="text-base">📊</span> Export EOD Report
                    </button>
                    <button
                      className="btn-primary bg-green-600 hover:bg-green-700 px-5 py-3 rounded-2xl flex items-center gap-2 shadow-lg text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
                      onClick={exportTodayExcel}
                    >
                      <span className="text-base">📥</span> Export Excel
                    </button>
                  </div>
                </div>

                {/* 3 KPI Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                  {/* Card 1: Today's Orders / Total Booked */}
                  <div className="glass p-6 rounded-3xl border border-primary/20 bg-primary/5 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] font-black uppercase text-primary tracking-widest">Today's Total Booked</p>
                      <span className="text-xl">📦</span>
                    </div>
                    <p className="text-3xl font-black text-text-primary">₹{totalRevenueToday}</p>
                    <p className="text-xs text-text-secondary font-medium mt-1">{totalOrdersCount} orders placed today</p>
                  </div>

                  {/* Card 2: Today's Received Amount */}
                  <div className="glass p-6 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] font-black uppercase text-emerald-700 tracking-widest">Today's Received Amount</p>
                      <span className="text-xl">💰</span>
                    </div>
                    <p className="text-3xl font-black text-emerald-800">₹{totalReceivedToday}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-600/15 text-emerald-800 border border-emerald-600/20">
                        Cash: ₹{cashReceivedToday}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-600/15 text-blue-800 border border-blue-600/20">
                        Online QR: ₹{onlineReceivedToday}
                      </span>
                    </div>
                  </div>

                  {/* Card 3: Today's Pending Collection */}
                  <div className="glass p-6 rounded-3xl border border-amber-500/30 bg-amber-500/10 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] font-black uppercase text-amber-700 tracking-widest">Today's Pending Collection</p>
                      <span className="text-xl">⏳</span>
                    </div>
                    <p className="text-3xl font-black text-amber-800">₹{pendingRevenueToday}</p>
                    <p className="text-xs text-amber-700/80 font-medium mt-1">{pendingOrdersCount} orders pending payment</p>
                  </div>
                </div>

                {/* Table with interactive payment toggles */}
                <div className="glass overflow-hidden rounded-3xl border border-black/5">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-black/5 bg-white/50">
                          <th className="p-4 text-[10px] font-black uppercase text-text-secondary tracking-widest">Order ID</th>
                          <th className="p-4 text-[10px] font-black uppercase text-text-secondary tracking-widest">Customer</th>
                          <th className="p-4 text-[10px] font-black uppercase text-text-secondary tracking-widest">Service</th>
                          <th className="p-4 text-[10px] font-black uppercase text-text-secondary tracking-widest">Status</th>
                          <th className="p-4 text-[10px] font-black uppercase text-text-secondary tracking-widest">Amount</th>
                          <th className="p-4 text-[10px] font-black uppercase text-text-secondary tracking-widest">Payment Status</th>
                          <th className="p-4 text-[10px] font-black uppercase text-text-secondary tracking-widest">Payment Mode</th>
                          <th className="p-4 text-[10px] font-black uppercase text-text-secondary tracking-widest text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          Array.from({ length: 5 }).map((_, i) => (
                            <tr key={`skeleton-${i}`} className="border-b border-black/5 animate-pulse">
                              <td className="p-4"><div className="h-4 bg-black/10 rounded w-20"></div></td>
                              <td className="p-4">
                                <div className="h-4 bg-black/10 rounded w-32 mb-2"></div>
                                <div className="h-3 bg-black/5 rounded w-24"></div>
                              </td>
                              <td className="p-4"><div className="h-4 bg-black/10 rounded w-24"></div></td>
                              <td className="p-4"><div className="h-6 bg-black/10 rounded-full w-20"></div></td>
                              <td className="p-4"><div className="h-4 bg-black/10 rounded w-16"></div></td>
                              <td className="p-4"><div className="h-6 bg-black/10 rounded-full w-24"></div></td>
                              <td className="p-4"><div className="h-6 bg-black/10 rounded w-20"></div></td>
                              <td className="p-4 text-right"><div className="h-4 bg-black/10 rounded w-16 ml-auto"></div></td>
                            </tr>
                          ))
                        ) : todayOrdersList.map((o: any) => {
                          const paymentStatus = (o.paymentStatus === 'Received' || o.payment_status === 'Received') ? 'Received' : 'Pending';
                          const paymentMode = o.paymentMode || o.payment_mode || 'Cash';
                          return (
                            <tr key={o.id} className="border-b border-black/5 hover:bg-white/40 transition-colors">
                              <td className="p-4 font-black text-sm text-primary">{o.id}</td>
                              <td className="p-4">
                                <div className="font-bold text-sm text-text-primary">{o.name}</div>
                                <div className="text-[10px] text-text-secondary">{o.phone}</div>
                              </td>
                              <td className="p-4 text-sm text-text-secondary">{o.services?.[0] || 'Wash & Iron'}</td>
                              <td className="p-4">
                                <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-black/5">{o.status}</span>
                              </td>
                              <td className="p-4 font-black text-sm text-text-primary">₹{o.total}</td>
                              <td className="p-4">
                                <div className="flex items-center gap-1.5 bg-black/5 p-1 rounded-xl w-fit">
                                  {(['Pending', 'Received'] as const).map(option => (
                                    <button
                                      key={option}
                                      onClick={() => updatePayment(o, option, paymentMode)}
                                      className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                        paymentStatus === option
                                          ? option === 'Received'
                                            ? 'bg-emerald-500 text-white shadow-sm font-bold'
                                            : 'bg-amber-500 text-white shadow-sm font-bold'
                                          : 'text-text-secondary hover:bg-white/60'
                                      }`}
                                    >
                                      <span>{option}</span>
                                      <span className={`ml-1 rounded-md px-1.5 py-0.5 text-[8px] ${paymentStatus === option ? 'bg-black/20 text-white' : 'bg-black/5 text-text-secondary'}`}>
                                        ₹{option === 'Received' ? (paymentStatus === 'Received' ? (o.received_amount !== undefined ? o.received_amount : o.total) : o.total) : (paymentStatus === 'Received' ? 0 : o.total)}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </td>
                              <td className="p-4">
                                <select
                                  value={paymentMode}
                                  onChange={(e) => updatePayment(o, paymentStatus, e.target.value)}
                                  className="bg-white/80 border border-black/10 rounded-xl px-2.5 py-1.5 text-[10px] font-black uppercase text-emerald-700 outline-none focus:border-emerald-500 shadow-sm cursor-pointer"
                                >
                                  {['Cash', 'Online QR', 'UPI', 'Card', 'Bank Transfer'].map(mode => (
                                    <option key={mode} value={mode}>{mode}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-4 text-right">
                                <button
                                  onClick={() => { setSelectedOrder(o); setShowInvoiceModal(true); }}
                                  className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline cursor-pointer"
                                >
                                  View Details
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {!loading && todayOrdersList.length === 0 && (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-text-secondary text-sm font-medium">No orders recorded for today yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}
          {activeTab === 'rates' && (
            <div className="animate-in fade-in zoom-in-95 duration-500">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div>
                  <h3 className="text-4xl font-black tracking-tighter">Rate List</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest border border-primary/20 shadow-sm shadow-primary/10">Admin Controlled</span>
                    <p className="text-xs text-text-secondary font-medium">Global pricing synchronized across all branches</p>
                  </div>
                </div>
                <div className="flex gap-2 bg-white/40 p-1.5 rounded-2xl border border-white/50 shadow-inner">
                  {['All', 'Men', 'Women', 'Shoes', 'House Item', 'Bags'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setFilterCat(cat)}
                      className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterCat === cat ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'hover:bg-white/50 text-text-secondary'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rates
                  .filter(r => filterCat === 'All' || r.category.toLowerCase() === filterCat.toLowerCase())
                  .sort((a: any, b: any) => {
                    const priceA = Number(a.price) || 0;
                    const priceB = Number(b.price) || 0;
                    if (priceA !== priceB) return priceA - priceB;
                    return (a.item || '').localeCompare(b.item || '');
                  })
                  .map((rate, idx) => (
                    <div key={idx} className="glass-card p-6 flex flex-col gap-4 group hover:scale-[1.02] transition-transform">
                      <div className="flex justify-between items-start">
                        <span className="bg-primary/10 text-primary text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-tight">
                          {rate.category}
                        </span>
                        <span className="text-text-secondary text-[10px] font-bold uppercase">{rate.serviceType || 'Standard'}</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-lg text-text-primary group-hover:text-primary transition-colors">{rate.item}</h4>
                        <p className="text-3xl font-black text-primary mt-2">₹{rate.price}</p>
                      </div>
                      <div className="mt-auto pt-4 border-t border-black/5 flex justify-between items-center">
                        <span className="text-[10px] text-text-secondary font-medium">Read-only Master Rate</span>
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-glow shadow-primary/50"></div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {activeTab === 'riders' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Search Bar for Riders */}
              <div className="flex gap-4 items-center bg-white/40 p-6 rounded-3xl border border-black/5">
                <input 
                  type="text" 
                  placeholder="🔍 Search Riders by Name, ID, or Phone..." 
                  value={riderSearch}
                  onChange={e => setRiderSearch(e.target.value)}
                  className="w-full bg-white/50 border border-black/5 rounded-2xl px-6 py-4 outline-none focus:border-primary text-sm font-bold transition-all"
                />
              </div>

              {/* Pending Approvals */}
              <div className="glass overflow-hidden border-orange-500/20">
                <div className="bg-orange-500/10 px-8 py-4 border-b border-orange-500/10 flex justify-between items-center">
                  <h4 className="text-sm font-black text-orange-600 uppercase tracking-widest">Verification Queue</h4>
                  <span className="text-[10px] font-black px-2 py-1 bg-orange-600 text-white rounded-md">{riders.filter(r => !r.isVerified).length} PENDING</span>
                </div>
                <table className="w-full text-left">
                  <tbody className="divide-y divide-black/5">
                    {loading ? (
                      Array.from({ length: 1 }).map((_, i) => (
                        <tr key={`skeleton-pending-rider-${i}`} className="hover:bg-white/40 transition-colors animate-pulse">
                          <td className="p-8">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-black/10"></div>
                              <div>
                                <div className="h-4 bg-black/10 rounded w-24"></div>
                                <div className="h-3 bg-black/10 rounded w-16 mt-2"></div>
                              </div>
                            </div>
                          </td>
                          <td className="p-8">
                            <div className="h-8 bg-black/10 rounded-xl w-32"></div>
                          </td>
                        </tr>
                      ))
                    ) : riders.filter(r => !r.isVerified).length === 0 ? (
                      <tr><td className="p-10 text-center text-text-secondary font-bold text-[10px] uppercase">No pending rider applications</td></tr>
                    ) : (
                      riders.filter(r => !r.isVerified).map(rider => (
                      <tr key={rider.id} className="hover:bg-white/40 transition-colors">
                        <td className="p-8">
                          <div className="flex items-center gap-3">
                            <img
                              src={rider.profilePicture || `https://api.dicebear.com/7.x/avataaars/png?seed=${rider.name}&backgroundColor=b6e3f4,c0aede,d1d4f9`}
                              alt={rider.name}
                              className="w-10 h-10 rounded-full object-cover border-2 border-orange-500/20 shadow-sm"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/png?seed=${rider.name}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
                              }}
                            />
                            <div>
                              <div className="font-black text-text-primary">{rider.name}</div>
                              <div className="text-[10px] text-text-secondary font-bold mt-1 uppercase tracking-widest">{rider.phone}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-8">
                          <div className="flex items-center gap-3">
                            <button
                               onClick={() => {
                                 verifyRider(rider.id, rider.id);
                               }}
                               className="bg-primary text-white text-[10px] font-black uppercase px-6 py-3 rounded-xl shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                            >
                              Approve & Activate
                            </button>
                          </div>
                        </td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              </div>

              {/* Active Fleet */}
              <div className="glass overflow-hidden shadow-2xl shadow-black/5">
                <div className="bg-primary/5 px-8 py-4 border-b border-primary/10 flex justify-between items-center">
                  <h4 className="text-sm font-black text-primary uppercase tracking-widest">Active Rider Fleet</h4>
                  <button onClick={exportBranchExcel} className="text-[10px] font-black uppercase text-primary hover:underline">Export Fleet Stats</button>
                </div>
                <table className="w-full text-left">
                  <thead className="bg-primary/5 text-[11px] font-black uppercase tracking-[2px] text-primary">
                    <tr>
                      <th className="p-6">Rider Name</th>
                      <th className="p-6">Identity</th>
                      <th className="p-6">Contact</th>
                      <th className="p-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 bg-white/20">
                    {loading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <tr key={`skeleton-rider-${i}`} className="border-b border-black/5 animate-pulse">
                          <td className="p-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-black/10"></div>
                              <div className="h-4 bg-black/10 rounded w-24"></div>
                            </div>
                          </td>
                          <td className="p-6"><div className="h-4 bg-black/10 rounded w-16"></div></td>
                          <td className="p-6"><div className="h-4 bg-black/10 rounded w-24"></div></td>
                          <td className="p-6"><div className="h-4 bg-black/10 rounded w-16 mx-auto"></div></td>
                        </tr>
                      ))
                    ) : riders.filter(r => r.isVerified && (
                      r.name.toLowerCase().includes(riderSearch.toLowerCase()) ||
                      r.id.toLowerCase().includes(riderSearch.toLowerCase()) ||
                      r.phone.includes(riderSearch)
                    )).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-text-secondary font-bold uppercase tracking-wider text-xs">
                          No active riders matching search query
                        </td>
                      </tr>
                    ) : (
                      riders.filter(r => r.isVerified && (
                        r.name.toLowerCase().includes(riderSearch.toLowerCase()) ||
                        r.id.toLowerCase().includes(riderSearch.toLowerCase()) ||
                        r.phone.includes(riderSearch)
                      )).map(rider => (
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
                              <div className="font-black text-sm text-text-primary">{rider.name}</div>
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="text-xs font-black text-primary">{rider.id}</div>
                          </td>
                          <td className="p-6 font-bold text-sm text-text-secondary">+91 {rider.phone}</td>
                          <td className="p-6">
                            <div className="flex justify-center gap-3">
                              <button onClick={() => deleteRider(rider.id)} className="text-red-500 font-black text-[10px] uppercase tracking-widest hover:underline">Remove</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
              {/* Inventory Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card p-6 bg-white/60 border-primary/5 shadow-xl shadow-primary/5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl">📦</div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-text-secondary tracking-wider">Total Items Tracked</p>
                    <p className="text-2xl font-black text-text-primary mt-1">{inventory.length} Items</p>
                  </div>
                </div>

                <div className="glass-card p-6 bg-white/60 border-orange-500/5 shadow-xl shadow-orange-500/5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-2xl">⏳</div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-text-secondary tracking-wider">Pending Stock Requests</p>
                    <p className="text-2xl font-black text-orange-600 mt-1">{stockRequests.filter(r => r.status === 'Pending').length} Pending</p>
                  </div>
                </div>

                <div className="glass-card p-6 bg-white/60 border-green-500/5 shadow-xl shadow-green-500/5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-2xl">✅</div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-text-secondary tracking-wider">Approved Requests</p>
                    <p className="text-2xl font-black text-green-600 mt-1">{stockRequests.filter(r => r.status === 'Approved').length} Approved</p>
                  </div>
                </div>
              </div>

              {/* Sub-tab Navigation & Actions */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex gap-2 bg-white/40 p-1.5 rounded-2xl border border-white/50 shadow-inner w-fit">
                  <button
                    onClick={() => setInventorySubTab('stock')}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${inventorySubTab === 'stock' ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'hover:bg-white/50 text-text-secondary'}`}
                  >
                    📦 Current Stock
                  </button>
                  <button
                    onClick={() => setInventorySubTab('requests')}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${inventorySubTab === 'requests' ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'hover:bg-white/50 text-text-secondary'}`}
                  >
                    ⏳ Request History
                  </button>
                </div>
                <button
                  onClick={exportInventoryExcel}
                  className="glass px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider hover:bg-white/60 transition-all flex items-center gap-2 text-primary border border-primary/20 shadow-sm"
                  title="Download complete detailed inventory report in Excel (.xlsx)"
                >
                  <span className="text-base">📊</span> Export Excel Report (.xlsx)
                </button>
              </div>

              {inventorySubTab === 'stock' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {inventory.length === 0 && (
                    <div className="col-span-full p-20 glass text-center">
                      <h3 className="text-xl font-black mb-2 uppercase tracking-widest">No Inventory Recorded</h3>
                      <p className="text-sm text-text-secondary">Click 'Update Inventory' or request stock from admin to populate.</p>
                    </div>
                  )}
                  {inventory.map((item, idx) => (
                    <div key={idx} className="glass-card p-10 bg-white/60 border-primary/5 hover:border-primary/20 transition-all group flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-6">
                          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl">📦</div>
                          <span className="text-[10px] font-black uppercase tracking-[3px] text-primary">Item ID: {idx + 101}</span>
                        </div>
                        <h4 className="text-2xl font-black tracking-tight mb-2 uppercase">{item.item}</h4>
                        <div className="flex items-end gap-2 mb-6">
                          <span className="text-5xl font-black text-primary tracking-tighter">{item.quantity}</span>
                          <span className="text-sm font-black text-text-secondary uppercase mb-2 tracking-widest">{item.unit}</span>
                        </div>
                      </div>
                      <div className="pt-6 border-t border-black/5 flex justify-between items-center">
                        <div>
                          <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest block">Last Updated</span>
                          <span className="text-[9px] font-bold text-text-primary uppercase">{item.lastUpdated?.split(',')[0]}</span>
                        </div>
                        <button
                          onClick={() => {
                            setInventoryForm({ item: item.item, quantity: String(item.quantity), unit: item.unit });
                            setShowInventoryModal(true);
                          }}
                          className="px-4 py-2 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm"
                        >
                          ✏️ Edit Stock
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass overflow-hidden rounded-3xl border border-black/5 shadow-lg">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-black/5 bg-white/40">
                        <th className="p-6 text-[10px] font-black uppercase text-text-secondary tracking-widest">Request ID</th>
                        <th className="p-6 text-[10px] font-black uppercase text-text-secondary tracking-widest">Item Name</th>
                        <th className="p-6 text-[10px] font-black uppercase text-text-secondary tracking-widest">Quantity</th>
                        <th className="p-6 text-[10px] font-black uppercase text-text-secondary tracking-widest">Status</th>
                        <th className="p-6 text-[10px] font-black uppercase text-text-secondary tracking-widest">Requested Date</th>
                        <th className="p-6 text-[10px] font-black uppercase text-text-secondary tracking-widest">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockRequests.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-text-secondary text-sm font-medium">No stock requests made yet.</td>
                        </tr>
                      ) : (
                        stockRequests.map((req: any) => (
                          <tr key={req.id} className="border-b border-black/5 hover:bg-white/40 transition-colors">
                            <td className="p-6 font-black text-sm text-primary">{req.id}</td>
                            <td className="p-6 font-bold text-sm text-text-primary uppercase">{req.item}</td>
                            <td className="p-6 font-black text-sm text-text-primary">
                              {req.quantity} <span className="text-xs text-text-secondary uppercase">{req.unit}</span>
                            </td>
                            <td className="p-6">
                              <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border tracking-wider ${
                                req.status === 'Approved'
                                  ? 'bg-green-500/10 text-green-600 border-green-500/20'
                                  : req.status === 'Rejected'
                                  ? 'bg-red-500/10 text-red-600 border-red-500/20'
                                  : 'bg-orange-500/10 text-orange-600 border-orange-500/20 animate-pulse'
                              }`}>
                                {req.status}
                              </span>
                            </td>
                            <td className="p-6 text-[10px] font-bold text-text-secondary uppercase">
                              {new Date(req.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
                            </td>
                            <td className="p-6 text-xs text-text-secondary max-w-xs truncate">
                              {req.notes || <span className="opacity-40 italic">-</span>}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {activeTab === 'reviews' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="glass p-10">
                <h3 className="text-3xl font-black mb-2 tracking-tight">Customer Reviews</h3>
                <p className="text-xs font-black uppercase text-text-secondary tracking-widest mb-8">Feedback and ratings from completed orders</p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {reviews.length === 0 ? (
                    <div className="col-span-full p-20 text-center glass border border-primary/5">
                      <span className="text-4xl mb-4 block">⭐</span>
                      <h4 className="text-xl font-black text-text-primary">No Reviews Yet</h4>
                      <p className="text-sm text-text-secondary font-bold mt-2">Completed orders will appear here once customers leave feedback.</p>
                    </div>
                  ) : (
                    reviews.map((rev, i) => (
                      <div key={i} className="glass-card p-6 border-primary/10 hover:border-primary/30 transition-colors">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary block mb-1">Order #{rev.orderId?.slice(-4) || 'N/A'}</span>
                            <span className="text-xs font-bold text-text-secondary">{rev.timestamp?.split(',')[0]}</span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 mb-4 border-y border-black/5 py-4">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">Service</span>
                            <div className="flex gap-1 text-orange-400">
                              {[1, 2, 3, 4, 5].map(star => (
                                <span key={star} className={star <= rev.serviceRating ? '' : 'opacity-20'}>⭐</span>
                              ))}
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">Rider</span>
                            <div className="flex gap-1 text-orange-400">
                              {[1, 2, 3, 4, 5].map(star => (
                                <span key={star} className={star <= rev.riderRating ? '' : 'opacity-20'}>⭐</span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {rev.feedback ? (
                          <p className="text-sm text-text-primary italic leading-relaxed">"{rev.feedback}"</p>
                        ) : (
                          <p className="text-xs text-text-secondary italic opacity-50">No text feedback provided.</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
          {activeTab === 'support' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="glass p-10">
                <h3 className="text-2xl font-black mb-6">System Health</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-5 bg-white/40 rounded-2xl border border-black/5">
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full bg-green-500 shadow-glow shadow-green-500/50"></span>
                      <span className="font-bold">Cloud Storage</span>
                    </div>
                    <span className="text-[10px] font-black text-text-secondary">CONNECTED</span>
                  </div>
                  <div className="flex justify-between items-center p-5 bg-white/40 rounded-2xl border border-black/5">
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full bg-green-500 shadow-glow shadow-green-500/50"></span>
                      <span className="font-bold">Sync Engine</span>
                    </div>
                    <span className="text-[10px] font-black text-text-secondary">RUNNING</span>
                  </div>
                  <div className="mt-10 p-6 bg-primary/5 rounded-2xl border border-primary/10 border-dashed">
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Notice</p>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      Importing history via CSV will automatically sync with the cloud database. Please ensure columns are in order: <b>Name, Phone, Service, Total, Date</b>.
                    </p>
                  </div>

                  <div className="mt-10 pt-10 border-t border-black/5">
                    <h3 className="text-xl font-black mb-4">Raise a Support Ticket</h3>
                    <div className="space-y-4">
                      <select
                        className="input w-full bg-white/60"
                        value={ticketForm.type}
                        onChange={e => setTicketForm({ ...ticketForm, type: e.target.value })}
                      >
                        <option>System Bug / Issue</option>
                        <option>Rider Related</option>
                        <option>Customer Complaint</option>
                        <option>Inventory Request</option>
                        <option>Other</option>
                      </select>
                      <textarea
                        className="input w-full bg-white/60 min-h-[120px]"
                        placeholder="Describe your issue in detail..."
                        value={ticketForm.description}
                        onChange={e => setTicketForm({ ...ticketForm, description: e.target.value })}
                      />
                      <button className="btn-primary w-full shadow-lg shadow-primary/20 py-4 text-base" onClick={handleRaiseTicket}>Submit Ticket</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Walk-in Modal */}
        {showWalkinModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="glass-card w-full max-w-xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
              <h3 className="text-2xl font-black mb-4 flex items-center gap-3">
                <span className="text-primary text-3xl">🧺</span> Manual / Walk-in Order
              </h3>

              {/* Repeat Customer Quick Search & Selection Bar */}
              <div className="mb-5 p-4 rounded-2xl bg-primary/5 border border-primary/20 relative">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-black uppercase text-primary tracking-wider flex items-center gap-1.5">
                    <span>⚡</span> Find Existing / Repeat Customer
                  </label>
                  {selectedRepeatCustomer && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                      ✓ Profile Loaded
                    </span>
                  )}
                </div>

                <div className="relative">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                      <input
                        type="text"
                        className="w-full bg-white dark:bg-black/40 border border-primary/25 rounded-xl pl-9 pr-8 py-2.5 text-xs font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-gray-400"
                        placeholder="Search by phone (e.g. 98260...) or customer name..."
                        value={cxSearchQuery}
                        onChange={e => {
                          setCxSearchQuery(e.target.value);
                          setShowCxDropdown(true);
                        }}
                        onFocus={() => {
                          if (cxSuggestions.length > 0 || recentRepeatCustomers.length > 0) {
                            setShowCxDropdown(true);
                          }
                        }}
                      />
                      {cxSearchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setCxSearchQuery('');
                            setCxSuggestions([]);
                            setShowCxDropdown(false);
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    {isSearchingCx && (
                      <span className="text-xs text-primary animate-spin">⏳</span>
                    )}
                  </div>

                  {/* Autocomplete Suggestions Dropdown */}
                  {showCxDropdown && (cxSuggestions.length > 0 || (cxSearchQuery.length === 0 && recentRepeatCustomers.length > 0)) && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl z-30 max-h-56 overflow-y-auto custom-scrollbar">
                      <div className="p-2 border-b border-gray-100 dark:border-gray-800 text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center justify-between">
                        <span>{cxSearchQuery.length > 0 ? `Matching Customers (${cxSuggestions.length})` : 'Frequent / Repeat Customers'}</span>
                        <button
                          type="button"
                          onClick={() => setShowCxDropdown(false)}
                          className="hover:text-red-500 text-[10px]"
                        >
                          Close ✕
                        </button>
                      </div>
                      {(cxSearchQuery.length > 0 ? cxSuggestions : recentRepeatCustomers).map((cx: any) => (
                        <button
                          key={cx.phone}
                          type="button"
                          onClick={() => selectCustomer(cx)}
                          className="w-full text-left p-2.5 hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors flex items-center justify-between border-b border-gray-50 dark:border-gray-800/50 last:border-b-0"
                        >
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                              {cx.name || 'Customer'}
                              {cx.orderCount > 1 && (
                                <span className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[9px] font-black px-1.5 py-0.2 rounded">
                                  ⭐ {cx.orderCount} Orders
                                </span>
                              )}
                              {cx.orderCount === 1 && (
                                <span className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[9px] font-black px-1.5 py-0.2 rounded">
                                  1 Order
                                </span>
                              )}
                            </span>
                            <span className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-0.5">
                              <span>📞 {cx.phone}</span>
                              {cx.accountType && <span className="text-[9px] opacity-75">({cx.accountType})</span>}
                            </span>
                            {cx.address && (
                              <span className="text-[10px] text-gray-400 truncate max-w-[280px]">
                                📍 {cx.address}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-black text-primary bg-primary/10 px-2 py-1 rounded-lg">
                            Select ↵
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Chips of Frequent Repeat Customers */}
                {recentRepeatCustomers.length > 0 && !selectedRepeatCustomer && (
                  <div className="mt-2.5">
                    <div className="text-[9px] font-black uppercase tracking-wider text-text-secondary mb-1 flex items-center gap-1">
                      <span>⚡ Frequent Repeat Customers:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {recentRepeatCustomers.slice(0, 5).map((cx: any) => (
                        <button
                          key={cx.phone}
                          type="button"
                          onClick={() => selectCustomer(cx)}
                          className="bg-white/90 dark:bg-black/40 border border-primary/20 hover:border-primary text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 hover:bg-primary/10 shadow-sm"
                        >
                          <span>👤 {cx.name?.split(' ')[0] || 'Customer'}</span>
                          <span className="text-primary font-black">({cx.orderCount || 1}★)</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Active Selected Repeat Customer Banner */}
                {selectedRepeatCustomer && (
                  <div className="mt-3 bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-sm">
                        ⭐
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-gray-900 dark:text-gray-100">
                            {selectedRepeatCustomer.name}
                          </span>
                          <span className="bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                            {selectedRepeatCustomer.orderCount} Past {selectedRepeatCustomer.orderCount === 1 ? 'Order' : 'Orders'}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-600 dark:text-gray-300 mt-0.5">
                          📞 {selectedRepeatCustomer.phone}
                          {selectedRepeatCustomer.lastOrderDate ? ` • Last: ${selectedRepeatCustomer.lastOrderDate}` : ''}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRepeatCustomer(null);
                      }}
                      className="text-[10px] font-black text-rose-500 hover:text-rose-600 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 px-2.5 py-1 rounded-lg transition-all"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-text-secondary ml-1">Customer Name</label>
                  <input
                    type="text"
                    className="w-full bg-white/50 border border-black/5 rounded-2xl px-4 py-3 outline-none focus:border-primary transition-colors"
                    placeholder="John Doe"
                    value={walkinForm.name}
                    onChange={e => setWalkinForm({ ...walkinForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase text-text-secondary ml-1">Phone Number</label>
                    {detectedCustomer && !selectedRepeatCustomer && (
                      <button
                        type="button"
                        onClick={() => selectCustomer(detectedCustomer)}
                        className="text-[10px] font-black text-primary bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-md transition-colors animate-pulse"
                      >
                        ✨ Found: {detectedCustomer.name} ({detectedCustomer.orderCount} Orders) [Auto-fill]
                      </button>
                    )}
                  </div>
                  <input
                    type="tel"
                    className="w-full bg-white/50 border border-black/5 rounded-2xl px-4 py-3 outline-none focus:border-primary transition-colors"
                    placeholder="9876543210"
                    value={walkinForm.phone}
                    onChange={e => setWalkinForm({ ...walkinForm, phone: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-text-secondary ml-1">Order Source</label>
                    <div className="flex gap-2 mt-1">
                      {['Walk-in', 'WhatsApp'].map(src => (
                        <button key={src} type="button"
                          className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all flex-1 ${walkinForm.source === src ? (src === 'WhatsApp' ? 'bg-[#25D366] text-white border-[#25D366]' : 'bg-primary text-white border-primary') : 'bg-white/50 border-black/10 text-text-secondary hover:border-primary/30'
                            }`}
                          onClick={() => setWalkinForm({ ...walkinForm, source: src, sourceSegment: src === 'WhatsApp' ? 'SM' : (walkinForm.sourceSegment || 'RF') })}
                        >
                          {src === 'WhatsApp' && <i className="fab fa-whatsapp mr-1 text-sm"></i>}
                          {src}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-text-secondary ml-1">Account Type</label>
                    <select
                      className="w-full bg-white/50 border border-black/5 rounded-2xl px-3 py-2.5 mt-1 text-xs font-black uppercase outline-none focus:border-primary transition-colors cursor-pointer"
                      value={walkinForm.cx_type || 'Residential'}
                      onChange={e => setWalkinForm({ ...walkinForm, cx_type: e.target.value })}
                    >
                      <option value="Residential">Residential</option>
                      <option value="Business">Business</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-text-secondary ml-1">Acquisition Segment</label>
                    <select
                      className="w-full bg-white/50 border border-black/5 rounded-2xl px-3 py-2.5 mt-1 text-xs font-black uppercase outline-none focus:border-primary transition-colors cursor-pointer"
                      value={walkinForm.sourceSegment || (walkinForm.source === 'WhatsApp' ? 'SM' : 'RF')}
                      onChange={e => setWalkinForm({ ...walkinForm, sourceSegment: e.target.value })}
                    >
                      <option value="NP">NP · NewsPaper</option>
                      <option value="SM">SM · Social Media</option>
                      <option value="RF">RF · Reference</option>
                      <option value="WS">WS · Website Directly</option>
                      <option value="AP">AP · App Directly</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2 py-2">
                  <input
                    type="checkbox"
                    id="wantsDelivery"
                    className="w-4 h-4 accent-primary rounded cursor-pointer"
                    checked={walkinForm.source === 'WhatsApp' || (walkinForm.address !== '' && walkinForm.address !== 'Store Walk-in')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setWalkinForm({ ...walkinForm, address: walkinForm.address === 'Store Walk-in' || !walkinForm.address ? 'Store Delivery' : walkinForm.address });
                      } else {
                        setWalkinForm({ ...walkinForm, address: '' });
                      }
                    }}
                  />
                  <label htmlFor="wantsDelivery" className="text-xs font-black uppercase text-text-primary cursor-pointer select-none">
                    🚚 Customer wants Home Delivery?
                  </label>
                </div>

                {(walkinForm.source === 'WhatsApp' || (walkinForm.address !== '' && walkinForm.address !== 'Store Walk-in')) && (
                  <div>
                    <label className="text-[10px] font-black uppercase text-text-secondary ml-1">Delivery Address / Home Location</label>
                    <input
                      type="text"
                      className="w-full bg-white/50 border border-black/5 rounded-2xl px-4 py-3 outline-none focus:border-primary transition-colors"
                      placeholder="Enter home delivery address"
                      value={walkinForm.address === 'Store Delivery' ? '' : walkinForm.address}
                      onChange={e => setWalkinForm({ ...walkinForm, address: e.target.value })}
                    />
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mb-2">
                  {dynamicCategories.map(cat => (
                    <button key={cat} type="button"
                      className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all ${selectedWalkinCat === cat ? 'bg-primary text-white border-primary' : 'bg-white/50 border-black/10 text-text-secondary hover:border-primary/30'
                        }`}
                      onClick={() => { setSelectedWalkinCat(cat); setWalkinForm({ ...walkinForm, searchQuery: '' }); }}
                    >{cat}</button>
                  ))}
                </div>
                <div>
                  <input
                    type="text"
                    autoFocus
                    className="w-full bg-white/50 border-2 border-primary/20 rounded-2xl px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-sm font-bold"
                    placeholder="🔍 Search service by name..."
                    value={walkinForm.searchQuery}
                    onChange={e => setWalkinForm({ ...walkinForm, searchQuery: e.target.value })}
                  />
                </div>

                <div className="bg-white/30 border border-black/5 rounded-2xl max-h-40 overflow-y-auto custom-scrollbar">
                  {rates
                    .filter(r => {
                      const query = walkinForm.searchQuery.trim().toLowerCase();
                      if (!query) {
                        // No search: filter by selected category
                        return r.category?.toLowerCase() === selectedWalkinCat.toLowerCase();
                      }
                      // Live search: look across all properties
                      const itemName = (r.item || "").toLowerCase();
                      const serviceType = (r.serviceType || "").toLowerCase();
                      const category = (r.category || "").toLowerCase();
                      return itemName.includes(query) ||
                        serviceType.includes(query) ||
                        category.includes(query);
                    })
                    .sort((a: any, b: any) => {
                      const priceA = Number(a.price) || 0;
                      const priceB = Number(b.price) || 0;
                      if (priceA !== priceB) return priceA - priceB;
                      return (a.item || '').localeCompare(b.item || '');
                    })
                    .map((r, idx) => (
                      <div key={`${r.item}-${idx}`} className="flex items-center border-b border-black/5 last:border-0 hover:bg-primary/5 transition-colors">
                        {/* Main item button */}
                        <button type="button"
                          className="flex-1 flex justify-between items-center px-4 py-2.5 text-sm"
                          onClick={() => {
                            const fullName = r.serviceType ? `${r.serviceType} (${r.item})` : r.item;
                            const existingIdx = walkinForm.selectedServices.findIndex(s => s.name === fullName);
                            let newList = [...walkinForm.selectedServices];
                            if (existingIdx > -1) {
                              newList[existingIdx].qty += 1;
                            } else {
                              newList.push({ name: fullName, price: r.price, qty: 1 });
                            }
                            setWalkinForm({ ...walkinForm, selectedServices: newList, total: recalcTotal(newList, walkinForm.discount), searchQuery: '' });
                          }}
                        >
                          <span className="font-medium text-left">{r.serviceType ? `${r.serviceType}: ` : ''}{r.item}</span>
                          <span className="font-black text-primary shrink-0 ml-2">₹{r.price}</span>
                        </button>
                      </div>
                    ))
                  }
                  {rates.filter(r => {
                    const query = walkinForm.searchQuery.trim().toLowerCase();
                    if (!query) return r.category?.toLowerCase() === selectedWalkinCat.toLowerCase();
                    const itemName = (r.item || "").toLowerCase();
                    const serviceType = (r.serviceType || "").toLowerCase();
                    const category = (r.category || "").toLowerCase();
                    return itemName.includes(query) || serviceType.includes(query) || category.includes(query);
                  }).length === 0 && (
                      <div className="px-4 py-8 text-center">
                        <p className="text-xs text-text-secondary font-bold uppercase tracking-widest">No matching services found</p>
                      </div>
                    )}
                  {walkinForm.searchQuery.trim() !== '' && (
                    <button type="button"
                      className="w-full flex justify-between items-center px-4 py-3 text-xs hover:bg-primary/10 transition-colors border-t border-black/5 bg-primary/5 text-primary font-bold"
                      onClick={() => {
                        const customName = walkinForm.searchQuery.trim();
                        let newList = [...walkinForm.selectedServices];
                        newList.push({ name: customName, price: 0, qty: 1, isCustom: true, description: '' });
                        setWalkinForm({
                          ...walkinForm,
                          selectedServices: newList,
                          total: recalcTotal(newList, walkinForm.discount, walkinForm.totalMode, walkinForm.adjustment),
                          searchQuery: ''
                        });
                      }}
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <span className="text-sm">✨</span> Add Custom Item: "{walkinForm.searchQuery.trim()}"
                      </span>
                      <span className="font-black text-primary shrink-0 ml-2">Set Price Below</span>
                    </button>
                  )}
                </div>

                {walkinForm.selectedServices.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-primary mb-2">Selected Services</p>
                    <div className="bg-primary/5 rounded-2xl p-4 space-y-2 border border-primary/10 max-h-48 overflow-y-auto custom-scrollbar">
                      {walkinForm.selectedServices.map((s, idx) => (
                        <div key={idx} className={`flex justify-between items-start bg-white/50 p-3 rounded-xl ${s.isCustom ? 'border border-primary/40 bg-primary/5' : ''}`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <p className="text-xs font-bold truncate pr-2">{s.name}</p>
                              {s.isCustom && <span className="text-[8px] font-black px-1.5 py-0.5 bg-primary/20 text-primary rounded">✨ CUSTOM</span>}
                            </div>
                            {s.isCustom && s.description && (
                              <p className="text-[8px] text-text-secondary italic mb-1 truncate">{s.description}</p>
                            )}
                            {s.isCustom && (
                              <input
                                type="text"
                                className="w-full bg-white border border-black/5 rounded px-1.5 py-0.5 text-[9px] mb-1 outline-none focus:border-primary transition-all"
                                placeholder="Add description (optional)"
                                value={s.description || ''}
                                onChange={e => {
                                  let newList = [...walkinForm.selectedServices];
                                  newList[idx].description = e.target.value;
                                  setWalkinForm({ ...walkinForm, selectedServices: newList });
                                }}
                              />
                            )}
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-[9px] text-text-secondary">₹</span>
                              <input
                                type="number"
                                className="bg-white border border-black/5 rounded px-1.5 py-0.5 text-[10px] font-bold w-16 text-primary outline-none focus:border-primary transition-all shadow-sm"
                                value={s.price === 0 ? '' : s.price}
                                placeholder="0"
                                onChange={e => {
                                  const p = parseFloat(e.target.value) || 0;
                                  let newList = [...walkinForm.selectedServices];
                                  newList[idx].price = p;
                                  setWalkinForm({
                                    ...walkinForm,
                                    selectedServices: newList,
                                    total: recalcTotal(newList, walkinForm.discount, walkinForm.totalMode, walkinForm.adjustment)
                                  });
                                }}
                              />
                              <span className="text-[9px] text-text-secondary">each</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 ml-2">
                            <div className="flex items-center bg-white rounded-lg border border-black/5 overflow-hidden">
                              <button
                                className="px-2 py-1 text-xs hover:bg-black/5 font-black"
                                onClick={() => {
                                  let newList = [...walkinForm.selectedServices];
                                  if (newList[idx].qty > 1) {
                                    newList[idx].qty -= 1;
                                    setWalkinForm({ ...walkinForm, selectedServices: newList, total: recalcTotal(newList, walkinForm.discount, walkinForm.totalMode, walkinForm.adjustment) });
                                  } else {
                                    const filteredList = newList.filter((_, i) => i !== idx);
                                    setWalkinForm({ ...walkinForm, selectedServices: filteredList, total: recalcTotal(filteredList, walkinForm.discount, walkinForm.totalMode, walkinForm.adjustment) });
                                  }
                                }}
                              >-</button>
                              <span className="px-2 py-1 text-xs font-black bg-primary/5">{s.qty}</span>
                              <button
                                className="px-2 py-1 text-xs hover:bg-black/5 font-black"
                                onClick={() => {
                                  let newList = [...walkinForm.selectedServices];
                                  newList[idx].qty += 1;
                                  setWalkinForm({ ...walkinForm, selectedServices: newList, total: recalcTotal(newList, walkinForm.discount, walkinForm.totalMode, walkinForm.adjustment) });
                                }}
                              >+</button>
                            </div>
                            <span className="text-xs font-black text-primary w-12 text-right">₹{s.price * s.qty}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <label className="text-[10px] font-black uppercase text-text-secondary ml-1">Order Date (Optional for Import)</label>
                  <input
                    type="datetime-local"
                    className="w-full bg-white/50 border border-black/5 rounded-2xl px-4 py-3 outline-none focus:border-primary transition-colors"
                    onChange={e => {
                      const dateStr = new Date(e.target.value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
                      setWalkinForm({ ...walkinForm, timestamp: dateStr });
                    }}
                  />
                </div>
                {/* Pricing Section */}
                <div className="mt-4 space-y-3">
                  {/* Discount row */}
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase text-text-secondary ml-1">Discount (%)</label>
                    <span className="text-[10px] font-black text-text-secondary mr-1">
                      Auto Total: <span className="text-primary">₹{recalcTotal(walkinForm.selectedServices, walkinForm.discount)}</span>
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0" max="100"
                    className="w-full bg-white/50 border border-black/5 rounded-2xl px-4 py-3 outline-none focus:border-primary transition-colors font-bold text-orange-600"
                    placeholder="0"
                    value={walkinForm.discount}
                    onChange={e => {
                      const d = e.target.value;
                      setWalkinForm({
                        ...walkinForm,
                        discount: d,
                        total: recalcTotal(walkinForm.selectedServices, d)
                      });
                    }}
                  />

                  {/* Grand Total pill */}
                  <div className="flex justify-between items-center bg-primary/10 rounded-2xl px-5 py-4 border border-primary/20">
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Grand Total</span>
                    <span className="text-3xl font-black text-primary">₹{walkinForm.total}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button className="btn-primary flex-1 py-4 shadow-xl shadow-primary/30" onClick={handleSaveWalkin}>Place Order</button>
                <button
                  type="button"
                  className="px-6 py-4 font-black uppercase text-[10px] tracking-widest text-text-secondary hover:text-red-500 transition-colors"
                  onClick={() => {
                    setShowWalkinModal(false);
                    setSelectedRepeatCustomer(null);
                    setDetectedCustomer(null);
                    setCxSearchQuery('');
                    setShowCxDropdown(false);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
 
        {/* Edit Order Modal */}
        {showEditOrderModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="glass-card w-full max-w-xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
              <h3 className="text-2xl font-black mb-6 flex items-center gap-3">
                <span className="text-primary text-3xl">✏️</span> Edit Order Details
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-text-secondary ml-1">Customer Name</label>
                    <input
                      type="text"
                      className="w-full bg-white/50 border border-black/5 rounded-2xl px-4 py-3 outline-none focus:border-primary transition-colors text-sm font-bold"
                      placeholder="John Doe"
                      value={editOrderForm.name}
                      onChange={e => setEditOrderForm({ ...editOrderForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-text-secondary ml-1">Phone Number</label>
                    <input
                      type="tel"
                      className="w-full bg-white/50 border border-black/5 rounded-2xl px-4 py-3 outline-none focus:border-primary transition-colors text-sm font-bold"
                      placeholder="9876543210"
                      value={editOrderForm.phone}
                      onChange={e => setEditOrderForm({ ...editOrderForm, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-text-secondary ml-1">Address / Delivery Location</label>
                  <input
                    type="text"
                    className="w-full bg-white/50 border border-black/5 rounded-2xl px-4 py-3 outline-none focus:border-primary transition-colors text-sm font-bold"
                    placeholder="Enter exact address"
                    value={editOrderForm.address}
                    onChange={e => setEditOrderForm({ ...editOrderForm, address: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-text-secondary ml-1">Order Source</label>
                    <select
                      value={editOrderForm.source}
                      onChange={e => setEditOrderForm({ ...editOrderForm, source: e.target.value })}
                      className="w-full bg-white/50 border border-black/5 rounded-2xl px-4 py-3 text-xs font-black uppercase outline-none focus:border-primary transition-colors cursor-pointer"
                    >
                      <option value="Walk-in">Walk-in</option>
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="App">App</option>
                      <option value="Excel Import">Excel Import</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-text-secondary ml-1">Account Type</label>
                    <select
                      value={editOrderForm.cx_type || "Residential"}
                      onChange={e => setEditOrderForm({ ...editOrderForm, cx_type: e.target.value })}
                      className="w-full bg-white/50 border border-black/5 rounded-2xl px-4 py-3 text-xs font-black uppercase outline-none focus:border-primary transition-colors cursor-pointer"
                    >
                      <option value="Residential">Residential</option>
                      <option value="Business">Business</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-text-secondary ml-1">Acquisition Segment</label>
                    <select
                      value={editOrderForm.sourceSegment || "RF"}
                      onChange={e => setEditOrderForm({ ...editOrderForm, sourceSegment: e.target.value })}
                      className="w-full bg-white/50 border border-black/5 rounded-2xl px-4 py-3 text-xs font-black uppercase outline-none focus:border-primary transition-colors cursor-pointer"
                    >
                      <option value="NP">NP · NewsPaper</option>
                      <option value="SM">SM · Social Media</option>
                      <option value="RF">RF · Reference</option>
                      <option value="WS">WS · Website Directly</option>
                      <option value="AP">AP · App Directly</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 bg-white/40 border border-black/5 rounded-2xl p-4">
                  <div>
                    <label className="text-[9px] font-black uppercase text-text-secondary mb-1 block">📌 Order Status</label>
                    <select
                      value={editOrderForm.status}
                      onChange={e => setEditOrderForm({ ...editOrderForm, status: e.target.value })}
                      className="w-full bg-transparent text-xs font-bold outline-none cursor-pointer"
                    >
                      <option value="Pending">PENDING</option>
                      <option value="Out for Pickup">OUT FOR PICKUP</option>
                      <option value="Pickup done">PICKUP DONE</option>
                      <option value="Delivered at store">DELIVERED AT STORE</option>
                      <option value="Processing">PROCESSING</option>
                      <option value="Washing">WASHING</option>
                      <option value="Drying">DRYING</option>
                      <option value="Ironing">IRONING</option>
                      <option value="Ready">READY</option>
                      <option value="Out for Delivery">OUT FOR DELIVERY</option>
                      <option value="Delivered">DELIVERED</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-black uppercase text-text-secondary mb-1 block">💳 Payment Status</label>
                    <select
                      value={editOrderForm.paymentStatus}
                      onChange={e => setEditOrderForm({ ...editOrderForm, paymentStatus: e.target.value })}
                      className="w-full bg-transparent text-xs font-bold outline-none cursor-pointer"
                    >
                      <option value="Unpaid">UNPAID</option>
                      <option value="Paid">PAID</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-black uppercase text-text-secondary mb-1 block">🛵 Assigned Rider</label>
                    <select
                      value={editOrderForm.assignedRiderId || ""}
                      onChange={e => setEditOrderForm({ ...editOrderForm, assignedRiderId: e.target.value })}
                      className="w-full bg-transparent text-xs font-bold outline-none cursor-pointer"
                    >
                      <option value="">Unassigned</option>
                      {riders.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 1. CURRENT ORDER ITEMS SECTION (Shown First!) */}
                <div className="pt-2 border-t border-black/5">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                      <span>📦</span> Current Order Items ({editOrderForm.selectedServices.length})
                    </p>
                    <span className="text-[10px] font-bold text-text-secondary">
                      Subtotal: ₹{editOrderForm.selectedServices.reduce((acc: number, curr: any) => acc + (curr.price * curr.qty), 0)}
                    </span>
                  </div>

                  {editOrderForm.selectedServices.length === 0 ? (
                    <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-center">
                      <p className="text-xs text-orange-700 font-bold">No items in this order yet. Use the search below to add items.</p>
                    </div>
                  ) : (
                    <div className="bg-primary/5 rounded-2xl p-4 space-y-2 border border-primary/10 max-h-56 overflow-y-auto custom-scrollbar">
                      {editOrderForm.selectedServices.map((s: any, idx: number) => (
                        <div key={idx} className={`flex justify-between items-start bg-white/70 p-3 rounded-xl border border-black/5 shadow-xs ${s.isCustom ? 'border-primary/40 bg-primary/5' : ''}`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <p className="text-xs font-black truncate pr-2 text-text-primary">{s.name}</p>
                              {s.isCustom && <span className="text-[8px] font-black px-1.5 py-0.5 bg-primary/20 text-primary rounded">✨ CUSTOM</span>}
                            </div>
                            {s.isCustom && s.description && (
                              <p className="text-[8px] text-text-secondary italic mb-1 truncate">{s.description}</p>
                            )}
                            {s.isCustom && (
                              <input
                                type="text"
                                className="w-full bg-white border border-black/10 rounded px-2 py-1 text-[9px] mb-1 outline-none focus:border-primary transition-all"
                                placeholder="Add description (optional)"
                                value={s.description || ''}
                                onChange={e => {
                                  let newList = [...editOrderForm.selectedServices];
                                  newList[idx].description = e.target.value;
                                  setEditOrderForm({ ...editOrderForm, selectedServices: newList });
                                }}
                              />
                            )}
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-[9px] text-text-secondary">₹</span>
                              <input
                                type="number"
                                className="bg-white border border-black/15 rounded px-2 py-0.5 text-[10px] font-bold w-16 text-primary outline-none focus:border-primary transition-all shadow-sm"
                                value={s.price === 0 ? '' : s.price}
                                placeholder="0"
                                onChange={e => {
                                  const p = parseFloat(e.target.value) || 0;
                                  let newList = [...editOrderForm.selectedServices];
                                  newList[idx].price = p;
                                  setEditOrderForm({
                                    ...editOrderForm,
                                    selectedServices: newList,
                                    total: recalcTotal(newList, editOrderForm.discount, editOrderForm.totalMode, editOrderForm.adjustment, editOrderForm.deliveryFee)
                                  });
                                }}
                              />
                              <span className="text-[9px] text-text-secondary">each</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 ml-2">
                            <div className="flex items-center bg-white rounded-lg border border-black/5 overflow-hidden">
                              <button
                                className="px-2 py-1 text-xs hover:bg-black/5 font-black"
                                onClick={() => {
                                  let newList = [...editOrderForm.selectedServices];
                                  if (newList[idx].qty > 1) {
                                    newList[idx].qty -= 1;
                                    setEditOrderForm({ ...editOrderForm, selectedServices: newList, total: recalcTotal(newList, editOrderForm.discount, editOrderForm.totalMode, editOrderForm.adjustment, editOrderForm.deliveryFee) });
                                  } else {
                                    const filteredList = newList.filter((_, i) => i !== idx);
                                    setEditOrderForm({ ...editOrderForm, selectedServices: filteredList, total: recalcTotal(filteredList, editOrderForm.discount, editOrderForm.totalMode, editOrderForm.adjustment, editOrderForm.deliveryFee) });
                                  }
                                }}
                              >-</button>
                              <span className="px-2 py-1 text-xs font-black bg-primary/5">{s.qty}</span>
                              <button
                                className="px-2 py-1 text-xs hover:bg-black/5 font-black"
                                onClick={() => {
                                  let newList = [...editOrderForm.selectedServices];
                                  newList[idx].qty += 1;
                                  setEditOrderForm({ ...editOrderForm, selectedServices: newList, total: recalcTotal(newList, editOrderForm.discount, editOrderForm.totalMode, editOrderForm.adjustment, editOrderForm.deliveryFee) });
                                }}
                              >+</button>
                            </div>
                            <span className="text-xs font-black text-primary w-12 text-right">₹{s.price * s.qty}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. ADD MORE SERVICES FROM RATE CARD (Clean & clearly separated) */}
                <div className="mt-4 pt-3 border-t border-black/5 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <span>➕</span> Add Items from Rate Card
                    </p>
                    <span className="text-[9px] font-bold text-slate-400">Optional</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {dynamicCategories.map(cat => (
                      <button key={cat} type="button"
                        className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border transition-all ${
                          selectedWalkinCat === cat ? 'bg-primary text-white border-primary shadow-xs' : 'bg-white border-slate-200 text-slate-600 hover:border-primary/40'
                        }`}
                        onClick={() => { setSelectedWalkinCat(cat); }}
                      >{cat}</button>
                    ))}
                  </div>

                  <div className="mb-2">
                    <input
                      type="text"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all text-xs font-bold placeholder:text-slate-400"
                      placeholder="🔍 Search service name (e.g. Shirt, Kurta, Dry Clean)..."
                      value={editOrderForm.searchQuery}
                      onChange={e => setEditOrderForm({ ...editOrderForm, searchQuery: e.target.value })}
                    />
                  </div>

                  {/* Rate list results (Shows when searching or browsing) */}
                  <div className="bg-white border border-slate-200 rounded-xl max-h-36 overflow-y-auto custom-scrollbar divide-y divide-slate-100">
                    {rates
                      .filter(r => {
                        const query = editOrderForm.searchQuery.trim().toLowerCase();
                        if (!query) {
                          return r.category?.toLowerCase() === selectedWalkinCat.toLowerCase();
                        }
                        const itemName = (r.item || "").toLowerCase();
                        const serviceType = (r.serviceType || "").toLowerCase();
                        const category = (r.category || "").toLowerCase();
                        return itemName.includes(query) || serviceType.includes(query) || category.includes(query);
                      })
                      .sort((a: any, b: any) => {
                        const priceA = Number(a.price) || 0;
                        const priceB = Number(b.price) || 0;
                        if (priceA !== priceB) return priceA - priceB;
                        return (a.item || '').localeCompare(b.item || '');
                      })
                      .map((r, idx) => (
                        <div key={`${r.item}-${idx}`} className="flex items-center hover:bg-primary/5 transition-colors">
                          <button type="button"
                            className="flex-1 flex justify-between items-center px-3.5 py-2 text-xs font-semibold text-slate-700"
                            onClick={() => {
                              const fullName = r.serviceType ? `${r.serviceType} (${r.item})` : r.item;
                              const existingIdx = editOrderForm.selectedServices.findIndex((s: any) => s.name === fullName);
                              let newList = [...editOrderForm.selectedServices];
                              if (existingIdx > -1) {
                                newList[existingIdx].qty += 1;
                              } else {
                                newList.push({ name: fullName, price: r.price, qty: 1 });
                              }
                              setEditOrderForm({ 
                                ...editOrderForm, 
                                selectedServices: newList, 
                                total: recalcTotal(newList, editOrderForm.discount, editOrderForm.totalMode, editOrderForm.adjustment, editOrderForm.deliveryFee), 
                                searchQuery: '' 
                              });
                            }}
                          >
                            <span className="text-left truncate">{r.serviceType ? `${r.serviceType}: ` : ''}{r.item}</span>
                            <span className="font-black text-primary shrink-0 ml-2 bg-primary/10 px-2 py-0.5 rounded text-[10px]">+ ₹{r.price}</span>
                          </button>
                        </div>
                      ))
                    }
                    {rates.filter(r => {
                      const query = editOrderForm.searchQuery.trim().toLowerCase();
                      if (!query) return r.category?.toLowerCase() === selectedWalkinCat.toLowerCase();
                      const itemName = (r.item || "").toLowerCase();
                      const serviceType = (r.serviceType || "").toLowerCase();
                      const category = (r.category || "").toLowerCase();
                      return itemName.includes(query) || serviceType.includes(query) || category.includes(query);
                    }).length === 0 && (
                      <div className="px-3 py-4 text-center">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">No matching services found</p>
                      </div>
                    )}
                    {editOrderForm.searchQuery.trim() !== '' && (
                      <button type="button"
                        className="w-full flex justify-between items-center px-3.5 py-2.5 text-xs hover:bg-primary/10 transition-colors bg-primary/5 text-primary font-bold"
                        onClick={() => {
                          const customName = editOrderForm.searchQuery.trim();
                          let newList = [...editOrderForm.selectedServices];
                          newList.push({ name: customName, price: 0, qty: 1, isCustom: true, description: '' });
                          setEditOrderForm({
                            ...editOrderForm,
                            selectedServices: newList,
                            total: recalcTotal(newList, editOrderForm.discount, editOrderForm.totalMode, editOrderForm.adjustment, editOrderForm.deliveryFee),
                            searchQuery: ''
                          });
                        }}
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <span>✨</span> Add Custom Item: "{editOrderForm.searchQuery.trim()}"
                        </span>
                        <span className="font-black text-primary shrink-0 ml-2">Set Price Above</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Pricing & Adjustments */}
                <div className="mt-4 space-y-3 pt-3 border-t border-black/5">
                  {/* Delivery Charges & 3rd Party Rider (On top of Discount) */}
                  <div className="bg-primary/5 border border-primary/10 rounded-2xl p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase text-primary tracking-wider">
                        Delivery Charges (₹)
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={editOrderForm.paidTo3rdPartyRider}
                          onChange={e => setEditOrderForm({ ...editOrderForm, paidTo3rdPartyRider: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary cursor-pointer"
                        />
                        <span className="text-[11px] font-bold text-gray-700">
                          Paid to 3rd party rider
                        </span>
                      </label>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        className="w-full bg-white border border-black/10 rounded-xl pl-8 pr-4 py-2 outline-none focus:border-primary transition-colors font-bold text-sm text-gray-900"
                        placeholder="0"
                        value={editOrderForm.deliveryFee}
                        onChange={e => {
                          const fee = e.target.value;
                          setEditOrderForm({
                            ...editOrderForm,
                            deliveryFee: fee,
                            total: recalcTotal(editOrderForm.selectedServices, editOrderForm.discount, editOrderForm.totalMode, editOrderForm.adjustment, fee)
                          });
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase text-text-secondary ml-1">Discount (%)</label>
                      <input
                        type="number"
                        min="0" max="100"
                        className="w-full bg-white/50 border border-black/5 rounded-2xl px-4 py-2.5 outline-none focus:border-primary transition-colors font-bold text-orange-600"
                        placeholder="0"
                        value={editOrderForm.discount}
                        onChange={e => {
                          const d = e.target.value;
                          setEditOrderForm({
                            ...editOrderForm,
                            discount: d,
                            total: recalcTotal(editOrderForm.selectedServices, d, editOrderForm.totalMode, editOrderForm.adjustment, editOrderForm.deliveryFee)
                          });
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-text-secondary ml-1">Calculation Mode</label>
                      <select
                        value={editOrderForm.totalMode}
                        onChange={e => {
                          const mode = e.target.value;
                          setEditOrderForm({
                            ...editOrderForm,
                            totalMode: mode,
                            total: recalcTotal(editOrderForm.selectedServices, editOrderForm.discount, mode, editOrderForm.adjustment, editOrderForm.deliveryFee)
                          });
                        }}
                        className="w-full bg-white/50 border border-black/5 rounded-2xl px-4 py-2.5 outline-none focus:border-primary transition-colors text-xs font-bold"
                      >
                        <option value="auto">Auto Calculated</option>
                        <option value="adjustment">Custom Adjustment (₹)</option>
                        <option value="manual">Manual Total Override</option>
                      </select>
                    </div>
                  </div>

                  {editOrderForm.totalMode === 'adjustment' && (
                    <div>
                      <label className="text-[10px] font-black uppercase text-text-secondary ml-1">Adjustment (e.g. +50 or -30)</label>
                      <input
                        type="text"
                        className="w-full bg-white/50 border border-black/5 rounded-2xl px-4 py-2.5 outline-none focus:border-primary transition-colors font-bold"
                        placeholder="+50 or -30"
                        value={editOrderForm.adjustment}
                        onChange={e => {
                          const adj = e.target.value;
                          setEditOrderForm({
                            ...editOrderForm,
                            adjustment: adj,
                            total: recalcTotal(editOrderForm.selectedServices, editOrderForm.discount, 'adjustment', adj, editOrderForm.deliveryFee)
                          });
                        }}
                      />
                    </div>
                  )}

                  {editOrderForm.totalMode === 'manual' && (
                    <div>
                      <label className="text-[10px] font-black uppercase text-text-secondary ml-1">Manual Grand Total Override (₹)</label>
                      <input
                        type="number"
                        className="w-full bg-white/50 border border-black/5 rounded-2xl px-4 py-2.5 outline-none focus:border-primary transition-colors font-bold text-primary"
                        placeholder="Enter direct total"
                        value={editOrderForm.total}
                        onChange={e => setEditOrderForm({ ...editOrderForm, total: e.target.value })}
                      />
                    </div>
                  )}

                  {/* Grand Total pill */}
                  <div className="flex justify-between items-center bg-primary/10 rounded-2xl px-5 py-4 border border-primary/20">
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Updated Total</span>
                    <span className="text-3xl font-black text-primary">₹{
                      editOrderForm.totalMode === 'manual' ? editOrderForm.total : recalcTotal(editOrderForm.selectedServices, editOrderForm.discount, editOrderForm.totalMode, editOrderForm.adjustment, editOrderForm.deliveryFee)
                    }</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button className="btn-primary flex-1 py-4 shadow-xl shadow-primary/30" onClick={handleUpdateOrder}>Save Changes</button>
                <button className="px-6 py-4 font-black uppercase text-[10px] tracking-widest text-text-secondary hover:text-red-500 transition-colors" onClick={() => setShowEditOrderModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Modal */}
        {showInventoryModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="glass-card w-full max-w-md p-8 shadow-2xl">
              <h3 className="text-2xl font-black mb-6 text-primary uppercase tracking-tighter">Branch Inventory Update</h3>
              <div className="space-y-4">
                <div className="form-group">
                  <label className="text-[10px] font-black uppercase text-text-secondary">Item Name</label>
                  <input type="text" value={inventoryForm.item} onChange={e => setInventoryForm({ ...inventoryForm, item: e.target.value })} className="w-full bg-white/50 border border-black/5 rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors" placeholder="e.g. Detergent Liquid" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="text-[10px] font-black uppercase text-text-secondary">Stock Quantity</label>
                    <input type="number" value={inventoryForm.quantity} onChange={e => setInventoryForm({ ...inventoryForm, quantity: e.target.value })} className="w-full bg-white/50 border border-black/5 rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors" placeholder="0" />
                  </div>
                  <div className="form-group">
                    <label className="text-[10px] font-black uppercase text-text-secondary">Unit (kg/L/pcs)</label>
                    <input type="text" value={inventoryForm.unit} onChange={e => setInventoryForm({ ...inventoryForm, unit: e.target.value })} className="w-full bg-white/50 border border-black/5 rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors" placeholder="Liters" />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button className="btn-primary flex-1 py-4 uppercase tracking-widest text-[10px]" onClick={handleSaveInventory}>Confirm Update</button>
                <button className="px-6 py-4 font-bold text-text-secondary uppercase tracking-widest text-[10px]" onClick={() => setShowInventoryModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Stock Request Modal */}
        {showStockRequestModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="glass-card w-full max-w-md p-8 shadow-2xl">
              <h3 className="text-2xl font-black mb-6 text-primary uppercase tracking-tighter flex items-center gap-2">
                <span>📨</span> Request Stock From Admin
              </h3>
              <div className="space-y-4">
                <div className="form-group">
                  <label className="text-[10px] font-black uppercase text-text-secondary">Item Name</label>
                  <input
                    type="text"
                    value={stockRequestForm.item}
                    onChange={e => setStockRequestForm({ ...stockRequestForm, item: e.target.value })}
                    className="w-full bg-white/50 border border-black/5 rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors text-sm font-bold"
                    placeholder="e.g. Detergent Liquid"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="text-[10px] font-black uppercase text-text-secondary">Requested Quantity</label>
                    <input
                      type="number"
                      value={stockRequestForm.quantity}
                      onChange={e => setStockRequestForm({ ...stockRequestForm, quantity: e.target.value })}
                      className="w-full bg-white/50 border border-black/5 rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors text-sm font-bold"
                      placeholder="0"
                    />
                  </div>
                  <div className="form-group">
                    <label className="text-[10px] font-black uppercase text-text-secondary">Unit (kg/L/pcs)</label>
                    <input
                      type="text"
                      value={stockRequestForm.unit}
                      onChange={e => setStockRequestForm({ ...stockRequestForm, unit: e.target.value })}
                      className="w-full bg-white/50 border border-black/5 rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors text-sm font-bold"
                      placeholder="e.g. kg"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="text-[10px] font-black uppercase text-text-secondary">Notes / Reason (Optional)</label>
                  <textarea
                    value={stockRequestForm.notes}
                    onChange={e => setStockRequestForm({ ...stockRequestForm, notes: e.target.value })}
                    className="w-full bg-white/50 border border-black/5 rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors text-sm font-bold min-h-[80px]"
                    placeholder="e.g. High order volume this week..."
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button className="btn-primary flex-1 py-4 uppercase tracking-widest text-[10px]" onClick={handleSaveStockRequest}>Submit Request</button>
                <button className="px-6 py-4 font-bold text-text-secondary uppercase tracking-widest text-[10px]" onClick={() => setShowStockRequestModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}



        {/* Invoice Modal */}
        {showInvoiceModal && selectedOrder && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="glass-card w-full max-w-lg overflow-hidden p-0 shadow-2xl rounded-[32px] max-h-[95vh] md:max-h-[90vh] flex flex-col">

              {/* Header */}
              <div className="bg-primary p-6 text-white text-center relative shrink-0">
                <p className="text-[10px] font-black uppercase tracking-[4px] opacity-70 mb-1">Official Invoice</p>
                <h2 className="text-3xl font-black">#{selectedOrder.id}</h2>
                <p className="text-xs opacity-60 mt-1">{storeName}</p>
                <button className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-white/10 rounded-full hover:bg-white/20 transition-colors" onClick={() => setShowInvoiceModal(false)}>✕</button>
              </div>

              <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                {/* Customer + Date */}
                <div className="flex justify-between mb-6 border-b border-black/5 pb-6">
                  <div>
                    <p className="text-[10px] font-black text-text-secondary uppercase mb-1">Customer</p>
                    <p className="font-bold text-lg">{selectedOrder.name}</p>
                    <p className="text-sm text-text-primary font-black text-black">+91 {selectedOrder.phone}</p>
                    <p className="text-xs text-text-secondary mt-1 max-w-[200px]">📍 {selectedOrder.address || 'Store Walk-in'}</p>
                    {selectedOrder.assignedRiderId && (
                      <div className="mt-2 text-[10px] font-bold text-text-primary bg-primary/5 px-2.5 py-1.5 rounded-lg inline-flex flex-col gap-0.5 border border-primary/10">
                        <span className="uppercase text-[8px] font-black tracking-wider text-text-secondary">Assigned Rider</span>
                        <span className="font-black text-primary">ID: {selectedOrder.assignedRiderId}</span>
                        {riders.find(r => r.id === selectedOrder.assignedRiderId) && (
                          <span className="text-[10px] text-text-primary">Name: {riders.find(r => r.id === selectedOrder.assignedRiderId).name}</span>
                        )}
                      </div>
                    )}
                    {!((selectedOrder.source && ['walk-in', 'whatsapp'].includes(selectedOrder.source.toLowerCase()))) && (selectedOrder.pickupCode || selectedOrder.deliveryCode) && (
                      <div className="mt-2 flex gap-2">
                        {selectedOrder.pickupCode && (
                          <div className="text-[10px] font-bold text-text-primary bg-green-50 px-2.5 py-1.5 rounded-lg inline-flex flex-col gap-0.5 border border-green-200">
                            <span className="uppercase text-[8px] font-black tracking-wider text-green-700">Pickup OTP</span>
                            <span className="font-black text-green-800 font-mono text-sm">{selectedOrder.pickupCode}</span>
                          </div>
                        )}
                        {selectedOrder.deliveryCode && (
                          <div className="text-[10px] font-bold text-text-primary bg-blue-50 px-2.5 py-1.5 rounded-lg inline-flex flex-col gap-0.5 border border-blue-200">
                            <span className="uppercase text-[8px] font-black tracking-wider text-blue-700">Delivery/Store PIN</span>
                            <span className="font-black text-blue-800 font-mono text-sm">{selectedOrder.deliveryCode}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-text-secondary uppercase mb-1">Store</p>
                    <p className="font-bold text-sm text-primary">🏪 {storeName}</p>
                    <p className="text-[10px] font-black text-text-secondary uppercase mt-3 mb-1">Date</p>
                    <p className="font-bold text-sm">{selectedOrder.timestamp || new Date().toLocaleDateString('en-IN')}</p>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase mt-2 inline-block ${selectedOrder.source === 'App' ? 'bg-purple-500/10 text-purple-600' :
                        selectedOrder.source === 'Walk-in' ? 'bg-green-500/10 text-green-600' :
                          'bg-blue-500/10 text-blue-600'
                      }`}>{selectedOrder.source || 'Web'}</span>
                    {selectedOrder.sourceSegment && (
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase mt-2 ml-1.5 inline-block ${
                        selectedOrder.sourceSegment === 'NP' ? 'bg-amber-500/15 text-amber-700 border border-amber-500/30' :
                        selectedOrder.sourceSegment === 'SM' ? 'bg-pink-500/15 text-pink-700 border border-pink-500/30' :
                        selectedOrder.sourceSegment === 'RF' ? 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/30' :
                        selectedOrder.sourceSegment === 'AP' ? 'bg-indigo-500/15 text-indigo-700 border border-indigo-500/30' :
                        'bg-cyan-500/15 text-cyan-700 border border-cyan-500/30'
                      }`}>
                        {selectedOrder.sourceSegment === 'NP' ? 'NP · NewsPaper' :
                         selectedOrder.sourceSegment === 'SM' ? 'SM · Social Media' :
                         selectedOrder.sourceSegment === 'RF' ? 'RF · Reference' :
                         selectedOrder.sourceSegment === 'WS' ? 'WS · Website Directly' :
                         selectedOrder.sourceSegment === 'AP' ? 'AP · App Directly' : selectedOrder.sourceSegment}
                      </span>
                    )}
                  </div>
                </div>

                {/* Services — Detailed Invoice Table */}
                <div className="bg-primary/5 rounded-2xl overflow-hidden mb-6 border border-primary/10">
                  {/* Table header */}
                  <div className="flex justify-between items-center px-4 py-2.5 border-b border-primary/20 bg-primary/10">
                    <span className="text-[9px] font-black uppercase tracking-[3px] text-primary">Order Details</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-primary/60">Amount</span>
                  </div>

                  {(() => {
                    let allItems = (Array.isArray(selectedOrder.services)
                      ? selectedOrder.services
                      : String(selectedOrder.services).split(',')
                    ).map((s: string) => {
                      let type = 'item';
                      let rawStr = s.trim();
                      if (rawStr.startsWith('Service:')) { type = 'service'; rawStr = rawStr.replace(/^Service:\s*/, ''); }
                      else if (rawStr.startsWith('Product:')) { type = 'product'; rawStr = rawStr.replace(/^Product:\s*/, ''); }
                      const parsed = parseServiceString(rawStr);
                      return { ...parsed, type };
                    });

                    let computedSubtotal = allItems.reduce((acc: number, i: any) => acc + (i.amount || 0), 0);
                    const parsedTotal = parseFloat(selectedOrder.total) || 0;
                    const estimate = getInvoiceEstimate(selectedOrder, allItems);

                    if (computedSubtotal === 0 && parsedTotal > 0 && allItems.length > 0) {
                      const perItemAmount = Math.round(parsedTotal / allItems.length);
                      allItems.forEach((item: any, index: number) => {
                        if (index === allItems.length - 1) {
                          item.amount = parsedTotal - (perItemAmount * (allItems.length - 1));
                        } else {
                          item.amount = perItemAmount;
                        }
                        item.rate = item.qty > 0 ? Math.round(item.amount / item.qty) : item.amount;
                      });
                      computedSubtotal = parsedTotal;
                    } else if (computedSubtotal === 0 && parsedTotal === 0 && estimate.estimated) {
                      allItems = estimate.items.map(item => ({ ...item, type: 'item' }));
                      computedSubtotal = estimate.total;
                    }

                    const subtotal = computedSubtotal;
                    const displayTotal = parsedTotal > 0 ? parsedTotal : estimate.total;
                    const diff = parsedTotal > 0 ? subtotal - parsedTotal : 0;

                    let discountRowUI = null;
                    if (diff > 0 && Math.abs(diff) > 0.01) {
                      let label = 'Adjustment / Discount';
                      if (selectedOrder.discount && parseFloat(selectedOrder.discount) > 0) {
                        label = `Discount (${selectedOrder.discount}%)`;
                      } else if (selectedOrder.totalMode === 'adjustment') {
                        label = 'Adjustment';
                      } else if (selectedOrder.totalMode === 'override') {
                        label = 'Manual Override';
                      }
                      discountRowUI = (
                        <div className="flex justify-between items-center px-4 py-2 bg-green-50/60">
                          <span className="text-[10px] font-black uppercase tracking-widest text-green-700 flex items-center gap-1">
                            <span>🏷️</span> {label}
                          </span>
                          <span className="text-sm font-black text-green-600">− ₹{diff.toFixed(0)}</span>
                        </div>
                      );
                    }

                    const typeLabel: any = { service: { label: '🧺 Service', color: 'text-primary bg-primary/10' }, product: { label: '📦 Product', color: 'text-amber-600 bg-amber-50' }, item: { label: '🧺 Laundry', color: 'text-blue-600 bg-blue-50' } };

                    return (
                      <div>
                        {allItems.map((item: any, idx: number) => (
                          <div
                            key={idx}
                            className={`px-4 py-3.5 border-b border-primary/5 last:border-0 ${idx % 2 === 0 ? 'bg-white/50' : 'bg-white/10'}`}
                          >
                            {/* Top row: number + name + amount */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2 flex-1 min-w-0">
                                <span className="text-[10px] font-black text-text-secondary/30 mt-0.5 shrink-0 w-4">{idx + 1}.</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-black text-text-primary leading-tight">{item.name}</p>
                                  <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded mt-1 inline-block ${typeLabel[item.type]?.color}`}>
                                    {typeLabel[item.type]?.label}
                                  </span>
                                </div>
                              </div>
                              <span className="text-base font-black text-primary shrink-0">
                                {item.amount > 0 ? `₹${item.amount}` : '–'}
                              </span>
                            </div>
                            {/* Bottom row: qty × rate */}
                            {item.amount > 0 && (
                              <div className="flex items-center gap-2 mt-1.5 ml-6">
                                <span className="text-[10px] text-text-secondary font-semibold">{item.qty} pcs</span>
                                <span className="text-[10px] text-text-secondary/40">×</span>
                                <span className="text-[10px] text-text-secondary font-semibold">₹{item.rate} each</span>
                              </div>
                            )}
                          </div>
                        ))}

                        {/* Subtotal */}
                        <div className="flex justify-between items-center px-4 py-2.5 border-t border-primary/20 bg-white/30">
                          <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Subtotal</span>
                          <span className="text-sm font-black text-text-primary">₹{subtotal}</span>
                        </div>

                        {/* Discount row — only if applicable */}
                        {discountRowUI}

                        {estimate.estimated && (
                          <div className="px-4 py-2 bg-amber-50/80 border-y border-amber-200/70">
                            <p className="text-[9px] font-black uppercase tracking-widest text-amber-700">
                              Estimated from rate list because imported amount was 0
                            </p>
                          </div>
                        )}

                        {/* Grand Total */}
                        <div className="flex justify-between items-center px-4 py-3.5 bg-primary text-white">
                          <span className="text-[10px] font-black uppercase tracking-[3px]">Grand Total</span>
                          <span className="text-2xl font-black">₹{displayTotal}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* UPI QR Payment Block & Play Store Download Banner (Side-by-Side) */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {/* Left: UPI QR */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-col items-center justify-center text-center">
                    <p className="text-[9px] font-black uppercase text-text-primary tracking-wider mb-2">Scan &amp; Pay via UPI</p>
                    <img src={PAYMENT_QR_BASE64} alt="UPI QR" className="w-28 h-28 object-contain bg-white p-1.5 rounded-xl border border-slate-200 shadow-xs" />
                    <p className="text-[8px] font-bold text-text-secondary mt-2">GPay • PhonePe • UPI</p>
                  </div>

                  {/* Right: Track & Book / Play Store Download */}
                  <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-3 flex flex-col items-center justify-center text-center">
                    <p className="text-[10px] font-black uppercase text-green-700 tracking-wider mb-2 leading-tight">Track &amp; Book easily</p>
                    <div className="flex flex-col items-center justify-center gap-1.5 text-green-800 font-bold text-xs">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 mb-1">
                        <polygon points="3 2 3 22 20 12"></polygon>
                      </svg>
                      <span>Download App from</span>
                      <span className="text-xs font-black">Play Store</span>
                    </div>
                  </div>
                </div>

                {/* Proof of Service Photos */}
                {(selectedOrder.pickupPhoto || selectedOrder.deliveryPhoto) && (
                  <div className="mb-6 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <p className="text-[10px] font-black text-text-secondary uppercase tracking-wider mb-3">📸 Proof of Service Photos</p>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedOrder.pickupPhoto && (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[9px] font-black uppercase text-primary">📦 Pickup Proof</span>
                          <a 
                            href={selectedOrder.pickupPhoto} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="block rounded-xl overflow-hidden border border-black/10 hover:border-primary transition-all group relative bg-black"
                          >
                            <img src={selectedOrder.pickupPhoto} alt="Pickup Proof" className="w-full h-28 object-cover group-hover:opacity-90" />
                            <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">View Full ↗</span>
                          </a>
                        </div>
                      )}
                      {selectedOrder.deliveryPhoto && (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[9px] font-black uppercase text-green-700">✅ Delivery Proof</span>
                          <a 
                            href={selectedOrder.deliveryPhoto} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="block rounded-xl overflow-hidden border border-black/10 hover:border-green-600 transition-all group relative bg-black"
                          >
                            <img src={selectedOrder.deliveryPhoto} alt="Delivery Proof" className="w-full h-28 object-cover group-hover:opacity-90" />
                            <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">View Full ↗</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-5 gap-2">
                  <button
                    className="btn-primary flex items-center justify-center gap-1 text-[10px] py-3 px-1"
                    onClick={() => printThermal(selectedOrder)}
                  >
                    <span>🖨️</span> Print
                  </button>
                  <button
                    className="glass flex items-center justify-center gap-1 font-black text-[10px] py-3 px-1 hover:bg-green-50 text-green-600 transition-all"
                    onClick={() => openWhatsAppOptions(selectedOrder)}
                  >
                    <span>📱</span> WA
                  </button>
                  <button
                    className="glass flex items-center justify-center gap-1 font-black text-[10px] py-3 px-1 hover:bg-primary/10 hover:text-primary transition-all"
                    onClick={() => downloadPDF(selectedOrder)}
                  >
                    <span>📄</span> PDF
                  </button>
                  <button
                    className="glass flex items-center justify-center gap-1 font-black text-[10px] py-3 px-1 hover:bg-blue-50 text-blue-600 transition-all"
                    onClick={() => { setShowInvoiceModal(false); handleStartEditOrder(selectedOrder); }}
                  >
                    <span>✏️</span> Edit
                  </button>
                  <button
                    className="glass flex items-center justify-center gap-1 font-black text-[10px] py-3 px-1 hover:bg-red-50 hover:text-red-500 transition-all"
                    onClick={() => setShowInvoiceModal(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WhatsApp Message Selection Modal */}
        {showWaModal && waModalOrder && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-black/5 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <span className="text-xl">📱</span> Send WhatsApp Update
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Order #{waModalOrder.id} • {waModalOrder.name}
                  </p>
                </div>
                <button
                  onClick={() => setShowWaModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-black transition-all"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-600 font-medium mb-4">
                Choose the message template you want to send to <span className="font-bold text-slate-800">{waModalOrder.name || 'Customer'}</span> (+91 {waModalOrder.phone}):
              </p>

              <div className="space-y-3">
                {/* Option 1: Order Confirmation (Store Received) */}
                <button
                  onClick={() => {
                    setShowWaModal(false);
                    shareReceivedConfirmation(waModalOrder);
                  }}
                  className="w-full text-left p-4 rounded-2xl border border-green-200 bg-green-50/50 hover:bg-green-100/70 hover:border-green-400 transition-all group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-black text-xs uppercase tracking-wide text-green-800 flex items-center gap-1.5">
                      <span>📦</span> Order Confirmation
                    </span>
                    <span className="text-[10px] bg-green-600 text-white font-bold px-2 py-0.5 rounded-full uppercase">
                      At Store
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Notifies the customer that order has been received at the store with service, pickup date, expected delivery &amp; tracking link.
                  </p>
                </button>

                {/* Option 2: Full Detailed Invoice */}
                <button
                  onClick={() => {
                    setShowWaModal(false);
                    shareOnWhatsapp(waModalOrder);
                  }}
                  className="w-full text-left p-4 rounded-2xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100/70 hover:border-blue-400 transition-all group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-black text-xs uppercase tracking-wide text-blue-800 flex items-center gap-1.5">
                      <span>🧺</span> Full Invoice &amp; Bill
                    </span>
                    <span className="text-[10px] bg-blue-600 text-white font-bold px-2 py-0.5 rounded-full uppercase">
                      ₹{waModalOrder.total}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Detailed bill with line items, total amount due, branch info, address and payment tracking.
                  </p>
                </button>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setShowWaModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-slate-500 hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* EOD Report with Graphs Modal */}
        {showEODModal && (() => {
          const todayDateStr = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
          const todayIsoStr = new Date().toISOString().split('T')[0];

          // Filter today's orders by timestamp, order_date, or received_date
          const todayOrders = orders.filter(o => {
            const ts = String(o.timestamp || o.order_date || '');
            const rcDate = String(o.received_date || '');
            return ts.includes(todayDateStr) || ts.includes(todayIsoStr) || rcDate === todayDateStr;
          });

          const totalOrders = todayOrders.length;
          const totalRevenue = todayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
          const receivedRevenue = todayOrders
            .filter(o => o.paymentStatus === 'Received' || o.payment_status === 'Received')
            .reduce((sum, o) => sum + (Number(o.received_amount !== undefined ? o.received_amount : o.total) || 0), 0);
          const pendingRevenue = Math.max(0, totalRevenue - receivedRevenue);

          const cashRevenue = todayOrders
            .filter(o => (o.paymentStatus === 'Received' || o.payment_status === 'Received') && (o.paymentMode === 'Cash' || o.payment_mode === 'Cash'))
            .reduce((sum, o) => sum + (Number(o.received_amount !== undefined ? o.received_amount : o.total) || 0), 0);

          const onlineRevenue = todayOrders
            .filter(o => (o.paymentStatus === 'Received' || o.payment_status === 'Received') && ((o.paymentMode && o.paymentMode !== 'Cash') || (o.payment_mode && o.payment_mode !== 'Cash')))
            .reduce((sum, o) => sum + (Number(o.received_amount !== undefined ? o.received_amount : o.total) || 0), 0);

          const deliveredCount = todayOrders.filter(o => ['delivered', 'delivered to cx', 'completed'].includes(String(o.status).toLowerCase())).length;
          const inProcessCount = todayOrders.filter(o => ['processing', 'washing', 'drying', 'ironing'].includes(String(o.status).toLowerCase())).length;
          const pendingCount = todayOrders.filter(o => ['pending', 'out for pickup', 'pickup done', 'delivered at store'].includes(String(o.status).toLowerCase())).length;

          // 1. Hourly Breakdown (08:00 to 22:00 in 5 slots)
          const timeSlots = [
            { label: 'Morning (8-11 AM)', range: [8, 11], count: 0, revenue: 0 },
            { label: 'Mid-day (11-2 PM)', range: [11, 14], count: 0, revenue: 0 },
            { label: 'Afternoon (2-5 PM)', range: [14, 17], count: 0, revenue: 0 },
            { label: 'Evening (5-8 PM)', range: [17, 20], count: 0, revenue: 0 },
            { label: 'Night (8-10 PM)', range: [20, 23], count: 0, revenue: 0 },
          ];

          todayOrders.forEach(o => {
            let hour = 12;
            try {
              const d = new Date(o.timestamp);
              if (!isNaN(d.getTime())) hour = d.getHours();
            } catch (_) {}
            const slot = timeSlots.find(s => hour >= s.range[0] && hour < s.range[1]) || timeSlots[1];
            slot.count += 1;
            slot.revenue += Number(o.total) || 0;
          });

          const maxSlotCount = Math.max(...timeSlots.map(s => s.count), 1);

          // 2. Services Breakdown
          const serviceCounts: Record<string, number> = {};
          todayOrders.forEach(o => {
            const raw = Array.isArray(o.services) ? o.services : String(o.services || '').split(',');
            raw.forEach((s: any) => {
              const name = String(s).replace(/^\d+\s*x\s*/, '').replace(/\(₹\d+\)/, '').trim() || 'General Laundry';
              serviceCounts[name] = (serviceCounts[name] || 0) + 1;
            });
          });
          const sortedServices = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
          const maxServiceCount = Math.max(...sortedServices.map(s => s[1]), 1);

          // 3. Payment percentages & Cash vs Online Split
          const totalCollected = cashRevenue + onlineRevenue;
          const cashPct = totalRevenue > 0 ? Math.round((cashRevenue / totalRevenue) * 100) : 0;
          const onlinePct = totalRevenue > 0 ? Math.round((onlineRevenue / totalRevenue) * 100) : 0;
          const pendingPct = totalRevenue > 0 ? Math.max(0, 100 - (cashPct + onlinePct)) : 0;
          const cashCollectedPct = totalCollected > 0 ? Math.round((cashRevenue / totalCollected) * 100) : 0;
          const onlineCollectedPct = totalCollected > 0 ? (100 - cashCollectedPct) : 0;

          // 4. Repeat Customer Rate
          const customerOrderHistoryMap: Record<string, number> = {};
          orders.forEach(o => {
            const p = (o.phone || o.mobile_number || '').replace(/\D/g, '').slice(-10);
            if (p) customerOrderHistoryMap[p] = (customerOrderHistoryMap[p] || 0) + 1;
          });

          let repeatCxOrdersCount = 0;
          let newCxOrdersCount = 0;
          let repeatCxRevenue = 0;
          let newCxRevenue = 0;

          todayOrders.forEach(o => {
            const p = (o.phone || o.mobile_number || '').replace(/\D/g, '').slice(-10);
            const totalCount = customerOrderHistoryMap[p] || 0;
            const isRepeat = Boolean(o.isRepeatCustomer || totalCount > 1);
            if (isRepeat) {
              repeatCxOrdersCount++;
              repeatCxRevenue += (Number(o.total) || 0);
            } else {
              newCxOrdersCount++;
              newCxRevenue += (Number(o.total) || 0);
            }
          });

          const repeatRatePct = totalOrders > 0 ? Math.round((repeatCxOrdersCount / totalOrders) * 100) : 0;
          const newRatePct = totalOrders > 0 ? (100 - repeatRatePct) : 0;

          // 5. Prediction Engine for Tomorrow
          const recentDays = dailyEarningsData.slice(-7);
          const avgDailyOrders = recentDays.length > 0 
            ? (recentDays.reduce((sum, d) => sum + d.count, 0) / recentDays.length)
            : (totalOrders || 4);
          const avgDailyRevenue = recentDays.length > 0
            ? (recentDays.reduce((sum, d) => sum + d.amount, 0) / recentDays.length)
            : (totalRevenue || 2000);

          const tomorrowDayIndex = (new Date().getDay() + 1) % 7;
          const isTomorrowWeekend = tomorrowDayIndex === 0 || tomorrowDayIndex === 6;
          const dayFactor = isTomorrowWeekend ? 1.25 : 1.05;

          const predictedOrdersMin = Math.max(1, Math.round(avgDailyOrders * 0.9 * dayFactor));
          const predictedOrdersMax = Math.max(predictedOrdersMin + 2, Math.round(avgDailyOrders * 1.35 * dayFactor));

          const predictedRevMin = Math.round(avgDailyRevenue * 0.9 * dayFactor);
          const predictedRevMax = Math.round(avgDailyRevenue * 1.35 * dayFactor);

          const predictedTopServices = sortedServices.length > 0 
            ? sortedServices.slice(0, 2).map(([name]) => name).join(' & ') 
            : 'Dry Cleaning & Steam Ironing';

          const recommendedRiders = Math.max(1, Math.ceil(predictedOrdersMax / 5));

          return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-3 md:p-6 overflow-y-auto">
              <div className="bg-white text-slate-900 w-full max-w-4xl rounded-[28px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-slate-200">
                
                {/* Modal Toolbar */}
                <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xl">
                      📊
                    </div>
                    <div>
                      <h3 className="font-black text-lg text-white leading-tight">EOD Graphical Operations Report</h3>
                      <p className="text-xs text-slate-400 font-medium">Visual Analytics &amp; Day Closing Summary</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={exportEODGraphPDF}
                      disabled={isExportingEODPdf}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all uppercase tracking-wider cursor-pointer"
                    >
                      {isExportingEODPdf ? (
                        <span>⏳ Generating PDF...</span>
                      ) : (
                        <><span>📥</span> Export PDF (with Graphs)</>
                      )}
                    </button>
                    <button
                      onClick={exportEODReport}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black px-4 py-2.5 rounded-xl flex items-center gap-2 border border-slate-700 transition-all uppercase tracking-wider cursor-pointer"
                      title="Download 2-sheet raw Excel workbook"
                    >
                      <span>📊</span> Excel
                    </button>
                    <button
                      onClick={() => setShowEODModal(false)}
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors ml-2 cursor-pointer font-bold"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Printable Graphical Report Content */}
                <div id="eod-printable-report" className="p-6 md:p-8 overflow-y-auto flex-1 bg-slate-50 space-y-6 custom-scrollbar">
                  
                  {/* Brand & Branch Banner */}
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-2xl text-blue-600 tracking-tight">Laundry Basket</span>
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">Official EOD Report</span>
                      </div>
                      <p className="text-xs font-bold text-slate-500 mt-1">Branch: <strong className="text-slate-800">{storeName}</strong> ({storeId}) · Unit of Everika</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Report Date</p>
                      <p className="text-xl font-black text-slate-900">{todayDateStr}</p>
                      <p className="text-[10px] font-semibold text-slate-500">Generated at {new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                    </div>
                  </div>

                  {/* KPI Executive Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Sales Today</p>
                      <p className="text-2xl font-black text-blue-600 mt-1">₹{totalRevenue.toLocaleString('en-IN')}</p>
                      <p className="text-[10px] font-bold text-slate-500 mt-1">{totalOrders} orders booked</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                      <p className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Cash In Hand</p>
                      <p className="text-2xl font-black text-emerald-600 mt-1">₹{cashRevenue.toLocaleString('en-IN')}</p>
                      <p className="text-[10px] font-bold text-slate-500 mt-1">{cashPct}% of total revenue</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                      <p className="text-[10px] font-black uppercase text-blue-600 tracking-wider">Online / UPI QR</p>
                      <p className="text-2xl font-black text-blue-600 mt-1">₹{onlineRevenue.toLocaleString('en-IN')}</p>
                      <p className="text-[10px] font-bold text-slate-500 mt-1">{onlinePct}% of total revenue</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                      <p className="text-[10px] font-black uppercase text-amber-600 tracking-wider">Pending Balance</p>
                      <p className="text-2xl font-black text-amber-600 mt-1">₹{pendingRevenue.toLocaleString('en-IN')}</p>
                      <p className="text-[10px] font-bold text-slate-500 mt-1">{pendingPct}% uncollected</p>
                    </div>
                  </div>

                  {/* Graphs Row 1: Hourly Order Flow & Payment Settlement */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Graph 1: Hourly Order Activity (Bar Chart) */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="font-black text-sm text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <span>📈</span> Hourly Order Activity Graph
                          </h4>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-blue-50 text-blue-700">Today</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mb-4">Volume of orders booked by time window</p>
                      </div>

                      <div className="h-44 flex items-end justify-between gap-2 pt-6 pb-2 px-2 border-b border-slate-100">
                        {timeSlots.map((slot, i) => {
                          const heightPct = maxSlotCount > 0 ? Math.max(15, Math.round((slot.count / maxSlotCount) * 100)) : 15;
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                              <span className="text-[10px] font-black text-slate-700">{slot.count}</span>
                              <div 
                                style={{ height: `${heightPct}%` }}
                                className="w-full max-w-[40px] rounded-t-lg bg-gradient-to-t from-blue-600 to-indigo-500 shadow-sm transition-all flex items-center justify-center"
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between pt-2 px-1 text-[9px] font-bold text-slate-500">
                        {timeSlots.map((slot, i) => (
                          <span key={i} className="text-center flex-1 truncate">{slot.label.split(' ')[0]}</span>
                        ))}
                      </div>
                    </div>

                    {/* Graph 2: Revenue Settlement Breakdown (Multi-Segment Visual) */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="font-black text-sm text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <span>💳</span> Revenue Settlement Graph
                          </h4>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Cash vs Online: {cashCollectedPct}% / {onlineCollectedPct}%
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mb-4">Breakdown of collected revenue vs pending amount</p>
                      </div>

                      <div className="my-auto py-2">
                        <div className="w-full h-8 bg-slate-100 rounded-xl overflow-hidden flex shadow-inner border border-slate-200">
                          {cashPct > 0 && (
                            <div 
                              style={{ width: `${cashPct}%` }} 
                              className="bg-emerald-500 flex items-center justify-center text-white text-[10px] font-black truncate px-1 transition-all"
                              title={`Cash: ₹${cashRevenue} (${cashPct}%)`}
                            >
                              Cash {cashPct}%
                            </div>
                          )}
                          {onlinePct > 0 && (
                            <div 
                              style={{ width: `${onlinePct}%` }} 
                              className="bg-blue-600 flex items-center justify-center text-white text-[10px] font-black truncate px-1 transition-all"
                              title={`Online: ₹${onlineRevenue} (${onlinePct}%)`}
                            >
                              Online {onlinePct}%
                            </div>
                          )}
                          {pendingPct > 0 && (
                            <div 
                              style={{ width: `${pendingPct}%` }} 
                              className="bg-amber-400 flex items-center justify-center text-slate-900 text-[10px] font-black truncate px-1 transition-all"
                              title={`Pending: ₹${pendingRevenue} (${pendingPct}%)`}
                            >
                              Pending {pendingPct}%
                            </div>
                          )}
                        </div>

                        {/* Legend */}
                        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/60">
                            <span className="block text-[9px] font-black uppercase text-emerald-800">Cash In Hand</span>
                            <span className="text-xs font-black text-emerald-700">₹{cashRevenue.toLocaleString('en-IN')}</span>
                            <span className="block text-[8px] font-bold text-emerald-600/75 mt-0.5">{cashCollectedPct}% of collected</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200/60">
                            <span className="block text-[9px] font-black uppercase text-blue-800">Online / UPI QR</span>
                            <span className="text-xs font-black text-blue-700">₹{onlineRevenue.toLocaleString('en-IN')}</span>
                            <span className="block text-[8px] font-bold text-blue-600/75 mt-0.5">{onlineCollectedPct}% of collected</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/60">
                            <span className="block text-[9px] font-black uppercase text-amber-800">Pending Balance</span>
                            <span className="text-xs font-black text-amber-700">₹{pendingRevenue.toLocaleString('en-IN')}</span>
                            <span className="block text-[8px] font-bold text-amber-600/75 mt-0.5">{pendingPct}% uncollected</span>
                          </div>
                        </div>

                        {/* Direct Cash vs Online Comparison Bar */}
                        <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-600 mb-1.5">
                            <span>Cash vs Online Collected Comparison</span>
                            <span className="font-bold text-slate-800">{totalCollected > 0 ? `₹${totalCollected.toLocaleString('en-IN')} Total Collected` : 'No Collections'}</span>
                          </div>
                          <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
                            {cashCollectedPct > 0 && (
                              <div style={{ width: `${cashCollectedPct}%` }} className="bg-emerald-500 h-full" title={`Cash: ${cashCollectedPct}%`} />
                            )}
                            {onlineCollectedPct > 0 && (
                              <div style={{ width: `${onlineCollectedPct}%` }} className="bg-blue-600 h-full" title={`Online: ${onlineCollectedPct}%`} />
                            )}
                          </div>
                          <div className="flex justify-between text-[10px] font-bold mt-1.5">
                            <span className="text-emerald-700 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                              Cash ({cashCollectedPct}%)
                            </span>
                            <span className="text-blue-700 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
                              Online UPI ({onlineCollectedPct}%)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Graphs Row 2: Status Pipeline & Top Services */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Graph 3: Order Status Pipeline */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <h4 className="font-black text-sm text-slate-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <span>📦</span> Order Status Pipeline Graph
                      </h4>
                      <p className="text-[11px] text-slate-500 mb-4">Fulfillment status of today&apos;s workload</p>

                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="text-emerald-700">✅ Delivered to Customer</span>
                            <span className="text-slate-700">{deliveredCount} ({totalOrders > 0 ? Math.round((deliveredCount / totalOrders) * 100) : 0}%)</span>
                          </div>
                          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              style={{ width: `${totalOrders > 0 ? (deliveredCount / totalOrders) * 100 : 0}%` }} 
                              className="h-full bg-emerald-500 rounded-full"
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="text-blue-700">🧼 In Process (Washing / Ironing)</span>
                            <span className="text-slate-700">{inProcessCount} ({totalOrders > 0 ? Math.round((inProcessCount / totalOrders) * 100) : 0}%)</span>
                          </div>
                          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              style={{ width: `${totalOrders > 0 ? (inProcessCount / totalOrders) * 100 : 0}%` }} 
                              className="h-full bg-blue-600 rounded-full"
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="text-orange-700">🛵 Pickup / En Route</span>
                            <span className="text-slate-700">{pendingCount} ({totalOrders > 0 ? Math.round((pendingCount / totalOrders) * 100) : 0}%)</span>
                          </div>
                          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              style={{ width: `${totalOrders > 0 ? (pendingCount / totalOrders) * 100 : 0}%` }} 
                              className="h-full bg-orange-500 rounded-full"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Graph 4: Top Service Demand */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <h4 className="font-black text-sm text-slate-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <span>🧺</span> Top Service Demand Graph
                      </h4>
                      <p className="text-[11px] text-slate-500 mb-4">Most demanded services today</p>

                      <div className="space-y-3">
                        {sortedServices.length === 0 ? (
                          <p className="text-xs text-slate-400 font-bold py-6 text-center">No orders recorded today yet</p>
                        ) : (
                          sortedServices.map(([sName, count], idx) => {
                            const pct = Math.round((count / maxServiceCount) * 100);
                            return (
                              <div key={idx}>
                                <div className="flex justify-between text-xs font-bold mb-1">
                                  <span className="text-slate-800 truncate max-w-[200px]">{sName}</span>
                                  <span className="text-blue-600 font-black">{count} orders</span>
                                </div>
                                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    style={{ width: `${pct}%` }} 
                                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                                  />
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Graphs Row 3: Repeat Customer Rate & Next-Day Prediction */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Card A: Repeat Customer Retention Rate */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="font-black text-sm text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <span>🔁</span> Repeat Customer Rate (Repeat CX)
                          </h4>
                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${repeatRatePct >= 50 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-blue-100 text-blue-800 border border-blue-300'}`}>
                            {repeatRatePct}% Repeat Ratio
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mb-3">Returning vs first-time customer volume &amp; revenue</p>
                      </div>

                      {/* Visual Repeat vs New Split Bar */}
                      <div className="space-y-3">
                        <div className="w-full h-5 bg-slate-100 rounded-full overflow-hidden flex shadow-inner border border-slate-200">
                          {repeatRatePct > 0 && (
                            <div 
                              style={{ width: `${repeatRatePct}%` }}
                              className="bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center transition-all truncate px-1"
                              title={`Repeat Customers: ${repeatRatePct}%`}
                            >
                              Repeat {repeatRatePct}%
                            </div>
                          )}
                          {newRatePct > 0 && (
                            <div 
                              style={{ width: `${newRatePct}%` }}
                              className="bg-blue-500 text-white text-[10px] font-black flex items-center justify-center transition-all truncate px-1"
                              title={`New Customers: ${newRatePct}%`}
                            >
                              New {newRatePct}%
                            </div>
                          )}
                        </div>

                        {/* Breakdown Metrics */}
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/60">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase text-emerald-800 flex items-center gap-1">
                                <span>⭐</span> Repeat Orders
                              </span>
                              <span className="text-xs font-black text-emerald-700">{repeatCxOrdersCount} ({repeatRatePct}%)</span>
                            </div>
                            <p className="text-sm font-black text-emerald-900 mt-1">₹{repeatCxRevenue.toLocaleString('en-IN')}</p>
                            <p className="text-[9px] font-semibold text-emerald-600/80 mt-0.5">High loyalty customer base</p>
                          </div>

                          <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200/60">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase text-blue-800 flex items-center gap-1">
                                <span>🌱</span> New Customers
                              </span>
                              <span className="text-xs font-black text-blue-700">{newCxOrdersCount} ({newRatePct}%)</span>
                            </div>
                            <p className="text-sm font-black text-blue-900 mt-1">₹{newCxRevenue.toLocaleString('en-IN')}</p>
                            <p className="text-[9px] font-semibold text-blue-600/80 mt-0.5">First-time orders booked</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card B: Tomorrow's Operational & Demand Prediction */}
                    <div className="bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/60 p-5 rounded-2xl border border-indigo-200/70 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="font-black text-sm text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                            <span>🤖</span> Next-Day Demand &amp; Sales Forecast
                          </h4>
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-indigo-600 text-white shadow-sm">
                            AI Trend Engine
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mb-3">Projected workload &amp; staffing advisory for tomorrow</p>
                      </div>

                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="p-2.5 rounded-xl bg-white border border-indigo-100 shadow-xs">
                            <span className="text-[9px] font-black uppercase text-indigo-600 block">Predicted Orders</span>
                            <span className="text-sm font-black text-slate-800 mt-0.5 block">{predictedOrdersMin} - {predictedOrdersMax} Orders</span>
                            <span className="text-[9px] font-bold text-slate-400">7-day velocity model</span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-white border border-indigo-100 shadow-xs">
                            <span className="text-[9px] font-black uppercase text-indigo-600 block">Projected Revenue</span>
                            <span className="text-sm font-black text-slate-800 mt-0.5 block">₹{predictedRevMin.toLocaleString('en-IN')} - ₹{predictedRevMax.toLocaleString('en-IN')}</span>
                            <span className="text-[9px] font-bold text-slate-400">{isTomorrowWeekend ? 'Weekend rush factored' : 'Weekday baseline'}</span>
                          </div>
                        </div>

                        {/* Operational Recommendations */}
                        <div className="bg-white/90 border border-indigo-100 rounded-xl p-2.5 space-y-1.5 text-[10px]">
                          <div className="flex items-center justify-between text-slate-700">
                            <span className="font-bold flex items-center gap-1 text-slate-600">
                              <span>⏰</span> Peak Pickup Hours:
                            </span>
                            <span className="font-black text-indigo-950">08:00 - 11:00 AM &amp; 05:00 - 08:00 PM</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-700">
                            <span className="font-bold flex items-center gap-1 text-slate-600">
                              <span>🛵</span> Staffing Advisory:
                            </span>
                            <span className="font-black text-emerald-700">{recommendedRiders} Active Riders Recommended</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-700">
                            <span className="font-bold flex items-center gap-1 text-slate-600">
                              <span>🧺</span> High Demand Service:
                            </span>
                            <span className="font-black text-blue-700 truncate max-w-[170px]">{predictedTopServices}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Summary Footer Verification */}
                  <div className="border-t border-slate-200 pt-4 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500">
                    <p>Manager Signature: _______________________</p>
                    <p className="mt-2 md:mt-0 font-medium">Laundry Basket Operations · EOD Closing Audit</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`manager-nav-item flex items-center gap-4 px-6 py-4 rounded-2xl cursor-pointer transition-all duration-300 ${active ? 'bg-primary/20 text-primary border border-primary/20 shadow-glow' : 'hover:bg-white/5 text-text-secondary hover:text-text-primary'}`}
    >
      <div className={`${active ? 'text-primary' : 'opacity-70'}`}>{icon}</div>
      <span className="font-bold text-sm tracking-tight">{label}</span>
    </div>
  );
}

function KanbanColumn({ title, count, children, color, filterElement }: { title: string, count: number, children: React.ReactNode, color: 'orange' | 'blue' | 'green', filterElement?: React.ReactNode }) {
  const colors = {
    orange: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    blue: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    green: 'bg-green-500/10 text-green-600 border-green-500/20'
  };
  return (
    <div className="kanban-column-wrap flex flex-col gap-6 min-w-0">
      <div className={`p-4 rounded-2xl border ${colors[color]} flex flex-col gap-3`}>
        <div className="flex justify-between items-center w-full">
          <h3 className="font-black uppercase tracking-widest text-xs">{title}</h3>
          <span className="bg-white/50 px-2 py-0.5 rounded-lg font-bold text-[10px]">{count}</span>
        </div>
        {filterElement && (
          <div className="mt-1 w-full border-t border-black/5 pt-2">
            {filterElement}
          </div>
        )}
      </div>
      <div className="kanban-card-stack flex flex-col gap-4 min-h-[400px]">
        {children}
      </div>
    </div>
  );
}

function OrderCard({ order, riders, onAssign, onUpdate, onView, onPrint, onPdf, onWhatsApp, onEdit }: { order: any, riders: any[], onAssign: any, onUpdate: any, onView: any, onPrint: any, onPdf: any, onWhatsApp: any, onEdit: any }) {
  return (
    <div className="glass-card order-card p-3.5 border-white/40 hover:scale-[1.01] transition-transform text-xs">
      {/* Clean spacious card header */}
      <div className="flex justify-between items-start mb-2.5 border-b border-black/5 pb-2">
        <div className="cursor-pointer flex-1 min-w-0" onClick={onView}>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-black text-xs text-primary leading-none uppercase tracking-tight">#{order.id}</span>
            <span className={`text-[7.5px] font-black px-1.5 py-0.5 rounded uppercase border ${order.source === 'App' ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' : order.source === 'Walk-in' ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-blue-500/10 text-blue-600 border-blue-500/20'}`}>
              {order.source || 'Web'}
            </span>
            {order.sourceSegment && (
              <span className={`text-[7.5px] font-black px-1.5 py-0.5 rounded uppercase border ${
                order.sourceSegment === 'NP' ? 'bg-amber-500/15 text-amber-700 border-amber-500/30' :
                order.sourceSegment === 'SM' ? 'bg-pink-500/15 text-pink-700 border-pink-500/30' :
                order.sourceSegment === 'RF' ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30' :
                order.sourceSegment === 'AP' ? 'bg-indigo-500/15 text-indigo-700 border-indigo-500/30' :
                'bg-cyan-500/15 text-cyan-700 border-cyan-500/30'
              }`}>
                {order.sourceSegment === 'NP' ? 'NP · NewsPaper' :
                 order.sourceSegment === 'SM' ? 'SM · Social' :
                 order.sourceSegment === 'RF' ? 'RF · Ref' :
                 order.sourceSegment === 'WS' ? 'WS · Web' :
                 order.sourceSegment === 'AP' ? 'AP · App' : order.sourceSegment}
              </span>
            )}
          </div>
          <span className="text-[8px] font-bold text-text-secondary uppercase mt-0.5 block">
            🕒 {(() => {
              try {
                // Handle DD/MM/YYYY format
                let dateStr = order.timestamp;
                if (dateStr && dateStr.includes('/')) {
                  const parts = dateStr.split(',');
                  const dateParts = parts[0].split('/');
                  if (dateParts[0].length <= 2 && parseInt(dateParts[1]) <= 12) {
                    // Try converting DD/MM to MM/DD for JS Date
                    dateStr = `${dateParts[1]}/${dateParts[0]}/${dateParts[2]}${parts[1] || ''}`;
                  }
                }
                const d = new Date(dateStr);
                return isNaN(d.getTime()) ? "Just Now" : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              } catch (e) { return "Just Now"; }
            })()}
          </span>
        </div>
        <div className="shrink-0 ml-1">
          <span className="text-[9px] font-black text-text-primary bg-black/5 px-1.5 py-0.5 rounded truncate max-w-[100px] inline-block align-middle" title={order.name}>
            👤 {order.name}
          </span>
        </div>
      </div>

      <div className="mb-2.5">
        <p className="text-xs font-bold text-text-primary line-clamp-1">{order.services}</p>
        <p className="text-[10px] text-text-secondary mt-0.5 font-medium">{order.name} · {order.phone}</p>
      </div>

      {/* Pickup/Delivery OTP Section - Hidden for Walk-in & WhatsApp */}
      {!((order.source && ['walk-in', 'whatsapp'].includes(order.source.toLowerCase()))) && (order.pickupCode || order.deliveryCode) && (
        <div className="mb-2.5 bg-primary/5 border border-primary/10 rounded-xl p-1.5 flex justify-between gap-2 text-center">
          {order.pickupCode && (
            <div className="flex-1">
              <span className="text-[7.5px] font-black uppercase text-text-secondary block leading-none mb-0.5">🔑 Pickup OTP</span>
              <span className="text-xs font-black text-primary font-mono">{order.pickupCode}</span>
            </div>
          )}
          {order.deliveryCode && (
            <div className="flex-1 border-l border-black/5">
              <span className="text-[7.5px] font-black uppercase text-text-secondary block leading-none mb-0.5">🔑 Store/Cx Delivery PIN</span>
              <span className="text-xs font-black text-primary font-mono">{order.deliveryCode}</span>
            </div>
          )}
        </div>
      )}

      {/* Proof of Service Photos Badges */}
      {(order.pickupPhoto || order.deliveryPhoto) && (
        <div className="mb-2.5 bg-primary/5 border border-primary/10 rounded-xl p-1.5 flex items-center justify-between gap-1.5">
          <span className="text-[7.5px] font-black uppercase text-text-secondary">📸 Photos:</span>
          <div className="flex gap-1.5">
            {order.pickupPhoto && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const w = window.open("");
                  w?.document.write(`<title>Pickup Photo #${order.id}</title><body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;height:100vh;"><img src="${order.pickupPhoto}" style="max-width:100%;max-height:100%;object-fit:contain;"/></body>`);
                }}
                className="text-[8px] font-black px-2 py-1 rounded bg-white text-primary border border-primary/20 hover:bg-primary hover:text-white uppercase transition-all shadow-sm"
              >
                📦 Pickup
              </button>
            )}
            {order.deliveryPhoto && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const w = window.open("");
                  w?.document.write(`<title>Delivery Photo #${order.id}</title><body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;height:100vh;"><img src="${order.deliveryPhoto}" style="max-width:100%;max-height:100%;object-fit:contain;"/></body>`);
                }}
                className="text-[8px] font-black px-2 py-1 rounded bg-white text-green-700 border border-green-300 hover:bg-green-600 hover:text-white uppercase transition-all shadow-sm"
              >
                ✅ Delivery
              </button>
            )}
          </div>
        </div>
      )}

      {/* Premium Symmetrical 2-Column Grid for Order Status & Rider Assignment */}
      <div className="grid grid-cols-2 gap-1.5 mb-2.5">
        {/* Status Dropdown */}
        <div className="bg-white/40 border border-black/5 rounded-xl p-1.5 flex flex-col justify-between min-h-[46px]">
          <label className="text-[7.5px] font-black uppercase text-text-secondary mb-0.5 block leading-none">📦 Order Status</label>
          <select
            value={order.status}
            onChange={(e) => onUpdate(e.target.value)}
            className="w-full bg-transparent text-[9px] font-black uppercase outline-none cursor-pointer text-primary p-0"
          >
            <option value="Pending">PENDING</option>
            <option value="Out for Pickup">OUT FOR PICKUP</option>
            <option value="Pickup done">PICKUP DONE</option>
            <option value="Delivered at store">DELIVERED AT STORE</option>
            <option value="Processing">PROCESSING</option>
            <option value="Washing">WASHING</option>
            <option value="Drying">DRYING</option>
            <option value="Ironing">IRONING</option>
            <option value="Ready">READY</option>
            <option value="Out for Delivery">OUT FOR DELIVERY</option>
            <option value="Delivered">DELIVERED</option>
          </select>
        </div>

        {/* Assigned Rider */}
        <div className="bg-white/40 border border-black/5 rounded-xl p-1.5 flex flex-col justify-between min-h-[46px]">
          <label className="text-[7.5px] font-black uppercase text-text-secondary mb-0.5 block leading-none">🛵 Assigned Rider</label>
          <select
            value={order.assignedRiderId || ""}
            onChange={(e) => onAssign(e.target.value)}
            className="w-full bg-transparent text-[9px] font-black uppercase outline-none cursor-pointer text-primary p-0"
          >
            <option value="">Unassigned</option>
            {riders.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="border-t border-black/5 pt-2.5">
        <div className="flex justify-between items-center mb-2">
          <button className="text-[9px] font-black text-primary uppercase tracking-wider hover:underline text-left" onClick={onView}>View Invoice →</button>
          <span className="text-sm font-black text-primary">₹{order.total}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={onWhatsApp}
            className="flex-1 min-w-[50px] flex items-center justify-center gap-0.5 bg-green-500/10 hover:bg-green-500/20 text-green-700 font-black text-[8px] uppercase tracking-wide py-1.5 rounded-lg transition-all"
          >
            📱 WA
          </button>
          <button
            onClick={onPrint}
            className="flex-1 min-w-[50px] flex items-center justify-center gap-0.5 bg-primary/10 hover:bg-primary/20 text-primary font-black text-[8px] uppercase tracking-wide py-1.5 rounded-lg transition-all"
          >
            🖨️ Print
          </button>
          <button
            onClick={onPdf}
            className="flex-1 min-w-[50px] flex items-center justify-center gap-0.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-700 font-black text-[8px] uppercase tracking-wide py-1.5 rounded-lg transition-all"
          >
            📄 PDF
          </button>
          <button
            onClick={onEdit}
            className="flex-1 min-w-[50px] flex items-center justify-center gap-0.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 font-black text-[8px] uppercase tracking-wide py-1.5 rounded-lg transition-all"
          >
            ✏️ Edit
          </button>
        </div>
        <div className="mt-2 text-[9px] font-bold text-text-secondary flex justify-between">
          <span>Store Share: ₹{(order.netEarning || (order.total * 0.85)).toFixed(0)}</span>
        </div>
      </div>
    </div>
  );
}



