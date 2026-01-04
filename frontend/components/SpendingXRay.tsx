import React, { useMemo } from 'react';
import { Transaction } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CURRENCY_SYMBOL } from '../config/constants';

interface SpendingXRayProps {
  data: Transaction[];
}

interface MonthlyData {
  month: string;
  monthLabel: string;
  amount: number;
  isSpike: boolean;
}

interface CategoryData {
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

interface MerchantData {
  name: string;
  amount: number;
  count: number;
}

const CATEGORY_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

export const SpendingXRay: React.FC<SpendingXRayProps> = ({ data }) => {
  // Filter expenses (positive amounts = money spent, negative = credits/refunds)
  const expenses = useMemo(() => data.filter(t => t.amount > 0), [data]);

  // 1. Total & Average Monthly Spend
  const totals = useMemo(() => {
    const total = expenses.reduce((acc, t) => acc + t.amount, 0);

    // Get unique months
    const months = new Set(expenses.map(t => t.date.substring(0, 7)));
    const monthCount = months.size || 1;

    return {
      total,
      avgMonthly: total / monthCount,
      monthCount
    };
  }, [expenses]);

  // 2. Monthly Spending with Spike Detection
  const monthlyData = useMemo(() => {
    const monthMap = new Map<string, number>();

    expenses.forEach(t => {
      const month = t.date.substring(0, 7);
      monthMap.set(month, (monthMap.get(month) || 0) + t.amount);
    });

    const entries = Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]));

    const amounts = entries.map(([_, amt]) => amt);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = Math.sqrt(amounts.reduce((sum, a) => sum + Math.pow(a - avgAmount, 2), 0) / amounts.length);
    const threshold = avgAmount + stdDev;

