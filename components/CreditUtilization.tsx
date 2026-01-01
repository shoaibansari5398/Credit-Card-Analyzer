import React, { useMemo, useState } from 'react';
import { Transaction } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const CURRENCY_SYMBOL = '₹';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="font-semibold text-gray-900 dark:text-white mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm flex items-center justify-between gap-4">
            <span className="text-gray-600 dark:text-gray-400 capitalize">
              {entry.name === 'utilization' ? 'Utilization' : 'Spend'}:
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {entry.name === 'utilization' ? `${entry.value.toFixed(1)}%` : `${CURRENCY_SYMBOL}${entry.value.toLocaleString()}`}
            </span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

interface CreditUtilizationProps {
  data: Transaction[];
  creditLimit?: number; // Optional - user can set this
}

interface MonthlyUtilization {
  month: string;
  monthLabel: string;
  spend: number;
  utilization: number;
  isHighUtilization: boolean;
}

export const CreditUtilization: React.FC<CreditUtilizationProps> = ({ data, creditLimit: propLimit }) => {
  const [creditLimit, setCreditLimit] = useState<number>(propLimit || 100000);
  const [showLimitInput, setShowLimitInput] = useState(false);

  // Filter expenses only (positive amounts = money spent, negative = credits/refunds)
  const debits = useMemo(() => data.filter(t => t.amount > 0), [data]);

  // Monthly utilization calculation
  const monthlyData = useMemo(() => {
    const monthMap = new Map<string, number>();

    debits.forEach(t => {
      const month = t.date.substring(0, 7);
      monthMap.set(month, (monthMap.get(month) || 0) + t.amount);
    });

    return Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, spend]): MonthlyUtilization => {
        const [year, mon] = month.split('-');
        const date = new Date(parseInt(year), parseInt(mon) - 1);
        const utilization = (spend / creditLimit) * 100;
        return {
          month,
          monthLabel: date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
          spend,
          utilization,
          isHighUtilization: utilization > 30
        };
      });
  }, [debits, creditLimit]);

  // High utilization months
  const highUtilizationMonths = useMemo(() => {
    return monthlyData.filter(m => m.isHighUtilization);
  }, [monthlyData]);

  // Average utilization
  const avgUtilization = useMemo(() => {
    if (monthlyData.length === 0) return 0;
    return monthlyData.reduce((acc, m) => acc + m.utilization, 0) / monthlyData.length;
  }, [monthlyData]);

  // Estimated interest impact (assuming 3.5% monthly on carried balance)
  const interestImpact = useMemo(() => {
    const avgMonthlySpend = monthlyData.reduce((acc, m) => acc + m.spend, 0) / (monthlyData.length || 1);
    // Assume 20% of balance is carried forward (revolved)
    const estimatedRevolved = avgMonthlySpend * 0.2;
    const monthlyInterest = estimatedRevolved * 0.035; // 3.5% monthly (42% APR)
    const yearlyInterest = monthlyInterest * 12;
    return { monthlyInterest, yearlyInterest, estimatedRevolved };
  }, [monthlyData]);

  const getUtilizationColor = (util: number) => {
    if (util <= 10) return '#10B981'; // Green
    if (util <= 30) return '#3B82F6'; // Blue
    if (util <= 50) return '#F59E0B'; // Amber
    return '#EF4444'; // Red
  };

  const getUtilizationStatus = (util: number) => {
    if (util <= 10) return { label: 'Excellent', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' };
    if (util <= 30) return { label: 'Good', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' };
    if (util <= 50) return { label: 'Fair', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' };
    return { label: 'Poor', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' };
  };

  const status = getUtilizationStatus(avgUtilization);

  if (debits.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            💳 Credit Utilization Intelligence
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track utilization to protect your credit score</p>
        </div>
        <button
          onClick={() => setShowLimitInput(!showLimitInput)}
          className="text-sm text-emerald-600 hover:text-emerald-800 font-medium"
        >
          {showLimitInput ? 'Done' : 'Set Credit Limit'}
        </button>
      </div>

      {/* Credit Limit Input */}
      {showLimitInput && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Enter your credit card limit
          </label>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-gray-400">{CURRENCY_SYMBOL}</span>
            <input
              type="number"
              value={creditLimit}
              onChange={(e) => setCreditLimit(Number(e.target.value) || 100000)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="100000"
            />
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className={`rounded-lg p-4 ${status.bg}`}>
          <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide">Avg Utilization</p>
          <p className={`text-2xl font-bold ${status.color}`}>{avgUtilization.toFixed(1)}%</p>
          <p className={`text-xs ${status.color} font-medium`}>{status.label}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Credit Limit</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {CURRENCY_SYMBOL}{creditLimit.toLocaleString()}
          </p>
        </div>
        <div className={`rounded-lg p-4 ${highUtilizationMonths.length > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'}`}>
          <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide">High Utilization</p>
          <p className={`text-2xl font-bold ${highUtilizationMonths.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {highUtilizationMonths.length} months
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">&gt;30% utilization</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
          <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide">Est. Interest/Year</p>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
            {CURRENCY_SYMBOL}{interestImpact.yearlyInterest.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">If revolved</p>
        </div>
      </div>

      {/* Utilization Chart */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">📊 Monthly Utilization Trend</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="utilizationGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
              <XAxis dataKey="month" hide />
              <YAxis
                hide={false}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
                domain={[0, 'auto']}
                tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={30} stroke="#EF4444" strokeDasharray="5 5" label={{ value: '30% threshold', fontSize: 10, fill: '#EF4444' }} />
              <Area
                type="monotone"
                dataKey="utilization"
                stroke="#10B981"
                fill="url(#utilizationGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* High Utilization Warning */}
      {highUtilizationMonths.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-red-900 dark:text-red-300 flex items-center gap-2 mb-2">
            ⚠️ Credit Score Risk Alert
          </h3>
          <p className="text-sm text-red-800 dark:text-red-200 mb-3">
            {highUtilizationMonths.length} month(s) had utilization above 30%, which can negatively impact your credit score.
          </p>
          <div className="flex flex-wrap gap-2">
            {highUtilizationMonths.map(m => (
              <span
                key={m.month}
                className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs font-medium"
              >
                {m.monthLabel}: {m.utilization.toFixed(0)}%
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Interest Impact Warning */}
      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-lg p-4">
        <h3 className="font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-2 mb-2">
          💰 Revolving Credit Interest Impact
        </h3>
        <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">
          If you carry forward even 20% of your balance, you could pay:
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/70 dark:bg-black/20 rounded p-3">
            <p className="text-xs text-gray-600 dark:text-gray-400">Monthly Interest</p>
            <p className="text-lg font-bold text-amber-700 dark:text-amber-400">
              {CURRENCY_SYMBOL}{interestImpact.monthlyInterest.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="bg-white/70 dark:bg-black/20 rounded p-3">
            <p className="text-xs text-gray-600 dark:text-gray-400">Yearly Interest</p>
            <p className="text-lg font-bold text-amber-700 dark:text-amber-400">
              {CURRENCY_SYMBOL}{interestImpact.yearlyInterest.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
        <p className="text-xs text-amber-700 dark:text-amber-300 mt-3">
          💡 <strong>Tip:</strong> Always pay full balance to avoid 35-45% APR interest charges.
        </p>
      </div>
    </div>
  );
};
