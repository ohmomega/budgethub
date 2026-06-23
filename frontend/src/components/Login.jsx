import React, { useState } from 'react';
import api from '../api';
import { User, Lock, Eye, EyeOff, LayoutGrid } from 'lucide-react';

const dict = {
  TH: {
    welcome: 'ยินดีต้อนรับสู่ BudgetHub',
    subtitle: 'ระบบจัดการงบประมาณที่ปลอดภัยและร่วมมือกัน ออกแบบมาเพื่อทดแทน Excel',
    usernameLabel: 'ชื่อผู้ใช้',
    usernamePlaceholder: 'กรอกชื่อผู้ใช้ของคุณ',
    passwordLabel: 'รหัสผ่าน',
    passwordPlaceholder: 'กรอกรหัสผ่านของคุณ',
    loginBtn: 'เข้าสู่ระบบ',
    registrationDisabled: 'การลงทะเบียนด้วยตนเองถูกปิดใช้งาน ติดต่อผู้ดูแลระบบเพื่อขอบัญชี',
    errorRequired: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน',
    errorInvalid: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
  },
  EN: {
    welcome: 'Welcome to BudgetHub',
    subtitle: 'Secure & collaborative budget management designed to replace Excel',
    usernameLabel: 'Username',
    usernamePlaceholder: 'Enter your username',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter your password',
    loginBtn: 'Log In',
    registrationDisabled: 'Self-registration is disabled. Contact administrator for an account.',
    errorRequired: 'Please enter username and password',
    errorInvalid: 'Invalid username or password',
  }
};

export default function Login({ onLoginSuccess, lang, setLang, theme }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const t = dict[lang];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError(t.errorRequired);
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { username, password });
      const { accessToken, refreshToken, user } = res.data;
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      onLoginSuccess(user);
    } catch (err) {
      console.error(err);
      setError(
        err.response && err.response.data && err.response.data.error
          ? (lang === 'TH' ? 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' : 'Invalid username or password')
          : t.errorInvalid
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center bg-slate-50 relative px-4 theme-${theme}`}>
      
      {/* Language Switcher in Login (Top-Right) */}
      <div className="absolute top-6 right-6 flex items-center bg-white border border-slate-200 p-0.5 rounded-lg">
        <button
          onClick={() => setLang('EN')}
          className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
            lang === 'EN' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          EN
        </button>
        <button
          onClick={() => setLang('TH')}
          className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
            lang === 'TH' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          ไทย
        </button>
      </div>

      <div className="w-full max-w-[440px] z-10 flex flex-col items-center">
        
        {/* Top Icon Block */}
        <div className="h-14 w-14 bg-teal-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-teal-600/20 mb-6 bg-[var(--color-primary)]">
          <LayoutGrid className="h-7 w-7" />
        </div>

        {/* Text Header */}
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight text-center">
          {t.welcome}
        </h1>
        <p className="text-sm text-slate-500 text-center mt-2 max-w-[320px] leading-relaxed whitespace-pre-line">
          {t.subtitle}
        </p>

        {/* Login White Panel Card */}
        <div className="w-full bg-white border border-slate-200/80 rounded-[24px] p-8 shadow-xl mt-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3.5 mb-6 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username field */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2">
                {t.usernameLabel}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4.5 w-4.5" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="glass-input w-full !pl-11 text-sm bg-slate-50/50"
                  placeholder={t.usernamePlaceholder}
                  autoComplete="username"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2">
                {t.passwordLabel}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4.5 w-4.5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="glass-input w-full !pl-11 !pr-10 text-sm bg-slate-50/50"
                  placeholder={t.passwordPlaceholder}
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="glass-btn-primary w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                t.loginBtn
              )}
            </button>
          </form>
        </div>

        {/* Footer info text */}
        <p className="text-center text-[11px] text-slate-400 mt-6 max-w-[280px] leading-relaxed">
          {t.registrationDisabled}
        </p>

      </div>
    </div>
  );
}
