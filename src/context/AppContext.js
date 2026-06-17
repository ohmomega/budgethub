'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const router = useRouter();
  const pathname = usePathname();

  const [theme, setThemeState] = useState('normal');
  const [language, setLanguageState] = useState('en');

  const applyTheme = (themeName) => {
    if (typeof window === 'undefined') return;
    const htmlEl = document.documentElement;
    const bodyEl = document.body;
    if (!htmlEl || !bodyEl) return;

    // Clear old theme classes
    htmlEl.classList.remove('dark');
    bodyEl.classList.remove('theme-normal', 'theme-dark', 'theme-pink');

    // Apply new theme classes
    bodyEl.classList.add(`theme-${themeName}`);
    if (themeName === 'dark') {
      htmlEl.classList.add('dark');
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('budgethub-theme') || 'normal';
    const savedLang = localStorage.getItem('budgethub-lang') || 'en';
    setThemeState(savedTheme);
    setLanguageState(savedLang);
    applyTheme(savedTheme);
  }, []);

  const setTheme = (themeName) => {
    setThemeState(themeName);
    localStorage.setItem('budgethub-theme', themeName);
    applyTheme(themeName);
  };

  const setLanguage = (lang) => {
    setLanguageState(lang);
    localStorage.setItem('budgethub-lang', lang);
  };

  // Load active user profile on mount
  const checkUserSession = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
        // If they are on a protected page, redirect
        if (pathname !== '/login') {
          router.push('/login');
        }
      }
    } catch (err) {
      console.error('Session check error:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [pathname, router]);

  useEffect(() => {
    // Skip checking session if on login page
    if (pathname === '/login') {
      setUser(null);
      setLoading(false);
      return;
    }
    checkUserSession();
  }, [pathname, checkUserSession]);

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const login = useCallback(async (username, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      setUser(data.user);
      showToast('Successfully logged in!', 'success');
      router.push('/dashboard');
      return { success: true };
    } catch (err) {
      showToast(err.message, 'error');
      return { success: false, error: err.message };
    }
  }, [router, showToast]);

  const logout = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/logout', {
        method: 'POST'
      });
      if (res.ok) {
        setUser(null);
        showToast('Logged out successfully', 'info');
        router.push('/login');
      } else {
        showToast('Logout error occurred', 'error');
      }
    } catch (err) {
      showToast('Connection failed during logout', 'error');
    }
  }, [router, showToast]);

  return (
    <AppContext.Provider
      value={{
        user,
        loading,
        toasts,
        showToast,
        removeToast,
        login,
        logout,
        refreshSession: checkUserSession,
        theme,
        setTheme,
        language,
        setLanguage
      }}
    >
      {children}
      
      {/* Dynamic Toast Renderer */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            className={`cursor-pointer flex items-center justify-between p-4 rounded-xl border shadow-lg transition-all transform duration-300 translate-y-0 scale-100 hover:scale-[1.02] active:scale-[0.98] ${
              toast.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-50 dark:border-emerald-900'
                : toast.type === 'error'
                ? 'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950 dark:text-rose-50 dark:border-rose-900'
                : 'bg-teal-50 text-teal-900 border-teal-200 dark:bg-teal-950 dark:text-teal-50 dark:border-teal-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="font-medium text-sm leading-relaxed">{toast.message}</span>
            </div>
            <button className="ml-4 text-xs font-semibold opacity-60 hover:opacity-100 transition-opacity">
              ✕
            </button>
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