    return entries.map(([month, amount]): MonthlyData => {
      const [year, mon] = month.split('-');
      const date = new Date(parseInt(year), parseInt(mon) - 1);
      return {
        month,
        monthLabel: date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
        amount,
        isSpike: amount > threshold
      };
    });
  }, [expenses]);

  // 3. Top 5 Categories
  const topCategories = useMemo(() => {
    const catMap = new Map<string, number>();
    expenses.forEach(t => {
      catMap.set(t.category, (catMap.get(t.category) || 0) + t.amount);
    });

    const total = expenses.reduce((acc, t) => acc + t.amount, 0);

    return Array.from(catMap.entries())
      .map(([name, amount]): Omit<CategoryData, 'color'> => ({
        name,
        amount,
        percentage: (amount / total) * 100,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map((cat, i) => ({
        ...cat,
        color: CATEGORY_COLORS[i % CATEGORY_COLORS.length]
      }));
  }, [expenses]);

  // 4. Top 10 Merchants
  const topMerchants = useMemo(() => {
    const merchantMap = new Map<string, { amount: number; count: number }>();

    expenses.forEach(t => {
      const existing = merchantMap.get(t.merchant) || { amount: 0, count: 0 };
      merchantMap.set(t.merchant, {
        amount: existing.amount + t.amount,
        count: existing.count + 1
      });
    });

    return Array.from(merchantMap.entries())
      .map(([name, { amount, count }]): MerchantData => ({ name, amount, count }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }, [expenses]);

  // 5. Day of Week Heatmap Data
  const dayHeatmap = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayData = new Array(7).fill(0).map(() => ({ amount: 0, count: 0 }));

    expenses.forEach(t => {
      const day = new Date(t.date).getDay();
      dayData[day].amount += t.amount;
      dayData[day].count++;
    });

    const maxAmount = Math.max(...dayData.map(d => d.amount));

    return days.map((day, i) => ({
      day,
      amount: dayData[i].amount,
      count: dayData[i].count,
      intensity: dayData[i].amount / (maxAmount || 1)
    }));
  }, [expenses]);

  // 6. Month vs Category Heatmap
  const categoryMonthHeatmap = useMemo(() => {
    const heatmapData: { month: string; category: string; amount: number }[] = [];
    const monthCatMap = new Map<string, Map<string, number>>();

    expenses.forEach(t => {
      const month = t.date.substring(0, 7);
      if (!monthCatMap.has(month)) {
        monthCatMap.set(month, new Map());
      }
      const catMap = monthCatMap.get(month)!;
      catMap.set(t.category, (catMap.get(t.category) || 0) + t.amount);
    });

    monthCatMap.forEach((catMap, month) => {
      catMap.forEach((amount, category) => {
        heatmapData.push({ month, category, amount });
      });
    });

    return heatmapData;
  }, [expenses]);

  const maxHeatmapAmount = Math.max(...categoryMonthHeatmap.map(d => d.amount), 1);
  const uniqueMonths = Array.from(new Set(categoryMonthHeatmap.map(d => d.month))).sort();
  const uniqueCategories = topCategories.map(c => c.name);

  if (expenses.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            🔬 Spending X-Ray
          </h2>
          <p className="text-sm text-gray-500 mt-1">Deep dive: How much? Where? When?</p>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4">
          <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Total Spent</p>
          <p className="text-2xl font-bold text-emerald-900 mt-1">
            {CURRENCY_SYMBOL}{totals.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4">
          <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Avg/Month</p>
          <p className="text-2xl font-bold text-emerald-900 mt-1">
            {CURRENCY_SYMBOL}{totals.avgMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4">
          <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">Transactions</p>
          <p className="text-2xl font-bold text-amber-900 mt-1">{expenses.length}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
          <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">Months Analyzed</p>
          <p className="text-2xl font-bold text-purple-900 mt-1">{totals.monthCount}</p>
        </div>
      </div>

      {/* Monthly Spend Chart with Spike Highlights */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          📊 Monthly Spending Pattern
          {monthlyData.some(m => m.isSpike) && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
              Spikes Detected
            </span>
          )}
        </h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => `${CURRENCY_SYMBOL}${(v/1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number) => [`${CURRENCY_SYMBOL}${value.toLocaleString()}`, 'Spend']}
                contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
              />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                {monthlyData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isSpike ? '#EF4444' : '#10B981'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top 5 Categories */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">📁 Top 5 Categories</h3>
          <div className="space-y-3">
            {topCategories.map((cat, i) => (
              <div key={cat.name} className="flex items-center gap-3">
                <span className="text-lg font-bold text-gray-400 w-6">#{i + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900 text-sm">{cat.name}</span>
                    <span className="text-sm text-gray-600">
                      {CURRENCY_SYMBOL}{cat.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${cat.percentage}%`,
                        backgroundColor: cat.color
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{cat.percentage.toFixed(1)}% of total</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top 10 Merchants */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">🏪 Top 10 Merchants</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {topMerchants.map((merchant, i) => (
              <div
                key={merchant.name}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    i < 3 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{merchant.name}</p>
                    <p className="text-xs text-gray-500">{merchant.count} transaction{merchant.count > 1 ? 's' : ''}</p>
                  </div>
                </div>
                <span className="font-semibold text-gray-900">
                  {CURRENCY_SYMBOL}{merchant.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Day of Week Heatmap */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">📅 Spending by Day of Week</h3>
        <div className="flex gap-2">
          {dayHeatmap.map((day) => (
            <div
              key={day.day}
              className="flex-1 text-center"
            >
              <div
                className="h-16 rounded-lg flex items-center justify-center mb-1 transition-all"
                style={{
                  backgroundColor: `rgba(16, 185, 129, ${0.1 + day.intensity * 0.8})`,
                }}
              >
                <span className={`text-xs font-bold ${day.intensity > 0.5 ? 'text-white' : 'text-emerald-700'}`}>
                  {CURRENCY_SYMBOL}{(day.amount / 1000).toFixed(0)}k
                </span>
              </div>
              <span className="text-xs text-gray-600 font-medium">{day.day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Category x Month Heatmap */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">🗓️ Category × Month Heatmap</h3>
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Header Row */}
            <div className="flex items-center mb-2">
              <div className="w-28 text-xs font-medium text-gray-500"></div>
              {uniqueMonths.map(month => {
                const [year, mon] = month.split('-');
                const date = new Date(parseInt(year), parseInt(mon) - 1);
                return (
                  <div key={month} className="flex-1 text-center text-xs font-medium text-gray-500">
                    {date.toLocaleDateString(undefined, { month: 'short' })}
                  </div>
                );
              })}
            </div>

            {/* Rows */}
            {uniqueCategories.map((category, catIdx) => (
              <div key={category} className="flex items-center mb-1">
                <div className="w-28 text-xs font-medium text-gray-700 truncate pr-2">{category}</div>
                {uniqueMonths.map(month => {
                  const cell = categoryMonthHeatmap.find(
                    d => d.month === month && d.category === category
                  );
                  const intensity = cell ? cell.amount / maxHeatmapAmount : 0;
                  return (
                    <div
                      key={`${category}-${month}`}
                      className="flex-1 mx-0.5"
                      title={cell ? `${CURRENCY_SYMBOL}${cell.amount.toLocaleString()}` : 'No data'}
        <div className="flex items-center justify-center gap-4 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-red-400"></div> Top 3 Categories
          </span>
          <span className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-gray-100"></div> Low
          </span>
          <span className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-emerald-300"></div> Medium
          </span>
          <span className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-emerald-600"></div> High
          </span>
        </div>
            <div className="w-4 h-4 rounded bg-emerald-600"></div> High
          </span>
        </div>
      </div>
    </div>
  );
};
