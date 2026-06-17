'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { getTranslation } from '@/lib/translations';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

const CustomTooltip = ({ active, payload, label, language }) => {
  if (active && payload && payload.length) {
    const formatCurrency = (val) => {
      const formatted = new Intl.NumberFormat(language === 'th' ? 'th-TH' : 'en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(val || 0);
      return `฿${formatted}`;
    };
    return (
      <div className="bg-surface/95 backdrop-blur border border-border p-4 rounded-xl shadow-xl select-none text-xs leading-relaxed flex flex-col gap-2">
        <p className="font-bold text-text-primary">{label}</p>
        <div className="space-y-1">
          {payload.map((p, idx) => {
            const textColor = p.dataKey === 'income' ? '#10b981' : '#f43f5e';
            return (
              <p key={idx} style={{ color: textColor }} className="font-semibold flex justify-between gap-4">
                <span>{p.name}:</span>
                <span>{formatCurrency(p.value)}</span>
              </p>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

export default function TrendsChart({ data }) {
  const { language } = useApp();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const formatCurrency = (val) => {
    const formatted = new Intl.NumberFormat(language === 'th' ? 'th-TH' : 'en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val || 0);
    return `฿${formatted}`;
  };

  if (!mounted) {
    return (
      <div className="w-full h-[320px] animate-pulse bg-slate-50 dark:bg-slate-900/10 rounded-2xl border border-slate-200/60 dark:border-slate-800/50" />
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex h-[300px] w-full items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 text-text-muted font-medium text-sm">
        {getTranslation('noTrendsData', language)}
      </div>
    );
  }

  return (
    <div className="w-full h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
        >
          <defs>
            <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.85}/>
              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.15}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800/60" />
          <XAxis 
            dataKey="label" 
            tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
            axisLine={{ stroke: '#cbd5e1' }}
            tickLine={false}
          />
          <YAxis 
            tickFormatter={formatCurrency}
            tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip 
            content={<CustomTooltip language={language} />} 
            contentStyle={{ backgroundColor: 'transparent', border: 'none', padding: 0 }}
          />
          <Legend 
            verticalAlign="top" 
            height={36} 
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, fontWeight: 600, paddingBottom: 10 }}
          />
          <Bar 
            name={getTranslation('expense', language)} 
            dataKey="expense" 
            fill="url(#expenseGrad)" 
            radius={[6, 6, 0, 0]} 
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
