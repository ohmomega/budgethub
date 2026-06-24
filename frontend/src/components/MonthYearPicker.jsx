import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

const MONTH_NAMES = {
  TH: [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ],
  EN: [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]
};

const MONTH_NAMES_FULL = {
  TH: [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ],
  EN: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
};

// A small calendar-style month/year picker. Click the field to open a popover
// with year navigation arrows and a 3×4 grid of months — no need to fiddle
// with two separate dropdowns. Thai (พ.ศ.) years are shown when lang === 'TH'.
//
// Props:
//   month, year   selected values (numbers) or null
//   onChange(month, year)   month/year are null when cleared
//   lang          'TH' | 'EN'
//   allowClear    show a clear (×) button + an "all" placeholder
//   placeholder   text shown when nothing is selected
//   widthClass    optional Tailwind width class for the trigger
export default function MonthYearPicker({
  month = null,
  year = null,
  onChange,
  lang = 'TH',
  allowClear = false,
  placeholder,
  widthClass = 'w-48'
}) {
  const [open, setOpen] = useState(false);
  const thisYear = new Date().getFullYear();
  const [viewYear, setViewYear] = useState(year || thisYear);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (year) setViewYear(year);
  }, [year]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const displayYear = (y) => (lang === 'TH' ? y + 543 : y);

  const triggerLabel =
    month && year
      ? `${MONTH_NAMES_FULL[lang][month - 1]} ${displayYear(year)}`
      : (placeholder || (lang === 'TH' ? 'เลือกเดือน/ปี' : 'Select month/year'));

  const handleSelect = (m) => {
    onChange(m, viewYear);
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null, null);
    setOpen(false);
  };

  const isSelected = (m) => month === m && year === viewYear;

  return (
    <div ref={wrapRef} className={`relative ${widthClass}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[var(--color-primary)] cursor-pointer hover:border-slate-300 transition"
      >
        <span className="flex items-center gap-2 truncate">
          <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
          <span className={`truncate ${month && year ? 'text-slate-800' : 'text-slate-400'}`}>
            {triggerLabel}
          </span>
        </span>
        {allowClear && month && year ? (
          <X
            className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 shrink-0"
            onClick={handleClear}
          />
        ) : (
          <ChevronRight className={`h-3.5 w-3.5 text-slate-400 shrink-0 transition ${open ? 'rotate-90' : ''}`} />
        )}
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 animate-scale-in">
          {/* Year navigation */}
          <div className="flex items-center justify-between mb-3 px-1">
            <button
              type="button"
              onClick={() => setViewYear((y) => y - 1)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-extrabold text-slate-800">
              {lang === 'TH' ? `พ.ศ. ${displayYear(viewYear)}` : displayYear(viewYear)}
            </span>
            <button
              type="button"
              onClick={() => setViewYear((y) => y + 1)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-3 gap-1.5">
            {MONTH_NAMES[lang].map((name, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelect(idx + 1)}
                className={`py-2 text-xs font-bold rounded-lg cursor-pointer transition ${
                  isSelected(idx + 1)
                    ? 'bg-[var(--color-primary)] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-[var(--color-primary-bg-light)] hover:text-[var(--color-primary)]'
                }`}
              >
                {name}
              </button>
            ))}
          </div>

          {allowClear && (
            <button
              type="button"
              onClick={handleClear}
              className="w-full mt-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer transition"
            >
              {lang === 'TH' ? 'ล้างตัวกรอง (ทุกเดือน/ปี)' : 'Clear (all months/years)'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
