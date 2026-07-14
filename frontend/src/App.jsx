import React, { useState, useEffect } from 'react';
import api from './api';
import Login from './components/Login';
import BudgetGrid from './components/BudgetGrid';
import Dashboard from './components/Dashboard';
import BudgetSheetsList from './components/BudgetSheetsList';
import CostCentersList from './components/CostCentersList';
import DepartmentsList from './components/DepartmentsList';
import ManageUsers from './components/ManageUsers';
import HelpCenter from './components/HelpCenter';
import {
  LogOut,
  LayoutDashboard,
  FileSpreadsheet,
  Layers,
  Building2,
  Users,
  User,
  Globe,
  Palette,
  HelpCircle,
  CheckCircle2,
  Circle,
  ArrowRight,
  Sparkles,
  X
} from 'lucide-react';

const dict = {
  TH: {
    dashboard: 'แผงควบคุม',
    budgetSheets: 'แผ่นงบประมาณ',
    costCenters: 'ศูนย์ต้นทุน',
    departments: 'จัดการแผนก',
    manageUsers: 'จัดการผู้ใช้งาน',
    help: 'คู่มือการใช้งาน',
    language: 'ภาษา',
    theme: 'ธีมสี',
    logout: 'ออกจากระบบ',
    checking: 'กำลังตรวจสอบสิทธิ์การใช้งาน...',
    eduOnly: 'เพื่อการศึกษาเท่านั้น • ข้อมูลเป็นเพียงตัวอย่าง',
    welcomeTitle: 'ยินดีต้อนรับสู่ BudgetHub',
    welcomeSubtitle: 'มาเริ่มตั้งค่าโปรแกรมกันก่อน ทำ 3 ขั้นตอนนี้ให้ครบเพื่อเริ่มใช้งาน',
    step1: 'สร้าง "แผ่นงบประมาณ" แรกของคุณ',
    step1Desc: 'เลือกเดือน/ปี เพื่อเริ่มต้น',
    step2: 'สร้าง "แผนก"',
    step2Desc: 'ที่เมนู "จัดการแผนก" หรือเพิ่มจากในแผ่นงานก็ได้',
    step3: 'เพิ่ม "ศูนย์ต้นทุน"',
    step3Desc: 'รหัสศูนย์ต้นทุนใช้ได้กับทุกแผนก',
    goDept: 'ไปที่จัดการแผนก',
    goCc: 'สร้างศูนย์ต้นทุน',
    goSheet: 'สร้างแผ่นงบประมาณ',
    doneLabel: 'เสร็จแล้ว',
    welcomeClose: 'ปิดหน้าต่างนี้',
    openHelp: 'ดูคู่มือการใช้งานแบบละเอียด',
  },
  EN: {
    dashboard: 'Dashboard',
    budgetSheets: 'Budget Sheets',
    costCenters: 'Cost Centers',
    departments: 'Departments',
    manageUsers: 'Manage Users',
    help: 'Help & Guide',
    language: 'Language',
    theme: 'Theme Color',
    logout: 'Log Out',
    checking: 'Checking credentials...',
    eduOnly: 'For educational purposes only • Sample data',
    welcomeTitle: 'Welcome to BudgetHub',
    welcomeSubtitle: "Let's set things up. Complete these 3 steps to get started.",
    step1: 'Create your first Budget Sheet',
    step1Desc: 'Pick a month/year to begin.',
    step2: 'Create a Department',
    step2Desc: 'From the "Departments" page, or add one inside a sheet.',
    step3: 'Create a Cost Center',
    step3Desc: 'Cost center codes work for every department.',
    goDept: 'Manage Departments',
    goCc: 'Create Cost Center',
    goSheet: 'Create Budget Sheet',
    doneLabel: 'Done',
    welcomeClose: 'Close this window',
    openHelp: 'Open the full user guide',
  }
};

