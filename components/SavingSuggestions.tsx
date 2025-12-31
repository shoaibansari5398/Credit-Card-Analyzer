import React, { useMemo } from 'react';
import { Transaction } from '../types';

const CURRENCY_SYMBOL = '₹';

interface SavingSuggestionsProps {
  data: Transaction[];
}

interface Suggestion {
  id: string;
  icon: string;
  title: string;
  description: string;
  potentialSaving: number;
  frequency: 'monthly' | 'yearly';
  category: string;
  priority: 'high' | 'medium' | 'low';
}

export const SavingSuggestions: React.FC<SavingSuggestionsProps> = ({ data }) => {
  // Filter expenses only (positive amounts = money spent, negative = credits/refunds)
  const expenses = useMemo(() => data.filter(t => t.amount > 0), [data]);
  const totalSpend = useMemo(() => expenses.reduce((acc, t) => acc + t.amount, 0), [expenses]);

  // Generate saving suggestions based on spending patterns
  const suggestions = useMemo(() => {
    if (expenses.length === 0) return [];

    const result: Suggestion[] = [];

    // Category analysis
    const catMap = new Map<string, { total: number; count: number }>();
    expenses.forEach(t => {
      const existing = catMap.get(t.category) || { total: 0, count: 0 };
      existing.total += t.amount;
      existing.count++;
      catMap.set(t.category, existing);
    });

    // 1. Dining/Restaurant Suggestions
    const diningCategories = ['dining', 'restaurant', 'food', 'swiggy', 'zomato', 'uber eats'];
    let diningTotal = 0;
    catMap.forEach((data, cat) => {
      if (diningCategories.some(d => cat.toLowerCase().includes(d))) {
        diningTotal += data.total;
      }
    });
    if (diningTotal > totalSpend * 0.15) {
      result.push({
        id: 'dining',
        icon: '🍽️',
        title: 'Reduce Dining Out Expenses',
        description: 'Your dining expenses are above 15% of total spending. Cooking at home 2-3 more meals per week could significantly reduce costs.',
        potentialSaving: diningTotal * 0.3,
        frequency: 'yearly',
        category: 'Dining',
        priority: 'high'
      });
    }

    // 2. Subscription Analysis
    const merchantFreq = new Map<string, { count: number; total: number; amounts: number[]; dates: number[] }>();
    expenses.forEach(t => {
      const key = t.merchant.toLowerCase();
      const existing = merchantFreq.get(key) || { count: 0, total: 0, amounts: [], dates: [] };
      existing.count++;
      existing.total += t.amount;
      existing.amounts.push(t.amount);

      const date = new Date(t.date).getTime();
      if (!isNaN(date)) {
        existing.dates.push(date);
      }
      merchantFreq.set(key, existing);
    });

    let subscriptionTotal = 0;
    merchantFreq.forEach((data, merchant) => {
      if (data.count >= 2) {
        const avgAmount = data.total / data.count;
        // Check amount consistency (variance < 15%)
        const isAmountConsistent = data.amounts.every(a => Math.abs(a - avgAmount) / avgAmount < 0.15);

        // Check temporal consistency if we have enough dates
        let isTimeConsistent = false;
        if (data.dates.length >= 2) {
          const sortedDates = data.dates.sort((a, b) => a - b);
          const intervals: number[] = [];
          for (let i = 1; i < sortedDates.length; i++) {
            const diffDays = (sortedDates[i] - sortedDates[i-1]) / (1000 * 60 * 60 * 24);
            intervals.push(diffDays);
          }

          // Check for monthly (approx 28-32 days) or weekly (approx 7 days) patterns
          const isMonthly = intervals.every(i => i >= 25 && i <= 35);
          const isWeekly = intervals.every(i => i >= 6 && i <= 8);
          // Also check for simple regularity (low variance in intervals)
          const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
          const isRegular = intervals.every(i => Math.abs(i - avgInterval) < 3); // within 3 days variance

          isTimeConsistent = isMonthly || isWeekly || isRegular;
        }

        // If high count (>= 3), strictly enforce time consistency.
        // For just 2 txns, it might be too early to tell, but we can trust amount consistency if strictly equal?
        // Let's require time consistency to be safe, or if only 2 txns, very specific monthly gap.

        if (isAmountConsistent && isTimeConsistent && avgAmount < 5000) {
          subscriptionTotal += data.total;
        }
      }
    });

    if (subscriptionTotal > 0) {
      result.push({
        id: 'subscriptions',
        icon: '🔄',
        title: 'Review Recurring Subscriptions',
        description: 'Audit your subscriptions quarterly. Cancel unused ones and consider annual plans for 15-20% savings.',
        potentialSaving: subscriptionTotal * 0.2,
        frequency: 'yearly',
        category: 'Subscriptions',
        priority: 'medium'
      });
    }

    // 3. Shopping Category
    let shoppingTotal = 0;
    catMap.forEach((data, cat) => {
      if (cat.toLowerCase().includes('shopping') || cat.toLowerCase().includes('retail')) {
        shoppingTotal += data.total;
      }
    });
    if (shoppingTotal > totalSpend * 0.2) {
      result.push({
        id: 'shopping',
        icon: '🛒',
        title: 'Implement 24-Hour Rule for Shopping',
        description: 'Wait 24 hours before making non-essential purchases over ₹1000. This reduces impulse buying by up to 40%.',
        potentialSaving: shoppingTotal * 0.25,
        frequency: 'yearly',
        category: 'Shopping',
        priority: 'high'
      });
    }

    // 4. Entertainment
    let entertainmentTotal = 0;
    catMap.forEach((data, cat) => {
      if (cat.toLowerCase().includes('entertainment') || cat.toLowerCase().includes('movies') || cat.toLowerCase().includes('gaming')) {
        entertainmentTotal += data.total;
      }
    });
    if (entertainmentTotal > totalSpend * 0.1) {
      result.push({
        id: 'entertainment',
        icon: '🎬',
        title: 'Optimize Entertainment Spending',
        description: 'Look for free events, matinee shows, and consolidate streaming services. Share subscriptions with family.',
        potentialSaving: entertainmentTotal * 0.3,
        frequency: 'yearly',
        category: 'Entertainment',
        priority: 'medium'
      });
    }

    // 5. Travel/Transport
    let travelTotal = 0;
    catMap.forEach((data, cat) => {
      if (cat.toLowerCase().includes('travel') || cat.toLowerCase().includes('transport') || cat.toLowerCase().includes('uber') || cat.toLowerCase().includes('ola')) {
        travelTotal += data.total;
      }
    });
    if (travelTotal > totalSpend * 0.1) {
      result.push({
        id: 'travel',
        icon: '🚗',
        title: 'Reduce Transportation Costs',
        description: 'Use public transport, carpool, or bike for shorter distances. Book travel in advance for better rates.',
        potentialSaving: travelTotal * 0.2,
        frequency: 'yearly',
        category: 'Travel',
        priority: 'medium'
      });
    }

    // 6. Small/Micro Transactions
    const smallTx = expenses.filter(t => t.amount < 200);
    const smallTotal = smallTx.reduce((acc, t) => acc + t.amount, 0);
    if (smallTx.length > expenses.length * 0.3 && smallTotal > totalSpend * 0.1) {
      result.push({
        id: 'micro',
        icon: '💸',
        title: 'Track Micro-Spending',
        description: `${smallTx.length} small transactions (<₹200) add up. Use a daily spending limit to curb these "invisible" expenses.`,
        potentialSaving: smallTotal * 0.4,
        frequency: 'yearly',
        category: 'Miscellaneous',
        priority: 'low'
      });
    }

    // 7. Cashback & Rewards
    result.push({
      id: 'cashback',
      icon: '💳',
      title: 'Maximize Card Rewards',
      description: 'Match your spending categories to cards with best rewards. Use 2% cashback cards for general spending.',
      potentialSaving: totalSpend * 0.02,
      frequency: 'yearly',
      category: 'General',
      priority: 'low'
    });

    return result.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [expenses, totalSpend]);

  // Total potential savings
  const totalSavings = useMemo(() => {
    return suggestions.reduce((acc, s) => acc + s.potentialSaving, 0);
  }, [suggestions]);

  const getPriorityStyle = (priority: Suggestion['priority']) => {
    switch (priority) {
      case 'high': return 'bg-red-50 border-red-200 text-red-700';
      case 'medium': return 'bg-amber-50 border-amber-200 text-amber-700';
      case 'low': return 'bg-blue-50 border-blue-200 text-blue-700';
    }
  };

  if (expenses.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            💡 Saving Suggestions
          </h2>
          <p className="text-sm text-gray-500 mt-1">Personalized tips to optimize your spending</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-emerald-500 uppercase tracking-wide">Potential Yearly Savings</p>
          <p className="text-2xl font-bold text-emerald-600">
            {CURRENCY_SYMBOL}{totalSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* Suggestions Grid */}
      <div className="space-y-4">
        {suggestions.map(suggestion => (
          <div
            key={suggestion.id}
            className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-start gap-4">
              <span className="text-3xl">{suggestion.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-gray-900">{suggestion.title}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${getPriorityStyle(suggestion.priority)}`}>
                    {suggestion.priority.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{suggestion.description}</p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-emerald-600 font-semibold">
                    Save ~{CURRENCY_SYMBOL}{suggestion.potentialSaving.toLocaleString(undefined, { maximumFractionDigits: 0 })}/{suggestion.frequency === 'yearly' ? 'year' : 'month'}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-500">{suggestion.category}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Footer */}
      <div className="mt-6 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎯</span>
          <div>
            <p className="font-semibold text-emerald-800">
              Implement these suggestions to save up to {CURRENCY_SYMBOL}{totalSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}/year
            </p>
            <p className="text-sm text-emerald-600">
              That's ~{CURRENCY_SYMBOL}{(totalSavings / 12).toLocaleString(undefined, { maximumFractionDigits: 0 })}/month back in your pocket!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
