import React, { useMemo } from 'react';
import { Transaction } from '../types';
import { exportToCSV } from '../utils/exportUtils';

const CURRENCY_SYMBOL = '₹';

interface YearlySummaryProps {
  data: Transaction[];
}

interface MonthSummary {
  month: string;
  monthLabel: string;
  spend: number;
  transactions: number;
  topCategory: string;
  topMerchant: string;
}

export const YearlySummary: React.FC<YearlySummaryProps> = ({ data }) => {
  // Filter expenses only (positive amounts = money spent, negative = credits/refunds)
  const expenses = useMemo(() => data.filter(t => t.amount > 0), [data]);

  // Yearly statistics (minimal - just for table footer)
  const yearlyStats = useMemo(() => {
    const totalSpend = expenses.reduce((acc, t) => acc + t.amount, 0);
    const totalTransactions = expenses.length;

    const dates = expenses.map(t => new Date(t.date).getTime());
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    return { totalSpend, totalTransactions, dateRange: { start: minDate, end: maxDate } };
  }, [expenses]);

  // Monthly breakdown
  const monthlyBreakdown = useMemo((): MonthSummary[] => {
    const monthMap = new Map<string, { spend: number; transactions: number; categories: Map<string, number>; merchants: Map<string, number> }>();

    expenses.forEach(t => {
      const month = t.date.substring(0, 7);
      const existing = monthMap.get(month) || {
        spend: 0,
        transactions: 0,
        categories: new Map(),
        merchants: new Map()
      };
      existing.spend += t.amount;
      existing.transactions++;
      existing.categories.set(t.category, (existing.categories.get(t.category) || 0) + t.amount);
      existing.merchants.set(t.merchant, (existing.merchants.get(t.merchant) || 0) + t.amount);
      monthMap.set(month, existing);
    });

    return Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, data]) => {
        const [year, mon] = month.split('-');
        const date = new Date(parseInt(year), parseInt(mon) - 1);
        const topCat = Array.from(data.categories.entries()).sort((a, b) => b[1] - a[1])[0];
        const topMerch = Array.from(data.merchants.entries()).sort((a, b) => b[1] - a[1])[0];

        return {
          month,
          monthLabel: date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
          spend: data.spend,
          transactions: data.transactions,
          topCategory: topCat ? topCat[0] : '-',
          topMerchant: topMerch ? topMerch[0] : '-'
        };
      });
  }, [expenses]);

  if (expenses.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            📊 Monthly Summary Report
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {yearlyStats.dateRange.start.toLocaleDateString()} - {yearlyStats.dateRange.end.toLocaleDateString()}
          </p>
        </div>
        <button
          onClick={() => exportToCSV(data)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Monthly Breakdown Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Month</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Spend</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Transactions</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Top Category</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Top Merchant</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
            {monthlyBreakdown.map((row, i) => (
              <tr key={row.month} className={i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/30'}>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{row.monthLabel}</td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-right font-mono">
                  {CURRENCY_SYMBOL}{row.spend.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 text-right">{row.transactions}</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{row.topCategory}</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{row.topMerchant}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-emerald-50 dark:bg-emerald-900/20">
            <tr>
              <td className="px-4 py-3 text-sm font-bold text-emerald-800 dark:text-emerald-400">Total</td>
              <td className="px-4 py-3 text-sm font-bold text-emerald-800 dark:text-emerald-400 text-right font-mono">
                {CURRENCY_SYMBOL}{yearlyStats.totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </td>
              <td className="px-4 py-3 text-sm font-bold text-emerald-800 dark:text-emerald-400 text-right">{yearlyStats.totalTransactions}</td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
