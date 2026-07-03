import React, { useState, useEffect } from 'react';
import { supabase } from './config/supabase';
import { Lock, Mail, Key, LogIn, Shield, User, Eye, EyeOff, CheckCircle, X } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardOverview from './spa-pages/DashboardOverview';
import StaffDirectory from './spa-pages/StaffDirectory';
import ShiftScheduler from './spa-pages/ShiftScheduler';
import PayrollIncentives from './spa-pages/PayrollIncentives';
import LeaveApprovals from './spa-pages/LeaveApprovals';
import EmployeeWorkspace from './spa-pages/EmployeeWorkspace';
import TasksManagement from './spa-pages/TasksManagement';
import AttendanceManagement from './spa-pages/AttendanceManagement';
import logoImg from './assets/logo.png';

// Lifted Database Collections (Synchronized Mock Data)
const initialStaff = [
  {
    "id": 1,
    "empId": "LBBPL001",
    "name": "Sarvesh Baroka",
    "role": "CEO",
    "dept": "MANAGEMENT",
    "email": "sarvesh.b@laundrybasket.com",
    "phone": "+91 83198 43116",
    "status": "Active",
    "salary": 15000,
    "joinDate": "2025-12-02",
    "bankName": "ICICI Bank",
    "bankAcc": "************5590",
    "bankIfsc": "ICIC0000182",
    "bankHolder": "Sarvesh Baroka",
    "shift": "10:00 - 20:00",
    "incentive": 0
  },
  {
    "id": 2,
    "empId": "LBBPL002",
    "name": "Neeraj Singh Parihar",
    "role": "VP",
    "dept": "SERVICE AND DELIVERY",
    "email": "neeraj.p@laundrybasket.com",
    "phone": "+91 99931 31613",
    "status": "Active",
    "salary": 65000,
    "joinDate": "2025-02-01",
    "bankName": "ICICI Bank",
    "bankAcc": "************5826",
    "bankIfsc": "ICIC0000182",
    "bankHolder": "Neeraj Singh Parihar",
    "shift": "10:00 - 20:00",
    "incentive": 0
  },
  {
    "id": 3,
    "empId": "LBBPL003",
    "name": "Anchit Biroka",
    "role": "PRESIDENT",
    "dept": "SERVICE AND DELIVERY",
    "email": "anchit.b@laundrybasket.com",
    "phone": "+91 82694 38399",
    "status": "Active",
    "salary": 85000,
    "joinDate": "2025-02-06",
    "bankName": "SBI",
    "bankAcc": "************9289",
    "bankIfsc": "SBIN0004283",
    "bankHolder": "Anchit Biroka",
    "shift": "10:00 - 20:00",
    "incentive": 0
  },
  {
    "id": 4,
    "empId": "LBBPL004",
    "name": "Rishabh Prajapati",
    "role": "MIS",
    "dept": "MIS",
    "email": "rishabh.p@laundrybasket.com",
    "phone": "+91 96444 91504",
    "status": "Active",
    "salary": 22000,
    "joinDate": "2026-04-10",
    "bankName": "ICICI Bank",
    "bankAcc": "************3551",
    "bankIfsc": "ICIC0000182",
    "bankHolder": "Rishabh Prajapati",
    "shift": "10:00 - 20:00",
    "incentive": 0
  },
  {
    "id": 5,
    "empId": "LBBPL005",
    "name": "Virendra",
    "role": "Seniour Developer",
    "dept": "Softwere DEVELOPER",
    "email": "virendra@laundrybasket.com",
    "phone": "+91 89650 75604",
    "status": "Active",
    "salary": 45000,
    "joinDate": "2026-04-18",
    "bankName": "ICICI Bank",
    "bankAcc": "************6256",
    "bankIfsc": "ICIC0000182",
    "bankHolder": "Virendra",
    "shift": "10:00 - 20:00",
    "incentive": 0
  },
  {
    "id": 6,
    "empId": "LBBPL006",
    "name": "Akhilesh Jatav",
    "role": "Pressman",
    "dept": "Workshop",
    "email": "akhilesh.j@laundrybasket.com",
    "phone": "+91 96449 44815",
    "status": "Active",
    "salary": 16000,
    "joinDate": "2026-04-15",
    "bankName": "HDFC Bank",
    "bankAcc": "************1269",
    "bankIfsc": "HDFC0001245",
    "bankHolder": "Akhilesh Jatav",
    "shift": "10:00 - 20:00",
    "incentive": 15
  },
  {
    "id": 7,
    "empId": "LBBPL007",
    "name": "Raju",
    "role": "Pressman",
    "dept": "Store",
    "email": "raju@laundrybasket.com",
    "phone": "+91 70245 81466",
    "status": "Active",
    "salary": 16000,
    "joinDate": "2026-02-18",
    "bankName": "SBI",
    "bankAcc": "************8587",
    "bankIfsc": "SBIN0004283",
    "bankHolder": "Raju",
    "shift": "10:00 - 20:00",
    "incentive": 15
  },
  {
    "id": 8,
    "empId": "LBBPL008",
    "name": "Rishi",
    "role": "Pressman",
    "dept": "Workshop",
    "email": "rishi@laundrybasket.com",
    "phone": "+91 99937 44920",
    "status": "Active",
    "salary": 16000,
    "joinDate": "2026-04-28",
    "bankName": "Axis Bank",
    "bankAcc": "************6194",
    "bankIfsc": "UTIB0000084",
    "bankHolder": "Rishi",
    "shift": "10:00 - 20:00",
    "incentive": 15
  },
  {
    "id": 9,
    "empId": "LBBPL009",
    "name": "Anju",
    "role": "Receptionist",
    "dept": "Store",
    "email": "anju@laundrybasket.com",
    "phone": "+91 62608 80205",
    "status": "Active",
    "salary": 18000,
    "joinDate": "2026-04-21",
    "bankName": "ICICI Bank",
    "bankAcc": "************5050",
    "bankIfsc": "ICIC0000182",
    "bankHolder": "Anju",
    "shift": "10:00 - 20:00",
    "incentive": 0
  },
  {
    "id": 10,
    "empId": "LBBPL010",
    "name": "Dolly",
    "role": "Receptionist",
    "dept": "Store",
    "email": "dolly@laundrybasket.com",
    "phone": "+91 62613 19137",
    "status": "Active",
    "salary": 18000,
    "joinDate": "2026-04-02",
    "bankName": "SBI",
    "bankAcc": "************4599",
    "bankIfsc": "SBIN0004283",
    "bankHolder": "Dolly",
    "shift": "10:00 - 20:00",
    "incentive": 0
  },
  {
    "id": 11,
    "empId": "LBBPL011",
    "name": "Neetu",
    "role": "Receptionist",
    "dept": "Store",
    "email": "neetu@laundrybasket.com",
    "phone": "+91 96301 96326",
    "status": "Active",
    "salary": 18000,
    "joinDate": "2026-05-24",
    "bankName": "Axis Bank",
    "bankAcc": "************3892",
    "bankIfsc": "UTIB0000084",
    "bankHolder": "Neetu",
    "shift": "10:00 - 20:00",
    "incentive": 0
  },
  {
    "id": 12,
    "empId": "LBBPL012",
    "name": "Pallavi Jivnani",
    "role": "Receptionist",
    "dept": "Store",
    "email": "pallavi.j@laundrybasket.com",
    "phone": "+91 91799 17683",
    "status": "Active",
    "salary": 18000,
    "joinDate": "2026-05-15",
    "bankName": "HDFC Bank",
    "bankAcc": "************2118",
    "bankIfsc": "HDFC0001245",
    "bankHolder": "Pallavi Jivnani",
    "shift": "10:00 - 20:00",
    "incentive": 0
  },
  {
    "id": 13,
    "empId": "LBBPL013",
    "name": "Riya Rajput",
    "role": "Receptionist",
    "dept": "Store",
    "email": "riya.r@laundrybasket.com",
    "phone": "+91 88154 47296",
    "status": "Active",
    "salary": 18000,
    "joinDate": "2025-12-02",
    "bankName": "HDFC Bank",
    "bankAcc": "************2745",
    "bankIfsc": "HDFC0001245",
    "bankHolder": "Riya Rajput",
    "shift": "10:00 - 20:00",
    "incentive": 0
  },
  {
    "id": 14,
    "empId": "LBBPL014",
    "name": "Bhupendra Sarathe",
    "role": "Rider",
    "dept": "Delivery",
    "email": "bhupendra.s@laundrybasket.com",
    "phone": "+91 72249 74157",
    "status": "Active",
    "salary": 15000,
    "joinDate": "2026-03-14",
    "bankName": "Axis Bank",
    "bankAcc": "************8771",
    "bankIfsc": "UTIB0000084",
    "bankHolder": "Bhupendra Sarathe",
    "shift": "10:00 - 20:00",
    "incentive": 50
  },
  {
    "id": 15,
    "empId": "LBBPL015",
    "name": "Cheten Malviya",
    "role": "Rider",
    "dept": "Delivery",
    "email": "cheten.m@laundrybasket.com",
    "phone": "+91 95163 99906",
    "status": "Active",
    "salary": 15000,
    "joinDate": "2026-05-03",
    "bankName": "HDFC Bank",
    "bankAcc": "************4623",
    "bankIfsc": "HDFC0001245",
    "bankHolder": "Cheten Malviya",
    "shift": "10:00 - 20:00",
    "incentive": 50
  },
  {
    "id": 16,
    "empId": "LBBPL016",
    "name": "Keshav Sahu",
    "role": "Rider",
    "dept": "Delivery",
    "email": "keshav.s@laundrybasket.com",
    "phone": "+91 94257 87685",
    "status": "Active",
    "salary": 15000,
    "joinDate": "2026-03-16",
    "bankName": "ICICI Bank",
    "bankAcc": "************2750",
    "bankIfsc": "ICIC0000182",
    "bankHolder": "Keshav Sahu",
    "shift": "10:00 - 20:00",
    "incentive": 50
  },
  {
    "id": 17,
    "empId": "LBBPL017",
    "name": "Kunal Sahu",
    "role": "Rider",
    "dept": "Delivery",
    "email": "kunal.s@laundrybasket.com",
    "phone": "+91 91655 77436",
    "status": "Active",
    "salary": 15000,
    "joinDate": "2026-03-08",
    "bankName": "Axis Bank",
    "bankAcc": "************6039",
    "bankIfsc": "UTIB0000084",
    "bankHolder": "Kunal Sahu",
    "shift": "10:00 - 20:00",
    "incentive": 50
  },
  {
    "id": 18,
    "empId": "LBBPL018",
    "name": "Naresh Bansal",
    "role": "Rider",
    "dept": "Delivery",
    "email": "naresh.b@laundrybasket.com",
    "phone": "+91 83054 18470",
    "status": "Active",
    "salary": 15000,
    "joinDate": "2026-03-21",
    "bankName": "SBI",
    "bankAcc": "************5263",
    "bankIfsc": "SBIN0004283",
    "bankHolder": "Naresh Bansal",
    "shift": "10:00 - 20:00",
    "incentive": 50
  },
  {
    "id": 19,
    "empId": "LBBPL019",
    "name": "Man",
    "role": "Washing Executive",
    "dept": "Workshop",
    "email": "man@laundrybasket.com",
    "phone": "+91 99939 34594",
    "status": "Active",
    "salary": 17000,
    "joinDate": "2026-04-21",
    "bankName": "HDFC Bank",
    "bankAcc": "************9191",
    "bankIfsc": "HDFC0001245",
    "bankHolder": "Man",
    "shift": "10:00 - 20:00",
    "incentive": 0
  },
  {
    "id": 20,
    "empId": "LBBPL020",
    "name": "Santosh",
    "role": "Washing Executive",
    "dept": "Workshop",
    "email": "santosh@laundrybasket.com",
    "phone": "+91 99999 99999",
    "status": "Active",
    "salary": 17000,
    "joinDate": "2026-03-15",
    "bankName": "SBI",
    "bankAcc": "************7330",
    "bankIfsc": "SBIN0004283",
    "bankHolder": "Santosh",
    "shift": "10:00 - 20:00",
    "incentive": 0
  },
  {
    "id": 21,
    "empId": "LBBPL021",
    "name": "Satendra",
    "role": "Washing Executive",
    "dept": "Workshop",
    "email": "satendra@laundrybasket.com",
    "phone": "+91 99999 99999",
    "status": "Active",
    "salary": 17000,
    "joinDate": "2026-05-09",
    "bankName": "Axis Bank",
    "bankAcc": "************3369",
    "bankIfsc": "UTIB0000084",
    "bankHolder": "Satendra",
    "shift": "10:00 - 20:00",
    "incentive": 0
  },
  {
    "id": 22,
    "empId": "LBBPL022",
    "name": "Shiva Prajapati",
    "role": "Washing Executive",
    "dept": "Workshop",
    "email": "shiva.p@laundrybasket.com",
    "phone": "+91 99812 70352",
    "status": "Active",
    "salary": 17000,
    "joinDate": "2026-06-03",
    "bankName": "HDFC Bank",
    "bankAcc": "************3424",
    "bankIfsc": "HDFC0001245",
    "bankHolder": "Shiva Prajapati",
    "shift": "10:00 - 20:00",
    "incentive": 0
  },
  {
    "id": 23,
    "empId": "LBBPL023",
    "name": "Sumit",
    "role": "Washing Executive",
    "dept": "Workshop",
    "email": "sumit@laundrybasket.com",
    "phone": "+91 99999 99999",
    "status": "Active",
    "salary": 17000,
    "joinDate": "2026-05-05",
    "bankName": "HDFC Bank",
    "bankAcc": "************7035",
    "bankIfsc": "HDFC0001245",
    "bankHolder": "Sumit",
    "shift": "10:00 - 20:00",
    "incentive": 0
  },
  {
    "id": 24,
    "empId": "LBBPL024",
    "name": "Suraj Rajak",
    "role": "Washing Executive",
    "dept": "Workshop",
    "email": "suraj.r@laundrybasket.com",
    "phone": "+91 97532 99146",
    "status": "Active",
    "salary": 17000,
    "joinDate": "2026-02-15",
    "bankName": "SBI",
    "bankAcc": "************3917",
    "bankIfsc": "SBIN0004283",
    "bankHolder": "Suraj Rajak",
    "shift": "10:00 - 20:00",
    "incentive": 0
  },
  {
    "id": 25,
    "empId": "LBBPL025",
    "name": "Vivek",
    "role": "Washing Executive",
    "dept": "Workshop",
    "email": "vivek@laundrybasket.com",
    "phone": "+91 84588 36771",
    "status": "Active",
    "salary": 17000,
    "joinDate": "2026-05-15",
    "bankName": "Axis Bank",
    "bankAcc": "************7147",
    "bankIfsc": "UTIB0000084",
    "bankHolder": "Vivek",
    "shift": "10:00 - 20:00",
    "incentive": 0
  }
];

