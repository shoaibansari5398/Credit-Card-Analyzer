import React, { useMemo } from 'react';
import { Transaction } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { CURRENCY_SYMBOL } from '../config/constants';

interface CategoryDistributionProps {
  data: Transaction[];
}

interface CategoryData {
  name: string;
  amount: number;
  percentage: number;
  count: number;
  [key: string]: string | number;
}

const COLORS = [
  '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

export const CategoryDistribution: React.FC<CategoryDistributionProps> = ({ data }) => {
  // Filter expenses only (positive amounts = money spent, negative = credits/refunds)
  const expenses = useMemo(() => data.filter(t => t.amount > 0), [data]);
  const totalSpend = useMemo(() => expenses.reduce((acc, t) => acc + t.amount, 0), [expenses]);

  // Category aggregation
  const categories = useMemo((): CategoryData[] => {
    const catMap = new Map<string, { amount: number; count: number }>();

    expenses.forEach(t => {
      const existing = catMap.get(t.category) || { amount: 0, count: 0 };
      existing.amount += t.amount;
      existing.count++;
      catMap.set(t.category, existing);
    });

    return Array.from(catMap.entries())
      .map(([name, data]) => ({
        name,
        amount: data.amount,
        percentage: (data.amount / totalSpend) * 100,
        count: data.count
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses, totalSpend]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-semibold text-gray-900 dark:text-white">{data.name}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {CURRENCY_SYMBOL}{data.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{data.percentage.toFixed(1)}% of total</p>
        </div>
      );
    }
    return null;
  };

  if (expenses.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            📁 Category Distribution
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Spending breakdown by category</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Categories</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{categories.length}</p>
        </div>
      </div>

      {/* Chart & List Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categories.slice(0, 8)}
                dataKey="amount"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={2}
              >
                {categories.slice(0, 8).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Category List */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {categories.map((cat, i) => (
            <div key={cat.name} className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-900 dark:text-gray-200 text-sm truncate">{cat.name}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300 font-semibold">
                    {CURRENCY_SYMBOL}{cat.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${cat.percentage}%`,
                        backgroundColor: COLORS[i % COLORS.length]
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-12 text-right">{cat.percentage.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top 3 Categories Summary */}
       <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
        <div className="grid grid-cols-3 gap-3">
          {categories.slice(0, 3).map((cat, i) => (
            <div
              key={cat.name}
              className="p-3 rounded-lg text-center bg-opacity-10 dark:bg-opacity-20"
              style={{ backgroundColor: `${COLORS[i]}15` }}
            >
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                #{i + 1} Category
              </p>
              <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{cat.name}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{cat.count} transactions</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
