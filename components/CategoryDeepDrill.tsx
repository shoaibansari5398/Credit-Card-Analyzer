import React, { useMemo, useState } from 'react';
import { Transaction } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const CURRENCY_SYMBOL = '₹';

interface CategoryDeepDrillProps {
  data: Transaction[];
}

interface CategoryStats {
  name: string;
  totalSpend: number;
  transactionCount: number;
  avgPerVisit: number;
  percentage: number;
  merchantCount: number;
}

interface MerchantBreakdown {
  merchant: string;
  amount: number;
  count: number;
  percentage: number;
}

interface MonthlyTrend {
  month: string;
  monthLabel: string;
  amount: number;
}

export const CategoryDeepDrill: React.FC<CategoryDeepDrillProps> = ({ data }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Filter expenses only (positive amounts = money spent, negative = credits/refunds)
  const debits = useMemo(() => data.filter(t => t.amount > 0), [data]);
  const totalSpend = useMemo(() => debits.reduce((acc, t) => acc + t.amount, 0), [debits]);

  // Category overview
  const categories = useMemo(() => {
    const catMap = new Map<string, { total: number; count: number; merchants: Set<string> }>();

    debits.forEach(t => {
      const existing = catMap.get(t.category) || { total: 0, count: 0, merchants: new Set() };
      existing.total += t.amount;
      existing.count++;
      existing.merchants.add(t.merchant);
      catMap.set(t.category, existing);
    });

    const result: CategoryStats[] = Array.from(catMap.entries())
      .map(([name, data]) => ({
        name,
        totalSpend: data.total,
        transactionCount: data.count,
        avgPerVisit: data.total / data.count,
        percentage: (data.total / totalSpend) * 100,
        merchantCount: data.merchants.size
      }))
      .sort((a, b) => b.totalSpend - a.totalSpend);

    return result;
  }, [debits, totalSpend]);

  // Selected category details
  const categoryDetails = useMemo(() => {
    if (!selectedCategory) return null;

    const categoryTx = debits.filter(t => t.category === selectedCategory);
    const catTotal = categoryTx.reduce((acc, t) => acc + t.amount, 0);

    // Merchant breakdown
    const merchantMap = new Map<string, { amount: number; count: number }>();
    categoryTx.forEach(t => {
      const existing = merchantMap.get(t.merchant) || { amount: 0, count: 0 };
      existing.amount += t.amount;
      existing.count++;
      merchantMap.set(t.merchant, existing);
    });

    const merchants: MerchantBreakdown[] = Array.from(merchantMap.entries())
      .map(([merchant, data]) => ({
        merchant,
        amount: data.amount,
        count: data.count,
        percentage: (data.amount / catTotal) * 100
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Monthly trend
    const monthMap = new Map<string, number>();
    categoryTx.forEach(t => {
      const month = t.date.substring(0, 7);
      monthMap.set(month, (monthMap.get(month) || 0) + t.amount);
    });

    const monthlyTrend: MonthlyTrend[] = Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, amount]) => {
        const [year, mon] = month.split('-');
        const date = new Date(parseInt(year), parseInt(mon) - 1);
        return {
          month,
          monthLabel: date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
          amount
        };
      });

    // Stats
    const avgPerVisit = catTotal / categoryTx.length;
    const yearlyTotal = catTotal;
    const savings10Pct = yearlyTotal * 0.1;
    const savings20Pct = yearlyTotal * 0.2;

    // Trend analysis
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (monthlyTrend.length >= 2) {
      const firstHalf = monthlyTrend.slice(0, Math.floor(monthlyTrend.length / 2));
      const secondHalf = monthlyTrend.slice(Math.floor(monthlyTrend.length / 2));
      const firstHalfAvg = firstHalf.reduce((acc, m) => acc + m.amount, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((acc, m) => acc + m.amount, 0) / secondHalf.length;

      if (secondHalfAvg > firstHalfAvg * 1.15) {
        trend = 'increasing';
      } else if (secondHalfAvg < firstHalfAvg * 0.85) {
        trend = 'decreasing';
      }
    }

    return {
      name: selectedCategory,
      totalSpend: catTotal,
      transactionCount: categoryTx.length,
      avgPerVisit,
      percentage: (catTotal / totalSpend) * 100,
      merchants,
      monthlyTrend,
      yearlyTotal,
      savings10Pct,
      savings20Pct,
      trend
    };
  }, [selectedCategory, debits, totalSpend]);

  const getCategoryColor = (index: number) => {
    const colors = [
      'bg-blue-100 text-blue-700 border-blue-200',
      'bg-emerald-100 text-emerald-700 border-emerald-200',
      'bg-amber-100 text-amber-700 border-amber-200',
      'bg-purple-100 text-purple-700 border-purple-200',
      'bg-rose-100 text-rose-700 border-rose-200',
      'bg-cyan-100 text-cyan-700 border-cyan-200',
      'bg-orange-100 text-orange-700 border-orange-200',
      'bg-pink-100 text-pink-700 border-pink-200'
    ];
    return colors[index % colors.length];
  };

  if (debits.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            🔍 Category Deep Drill
          </h2>
          <p className="text-sm text-gray-500 mt-1">Click a category to see detailed breakdown</p>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((cat, i) => (
          <button
            key={cat.name}
            onClick={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
              selectedCategory === cat.name
                ? 'bg-gray-900 text-white border-gray-900 shadow-md'
                : `${getCategoryColor(i)} hover:shadow-sm`
            }`}
          >
            {cat.name}
            <span className="ml-2 opacity-70">{cat.percentage.toFixed(0)}%</span>
          </button>
        ))}
      </div>

      {/* Category Details Panel */}
      {selectedCategory && categoryDetails && (
        <div className="bg-gray-50 rounded-xl p-6 space-y-6">
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900">
                {CURRENCY_SYMBOL}{categoryDetails.totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Avg per Visit</p>
              <p className="text-2xl font-bold text-gray-900">
                {CURRENCY_SYMBOL}{categoryDetails.avgPerVisit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Transactions</p>
              <p className="text-2xl font-bold text-gray-900">{categoryDetails.transactionCount}</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Share of Total</p>
              <p className="text-2xl font-bold text-gray-900">{categoryDetails.percentage.toFixed(1)}%</p>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Merchants */}
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                🏪 Top Merchants in {selectedCategory}
              </h3>
              <div className="space-y-3">
                {categoryDetails.merchants.map((m, i) => (
                  <div key={m.merchant} className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      i < 3 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900 text-sm">{m.merchant}</span>
                        <span className="text-sm text-gray-700 font-semibold">
                          {CURRENCY_SYMBOL}{m.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{m.count} transactions</span>
                        <span>{m.percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly Trend Chart */}
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                📈 Monthly Trend
                {categoryDetails.trend === 'increasing' && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">↗ Increasing</span>
                )}
                {categoryDetails.trend === 'decreasing' && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">↘ Decreasing</span>
                )}
              </h3>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={categoryDetails.monthlyTrend} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="monthLabel" tick={{ fontSize: 10 }} />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => `${CURRENCY_SYMBOL}${(v/1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${CURRENCY_SYMBOL}${value.toLocaleString()}`, 'Spend']}
                      contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke="#10B981"
                      strokeWidth={2}
                      dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Savings Suggestions */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-4 border border-emerald-200">
            <h3 className="font-semibold text-emerald-900 mb-3 flex items-center gap-2">
              💡 Savings Potential
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/70 rounded-lg p-3">
                <p className="text-sm text-gray-700">
                  Cutting <span className="font-bold">{selectedCategory}</span> by <span className="text-emerald-600 font-bold">10%</span> saves:
                </p>
                <p className="text-xl font-bold text-emerald-700 mt-1">
                  {CURRENCY_SYMBOL}{categoryDetails.savings10Pct.toLocaleString(undefined, { maximumFractionDigits: 0 })}/year
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  ~{CURRENCY_SYMBOL}{(categoryDetails.savings10Pct / 12).toLocaleString(undefined, { maximumFractionDigits: 0 })}/month
                </p>
              </div>
              <div className="bg-white/70 rounded-lg p-3">
                <p className="text-sm text-gray-700">
                  Cutting <span className="font-bold">{selectedCategory}</span> by <span className="text-emerald-600 font-bold">20%</span> saves:
                </p>
                <p className="text-xl font-bold text-emerald-700 mt-1">
                  {CURRENCY_SYMBOL}{categoryDetails.savings20Pct.toLocaleString(undefined, { maximumFractionDigits: 0 })}/year
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  ~{CURRENCY_SYMBOL}{(categoryDetails.savings20Pct / 12).toLocaleString(undefined, { maximumFractionDigits: 0 })}/month
                </p>
              </div>
            </div>

            {/* Context-specific suggestions */}
            <div className="mt-4 pt-3 border-t border-emerald-200">
              <p className="text-sm text-emerald-800">
                {categoryDetails.name.toLowerCase().includes('dining') || categoryDetails.name.toLowerCase().includes('food') ? (
                  <>💡 <strong>Tip:</strong> Cooking at home 2 more times per week could achieve these savings.</>
                ) : categoryDetails.name.toLowerCase().includes('shopping') ? (
                  <>💡 <strong>Tip:</strong> Wait 24 hours before purchases over ₹1000 to reduce impulse buying.</>
                ) : categoryDetails.name.toLowerCase().includes('entertainment') ? (
                  <>💡 <strong>Tip:</strong> Look for free events or consolidate streaming subscriptions.</>
                ) : categoryDetails.name.toLowerCase().includes('travel') ? (
                  <>💡 <strong>Tip:</strong> Book in advance and use cashback cards for travel expenses.</>
                ) : (
                  <>💡 <strong>Tip:</strong> Review monthly to identify unnecessary expenses in this category.</>
                )}
              </p>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={() => setSelectedCategory(null)}
            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Close breakdown
          </button>
        </div>
      )}

      {/* No Selection State */}
      {!selectedCategory && (
        <div className="text-center py-8 text-gray-500">
          <span className="text-4xl mb-2 block">👆</span>
          <p>Select a category above to see detailed insights</p>
        </div>
      )}
    </div>
  );
};
