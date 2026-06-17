'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { getTranslation } from '@/lib/translations';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  Building2,
  Users,
  LogOut,
  Menu,
  X,
  User as UserIcon,
  ShieldAlert
} from 'lucide-react';

export default function LayoutShell({ children }) {
  const { user, logout, loading, theme, setTheme, language, setLanguage } = useApp();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-text-primary">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm font-medium text-text-secondary">{getTranslation('loadingApp', language)}</p>
        </div>
      </div>
    );
  }

  // If no user is logged in (should be redirected by middleware, but fallback spinner)
  if (!user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-text-primary">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-pulse rounded-full bg-primary"></div>
          <p className="text-sm font-medium text-text-secondary">{getTranslation('redirecting', language)}</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { name: 'Dashboard', key: 'dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'user', 'viewer'] },
    { name: 'Budget Sheets', key: 'budgetPeriods', href: '/periods', icon: Calendar, roles: ['admin', 'user', 'viewer'] },
    { name: 'Cost Centers', key: 'costCenters', href: '/admin/cost-centers', icon: Building2, roles: ['admin'] },
    { name: 'User Management', key: 'userManagement', href: '/admin/users', icon: Users, roles: ['admin'] }
  ];

  const allowedItems = navItems.filter((item) => item.roles.includes(user.role));

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900';
      case 'user':
        return 'bg-primary-light text-primary border-primary-border';
      case 'viewer':
        return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-text-primary">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-sidebar-bg p-5 shrink-0 select-none fixed top-0 left-0 bottom-0 h-screen overflow-y-auto z-20">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 px-2 py-4 mb-6">
          <div className="bg-gradient-to-tr from-primary-gradient-from to-primary-gradient-to text-white p-2.5 rounded-xl shadow-md shadow-primary-shadow">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text text-transparent">
            BudgetHub
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1">
          {allowedItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-primary-light text-primary font-semibold shadow-sm'
                    : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-primary" />
                )}
                <Icon className={`h-4.5 w-4.5 transition-transform duration-200 group-hover:scale-105 ${
                  isActive ? 'text-primary' : 'text-text-muted group-hover:text-text-secondary'
                }`} />
                {getTranslation(item.key, language)}
              </Link>
            );
          })}
        </nav>

        {/* Theme and Language Settings Panel */}
        <div className="border-t border-border pt-4 mt-4 space-y-3.5">
          {/* Language Selector */}
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-semibold text-text-secondary">
              {getTranslation('langLabel', language)}
            </span>
            <div className="flex bg-surface-hover rounded-lg p-0.5 select-none border border-border">
              <button
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                  language === 'en'
                    ? 'bg-surface text-text-primary shadow-sm'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('th')}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                  language === 'th'
                    ? 'bg-surface text-text-primary shadow-sm'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                ไทย
              </button>
            </div>
          </div>

          {/* Theme Selector */}
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-semibold text-text-secondary">
              {getTranslation('themeLabel', language)}
            </span>
            <div className="flex items-center gap-2">
              {/* Normal/Teal dot */}
              <button
                onClick={() => setTheme('normal')}
                title="Normal Theme"
                className={`h-5.5 w-5.5 rounded-full bg-teal-600 border-2 cursor-pointer transition-all ${
                  theme === 'normal' ? 'border-text-primary scale-110 shadow-sm' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              />
              {/* Dark dot */}
              <button
                onClick={() => setTheme('dark')}
                title="Dark Theme"
                className={`h-5.5 w-5.5 rounded-full bg-slate-950 border-2 cursor-pointer transition-all ${
                  theme === 'dark' ? 'border-white scale-110 shadow-sm' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              />
              {/* PEA Purple & Gold dot */}
              <button
                onClick={() => setTheme('pink')}
                title="PEA Purple Theme"
                className={`h-5.5 w-5.5 rounded-full bg-[#852885] border-2 cursor-pointer transition-all ${
                  theme === 'pink' ? 'border-text-primary scale-110 shadow-sm' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              />
            </div>
          </div>
        </div>

        {/* User profile section */}
        <div className="border-t border-border pt-4 mt-4 flex flex-col gap-3">
          <div className="flex items-center gap-3 px-2">
            <div className="h-9 w-9 rounded-full bg-primary-light flex items-center justify-center border border-primary-border text-primary">
              <UserIcon className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate text-text-primary">{user.username}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`px-1.5 py-0.5 text-[10px] font-bold tracking-wide rounded border uppercase ${getRoleBadgeColor(user.role)}`}>
                  {user.role}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/10 transition-all duration-200"
          >
            <LogOut className="h-4.5 w-4.5" />
            {getTranslation('signOut', language)}
          </button>
        </div>
      </aside>

      {/* Spacer for Desktop Sidebar to prevent overlapping */}
      <div className="hidden md:block w-64 shrink-0" />

      {/* Mobile Top Navbar */}
      <header className="md:hidden flex items-center justify-between px-5 py-4 border-b border-border bg-sidebar-bg sticky top-0 z-40 select-none">
        <div className="flex items-center gap-2.5">
          <div className="bg-gradient-to-tr from-primary-gradient-from to-primary-gradient-to text-white p-1.5 rounded-lg">
            <LayoutDashboard className="h-4 w-4" />
          </div>
          <span className="font-bold text-base bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text text-transparent">
            BudgetHub
          </span>
        </div>
        
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-text-secondary p-1 hover:bg-surface-hover rounded-lg"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* Mobile Menu Panel */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-[57px] bottom-0 bg-slate-950/40 backdrop-blur-sm z-30 transition-opacity duration-300">
          <div className="bg-surface border-b border-border p-5 flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
            <nav className="space-y-1">
              {allowedItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-primary-light text-primary font-semibold shadow-sm'
                        : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5" />
                    {getTranslation(item.key, language)}
                  </Link>
                );
              })}
            </nav>

            {/* Theme and Language Settings Panel */}
            <div className="border-t border-border pt-4 flex flex-col gap-3">
              {/* Language Selector */}
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-text-secondary">
                  {getTranslation('langLabel', language)}
                </span>
                <div className="flex bg-surface-hover rounded-lg p-0.5 select-none border border-border">
                  <button
                    onClick={() => setLanguage('en')}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                      language === 'en'
                        ? 'bg-surface text-text-primary shadow-sm'
                        : 'text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    EN
                  </button>
                  <button
                    onClick={() => setLanguage('th')}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                      language === 'th'
                        ? 'bg-surface text-text-primary shadow-sm'
                        : 'text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    ไทย
                  </button>
                </div>
              </div>

              {/* Theme Selector */}
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-text-secondary">
                  {getTranslation('themeLabel', language)}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTheme('normal')}
                    className={`h-5.5 w-5.5 rounded-full bg-teal-600 border-2 cursor-pointer ${
                      theme === 'normal' ? 'border-text-primary scale-110 shadow-sm' : 'border-transparent opacity-60'
                    }`}
                  />
                  <button
                    onClick={() => setTheme('dark')}
                    className={`h-5.5 w-5.5 rounded-full bg-slate-950 border-2 cursor-pointer ${
                      theme === 'dark' ? 'border-white scale-110 shadow-sm' : 'border-transparent opacity-60'
                    }`}
                  />
                  <button
                    onClick={() => setTheme('pink')}
                    title="PEA Purple Theme"
                    className={`h-5.5 w-5.5 rounded-full bg-[#852885] border-2 cursor-pointer ${
                      theme === 'pink' ? 'border-text-primary scale-110 shadow-sm' : 'border-transparent opacity-60'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-4 flex flex-col gap-4">
              <div className="flex items-center gap-3 px-1">
                <div className="h-9 w-9 rounded-full bg-primary-light flex items-center justify-center text-primary">
                  <UserIcon className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{user.username}</p>
                  <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded border uppercase ${getRoleBadgeColor(user.role)}`}>
                    {user.role}
                  </span>
                </div>
              </div>
              
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut className="h-4.5 w-4.5" />
                {getTranslation('signOut', language)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main View Area */}
      <main className="flex-1 flex flex-col min-w-0 p-5 md:p-8 max-w-[1600px] mx-auto w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