// Weekly off schedule — each employee gets only 2 days off per month, so they are scheduled to work every day on weekly basis
const WEEKLY_OFFS: Record<string, string[]> = {
  'Mon': [],
  'Tue': [],
  'Wed': [],
  'Thu': [],
  'Fri': [],
  'Sat': [],
  'Sun': []
};

const SHIFT_LABEL = 'Full Day (10 AM - 08 PM)';

function buildWeeklyShifts(staff: typeof initialStaff): Record<string, any[]> {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const result: Record<string, any[]> = {};
  days.forEach((day, dayIdx) => {
    const offs = WEEKLY_OFFS[day] || [];
    let entryId = dayIdx * 100 + 1;
    result[day] = staff
      .filter(emp => !offs.includes(emp.name))
      .map(emp => ({
        id: entryId++,
        staff: emp.name,
        role: emp.role,
        type: SHIFT_LABEL
      }));
  });
  return result;
}

const initialWeeklyShifts = buildWeeklyShifts(initialStaff);

// Payroll generated from staff data — clean slate, no test numbers
const initialRidersPayroll = initialStaff.map((emp, i) => ({
  id: i + 1,
  name: emp.name,
  role: emp.role,
  base: emp.salary,
  deliveries: 0,
  rate: emp.incentive,
  paidStatus: 'Pending'
}));

