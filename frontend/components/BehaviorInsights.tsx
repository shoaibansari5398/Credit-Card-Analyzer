import React, { useMemo } from 'react';
import { Transaction } from '../types';
import { CURRENCY_SYMBOL } from '../config/constants';

interface BehaviorInsightsProps {
  data: Transaction[];
}

interface Insight {
  id: string;
  icon: string;
  title: string;
  description: string;
  detail?: string;
  type: 'info' | 'warning' | 'success' | 'alert';
  action?: string;
}

interface SubscriptionInfo {
  merchant: string;
  amount: number;
  frequency: 'monthly' | 'yearly';
  yearlyTotal: number;
}

export const BehaviorInsights: React.FC<BehaviorInsightsProps> = ({ data }) => {
  // Filter expenses only (positive amounts = money spent, negative = credits/refunds)
  const debits = useMemo(() => data.filter(t => t.amount > 0), [data]);

  // Generate all behavioral insights
  const insights = useMemo(() => {
    if (debits.length === 0) return [];

    const results: Insight[] = [];

    // 1. Weekend vs Weekday Pattern
    const weekendTx = debits.filter(t => {
      const day = new Date(t.date).getDay();
      return day === 0 || day === 6;
    });
    const weekdayTx = debits.filter(t => {
      const day = new Date(t.date).getDay();
      return day >= 1 && day <= 5;
    });

    const weekendTotal = weekendTx.reduce((acc, t) => acc + t.amount, 0);
    const weekdayTotal = weekdayTx.reduce((acc, t) => acc + t.amount, 0);

    // Normalize by number of days
    const weekendAvg = weekendTotal / 2; // 2 weekend days
    const weekdayAvg = weekdayTotal / 5; // 5 weekdays

    if (weekdayAvg > 0 && weekendAvg > weekdayAvg * 1.3) {
      const pctMore = ((weekendAvg / weekdayAvg - 1) * 100).toFixed(0);
      results.push({
        id: 'weekend-spender',
        icon: '🎉',
        title: 'Weekend Spender Detected',
        description: `You spend ${pctMore}% more per day on weekends than weekdays.`,
        detail: `Weekend avg: ${CURRENCY_SYMBOL}${weekendAvg.toLocaleString(undefined, { maximumFractionDigits: 0 })}/day vs Weekday: ${CURRENCY_SYMBOL}${weekdayAvg.toLocaleString(undefined, { maximumFractionDigits: 0 })}/day`,
        type: 'info'
      });
    } else if (weekendAvg > 0 && weekdayAvg > weekendAvg * 1.3) {
      results.push({
        id: 'weekday-spender',
        icon: '💼',
        title: 'Peak Spending on Workdays',
        description: 'Your spending is concentrated during weekdays.',
        detail: 'Consider if work-related expenses can be optimized.',
        type: 'info'
      });
    }

    // 2. Time-of-Month Pattern (Start/Mid/End)
    const startOfMonth = debits.filter(t => parseInt(t.date.split('-')[2]) <= 10);
    const midMonth = debits.filter(t => {
      const day = parseInt(t.date.split('-')[2]);
      return day > 10 && day <= 20;
    });
    const endOfMonth = debits.filter(t => parseInt(t.date.split('-')[2]) > 20);

    const startTotal = startOfMonth.reduce((acc, t) => acc + t.amount, 0);
    const midTotal = midMonth.reduce((acc, t) => acc + t.amount, 0);
    const endTotal = endOfMonth.reduce((acc, t) => acc + t.amount, 0);

    const monthPeriods = [
      { name: 'start of month (1-10)', total: startTotal },
      { name: 'mid-month (11-20)', total: midTotal },
      { name: 'end of month (21-31)', total: endTotal }
    ].sort((a, b) => b.total - a.total);

    if (monthPeriods[0].total > monthPeriods[1].total * 1.4) {
      results.push({
        id: 'month-pattern',
        icon: '📅',
        title: `Heavy Spending at ${monthPeriods[0].name.split(' (')[0].charAt(0).toUpperCase() + monthPeriods[0].name.split(' (')[0].slice(1)}`,
        description: `You spend most during the ${monthPeriods[0].name}.`,
        detail: monthPeriods[0].name.includes('start')
          ? 'Post-salary spending surge detected. Consider budgeting for the full month.'
          : monthPeriods[0].name.includes('end')
            ? 'End-of-month spending spike. Watch out for impulsive purchases before payday.'
            : 'Mid-month is your peak spending period.',
        type: 'warning'
      });
    }

    // 3. Category Dining Pattern at Month-End
    const diningEnd = endOfMonth.filter(t =>
      t.category.toLowerCase().includes('dining') ||
      t.category.toLowerCase().includes('food') ||
      t.category.toLowerCase().includes('restaurant')
    );
    const diningOther = debits.filter(t =>
      (t.category.toLowerCase().includes('dining') ||
       t.category.toLowerCase().includes('food') ||
       t.category.toLowerCase().includes('restaurant')) &&
      parseInt(t.date.split('-')[2]) <= 20
    );

    if (diningEnd.length > 0 && diningEnd.length > diningOther.length * 0.5) {
      const diningEndTotal = diningEnd.reduce((acc, t) => acc + t.amount, 0);
      results.push({
        id: 'dining-end-month',
        icon: '🍽️',
        title: 'Dining Spikes at Month-End',
        description: `Your food/dining spending increases significantly toward the end of the month.`,
        detail: `Month-end dining: ${CURRENCY_SYMBOL}${diningEndTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        type: 'warning',
        action: 'Consider meal prepping to reduce end-of-month food expenses.'
      });
    }

    // 4. Category Trend Analysis (YoY or Half-Year Comparison)
    const sortedByDate = [...debits].sort((a, b) => a.date.localeCompare(b.date));
    if (sortedByDate.length > 20) {
      const midpoint = Math.floor(sortedByDate.length / 2);
      const firstHalf = sortedByDate.slice(0, midpoint);
      const secondHalf = sortedByDate.slice(midpoint);

      // Analyze travel category
      const travelFirst = firstHalf
        .filter(t => t.category.toLowerCase().includes('travel') || t.category.toLowerCase().includes('transport'))
        .reduce((acc, t) => acc + t.amount, 0);
      const travelSecond = secondHalf
        .filter(t => t.category.toLowerCase().includes('travel') || t.category.toLowerCase().includes('transport'))
        .reduce((acc, t) => acc + t.amount, 0);

      if (travelFirst > 0 && travelSecond > travelFirst * 1.25) {
        const increase = ((travelSecond / travelFirst - 1) * 100).toFixed(0);
        results.push({
          id: 'travel-increase',
          icon: '✈️',
          title: `Travel Spending Up ${increase}%`,
          description: 'Your travel/transport expenses increased significantly in recent months.',
          detail: `Earlier: ${CURRENCY_SYMBOL}${travelFirst.toLocaleString(undefined, { maximumFractionDigits: 0 })} → Recent: ${CURRENCY_SYMBOL}${travelSecond.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
          type: 'info'
        });
      } else if (travelFirst > 0 && travelSecond < travelFirst * 0.75) {
        const decrease = ((1 - travelSecond / travelFirst) * 100).toFixed(0);
        results.push({
          id: 'travel-decrease',
          icon: '✈️',
          title: `Travel Spending Down ${decrease}%`,
          description: 'Great job! Your travel/transport costs have decreased.',
          type: 'success'
        });
      }
    }

    // 5. Subscription Analysis
    const merchantFreq = new Map<string, { count: number; amounts: number[]; dates: string[] }>();
    debits.forEach(t => {
      const key = t.merchant.toLowerCase().trim();
      const existing = merchantFreq.get(key) || { count: 0, amounts: [], dates: [] };
      existing.count++;
      existing.amounts.push(t.amount);
      existing.dates.push(t.date);
      merchantFreq.set(key, existing);
    });

    const subscriptions: SubscriptionInfo[] = [];
    merchantFreq.forEach((data, merchant) => {
      if (data.count >= 2) {
        const avgAmount = data.amounts.reduce((a, b) => a + b, 0) / data.amounts.length;
        const isConsistent = data.amounts.every(a => Math.abs(a - avgAmount) / avgAmount < 0.15);

        if (isConsistent) {
          // Determine frequency
          const sortedDates = data.dates.sort();
          let avgDaysBetween = 0;
          for (let i = 1; i < sortedDates.length; i++) {
            const d1 = new Date(sortedDates[i - 1]);
            const d2 = new Date(sortedDates[i]);
            avgDaysBetween += (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24);
          }
          avgDaysBetween = avgDaysBetween / (sortedDates.length - 1);

          const frequency: 'monthly' | 'yearly' = avgDaysBetween > 180 ? 'yearly' : 'monthly';
          const yearlyTotal = frequency === 'monthly' ? avgAmount * 12 : avgAmount;

          subscriptions.push({
            merchant: merchant.charAt(0).toUpperCase() + merchant.slice(1),
            amount: avgAmount,
            frequency,
            yearlyTotal
          });
        }
      }
    });

    if (subscriptions.length > 0) {
      const totalYearly = subscriptions.reduce((acc, s) => acc + s.yearlyTotal, 0);
      const topSubs = subscriptions.sort((a, b) => b.yearlyTotal - a.yearlyTotal).slice(0, 5);

      results.push({
        id: 'subscriptions',
        icon: '🔄',
        title: `Subscriptions Cost You ${CURRENCY_SYMBOL}${totalYearly.toLocaleString(undefined, { maximumFractionDigits: 0 })}/year`,
        description: `${subscriptions.length} recurring charges detected.`,
        detail: topSubs.map(s => `${s.merchant}: ${CURRENCY_SYMBOL}${s.yearlyTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr`).join(' • '),
        type: 'warning',
        action: 'Review subscriptions — cancel unused ones to save money.'
      });
    }

    // 6. Impulse Spending Detection (Small frequent transactions)
    const smallTx = debits.filter(t => t.amount < 500);
    const smallTotal = smallTx.reduce((acc, t) => acc + t.amount, 0);
    const totalSpend = debits.reduce((acc, t) => acc + t.amount, 0);

    if (smallTx.length > debits.length * 0.5 && smallTotal > totalSpend * 0.2) {
      results.push({
        id: 'micro-spending',
        icon: '💸',
        title: 'Micro-Spending Adds Up',
        description: `${smallTx.length} small transactions (<₹500) total ${CURRENCY_SYMBOL}${smallTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        detail: `That's ${((smallTotal / totalSpend) * 100).toFixed(0)}% of your total spending on small purchases.`,
        type: 'warning',
        action: 'Track these "invisible" expenses — they compound over time.'
      });
    }

    // 7. High Weekend Entertainment
    const entertainmentWeekend = weekendTx.filter(t =>
      t.category.toLowerCase().includes('entertainment') ||
      t.category.toLowerCase().includes('movies') ||
      t.category.toLowerCase().includes('gaming')
    );
    if (entertainmentWeekend.length > 3) {
      const entTotal = entertainmentWeekend.reduce((acc, t) => acc + t.amount, 0);
      results.push({
        id: 'weekend-entertainment',
        icon: '🎬',
        title: 'Weekend Entertainment Habit',
        description: `You frequently spend on entertainment during weekends.`,
        detail: `Total: ${CURRENCY_SYMBOL}${entTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })} across ${entertainmentWeekend.length} transactions`,
        type: 'info'
      });
    }

    return results;
  }, [debits]);

  // Time of month distribution for visualization
  const monthPeriodData = useMemo(() => {
    const start = debits.filter(t => parseInt(t.date.split('-')[2]) <= 10).reduce((acc, t) => acc + t.amount, 0);
    const mid = debits.filter(t => {
      const day = parseInt(t.date.split('-')[2]);
      return day > 10 && day <= 20;
    }).reduce((acc, t) => acc + t.amount, 0);
    const end = debits.filter(t => parseInt(t.date.split('-')[2]) > 20).reduce((acc, t) => acc + t.amount, 0);
    const total = start + mid + end || 1;

    return [
      { period: 'Start (1-10)', amount: start, percentage: (start / total) * 100 },
      { period: 'Mid (11-20)', amount: mid, percentage: (mid / total) * 100 },
      { period: 'End (21-31)', amount: end, percentage: (end / total) * 100 }
    ];
  }, [debits]);

  const getTypeStyle = (type: Insight['type']) => {
    switch (type) {
      case 'warning': return 'border-l-amber-500 bg-amber-50';
      case 'success': return 'border-l-emerald-500 bg-emerald-50';
      case 'alert': return 'border-l-red-500 bg-red-50';
      default: return 'border-l-blue-500 bg-blue-50';
    }
  };

  if (debits.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            🧠 Behavior Insights
          </h2>
          <p className="text-sm text-gray-500 mt-1">Your personal financial patterns, translated</p>
        </div>
      </div>

      {/* Billing Cycle Pattern Visual */}
      <div className="mb-6 p-4 bg-gray-50 rounded-xl">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">📊 Spending by Billing Cycle Period</h3>
        <div className="flex items-end gap-4 h-24">
          {monthPeriodData.map((period) => (
            <div key={period.period} className="flex-1 flex flex-col items-center">
              <div className="w-full flex flex-col items-center">
                <span className="text-xs font-semibold text-gray-700 mb-1">
                  {CURRENCY_SYMBOL}{(period.amount / 1000).toFixed(0)}k
                </span>
                <div
                  className="w-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-lg transition-all duration-500"
                  style={{ height: `${Math.max(period.percentage * 0.8, 10)}px` }}
                />
              </div>
              <span className="text-xs text-gray-600 mt-2 text-center">{period.period}</span>
              <span className="text-[10px] text-gray-400">{period.percentage.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Insights Cards */}
      {insights.length > 0 ? (
        <div className="space-y-3">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className={`border-l-4 rounded-r-lg p-4 ${getTypeStyle(insight.type)}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{insight.icon}</span>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{insight.title}</h4>
                  <p className="text-sm text-gray-700 mt-0.5">{insight.description}</p>
                  {insight.detail && (
                    <p className="text-xs text-gray-500 mt-1">{insight.detail}</p>
                  )}
                  {insight.action && (
                    <p className="text-xs font-medium text-emerald-700 mt-2 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                      {insight.action}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <span className="text-4xl mb-2 block">📊</span>
          <p>Not enough data to generate behavioral insights yet.</p>
          <p className="text-sm">Upload more transactions for personalized analysis.</p>
        </div>
      )}
    </div>
  );
};
