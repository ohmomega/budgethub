import React, { useState, useEffect } from 'react';
import api from './api';
import Login from './components/Login';
import BudgetGrid from './components/BudgetGrid';
import Dashboard from './components/Dashboard';
import BudgetSheetsList from './components/BudgetSheetsList';
import CostCentersList from './components/CostCentersList';
import ManageUsers from './components/ManageUsers';
import {
  LogOut,
  LayoutDashboard,
  FileSpreadsheet,
  Layers,
  Users,
  User,
  Globe,
  Palette
} from 'lucide-react';

const dict = {
  TH: {
    dashboard: 'แผงควบคุม',
    budgetSheets: 'แผ่นงบประมาณ',
    costCenters: 'ศูนย์ต้นทุน',
    manageUsers: 'จัดการผู้ใช้งาน',
    language: 'ภาษา',
    theme: 'ธีมสี',
    logout: 'ออกจากระบบ',
    checking: 'กำลังตรวจสอบสิทธิ์การใช้งาน...',
  },
  EN: {
    dashboard: 'Dashboard',
    budgetSheets: 'Budget Sheets',
    costCenters: 'Cost Centers',
    manageUsers: 'Manage Users',
    language: 'Language',
    theme: 'Theme Color',
    logout: 'Log Out',
    checking: 'Checking credentials...',
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
              user={user}
              lang={lang}
              periodInfo={activeSheetPeriod}
              onBack={() => setActiveSheetPeriod(null)}
            />
          ) : (
            <BudgetSheetsList user={user} lang={lang} onOpenSheet={handleOpenSheet} />
          )
        )}
        {currentTab === 'costcenters' && (
          <CostCentersList user={user} lang={lang} />
        )}

      </main>
    </div>
  );
}
