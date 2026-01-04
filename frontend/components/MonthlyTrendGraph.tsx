import React, { useMemo } from 'react';
import { Transaction } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { CURRENCY_SYMBOL } from '../config/constants';

interface MonthlyTrendGraphProps {
  data: Transaction[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="font-semibold text-gray-900 dark:text-white mb-1">{label}</p>
        <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
          {CURRENCY_SYMBOL}{payload[0].value.toLocaleString()}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">Total Spend</p>
      </div>
    );
  }
  return null;
};

export const MonthlyTrendGraph: React.FC<MonthlyTrendGraphProps> = ({ data }) => {
  // Filter expenses only (positive amounts = money spent, negative = credits/refunds)
  const expenses = useMemo(() => data.filter(t => t.amount > 0), [data]);

  // Monthly aggregation with trend analysis
  const monthlyData = useMemo(() => {
    const monthMap = new Map<string, number>();

    expenses.forEach(t => {
      const month = t.date.substring(0, 7);
      monthMap.set(month, (monthMap.get(month) || 0) + t.amount);
    });

    const entries = Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]));

    return entries.map(([month, amount]) => {
      const [year, mon] = month.split('-');
      const date = new Date(parseInt(year), parseInt(mon) - 1);
      return {
        month,
        monthLabel: date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
        amount
      };
    });
  }, [expenses]);

  // Statistics
  const stats = useMemo(() => {
    if (monthlyData.length === 0) return { avg: 0, max: 0, min: 0, trend: 'stable' as const };

    const amounts = monthlyData.map(m => m.amount);
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const max = Math.max(...amounts);
    const min = Math.min(...amounts);

    // Simple trend analysis
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (monthlyData.length >= 3) {
      const firstHalf = amounts.slice(0, Math.floor(amounts.length / 2));
      const secondHalf = amounts.slice(Math.floor(amounts.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      if (secondAvg > firstAvg * 1.1) trend = 'up';
      else if (secondAvg < firstAvg * 0.9) trend = 'down';
    }

    return { avg, max, min, trend };
  }, [monthlyData]);

  if (expenses.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            📈 Monthly Spending Trend
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track your spending over time</p>
        </div>
        <div className="flex items-center gap-2">
          {stats.trend === 'up' && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium flex items-center gap-1">
              ↗ Increasing
            </span>
          )}
          {stats.trend === 'down' && (
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium flex items-center gap-1">
              ↘ Decreasing
            </span>
          )}
          {stats.trend === 'stable' && (
            <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full font-medium">
              → Stable
            </span>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Average</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {CURRENCY_SYMBOL}{stats.avg.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-xs text-red-500 dark:text-red-400 uppercase tracking-wide mb-1">Highest</p>
          <p className="text-lg font-bold text-red-700 dark:text-red-400">
            {CURRENCY_SYMBOL}{stats.max.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
          <p className="text-xs text-emerald-500 dark:text-emerald-400 uppercase tracking-wide mb-1">Lowest</p>
          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
            {CURRENCY_SYMBOL}{stats.min.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="monthLabel"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--chart-axis)', fontSize: 12 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--chart-axis)', fontSize: 12 }}
              tickFormatter={(v) => `${CURRENCY_SYMBOL}${(v/1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={stats.avg}
              stroke="#6B7280"
              strokeDasharray="5 5"
              label={{ value: 'Avg', fontSize: 10, fill: '#6B7280', position: 'right' }}
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#10B981"
              fill="url(#trendGradient)"
              strokeWidth={2}
              dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#059669' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
