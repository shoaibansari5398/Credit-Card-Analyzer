import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CURRENCY_SYMBOL } from '../config/constants';

interface SpendingSummaryProps {
  data: Transaction[];
}

type TimePeriod = 'daily' | 'weekly' | 'monthly';

interface SummaryData {
  label: string;
  amount: number;
  count: number;
}

export const SpendingSummary: React.FC<SpendingSummaryProps> = ({ data }) => {
  const [period, setPeriod] = useState<TimePeriod>('daily');

  const summaryData = useMemo(() => {
    const groupedData = new Map<string, { amount: number; count: number }>();

    data.forEach(t => {
      if (t.amount <= 0) return; // Skip credits/refunds (negative amounts)

      const date = new Date(t.date);
      let key: string;

      switch (period) {
        case 'daily':
          key = t.date; // YYYY-MM-DD
          break;
        case 'weekly':
          // Get ISO week number
          const startOfYear = new Date(date.getFullYear(), 0, 1);
          const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
          const weekNum = Math.ceil((days + startOfYear.getDay() + 1) / 7);
          key = `${date.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
          break;
        case 'monthly':
          key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
          break;
      }

      const existing = groupedData.get(key) || { amount: 0, count: 0 };
      groupedData.set(key, {
        amount: existing.amount + t.amount,
        count: existing.count + 1
      });
    });

    // Convert to array and sort by date
    const result: SummaryData[] = Array.from(groupedData.entries())
      .map(([label, { amount, count }]) => ({
        label: formatLabel(label, period),
        amount,
        count
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return result;
  }, [data, period]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalAmount = summaryData.reduce((acc, d) => acc + d.amount, 0);
    const avgAmount = summaryData.length > 0 ? totalAmount / summaryData.length : 0;
    const maxPeriod = summaryData.reduce((max, d) => d.amount > max.amount ? d : max, { label: '', amount: 0, count: 0 });
    return { totalAmount, avgAmount, maxPeriod };
  }, [summaryData]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      {/* Header with Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wide">
          Spending Summary
        </h3>
        <div className="flex bg-gray-100 rounded-lg p-1">
          {(['daily', 'weekly', 'monthly'] as TimePeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                period === p
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total</p>
          <p className="text-lg font-bold text-gray-900">
            {CURRENCY_SYMBOL}{totals.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Avg/{period.slice(0, -2) + 'ly'}</p>
          <p className="text-lg font-bold text-gray-900">
            {CURRENCY_SYMBOL}{totals.avgAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="text-center p-3 bg-emerald-50 rounded-lg">
          <p className="text-xs text-emerald-600 uppercase tracking-wide mb-1">Highest</p>
          <p className="text-lg font-bold text-emerald-700">
            {totals.maxPeriod.label || 'N/A'}
          </p>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={summaryData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${CURRENCY_SYMBOL}${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value: number) => [`${CURRENCY_SYMBOL}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, 'Amount']}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px'
              }}
            />
            <Bar
              dataKey="amount"
              fill="#10B981"
              radius={[4, 4, 0, 0]}
              maxBarSize={50}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Data Table */}
      <div className="mt-6 max-h-48 overflow-y-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Transactions</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {summaryData.slice().reverse().map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-sm text-gray-900 font-medium">{row.label}</td>
                <td className="px-4 py-2 text-sm text-gray-500 text-right">{row.count}</td>
                <td className="px-4 py-2 text-sm text-gray-900 text-right font-mono">
                  {CURRENCY_SYMBOL}{row.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Helper function to format labels for display
function formatLabel(key: string, period: TimePeriod): string {
  switch (period) {
    case 'daily':
      const date = new Date(key);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    case 'weekly':
      // key is like "2024-W05"
      return key.replace('-W', ' Week ');
    case 'monthly':
      // key is like "2024-01"
      const [year, month] = key.split('-');
      const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      return monthDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  }
}