export default function App() {
  const [user, setUser] = useState(null);
  const [currentTab, setCurrentTab] = useState('dashboard'); // 'dashboard', 'sheets', 'costcenters', 'users'
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'TH');
  const [theme, setTheme] = useState(() => localStorage.getItem('themeColor') || 'teal');
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('themeMode') || 'light');
  const [activeSheetPeriod, setActiveSheetPeriod] = useState(null); // { month, year } when editing

  // Onboarding / first-run setup state
  const [setup, setSetup] = useState({ depts: 0, ccs: 0, sheets: 0, loaded: false });
  const [showWelcome, setShowWelcome] = useState(false);

  // Count the core entities so the setup checklist can show live progress and
  // the first-run welcome can decide whether to appear.
  const refreshSetup = async () => {
    try {
      const [deptRes, ccRes, periodRes] = await Promise.all([
        api.get('/departments'),
        api.get('/cost-centers'),
        api.get('/periods'),
      ]);
      setSetup({
        depts: deptRes.data.length,
        ccs: ccRes.data.length,
        sheets: periodRes.data.length,
        loaded: true,
      });
      return { depts: deptRes.data.length };
    } catch (err) {
      console.error('Setup check failed:', err);
      setSetup(prev => ({ ...prev, loaded: true }));
      return { depts: 0 };
    }
  };

  // Check auth status on mount - automatically logs in as administrator
  useEffect(() => {
    const autoLogin = async () => {
      try {
        // Set mock tokens so requests are sent successfully
        localStorage.setItem('accessToken', 'mock-token');
        localStorage.setItem('refreshToken', 'mock-token');
        
        // Fetch current user from backend (which always returns admin details now)
        const res = await api.get('/auth/me');
        setUser(res.data);
        localStorage.setItem('user', JSON.stringify(res.data));
      } catch (err) {
        console.error('Auto-login failed, using local admin fallback:', err);
        const fallbackAdmin = {
          id: '00000000-0000-0000-0000-000000000000',
          username: 'admin',
          role: 'admin',
          full_name: 'Administrator',
          department_id: null,
          department_name: 'All Departments',
          department_code: 'ALL'
        };
        setUser(fallbackAdmin);
        localStorage.setItem('user', JSON.stringify(fallbackAdmin));
      } finally {
        setCheckingAuth(false);
      }
    };

    autoLogin();
  }, []);

  // After sign-in, load setup counts and decide whether to show the first-run
  // welcome. It appears if the user has never dismissed it, or whenever there
  // are still no departments (the app is not usable until one exists).
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { depts } = await refreshSetup();
      const seen = localStorage.getItem('bh_welcome_seen') === '1';
      if (!seen || depts === 0) setShowWelcome(true);
    })();
  }, [user]);

  // Sync theme to body class
  useEffect(() => {
    document.body.className = `theme-${theme} mode-${themeMode}`;
    localStorage.setItem('themeColor', theme);
    localStorage.setItem('themeMode', themeMode);
  }, [theme, themeMode]);

  // Sync language to localStorage
  useEffect(() => {
    localStorage.setItem('lang', lang);
  }, [lang]);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setCurrentTab('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
    setActiveSheetPeriod(null);
  };

  const handleOpenSheet = (month, year) => {
    setActiveSheetPeriod({ month, year });
    setCurrentTab('sheets');
  };

  // Generic tab navigation used by onboarding and empty-state guides.
  const handleNavigate = (tab) => {
    setCurrentTab(tab);
    setActiveSheetPeriod(null);
  };

  const dismissWelcome = () => {
    localStorage.setItem('bh_welcome_seen', '1');
    setShowWelcome(false);
  };

  // Navigate from the welcome checklist to a setup page (keeps the flag so it
  // won't nag again, but the user can always reopen it from the Help page).
  const goSetup = (tab) => {
    dismissWelcome();
    handleNavigate(tab);
  };

  const t = dict[lang];

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin" />
          <span>{t.checking}</span>
        </div>
      </div>
    );
  }

  // If not logged in, render Login Page
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} lang={lang} setLang={setLang} theme={theme} />;
  }

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-800">

      {/* 1. Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between h-screen sticky top-0 shrink-0 select-none">
        <div>
          {/* Logo Brand Header */}
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <div className="h-9 w-9 bg-[var(--color-primary)] text-white rounded-xl flex items-center justify-center font-black shadow-md shadow-teal-600/10">
              BH
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-800 leading-none">
                BudgetHub
              </h1>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                Provincial Electricity
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {/* Dashboard */}
            <button
              onClick={() => { setCurrentTab('dashboard'); setActiveSheetPeriod(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition cursor-pointer ${currentTab === 'dashboard'
                ? 'bg-[var(--color-primary-bg-light)] text-[var(--color-primary)]'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                }`}
            >
              <LayoutDashboard className="h-5 w-5" />
              <span>{t.dashboard}</span>
            </button>

            {/* Budget Sheets */}
            <button
              onClick={() => { setCurrentTab('sheets'); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition cursor-pointer ${currentTab === 'sheets'
                ? 'bg-[var(--color-primary-bg-light)] text-[var(--color-primary)]'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                }`}
            >
              <FileSpreadsheet className="h-5 w-5" />
              <span>{t.budgetSheets}</span>
            </button>

            {/* Cost Centers */}
            <button
              onClick={() => { setCurrentTab('costcenters'); setActiveSheetPeriod(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition cursor-pointer ${currentTab === 'costcenters'
                ? 'bg-[var(--color-primary-bg-light)] text-[var(--color-primary)]'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                }`}
            >
              <Layers className="h-5 w-5" />
              <span>{t.costCenters}</span>
            </button>

            {/* Departments */}
            <button
              onClick={() => { setCurrentTab('departments'); setActiveSheetPeriod(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition cursor-pointer ${currentTab === 'departments'
                ? 'bg-[var(--color-primary-bg-light)] text-[var(--color-primary)]'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                }`}
            >
              <Building2 className="h-5 w-5" />
              <span>{t.departments}</span>
            </button>

            {/* Help & Guide */}
            <button
              onClick={() => { setCurrentTab('help'); setActiveSheetPeriod(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition cursor-pointer ${currentTab === 'help'
                ? 'bg-[var(--color-primary-bg-light)] text-[var(--color-primary)]'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                }`}
            >
              <HelpCircle className="h-5 w-5" />
              <span>{t.help}</span>
            </button>

          </nav>
        </div>

        {/* Sidebar Footer options */}
        <div className="p-4 border-t border-slate-100 space-y-4">

          {/* Language Switcher */}
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              {t.language}
            </span>
            <div className="bg-slate-100 p-0.5 rounded-lg flex items-center">
              <button
                onClick={() => setLang('EN')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition ${lang === 'EN' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                EN
              </button>
              <button
                onClick={() => setLang('TH')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition ${lang === 'TH' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                ไทย
              </button>
            </div>
          </div>

          {/* Theme Color Switcher */}
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5" />
              {t.theme}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTheme('teal')}
                className={`h-4.5 w-4.5 rounded-full bg-teal-600 transition border ${theme === 'teal' ? 'ring-2 ring-teal-600 ring-offset-2 border-white' : 'border-transparent'
                  }`}
                title="Teal"
              />
              <button
                onClick={() => setTheme('slate')}
                className={`h-4.5 w-4.5 rounded-full bg-slate-600 transition border ${theme === 'slate' ? 'ring-2 ring-slate-600 ring-offset-2 border-white' : 'border-transparent'
                  }`}
                title="Slate"
              />
              <button
                onClick={() => setTheme('purple')}
                className={`h-4.5 w-4.5 rounded-full bg-purple-600 transition border ${theme === 'purple' ? 'ring-2 ring-purple-600 ring-offset-2 border-white' : 'border-transparent'
                  }`}
                title="Purple"
              />
            </div>
          </div>

          {/* Theme Mode Switcher */}
          <div className="flex flex-col gap-2 px-2 pt-1">
            <div className="bg-slate-100 p-0.5 rounded-xl flex items-center w-full justify-between">
              <button
                onClick={() => setThemeMode('light')}
                className={`flex-1 py-1.5 text-[10px] font-extrabold rounded-lg transition text-center cursor-pointer ${themeMode === 'light' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                {lang === 'TH' ? 'สว่าง' : 'Light'}
              </button>
              <button
                onClick={() => setThemeMode('dark')}
                className={`flex-1 py-1.5 text-[10px] font-extrabold rounded-lg transition text-center cursor-pointer ${themeMode === 'dark' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                {lang === 'TH' ? 'มืด' : 'Dark'}
              </button>
              <button
                onClick={() => setThemeMode('soft')}
                className={`flex-1 py-1.5 text-[10px] font-extrabold rounded-lg transition text-center cursor-pointer ${themeMode === 'soft' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                {lang === 'TH' ? 'นุ่มนวล' : 'Soft'}
              </button>
            </div>
          </div>

          {/* User Avatar info and Logout */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-9 w-9 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 shrink-0">
                <User className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-800 truncate" title={user.full_name}>
                  {user.full_name}
                </div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide truncate">
                  {user.role} {user.department_code ? `(${user.department_code})` : ''}
                </div>
              </div>
            </div>

            {/* Log Out button hidden in single-user mode */}
          </div>

          {/* Educational-use disclaimer + build version */}
          <p className="text-[9px] leading-snug text-slate-400 font-semibold text-center pt-1 border-t border-slate-100">
            {t.eduOnly}
            <span className="block mt-1 text-slate-300 tracking-wide">
              BudgetHub v{__APP_VERSION__}
            </span>
          </p>

        </div>
      </aside>

      {/* 2. Main content area */}
      <main className="flex-1 min-w-0 overflow-y-auto h-screen p-8">
        {currentTab === 'dashboard' && (
          <Dashboard user={user} lang={lang} onOpenSheet={handleOpenSheet} />
        )}
        {currentTab === 'sheets' && (
          activeSheetPeriod ? (
            <BudgetGrid
              key={`${activeSheetPeriod.month}-${activeSheetPeriod.year}`}
              user={user}
              lang={lang}
              periodInfo={activeSheetPeriod}
              onBack={() => setActiveSheetPeriod(null)}
              onNavigate={handleNavigate}
            />
          ) : (
            <BudgetSheetsList
              user={user}
              lang={lang}
              onOpenSheet={handleOpenSheet}
              onNavigate={handleNavigate}
            />
          )
        )}
        {currentTab === 'costcenters' && (
          <CostCentersList user={user} lang={lang} />
        )}
        {currentTab === 'departments' && (
          <DepartmentsList user={user} lang={lang} />
        )}
        {currentTab === 'help' && (
          <HelpCenter lang={lang} onNavigate={handleNavigate} onOpenSetup={() => { refreshSetup(); setShowWelcome(true); }} />
        )}

      </main>

      {/* First-run welcome / setup checklist */}
      {showWelcome && (
        <div className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-[28px] p-7 w-full max-w-lg shadow-2xl animate-scale-in">
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 bg-[var(--color-primary)] text-white rounded-2xl flex items-center justify-center shrink-0 shadow-md shadow-teal-600/10">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg leading-tight">{t.welcomeTitle}</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">{t.welcomeSubtitle}</p>
                </div>
              </div>
              <button
                onClick={dismissWelcome}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition cursor-pointer shrink-0"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2.5 mt-5">
              {[
                { done: setup.sheets > 0, title: t.step1, desc: t.step1Desc, btn: t.goSheet, tab: 'sheets' },
                { done: setup.depts > 0, title: t.step2, desc: t.step2Desc, btn: t.goDept, tab: 'departments' },
                { done: setup.ccs > 0, title: t.step3, desc: t.step3Desc, btn: t.goCc, tab: 'costcenters' },
              ].map((s, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl border ${
                    s.done ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  {s.done
                    ? <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
                    : <Circle className="h-6 w-6 text-slate-300 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-400">{i + 1}</span>
                      {s.title}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">{s.desc}</div>
                  </div>
                  {s.done ? (
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wide shrink-0">{t.doneLabel}</span>
                  ) : (
                    <button
                      onClick={() => goSetup(s.tab)}
                      className="glass-btn-primary text-xs font-bold py-1.5 px-3 shrink-0"
                    >
                      <span>{s.btn}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-3 pt-5 mt-4 border-t border-slate-100">
              <button
                onClick={() => { dismissWelcome(); handleNavigate('help'); }}
                className="text-xs font-bold text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] flex items-center gap-1 cursor-pointer"
              >
                <HelpCircle className="h-4 w-4" />
                <span>{t.openHelp}</span>
              </button>
              <button onClick={dismissWelcome} className="glass-btn-secondary text-sm font-bold">
                {t.welcomeClose}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
