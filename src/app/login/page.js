'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { getTranslation } from '@/lib/translations';
import { LayoutDashboard, Lock, User as UserIcon, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { login, language } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);



  const t = (key) => getTranslation(key, language);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError(t('fillAllFields'));
      return;
    }

    setError('');
    setSubmitting(true);
    const result = await login(username.trim(), password);
    setSubmitting(false);

    if (!result.success) {
      setError(result.error || t('authFailed'));
    }
  };



  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 select-none">
      <div className="w-full max-w-md">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="bg-gradient-to-tr from-primary-gradient-from to-primary-gradient-to text-white p-3 rounded-2xl shadow-lg shadow-primary-shadow mb-3">
            <LayoutDashboard className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text text-transparent">
            {t('welcomeTitle')}
          </h1>
          <p className="text-sm text-text-secondary mt-1.5 max-w-xs font-medium">
            {t('loginSubtitle')}
          </p>
        </div>

        {/* Login Form Card */}
        <div className="bg-surface border border-border rounded-2xl shadow-xl p-6 md:p-8">
          
          {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Error message bubble */}
              {error && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-800 dark:text-rose-300 text-xs font-semibold leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
                  {error}
                </div>
              )}

              {/* Username Input */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                  {t('usernameLabel')}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-text-muted pointer-events-none">
                    <UserIcon className="h-4.5 w-4.5" />
                  </span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t('enterUsername')}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-surface-hover focus:bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm transition-all duration-200 text-text-primary"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                  {t('passwordLabel')}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-text-muted pointer-events-none">
                    <Lock className="h-4.5 w-4.5" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('enterPassword')}
                    className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-border bg-surface-hover focus:bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm transition-all duration-200 text-text-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>



              {/* Login Trigger */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-sm shadow-md shadow-primary-shadow active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all duration-200 cursor-pointer"
              >
                {submitting ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                ) : (
                  t('signIn')
                )}
              </button>

            </form>
        </div>

        {/* Warning footer */}
        <p className="text-center text-[11px] text-text-muted mt-6 leading-relaxed font-medium">
          {t('selfRegDisabled')}
        </p>
      </div>
    </div>
  );
}
