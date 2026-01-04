import React, { useMemo, useState } from 'react';
import { Transaction } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CURRENCY_SYMBOL } from '../config/constants';

interface MerchantBreakdownProps {
  data: Transaction[];
}

interface MerchantData {
  name: string;
  amount: number;
  count: number;
  percentage: number;
  category: string;
}

const COLORS = [
  '#14B8A6', '#0D9488', '#0F766E', '#115E59', '#134E4A'
];

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

export const MerchantBreakdown: React.FC<MerchantBreakdownProps> = ({ data }) => {
  const [viewMode, setViewMode] = useState<'chart' | 'list'>('chart');
  const [showCount, setShowCount] = useState(10);

  // Filter expenses only (positive amounts = money spent, negative = credits/refunds)
  const expenses = useMemo(() => data.filter(t => t.amount > 0), [data]);
  const totalSpend = useMemo(() => expenses.reduce((acc, t) => acc + t.amount, 0), [expenses]);

  // Merchant aggregation
  const merchants = useMemo((): MerchantData[] => {
    const merchantMap = new Map<string, { amount: number; count: number; category: string }>();

    expenses.forEach(t => {
      const existing = merchantMap.get(t.merchant) || { amount: 0, count: 0, category: t.category };
      existing.amount += t.amount;
      existing.count++;
      merchantMap.set(t.merchant, existing);
    });

    return Array.from(merchantMap.entries())
      .map(([name, data]) => ({
        name,
        amount: data.amount,
        count: data.count,
        percentage: (data.amount / totalSpend) * 100,
        category: data.category
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses, totalSpend]);

  const displayMerchants = merchants.slice(0, showCount);
  // Cap chart display at 15 items for readability (bar height becomes too thin beyond this)
  const chartDisplayMerchants = displayMerchants.slice(0, 15);

  if (expenses.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            🏪 Merchant Breakdown
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Where your money goes</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('chart')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              viewMode === 'chart'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Chart
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              viewMode === 'list'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            List
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Total Merchants</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{merchants.length}</p>
        </div>
        <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
          <p className="text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-1">Top Merchant</p>
          <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300 truncate">{merchants[0]?.name || '-'}</p>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Top % Share</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{merchants[0]?.percentage.toFixed(1) || 0}%</p>
        </div>
      </div>

      {/* Chart View */}
      {viewMode === 'chart' && (
        <div className="h-64 mb-4">
          <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartDisplayMerchants}
                layout="vertical"
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--chart-grid)" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: 'var(--chart-axis)' }}
                  tickFormatter={(v) => `${CURRENCY_SYMBOL}${(v/1000).toFixed(0)}k`}
                  axisLine={{ stroke: 'var(--chart-grid)' }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10, fill: 'var(--chart-axis)' }}
                  width={90}
                  axisLine={false}
                  tickLine={false}
                />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
              <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                {chartDisplayMerchants.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {displayMerchants.map((merchant, i) => (
            <div
              key={merchant.name}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    i < 3 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{merchant.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{merchant.category} • {merchant.count} transactions</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900 dark:text-white">
                  {CURRENCY_SYMBOL}{merchant.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{merchant.percentage.toFixed(1)}%</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Show More/Less */}
      {merchants.length > 10 && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowCount(showCount === 10 ? merchants.length : 10)}
            className="text-sm text-emerald-600 hover:text-emerald-800 font-medium"
          >
            {showCount === 10 ? `Show all ${merchants.length} merchants` : 'Show less'}
          </button>
        </div>
      )}
    </div>
  );
};