// Clean slate — no test data
const initialLeaves: any[] = [];

const initialClockLogs: any[] = [];

const initialTasks: any[] = [];

export default function App() {
  // Navigation & Layout Coordinates
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'admin' | 'employee'>('admin');

  // React Synchronized State Databases (Raw states updated by Firestore listeners)
  const [staffList, rawSetStaffList] = useState<any[]>(initialStaff);
  const [shifts, rawSetShifts] = useState<Record<string, any[]>>(initialWeeklyShifts);
  const [payrollList, rawSetPayrollList] = useState<any[]>(initialRidersPayroll);
  const [leavesList, rawSetLeavesList] = useState<any[]>(initialLeaves);
  const [clockLogs, rawSetClockLogs] = useState<any[]>(initialClockLogs);
  const [tasksList, rawSetTasksList] = useState<any[]>(initialTasks);
  const [employeePasswords, rawSetEmployeePasswords] = useState<Record<string, string>>({});

  // Auth Session States
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Password change flow states
  const [needsPasswordChange, setNeedsPasswordChange] = useState<boolean>(false);

  // Helper adapters for mapping snake_case db columns to camelCase JS objects
  const mapStaffFromDb = (row: any) => ({
    id: Number(row.id),
    empId: row.emp_id,
    name: row.name,
    role: row.role,
    dept: row.dept,
    email: row.email,
    phone: row.phone,
    status: row.status,
    salary: Number(row.salary),
    joinDate: row.join_date,
    bankName: row.bank_name,
    bankAcc: row.bank_acc,
    bankIfsc: row.bank_ifsc,
    bankHolder: row.bank_holder,
    shift: row.shift,
    incentive: Number(row.incentive)
  });

  const mapStaffToDb = (emp: any) => ({
    id: emp.id,
    emp_id: emp.empId,
    name: emp.name,
    role: emp.role,
    dept: emp.dept,
    email: emp.email,
    phone: emp.phone,
    status: emp.status,
    salary: emp.salary,
    join_date: emp.joinDate,
    bank_name: emp.bankName,
    bank_acc: emp.bankAcc,
    bank_ifsc: emp.bankIfsc,
    bank_holder: emp.bankHolder,
    shift: emp.shift,
    incentive: emp.incentive
  });

  const mapPayrollFromDb = (row: any) => ({
    id: Number(row.id),
    empId: row.emp_id,
    name: row.name,
    role: row.role,
    baseSalary: Number(row.base_salary),
    incentives: Number(row.incentives),
    allowance: Number(row.allowance),
    deductions: Number(row.deductions),
    netSalary: Number(row.net_salary),
    status: row.status,
    month: row.month
  });

  const mapPayrollToDb = (p: any) => ({
    id: p.id,
    emp_id: p.empId,
    name: p.name,
    role: p.role,
    base_salary: p.baseSalary,
    incentives: p.incentives,
    allowance: p.allowance,
    deductions: p.deductions,
    net_salary: p.netSalary,
    status: p.status,
    month: p.month
  });

  const mapLeaveFromDb = (row: any) => ({
    id: Number(row.id),
    empId: row.emp_id,
    employeeName: row.employee_name,
    type: row.type,
    startDate: row.start_date,
    endDate: row.end_date,
    days: row.days,
    reason: row.reason,
    status: row.status
  });

  const mapLeaveToDb = (l: any) => ({
    id: l.id,
    emp_id: l.empId,
    employee_name: l.employeeName,
    type: l.type,
    start_date: l.startDate,
    end_date: l.endDate,
    days: l.days,
    reason: l.reason,
    status: l.status
  });

  const mapClockFromDb = (row: any) => ({
    id: Number(row.id),
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    role: row.role,
    clockIn: row.clock_in,
    clockOut: row.clock_out,
    hoursWorked: Number(row.hours_worked),
    date: row.date,
    status: row.status,
    style: row.style,
    distance: row.distance
  });

  const mapClockToDb = (log: any) => ({
    id: log.id,
    employee_id: log.employeeId,
    employee_name: log.employeeName,
    role: log.role,
    clock_in: log.clockIn,
    clock_out: log.clockOut,
    hours_worked: log.hoursWorked,
    date: log.date,
    status: log.status,
    style: log.style,
    distance: log.distance
  });

  const mapTaskFromDb = (row: any) => ({
    id: Number(row.id),
    title: row.title,
    description: row.description,
    assignee: row.assignee,
    dueDate: row.due_date,
    priority: row.priority,
    status: row.status
  });

  const mapTaskToDb = (t: any) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    assignee: t.assignee,
    due_date: t.dueDate,
    priority: t.priority,
    status: t.status
  });

  // Supabase Sync Wrappers for User Operations
  const setStaffList = (val: any) => {
    rawSetStaffList((prev: any[]) => {
      const next = typeof val === 'function' ? val(prev) : val;
      const deleted = prev.filter((p: any) => !next.some((n: any) => n.empId === p.empId));
      deleted.forEach(async (emp: any) => {
        const id = emp.empId || `LBBPL${String(emp.id).padStart(3, '0')}`;
        const { error } = await supabase.from('staff').delete().eq('emp_id', id);
        if (error) console.error("Supabase staff delete failed:", error);
      });
      next.forEach(async (emp: any) => {
        const row = mapStaffToDb(emp);
        const { error } = await supabase.from('staff').upsert(row);
        if (error) console.error("Supabase staff upsert failed:", error);
      });
      return next;
    });
  };

  const setShifts = (val: any) => {
    rawSetShifts((prev: Record<string, any[]>) => {
      const next = typeof val === 'function' ? val(prev) : val;
      supabase.from('weekly_shifts').upsert({ key: 'current', shifts: next }).then(({ error }) => {
        if (error) console.error("Supabase weekly_shifts upsert failed:", error);
      });
      return next;
    });
  };

  const setPayrollList = (val: any) => {
    rawSetPayrollList((prev: any[]) => {
      const next = typeof val === 'function' ? val(prev) : val;
      next.forEach(async (payroll: any) => {
        const prevP = prev.find(p => p.id === payroll.id);
        if (!prevP || JSON.stringify(prevP) !== JSON.stringify(payroll)) {
          const row = mapPayrollToDb(payroll);
          const { error } = await supabase.from('payroll').upsert(row);
          if (error) console.error("Supabase payroll upsert failed:", error);
        }
      });
      return next;
    });
  };

  const setLeavesList = (val: any) => {
    rawSetLeavesList((prev: any[]) => {
      const next = typeof val === 'function' ? val(prev) : val;
      const deleted = prev.filter((p: any) => !next.some((n: any) => n.id === p.id));
      deleted.forEach(async (l: any) => {
        const { error } = await supabase.from('leaves').delete().eq('id', l.id);
        if (error) console.error("Supabase leaves delete failed:", error);
      });
      next.forEach(async (l: any) => {
        const prevL = prev.find(p => p.id === l.id);
        if (!prevL || JSON.stringify(prevL) !== JSON.stringify(l)) {
          const row = mapLeaveToDb(l);
          const { error } = await supabase.from('leaves').upsert(row);
          if (error) console.error("Supabase leaves upsert failed:", error);
        }
      });
      return next;
    });
  };

  const setClockLogs = (val: any) => {
    rawSetClockLogs((prev: any[]) => {
      const next = typeof val === 'function' ? val(prev) : val;
      next.forEach(async (log: any) => {
        const prevLog = prev.find(p => p.id === log.id);
        if (!prevLog || JSON.stringify(prevLog) !== JSON.stringify(log)) {
          const row = mapClockToDb(log);
          const { error } = await supabase.from('clock_logs').upsert(row);
          if (error) console.error("Supabase clock_logs upsert failed:", error);
        }
      });
      return next;
    });
  };

  const setTasksList = (val: any) => {
    rawSetTasksList((prev: any[]) => {
      const next = typeof val === 'function' ? val(prev) : val;
      const deleted = prev.filter((p: any) => !next.some((n: any) => n.id === p.id));
      deleted.forEach(async (t: any) => {
        const { error } = await supabase.from('tasks').delete().eq('id', t.id);
        if (error) console.error("Supabase tasks delete failed:", error);
      });
      next.forEach(async (t: any) => {
        const prevT = prev.find(p => p.id === t.id);
        if (!prevT || JSON.stringify(prevT) !== JSON.stringify(t)) {
          const row = mapTaskToDb(t);
          const { error } = await supabase.from('tasks').upsert(row);
          if (error) console.error("Supabase tasks upsert failed:", error);
        }
      });
      return next;
    });
  };

  const setEmployeePasswords = (val: any) => {
    rawSetEmployeePasswords((prev: Record<string, string>) => {
      const next = typeof val === 'function' ? val(prev) : val;
      supabase.from('credentials').upsert({ key: 'registry', passwords: next }).then(({ error }) => {
        if (error) console.error("Supabase credentials upsert failed:", error);
      });
      return next;
    });
  };

  // Real-time Supabase Listeners on Mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Staff
        const { data: staffData } = await supabase.from('staff').select('*');
        if (staffData && staffData.length > 0) {
          rawSetStaffList(staffData.map(mapStaffFromDb).sort((a, b) => b.id - a.id));
        } else {
          initialStaff.forEach(async (emp) => {
            await supabase.from('staff').upsert(mapStaffToDb(emp));
          });
        }

        // Shifts
        const { data: shiftData } = await supabase.from('weekly_shifts').select('*').eq('key', 'current').maybeSingle();
        if (shiftData) {
          rawSetShifts(shiftData.shifts);
        } else {
          await supabase.from('weekly_shifts').upsert({ key: 'current', shifts: initialWeeklyShifts });
        }

        // Payroll
        const { data: payrollData } = await supabase.from('payroll').select('*');
        if (payrollData && payrollData.length > 0) {
          rawSetPayrollList(payrollData.map(mapPayrollFromDb).sort((a, b) => a.id - b.id));
        } else {
          initialRidersPayroll.forEach(async (p) => {
            await supabase.from('payroll').upsert(mapPayrollToDb(p));
          });
        }

        // Leaves
        const { data: leavesData } = await supabase.from('leaves').select('*');
        if (leavesData) {
          rawSetLeavesList(leavesData.map(mapLeaveFromDb).sort((a, b) => b.id - a.id));
        }

        // Clock logs
        const { data: clockData } = await supabase.from('clock_logs').select('*');
        if (clockData) {
          rawSetClockLogs(clockData.map(mapClockFromDb).sort((a, b) => b.id - a.id));
        }

        // Tasks
        const { data: tasksData } = await supabase.from('tasks').select('*');
        if (tasksData) {
          rawSetTasksList(tasksData.map(mapTaskFromDb).sort((a, b) => b.id - a.id));
        }

        // Credentials
        const { data: credsData } = await supabase.from('credentials').select('*').eq('key', 'registry').maybeSingle();
        if (credsData) {
          rawSetEmployeePasswords(credsData.passwords);
        } else {
          const initialCreds = {
            "hr@laundrybasket.com": "55f527c449bc28cfde14ef97b2d5a39cb621183307567823b10b427b5e43bc95" // HR@1234
          };
          await supabase.from('credentials').upsert({ key: 'registry', passwords: initialCreds });
        }
      } catch (err) {
        console.error("Failed to load initial Supabase data:", err);
      }
    };

    fetchInitialData();

    // Set up real-time postgres broadcast trigger channel listeners
    const staffChannel = supabase.channel('hrms:staff')
      .on('broadcast', { event: 'INSERT' }, () => {
        supabase.from('staff').select('*').then(({ data }) => {
          if (data) rawSetStaffList(data.map(mapStaffFromDb).sort((a, b) => b.id - a.id));
        });
      })
      .on('broadcast', { event: 'UPDATE' }, () => {
        supabase.from('staff').select('*').then(({ data }) => {
          if (data) rawSetStaffList(data.map(mapStaffFromDb).sort((a, b) => b.id - a.id));
        });
      })
      .on('broadcast', { event: 'DELETE' }, () => {
        supabase.from('staff').select('*').then(({ data }) => {
          if (data) rawSetStaffList(data.map(mapStaffFromDb).sort((a, b) => b.id - a.id));
        });
      })
      .subscribe();

    const shiftsChannel = supabase.channel('hrms:weekly_shifts')
      .on('broadcast', { event: 'INSERT' }, () => {
        supabase.from('weekly_shifts').select('*').eq('key', 'current').maybeSingle().then(({ data }) => {
          if (data) rawSetShifts(data.shifts);
        });
      })
      .on('broadcast', { event: 'UPDATE' }, () => {
        supabase.from('weekly_shifts').select('*').eq('key', 'current').maybeSingle().then(({ data }) => {
          if (data) rawSetShifts(data.shifts);
        });
      })
      .subscribe();

    const payrollChannel = supabase.channel('hrms:payroll')
      .on('broadcast', { event: 'INSERT' }, () => {
        supabase.from('payroll').select('*').then(({ data }) => {
          if (data) rawSetPayrollList(data.map(mapPayrollFromDb).sort((a, b) => a.id - b.id));
        });
      })
      .on('broadcast', { event: 'UPDATE' }, () => {
        supabase.from('payroll').select('*').then(({ data }) => {
          if (data) rawSetPayrollList(data.map(mapPayrollFromDb).sort((a, b) => a.id - b.id));
        });
      })
      .on('broadcast', { event: 'DELETE' }, () => {
        supabase.from('payroll').select('*').then(({ data }) => {
          if (data) rawSetPayrollList(data.map(mapPayrollFromDb).sort((a, b) => a.id - b.id));
        });
      })
      .subscribe();

    const leavesChannel = supabase.channel('hrms:leaves')
      .on('broadcast', { event: 'INSERT' }, () => {
        supabase.from('leaves').select('*').then(({ data }) => {
          if (data) rawSetLeavesList(data.map(mapLeaveFromDb).sort((a, b) => b.id - a.id));
        });
      })
      .on('broadcast', { event: 'UPDATE' }, () => {
        supabase.from('leaves').select('*').then(({ data }) => {
          if (data) rawSetLeavesList(data.map(mapLeaveFromDb).sort((a, b) => b.id - a.id));
        });
      })
      .on('broadcast', { event: 'DELETE' }, () => {
        supabase.from('leaves').select('*').then(({ data }) => {
          if (data) rawSetLeavesList(data.map(mapLeaveFromDb).sort((a, b) => b.id - a.id));
        });
      })
      .subscribe();

    const clockChannel = supabase.channel('hrms:clock_logs')
      .on('broadcast', { event: 'INSERT' }, () => {
        supabase.from('clock_logs').select('*').then(({ data }) => {
          if (data) rawSetClockLogs(data.map(mapClockFromDb).sort((a, b) => b.id - a.id));
        });
      })
      .on('broadcast', { event: 'UPDATE' }, () => {
        supabase.from('clock_logs').select('*').then(({ data }) => {
          if (data) rawSetClockLogs(data.map(mapClockFromDb).sort((a, b) => b.id - a.id));
        });
      })
      .on('broadcast', { event: 'DELETE' }, () => {
        supabase.from('clock_logs').select('*').then(({ data }) => {
          if (data) rawSetClockLogs(data.map(mapClockFromDb).sort((a, b) => b.id - a.id));
        });
      })
      .subscribe();

    const tasksChannel = supabase.channel('hrms:tasks')
      .on('broadcast', { event: 'INSERT' }, () => {
        supabase.from('tasks').select('*').then(({ data }) => {
          if (data) rawSetTasksList(data.map(mapTaskFromDb).sort((a, b) => b.id - a.id));
        });
      })
      .on('broadcast', { event: 'UPDATE' }, () => {
        supabase.from('tasks').select('*').then(({ data }) => {
          if (data) rawSetTasksList(data.map(mapTaskFromDb).sort((a, b) => b.id - a.id));
        });
      })
      .on('broadcast', { event: 'DELETE' }, () => {
        supabase.from('tasks').select('*').then(({ data }) => {
          if (data) rawSetTasksList(data.map(mapTaskFromDb).sort((a, b) => b.id - a.id));
        });
      })
      .subscribe();

    const credsChannel = supabase.channel('hrms:credentials')
      .on('broadcast', { event: 'INSERT' }, () => {
        supabase.from('credentials').select('*').eq('key', 'registry').maybeSingle().then(({ data }) => {
          if (data) rawSetEmployeePasswords(data.passwords);
        });
      })
      .on('broadcast', { event: 'UPDATE' }, () => {
        supabase.from('credentials').select('*').eq('key', 'registry').maybeSingle().then(({ data }) => {
          if (data) rawSetEmployeePasswords(data.passwords);
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(staffChannel);
      supabase.removeChannel(shiftsChannel);
      supabase.removeChannel(payrollChannel);
      supabase.removeChannel(leavesChannel);
      supabase.removeChannel(clockChannel);
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(credsChannel);
    };
  }, []);

  // Sync currentUser with latest staffList updates
  useEffect(() => {
    if (isLoggedIn && currentUser && currentUser.email !== 'hr@laundrybasket.com') {
      const updated = staffList.find(emp => emp.empId === currentUser.empId || emp.email === currentUser.email);
      if (updated && JSON.stringify(updated) !== JSON.stringify(currentUser)) {
        setCurrentUser(updated);
      }
    }
  }, [staffList, isLoggedIn, currentUser]);

  const [newPasswordInput, setNewPasswordInput] = useState<string>('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState<boolean>(false);

  // Global Change Password Modal State
  const [showGlobalPasswordModal, setShowGlobalPasswordModal] = useState<boolean>(false);
  const [globalCurrentPassword, setGlobalCurrentPassword] = useState<string>('');
  const [globalNewPassword, setGlobalNewPassword] = useState<string>('');
  const [globalConfirmPassword, setGlobalConfirmPassword] = useState<string>('');
  const [globalPasswordError, setGlobalPasswordError] = useState<string | null>(null);
  const [globalPasswordSuccess, setGlobalPasswordSuccess] = useState<boolean>(false);

  // Form states for login
  const [emailInput, setEmailInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Default password hashes (1234 and backward-compatible LBBPL1234)
  const DEFAULT_PASSWORD_HASH = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4'; // '1234'
  const TEMP_PASSWORD_HASH = 'c06711838b266b83db308ce664591886c1db5a6682defc68fd0e1754e021d848'; // 'LBBPL1234'

  const hashPassword = async (password: string) => {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const username = emailInput.trim();
    const password = passwordInput.trim();
    
    try {
      const hashedPassword = await hashPassword(password);

      if (username.toLowerCase() === 'hr@laundrybasket.com') {
        const customAdminHash = employeePasswords['hr@laundrybasket.com'];
        // SHA-256 of 'HR@1234' is 'b1cfb6a12530eb73708d70df82ccb5774e1d5ebc98ef2e22f2fdcd42e1289196'
        const isOriginalHash = hashedPassword === 'b1cfb6a12530eb73708d70df82ccb5774e1d5ebc98ef2e22f2fdcd42e1289196';
        const isDefaultHash = hashedPassword === DEFAULT_PASSWORD_HASH || hashedPassword === TEMP_PASSWORD_HASH;

        if ((customAdminHash && hashedPassword === customAdminHash) || (!customAdminHash && isDefaultHash) || isOriginalHash) {
          const adminUser = {
            name: 'HR Administrator',
            email: 'hr@laundrybasket.com',
            role: 'HR Manager',
            id: 0
          };
          setCurrentUser(adminUser);
          
          if (isDefaultHash && !customAdminHash) {
            // Force password change for admin too if they used default
            setNeedsPasswordChange(true);
          } else {
            setViewMode('admin');
            setActiveTab('dashboard');
            setIsLoggedIn(true);
          }
        } else {
          setLoginError('Invalid Employee ID/Email or password.');
        }
      } else {
        // Employee login (by empId or email)
        const foundEmployee = staffList.find(
          emp => emp.empId.toUpperCase() === username.toUpperCase() || 
                 emp.email.toLowerCase() === username.toLowerCase()
        );
        if (foundEmployee) {
          // Check if employee has set a custom password
          const customHash = employeePasswords[foundEmployee.empId] || employeePasswords[foundEmployee.email.toLowerCase()];
          const isDefaultHash = hashedPassword === DEFAULT_PASSWORD_HASH || hashedPassword === TEMP_PASSWORD_HASH;

          if (customHash) {
            if (hashedPassword === customHash) {
              setCurrentUser(foundEmployee);
              if (isDefaultHash) {
                setNeedsPasswordChange(true);
              } else {
                setViewMode('employee');
                setActiveTab('emp-dashboard');
                setIsLoggedIn(true);
              }
            } else {
              setLoginError('Invalid Employee ID/Email or password.');
            }
          } else {
            // First login with default password
            if (isDefaultHash) {
              setCurrentUser(foundEmployee);
              setNeedsPasswordChange(true);
            } else {
              setLoginError('Invalid Employee ID/Email or password.');
            }
          }
        } else {
          setLoginError('Invalid Employee ID/Email or password.');
        }
      }
    } catch (err) {
      setLoginError('An internal authentication error occurred.');
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeError(null);

    const newPass = newPasswordInput.trim();
    const confirmPass = confirmPasswordInput.trim();

    if (newPass.length < 6) {
      setPasswordChangeError('Password must be at least 6 characters long.');
      return;
    }
    if (newPass !== confirmPass) {
      setPasswordChangeError('Passwords do not match. Please re-enter.');
      return;
    }

    try {
      const newHash = await hashPassword(newPass);

      // Check it's not the same as default passwords
      if (newHash === DEFAULT_PASSWORD_HASH || newHash === TEMP_PASSWORD_HASH) {
        setPasswordChangeError('New password cannot be the same as the default temporary password.');
        return;
      }

      // Store the custom password hash under both empId and email keys
      setEmployeePasswords((prev: Record<string, string>) => {
        const updated = { ...prev };
        if (currentUser.empId) {
          updated[currentUser.empId] = newHash;
        }
        updated[currentUser.email.toLowerCase()] = newHash;
        return updated;
      });

      setPasswordChangeSuccess(true);

      // After a brief success animation, proceed to the correct dashboard
      setTimeout(() => {
        setNeedsPasswordChange(false);
        setPasswordChangeSuccess(false);
        setNewPasswordInput('');
        setConfirmPasswordInput('');
        if (currentUser.email.toLowerCase() === 'hr@laundrybasket.com') {
          setViewMode('admin');
          setActiveTab('dashboard');
        } else {
          setViewMode('employee');
          setActiveTab('emp-dashboard');
        }
        setIsLoggedIn(true);
      }, 1500);
    } catch (err) {
      setPasswordChangeError('An error occurred while setting your password.');
    }
  };

  const handleGlobalPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalPasswordError(null);

    const currentPass = globalCurrentPassword.trim();
    const newPass = globalNewPassword.trim();
    const confirmPass = globalConfirmPassword.trim();

    if (!currentPass || !newPass || !confirmPass) {
      setGlobalPasswordError('All fields are required.');
      return;
    }

    if (newPass.length < 6) {
      setGlobalPasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (newPass !== confirmPass) {
      setGlobalPasswordError('New passwords do not match.');
      return;
    }

    if (newPass === '1234' || newPass === 'LBBPL1234') {
      setGlobalPasswordError('New password cannot be the same as the default temporary password.');
      return;
    }

    try {
      const currentHash = await hashPassword(currentPass);
      const newHash = await hashPassword(newPass);
      const emailKey = currentUser.email.toLowerCase();

      let isValidCurrent = false;

      if (emailKey === 'hr@laundrybasket.com') {
        const storedHash = employeePasswords[emailKey];
        if (storedHash) {
          isValidCurrent = (currentHash === storedHash);
        } else {
          // Default original hash of 'HR@1234'
          isValidCurrent = (currentHash === 'b1cfb6a12530eb73708d70df82ccb5774e1d5ebc98ef2e22f2fdcd42e1289196' || currentHash === DEFAULT_PASSWORD_HASH || currentHash === TEMP_PASSWORD_HASH);
        }
      } else {
        const storedHash = employeePasswords[currentUser.empId] || employeePasswords[emailKey];
        if (storedHash) {
          isValidCurrent = (currentHash === storedHash);
        } else {
          isValidCurrent = (currentHash === TEMP_PASSWORD_HASH || currentHash === DEFAULT_PASSWORD_HASH);
        }
      }

      if (!isValidCurrent) {
        setGlobalPasswordError('Current password is incorrect.');
        return;
      }

      // Store the custom password hash under both empId and email keys
      setEmployeePasswords((prev: Record<string, string>) => {
        const updated = { ...prev };
        if (currentUser.empId) {
          updated[currentUser.empId] = newHash;
        }
        updated[emailKey] = newHash;
        return updated;
      });

      setGlobalPasswordSuccess(true);

      setTimeout(() => {
        setShowGlobalPasswordModal(false);
        setGlobalPasswordSuccess(false);
        setGlobalCurrentPassword('');
        setGlobalNewPassword('');
        setGlobalConfirmPassword('');
      }, 1500);

    } catch (err) {
      setGlobalPasswordError('An error occurred while changing your password.');
    }
  };

  const pendingLeavesCount = leavesList.filter(l => l.status === 'Pending').length;

  const renderContent = () => {
    // Force View Mode protection
    const enforcedViewMode = currentUser?.email?.toLowerCase() === 'hr@laundrybasket.com' ? viewMode : 'employee';

    // If Employee Portal is Active
    if (enforcedViewMode === 'employee') {
      // Attendance gets its own dedicated page even in employee mode
      if (activeTab === 'emp-attendance' || activeTab === 'attendance') {
        return <AttendanceManagement viewMode="employee" currentUser={currentUser} staffList={staffList} clockLogs={clockLogs} setClockLogs={setClockLogs} />;
      }
      const subTab = activeTab.startsWith('emp-') ? activeTab.replace('emp-', '') : activeTab; // 'dashboard', 'shifts', 'payroll', 'leaves', 'tasks', 'profile'
      return (
        <EmployeeWorkspace 
          staffList={staffList}
          setStaffList={setStaffList}
          shifts={shifts}
          payrollList={payrollList}
          leavesList={leavesList}
          setLeavesList={setLeavesList}
          activeSubTab={subTab === 'dashboard' ? 'dashboard' : subTab}
          clockLogs={clockLogs}
          setClockLogs={setClockLogs}
          tasksList={tasksList}
          setTasksList={setTasksList}
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
          employeePasswords={employeePasswords}
          setEmployeePasswords={setEmployeePasswords}
        />
      );
    }

    // If Admin Console is Active
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardOverview 
            setActiveTab={setActiveTab} 
            staffList={staffList}
            payrollList={payrollList}
            leavesList={leavesList}
          />
        );
      case 'staff':
        return <StaffDirectory staffList={staffList} setStaffList={setStaffList} employeePasswords={employeePasswords} setEmployeePasswords={setEmployeePasswords} />;
      case 'shifts':
        return <ShiftScheduler shifts={shifts} setShifts={setShifts} clockLogs={clockLogs} setClockLogs={setClockLogs} />;
      case 'payroll':
        return <PayrollIncentives payrollList={payrollList} setPayrollList={setPayrollList} />;
      case 'leaves':
        return <LeaveApprovals leavesList={leavesList} setLeavesList={setLeavesList} />;
      case 'tasks':
        return <TasksManagement tasksList={tasksList} setTasksList={setTasksList} staffList={staffList} />;
      case 'attendance':
        return <AttendanceManagement viewMode="admin" currentUser={currentUser} staffList={staffList} clockLogs={clockLogs} setClockLogs={setClockLogs} />;
      default:
        return (
          <DashboardOverview 
            setActiveTab={setActiveTab} 
            staffList={staffList}
            payrollList={payrollList}
            leavesList={leavesList}
          />
        );
    }
  };

  // --- SET PASSWORD SCREEN (shown after first login with temp password) ---
  if (needsPasswordChange && !isLoggedIn) {
    return (
      <div className="min-h-screen text-slate-700 flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/40 to-white font-sans">
        <div className="absolute top-[5%] left-[5%] w-[50%] h-[50%] rounded-full bg-[#1A6FDB]/8 blur-[140px] pointer-events-none" />
        <div className="absolute bottom-[5%] right-[5%] w-[50%] h-[50%] rounded-full bg-emerald-400/8 blur-[140px] pointer-events-none" />
        <div className="absolute top-[40%] left-[50%] w-[30%] h-[30%] rounded-full bg-indigo-400/5 blur-[100px] pointer-events-none" />

        <div className="w-full max-w-md p-6 sm:p-8 glass-panel border border-white/60 shadow-2xl relative z-10 mx-4">
          {/* Success animation overlay */}
          {passwordChangeSuccess && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center z-20 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-lg font-black text-slate-800">Password Set Successfully!</h3>
              <p className="text-xs text-slate-500 font-bold mt-1">Redirecting to your dashboard...</p>
            </div>
          )}

          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-[#1A6FDB]/10 backdrop-blur-md flex items-center justify-center border border-white/60 shadow-lg shadow-emerald-500/10 mb-3 flex-shrink-0">
              <Key className="w-7 h-7 text-[#1A6FDB]" />
            </div>
            <h2 className="text-xl font-black bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900 bg-clip-text text-transparent">
              Set Your Password
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-bold text-center max-w-xs">
              Welcome, <span className="text-[#1A6FDB] font-extrabold">{currentUser?.name}</span>! Please create a new password to secure your account.
            </p>
          </div>

          {passwordChangeError && (
            <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block flex-shrink-0" />
              <span>{passwordChangeError}</span>
            </div>
          )}

          <form onSubmit={handleSetNewPassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 text-xs glass-input bg-white/70 text-slate-800 font-semibold placeholder-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Re-enter your new password"
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 text-xs glass-input bg-white/70 text-slate-800 font-semibold placeholder-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Password match indicator */}
              {confirmPasswordInput.length > 0 && (
                <div className={`flex items-center gap-1.5 text-[10px] font-bold mt-1 ${newPasswordInput === confirmPasswordInput ? 'text-emerald-600' : 'text-rose-500'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${newPasswordInput === confirmPasswordInput ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  {newPasswordInput === confirmPasswordInput ? 'Passwords match' : 'Passwords do not match'}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={passwordChangeSuccess}
              className="w-full py-3 px-5 mt-2 rounded-xl text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-[#1A6FDB] hover:from-emerald-500 hover:to-blue-600 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/25 active:scale-98 disabled:opacity-50"
            >
              <Key className="w-4 h-4" />
              <span>SET PASSWORD & CONTINUE</span>
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setNeedsPasswordChange(false);
              setCurrentUser(null);
              setNewPasswordInput('');
              setConfirmPasswordInput('');
              setPasswordChangeError(null);
            }}
            className="mt-4 w-full text-center text-[10px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
          >
            ← Back to Login
          </button>
        </div>
      </div>
    );
  }

  // --- LOGIN SCREEN ---
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen text-slate-700 flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/40 to-white font-sans">
        {/* Decorative Light Glow Background Overlays */}
        <div className="absolute top-[5%] left-[5%] w-[50%] h-[50%] rounded-full bg-[#1A6FDB]/8 blur-[140px] pointer-events-none" />
        <div className="absolute bottom-[5%] right-[5%] w-[50%] h-[50%] rounded-full bg-cyan-400/8 blur-[140px] pointer-events-none" />
        <div className="absolute top-[40%] left-[50%] w-[30%] h-[30%] rounded-full bg-indigo-400/5 blur-[100px] pointer-events-none" />

        <div className="w-full max-w-md p-6 sm:p-8 glass-panel border border-white/60 shadow-2xl relative z-10 mx-4">
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-white/80 backdrop-blur-md flex items-center justify-center border border-white/60 shadow-lg shadow-blue-500/10 mb-3 flex-shrink-0">
              <img src={logoImg} alt="Laundry Basket Logo" className="w-12 h-12 object-contain" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900 bg-clip-text text-transparent">
              Laundry Basket HRMS
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-bold">Portal Secure Access Gateway</p>
          </div>

          {loginError && (
            <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-bold flex items-center gap-2 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Employee ID or Email</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. LBBPL005 or hr@laundrybasket.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-xs glass-input bg-white/70 text-slate-800 font-semibold placeholder-slate-400"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Security Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="Enter your password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-xs glass-input bg-white/70 text-slate-800 font-semibold placeholder-slate-400"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-5 mt-2 rounded-xl text-xs font-black text-white bg-gradient-to-r from-blue-600 to-[#1A6FDB] hover:from-blue-500 hover:to-blue-600 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#1A6FDB]/25 active:scale-98"
            >
              <LogIn className="w-4 h-4" />
              <span>AUTHENTICATE SYSTEM</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-700 flex relative overflow-x-hidden antialiased">
      {/* Decorative Light Glow Background Overlays */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/6 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] rounded-full bg-indigo-500/3 blur-[120px] pointer-events-none" />

      {/* Sidebar Drawer Backdrop for Mobile Screens */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setMobileOpen(false); // Close sidebar on mobile after clicking item
        }} 
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        viewMode={currentUser?.email?.toLowerCase() === 'hr@laundrybasket.com' ? viewMode : 'employee'}
        setViewMode={setViewMode}
        pendingLeavesCount={pendingLeavesCount}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        currentUser={currentUser}
        onLogout={() => {
          setIsLoggedIn(false);
          setCurrentUser(null);
          setEmailInput('');
          setPasswordInput('');
        }}
        onChangePasswordClick={() => setShowGlobalPasswordModal(true)}
      />

      {/* Main Content Area */}
      <main 
        className={`flex-1 min-h-screen p-3 md:p-6 transition-all duration-300 ${
          collapsed ? 'ml-0 md:ml-24' : 'ml-0 md:ml-76'
        } flex flex-col`}
      >
        {/* Dynamic Header */}
        <Header activeTab={activeTab} setMobileOpen={setMobileOpen} />

        {/* Dynamic Panel Views */}
        <div className="flex-1 w-full relative">
          {renderContent()}
        </div>

        {/* Global Footer */}
        <footer className="mt-8 py-4 border-t border-slate-200/40 flex flex-col sm:flex-row justify-between items-center gap-2.5 text-[10px] text-slate-450 font-bold tracking-wider uppercase">
          <span>© 2026 Laundry Basket Unicorn Inc. All rights reserved.</span>
          <span className="flex items-center gap-1.5 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1A6FDB] shadow-[0_0_8px_rgba(26,111,219,0.5)]" />
            HRMS Version 1.2.1
          </span>
        </footer>
      </main>

      {/* Global Change Password Modal */}
      {showGlobalPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs animate-fade-in p-4">
          <div className="w-full max-w-md p-6 sm:p-8 glass-panel border border-white/60 shadow-2xl relative">
            {globalPasswordSuccess && (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center z-20 animate-fade-in">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
                  <CheckCircle className="w-7 h-7 text-emerald-500" />
                </div>
                <h3 className="text-base font-black text-slate-800">Password Changed Successfully!</h3>
                <p className="text-xs text-slate-500 font-bold mt-1">Closing settings...</p>
              </div>
            )}

            <div className="flex justify-between items-center mb-5 border-b border-slate-200/40 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#1A6FDB]/10 rounded-lg text-[#1A6FDB]">
                  <Key className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-slate-850 text-sm">Change Account Password</h3>
              </div>
              <button 
                onClick={() => {
                  setShowGlobalPasswordModal(false);
                  setGlobalPasswordError(null);
                  setGlobalCurrentPassword('');
                  setGlobalNewPassword('');
                  setGlobalConfirmPassword('');
                }}
                className="p-1 hover:bg-slate-100 rounded text-slate-450 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {globalPasswordError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 text-xs font-bold flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block flex-shrink-0" />
                <span>{globalPasswordError}</span>
              </div>
            )}

            <form onSubmit={handleGlobalPasswordChange} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Current Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="Enter current password"
                    value={globalCurrentPassword}
                    onChange={(e) => setGlobalCurrentPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-xs glass-input bg-white/70 text-slate-800 font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">New Password (min 6 chars)</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="Enter new password"
                    value={globalNewPassword}
                    onChange={(e) => setGlobalNewPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-xs glass-input bg-white/70 text-slate-800 font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="Confirm new password"
                    value={globalConfirmPassword}
                    onChange={(e) => setGlobalConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-xs glass-input bg-white/70 text-slate-800 font-semibold"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 mt-2 rounded-xl text-xs font-black text-white bg-gradient-to-r from-blue-600 to-[#1A6FDB] hover:from-blue-500 hover:to-blue-600 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#1A6FDB]/20"
              >
                <span>UPDATE PASSWORD</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
