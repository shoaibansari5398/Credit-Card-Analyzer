import React, { useMemo } from 'react';
import { Transaction } from '../types';
import { CURRENCY_SYMBOL } from '../config/constants';

interface SmartAnalyticsProps {
  data: Transaction[];
}

interface PatternInsight {
  title: string;
  value: string;
  description: string;
  type: 'info' | 'warning' | 'success' | 'neutral';
  icon: string;
}

// Indian festivals/holidays for seasonal detection
const INDIAN_FESTIVALS: { [key: string]: string[] } = {
  '01': ['New Year'],
  '03': ['Holi'],
  '08': ['Independence Day', 'Raksha Bandhan'],
  '10': ['Dussehra', 'Durga Puja'],
  '11': ['Diwali', 'Bhai Dooj'],
  '12': ['Christmas']
};

export const SmartAnalytics: React.FC<SmartAnalyticsProps> = ({ data }) => {
  const insights = useMemo(() => {
    if (data.length === 0) return [];

    const results: PatternInsight[] = [];
    const debits = data.filter(t => t.amount > 0);

    // 1. Weekend vs Weekday Pattern
    const weekendSpend = debits
      .filter(t => {
        const day = new Date(t.date).getDay();
        return day === 0 || day === 6;
      })
      .reduce((acc, t) => acc + t.amount, 0);

    const weekdaySpend = debits
      .filter(t => {
        const day = new Date(t.date).getDay();
        return day >= 1 && day <= 5;
      })
      .reduce((acc, t) => acc + t.amount, 0);

    const weekendAvgPerDay = weekendSpend / 8; // ~8 weekend days per month
    const weekdayAvgPerDay = weekdaySpend / 22; // ~22 weekdays per month
    const spendRatio = weekendAvgPerDay / (weekdayAvgPerDay || 1);

    if (spendRatio > 1.5) {
      results.push({
        title: 'Weekend Spender',
        value: `${(spendRatio * 100 - 100).toFixed(0)}% more`,
        description: 'You spend significantly more on weekends compared to weekdays.',
        type: 'warning',
        icon: '🎉'
      });
    } else if (spendRatio < 0.7) {
      results.push({
        title: 'Weekday Spender',
        value: `${((1 - spendRatio) * 100).toFixed(0)}% more`,
        description: 'Your spending is higher during weekdays than weekends.',
        type: 'info',
        icon: '💼'
      });
    } else {
      results.push({
        title: 'Balanced Spending',
        value: 'Even',
        description: 'Your spending is evenly distributed across the week.',
        type: 'success',
        icon: '⚖️'
      });
    }

    // 2. Peak Spending Month
    const monthlySpend = new Map<string, number>();
    debits.forEach(t => {
      const month = t.date.substring(0, 7); // YYYY-MM
      monthlySpend.set(month, (monthlySpend.get(month) || 0) + t.amount);
    });

    let peakMonth = '';
    let peakAmount = 0;
    monthlySpend.forEach((amount, month) => {
      if (amount > peakAmount) {
        peakAmount = amount;
        peakMonth = month;
      }
    });

    if (peakMonth) {
      const [year, month] = peakMonth.split('-');
      const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      results.push({
        title: 'Peak Spending Month',
        value: monthName,
        description: `Highest spending of ${CURRENCY_SYMBOL}${peakAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        type: 'neutral',
        icon: '📈'
      });
    }

    // 3. Seasonal/Festival Spending Detection
    const monthSpendMap = new Map<string, { total: number; count: number }>();
    debits.forEach(t => {
      const month = t.date.substring(5, 7); // MM
      const existing = monthSpendMap.get(month) || { total: 0, count: 0 };
      monthSpendMap.set(month, { total: existing.total + t.amount, count: existing.count + 1 });
    });

    // Find months with festivals that have higher than average spend
    const avgMonthlySpend = debits.reduce((acc, t) => acc + t.amount, 0) / 12;
    const festivalMonths: string[] = [];

    monthSpendMap.forEach((data, month) => {
      if (INDIAN_FESTIVALS[month] && data.total > avgMonthlySpend * 1.3) {
        festivalMonths.push(...INDIAN_FESTIVALS[month]);
      }
    });

    if (festivalMonths.length > 0) {
      results.push({
        title: 'Festival Spending Detected',
        value: festivalMonths.slice(0, 2).join(', '),
        description: 'Higher spending during festival seasons observed.',
        type: 'info',
        icon: '🎊'
      });
    }

    // 4. Recurring/Subscription Detection
    const merchantFrequency = new Map<string, { count: number; amounts: number[]; dates: string[] }>();
    debits.forEach(t => {
      const key = t.merchant.toLowerCase().trim();
      const existing = merchantFrequency.get(key) || { count: 0, amounts: [], dates: [] };
      existing.count++;
      existing.amounts.push(t.amount);
      existing.dates.push(t.date);
      merchantFrequency.set(key, existing);
    });

    const subscriptions: { name: string; amount: number }[] = [];
    merchantFrequency.forEach((data, merchant) => {
      if (data.count >= 2) {
        // Check if amounts are similar (within 10%)
        const avgAmount = data.amounts.reduce((a, b) => a + b, 0) / data.amounts.length;
        const isConsistentAmount = data.amounts.every(a => Math.abs(a - avgAmount) / avgAmount < 0.1);

        if (isConsistentAmount) {
          subscriptions.push({ name: merchant, amount: avgAmount });
        }
      }
    });

    if (subscriptions.length > 0) {
      const topSubs = subscriptions.slice(0, 3);
      const monthlySubTotal = subscriptions.reduce((acc, s) => acc + s.amount, 0);
      results.push({
        title: 'Recurring Expenses Found',
        value: `${subscriptions.length} subscriptions`,
        description: `~${CURRENCY_SYMBOL}${monthlySubTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo in recurring charges`,
        type: 'warning',
        icon: '🔄'
      });
    }

    // 5. Unusual/High-Value Transaction Detection
    const amounts = debits.map(t => t.amount);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = Math.sqrt(amounts.reduce((sum, a) => sum + Math.pow(a - avgAmount, 2), 0) / amounts.length);

    const outliers = debits.filter(t => t.amount > avgAmount + 2 * stdDev);

    if (outliers.length > 0) {
      const topOutlier = outliers.sort((a, b) => b.amount - a.amount)[0];
      results.push({
        title: 'Unusual Transactions',
        value: `${outliers.length} detected`,
        description: `Largest: ${CURRENCY_SYMBOL}${topOutlier.amount.toLocaleString()} at ${topOutlier.merchant}`,
        type: 'warning',
        icon: '⚠️'
      });
    } else {
      results.push({
        title: 'Spending Pattern',
        value: 'Normal',
        description: 'No unusual high-value transactions detected.',
        type: 'success',
        icon: '✓'
      });
    }

    // 6. Next Month Prediction (Simple Moving Average)
    const sortedMonths = Array.from(monthlySpend.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    if (sortedMonths.length >= 2) {
      // Use last 3 months for prediction (or available months)
      const recentMonths = sortedMonths.slice(-3);
      const avgRecentSpend = recentMonths.reduce((acc, [_, amt]) => acc + amt, 0) / recentMonths.length;

      // Apply simple trend adjustment
      let trend = 0;
      if (recentMonths.length >= 2) {
        const lastMonthSpend = recentMonths[recentMonths.length - 1][1];
        const prevMonthSpend = recentMonths[recentMonths.length - 2][1];
        trend = (lastMonthSpend - prevMonthSpend) / prevMonthSpend;
      }

      const prediction = avgRecentSpend * (1 + trend * 0.5); // Dampened trend
      const confidence = recentMonths.length >= 3 ? 'High' : 'Medium';

      results.push({
        title: 'Next Month Forecast',
        value: `${CURRENCY_SYMBOL}${prediction.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        description: `${confidence} confidence based on ${recentMonths.length}-month trend`,
        type: 'info',
        icon: '🔮'
      });
    }

    return results;
  }, [data]);

  // Get recurring subscriptions for detail display
  const subscriptionDetails = useMemo(() => {
    const merchantFrequency = new Map<string, { count: number; amounts: number[] }>();
    data.filter(t => t.amount > 0).forEach(t => {
      const key = t.merchant.toLowerCase().trim();
      const existing = merchantFrequency.get(key) || { count: 0, amounts: [] };
      existing.count++;
      existing.amounts.push(t.amount);
      merchantFrequency.set(key, existing);
    });

    const subs: { name: string; amount: number; frequency: string }[] = [];
    merchantFrequency.forEach((data, merchant) => {
      if (data.count >= 2) {
        const avgAmount = data.amounts.reduce((a, b) => a + b, 0) / data.amounts.length;
        const isConsistent = data.amounts.every(a => Math.abs(a - avgAmount) / avgAmount < 0.1);
        if (isConsistent) {
          subs.push({
            name: merchant.charAt(0).toUpperCase() + merchant.slice(1),
            amount: avgAmount,
            frequency: data.count >= 4 ? 'Weekly' : 'Monthly'
          });
        }
      }
    });

    return subs.sort((a, b) => b.amount - a.amount).slice(0, 5);
  }, [data]);

  const getTypeStyles = (type: PatternInsight['type']) => {
    switch (type) {
      case 'warning':
        return 'bg-amber-50 border-amber-200 text-amber-800';
      case 'success':
        return 'bg-emerald-50 border-emerald-200 text-emerald-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Smart Analytics</h3>
          <p className="text-sm text-gray-500">AI-powered spending behavior patterns</p>
        </div>
        <span className="text-2xl">🧠</span>
      </div>

      {/* Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {insights.map((insight, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border ${getTypeStyles(insight.type)} transition-all hover:shadow-md`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{insight.icon}</span>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm">{insight.title}</h4>
                <p className="text-lg font-bold mt-0.5">{insight.value}</p>
                <p className="text-xs mt-1 opacity-80">{insight.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Subscription Details */}
      {subscriptionDetails.length > 0 && (
        <div className="border-t border-gray-100 pt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span>🔄</span> Detected Recurring Expenses
          </h4>
          <div className="flex flex-wrap gap-2">
            {subscriptionDetails.map((sub, i) => (
              <div
                key={i}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full text-sm"
              >
                <span className="font-medium text-gray-700">{sub.name}</span>
                <span className="text-gray-500">•</span>
                <span className="text-emerald-600 font-semibold">
                  {CURRENCY_SYMBOL}{sub.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
                <span className="text-xs text-gray-400">{sub.frequency}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
