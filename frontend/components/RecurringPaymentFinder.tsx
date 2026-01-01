import React, { useMemo, useState } from 'react';
import { Transaction } from '../types';

const CURRENCY_SYMBOL = '₹';

interface RecurringPaymentFinderProps {
  data: Transaction[];
}

interface RecurringPayment {
  id: string;
  merchant: string;
  type: 'subscription' | 'emi' | 'utility';
  amount: number;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  lastPaymentDate: string;
  nextRenewalDate: string;
  daysUntilRenewal: number;
  occurrences: number;
  yearlyTotal: number;
  category: string;
}

// Known subscription services for better categorization
const SUBSCRIPTION_KEYWORDS = [
  'netflix', 'spotify', 'amazon prime', 'hotstar', 'disney', 'youtube', 'apple',
  'google play', 'adobe', 'microsoft', 'zoom', 'slack', 'notion', 'figma',
  'gym', 'fitness', 'club', 'membership', 'prime', 'swiggy one', 'zomato pro'
];

const EMI_KEYWORDS = ['emi', 'loan', 'installment', 'bajaj', 'hdfc emi', 'icici emi'];

const UTILITY_KEYWORDS = [
  'electricity', 'water', 'gas', 'internet', 'broadband', 'wifi', 'jio', 'airtel',
  'vodafone', 'bsnl', 'tata play', 'dth', 'insurance'
];

export const RecurringPaymentFinder: React.FC<RecurringPaymentFinderProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'subscription' | 'emi' | 'utility'>('all');

  // Filter expenses only (positive amounts = money spent, negative = credits/refunds)
  const debits = useMemo(() => data.filter(t => t.amount > 0), [data]);

  // Identify recurring payments
  const recurringPayments = useMemo(() => {
    const merchantMap = new Map<string, {
      amounts: number[];
      dates: string[];
      category: string;
    }>();

    // Group by merchant
    debits.forEach(t => {
      const key = t.merchant.toLowerCase().trim();
      const existing = merchantMap.get(key) || { amounts: [], dates: [], category: t.category };
      existing.amounts.push(t.amount);
      existing.dates.push(t.date);
      merchantMap.set(key, existing);
    });

    const payments: RecurringPayment[] = [];
    const today = new Date();

    merchantMap.forEach((data, merchant) => {
      // Need at least 2 occurrences
      if (data.dates.length < 2) return;

      // Check for consistent amounts (within 10% variance)
      const avgAmount = data.amounts.reduce((a, b) => a + b, 0) / data.amounts.length;
      const isConsistent = data.amounts.every(a => Math.abs(a - avgAmount) / avgAmount < 0.1);

      if (!isConsistent) return;

      // Calculate frequency
      const sortedDates = data.dates.sort();
      let totalDays = 0;
      for (let i = 1; i < sortedDates.length; i++) {
        const d1 = new Date(sortedDates[i - 1]);
        const d2 = new Date(sortedDates[i]);
        totalDays += (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24);
      }
      const avgDaysBetween = totalDays / (sortedDates.length - 1);

      // Determine frequency
      let frequency: RecurringPayment['frequency'];
      let yearlyMultiplier: number;

      if (avgDaysBetween <= 10) {
        frequency = 'weekly';
        yearlyMultiplier = 52;
      } else if (avgDaysBetween <= 45) {
        frequency = 'monthly';
        yearlyMultiplier = 12;
      } else if (avgDaysBetween <= 120) {
        frequency = 'quarterly';
        yearlyMultiplier = 4;
      } else {
        frequency = 'yearly';
        yearlyMultiplier = 1;
      }

      // Determine type
      const merchantLower = merchant.toLowerCase();
      let type: RecurringPayment['type'] = 'subscription';

      if (EMI_KEYWORDS.some(kw => merchantLower.includes(kw))) {
        type = 'emi';
      } else if (UTILITY_KEYWORDS.some(kw => merchantLower.includes(kw))) {
        type = 'utility';
      } else if (SUBSCRIPTION_KEYWORDS.some(kw => merchantLower.includes(kw))) {
        type = 'subscription';
      }

      // Calculate next renewal
      const lastPaymentDate = sortedDates[sortedDates.length - 1];
      const lastPayment = new Date(lastPaymentDate);

      let nextRenewal = new Date(lastPayment);
      switch (frequency) {
        case 'weekly':
          nextRenewal.setDate(nextRenewal.getDate() + 7);
          break;
        case 'monthly':
          nextRenewal.setMonth(nextRenewal.getMonth() + 1);
          break;
        case 'quarterly':
          nextRenewal.setMonth(nextRenewal.getMonth() + 3);
          break;
        case 'yearly':
          nextRenewal.setFullYear(nextRenewal.getFullYear() + 1);
          break;
      }

      // If next renewal is in the past, calculate the next one from today
      while (nextRenewal < today) {
        switch (frequency) {
          case 'weekly':
            nextRenewal.setDate(nextRenewal.getDate() + 7);
            break;
          case 'monthly':
            nextRenewal.setMonth(nextRenewal.getMonth() + 1);
            break;
          case 'quarterly':
            nextRenewal.setMonth(nextRenewal.getMonth() + 3);
            break;
          case 'yearly':
            nextRenewal.setFullYear(nextRenewal.getFullYear() + 1);
            break;
        }
      }

      const daysUntilRenewal = Math.ceil((nextRenewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      payments.push({
        id: merchant,
        merchant: merchant.charAt(0).toUpperCase() + merchant.slice(1),
        type,
        amount: avgAmount,
        frequency,
        lastPaymentDate,
        nextRenewalDate: nextRenewal.toISOString().split('T')[0],
        daysUntilRenewal,
        occurrences: data.dates.length,
        yearlyTotal: avgAmount * yearlyMultiplier,
        category: data.category
      });
    });

    return payments.sort((a, b) => a.daysUntilRenewal - b.daysUntilRenewal);
  }, [debits]);

  // Filter by active tab
  const filteredPayments = useMemo(() => {
    if (activeTab === 'all') return recurringPayments;
    return recurringPayments.filter(p => p.type === activeTab);
  }, [recurringPayments, activeTab]);

  // Totals
  const totals = useMemo(() => {
    const subscriptionTotal = recurringPayments
      .filter(p => p.type === 'subscription')
      .reduce((acc, p) => acc + p.yearlyTotal, 0);

    const emiTotal = recurringPayments
      .filter(p => p.type === 'emi')
      .reduce((acc, p) => acc + p.yearlyTotal, 0);

    const utilityTotal = recurringPayments
      .filter(p => p.type === 'utility')
      .reduce((acc, p) => acc + p.yearlyTotal, 0);

    return {
      subscriptionTotal,
      emiTotal,
      utilityTotal,
      grandTotal: subscriptionTotal + emiTotal + utilityTotal
    };
  }, [recurringPayments]);

  // Upcoming renewals (next 7 days)
  const upcomingRenewals = useMemo(() => {
    return recurringPayments.filter(p => p.daysUntilRenewal <= 7 && p.daysUntilRenewal >= 0);
  }, [recurringPayments]);

  const getTypeIcon = (type: RecurringPayment['type']) => {
    switch (type) {
      case 'subscription': return '📱';
      case 'emi': return '💳';
      case 'utility': return '🏠';
    }
  };

  const getTypeColor = (type: RecurringPayment['type']) => {
    switch (type) {
      case 'subscription': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'emi': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'utility': return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getFrequencyLabel = (freq: RecurringPayment['frequency']) => {
    switch (freq) {
      case 'weekly': return '/week';
      case 'monthly': return '/month';
      case 'quarterly': return '/quarter';
      case 'yearly': return '/year';
    }
  };

  if (debits.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            🔄 Recurring Payment Finder
          </h2>
          <p className="text-sm text-gray-500 mt-1">Auto-detected subscriptions, EMIs & utilities</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Yearly Total</p>
          <p className="text-2xl font-bold text-gray-900">
            {CURRENCY_SYMBOL}{totals.grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
          <div className="flex items-center gap-2 mb-1">
            <span>📱</span>
            <span className="text-xs font-medium text-purple-700 uppercase">Subscriptions</span>
          </div>
          <p className="text-lg font-bold text-purple-900">
            {CURRENCY_SYMBOL}{totals.subscriptionTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr
          </p>
          <p className="text-xs text-purple-600">
            {recurringPayments.filter(p => p.type === 'subscription').length} detected
          </p>
        </div>

        <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
          <div className="flex items-center gap-2 mb-1">
            <span>💳</span>
            <span className="text-xs font-medium text-amber-700 uppercase">EMIs</span>
          </div>
          <p className="text-lg font-bold text-amber-900">
            {CURRENCY_SYMBOL}{totals.emiTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr
          </p>
          <p className="text-xs text-amber-600">
            {recurringPayments.filter(p => p.type === 'emi').length} detected
          </p>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
          <div className="flex items-center gap-2 mb-1">
            <span>🏠</span>
            <span className="text-xs font-medium text-blue-700 uppercase">Utilities</span>
          </div>
          <p className="text-lg font-bold text-blue-900">
            {CURRENCY_SYMBOL}{totals.utilityTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr
          </p>
          <p className="text-xs text-blue-600">
            {recurringPayments.filter(p => p.type === 'utility').length} detected
          </p>
        </div>
      </div>

      {/* Upcoming Renewals Alert */}
      {upcomingRenewals.length > 0 && (
        <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-orange-900 flex items-center gap-2 mb-2">
            ⏰ Upcoming Renewals (Next 7 Days)
          </h3>
          <div className="flex flex-wrap gap-2">
            {upcomingRenewals.map(p => (
              <div
                key={p.id}
                className="inline-flex items-center gap-2 bg-white/80 px-3 py-1.5 rounded-full text-sm border border-orange-200"
              >
                <span>{getTypeIcon(p.type)}</span>
                <span className="font-medium text-gray-900">{p.merchant}</span>
                <span className="text-orange-600 font-semibold">
                  {CURRENCY_SYMBOL}{p.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
                <span className="text-xs text-gray-500">
                  {p.daysUntilRenewal === 0 ? 'Today' :
                   p.daysUntilRenewal === 1 ? 'Tomorrow' :
                   `in ${p.daysUntilRenewal} days`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        {(['all', 'subscription', 'emi', 'utility'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab === 'all' ? 'All' :
             tab === 'subscription' ? '📱 Subscriptions' :
             tab === 'emi' ? '💳 EMIs' : '🏠 Utilities'}
          </button>
        ))}
      </div>

      {/* Payments List */}
      {filteredPayments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <span className="text-4xl mb-2 block">🔍</span>
          <p>No {activeTab === 'all' ? 'recurring payments' : activeTab + 's'} detected.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {filteredPayments.map(payment => (
            <div
              key={payment.id}
              className="flex items-center justify-between p-4 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${getTypeColor(payment.type)}`}>
                  <span className="text-xl">{getTypeIcon(payment.type)}</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{payment.merchant}</h4>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className={`px-1.5 py-0.5 rounded border ${getTypeColor(payment.type)}`}>
                      {payment.type}
                    </span>
                    <span>•</span>
                    <span>{payment.occurrences} payments found</span>
                    <span>•</span>
                    <span>{payment.category}</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <p className="font-bold text-gray-900">
                  {CURRENCY_SYMBOL}{payment.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  <span className="text-xs font-normal text-gray-500 ml-1">
                    {getFrequencyLabel(payment.frequency)}
                  </span>
                </p>
                <p className="text-xs text-gray-500">
                  Next: {new Date(payment.nextRenewalDate).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric'
                  })}
                  {payment.daysUntilRenewal <= 3 && (
                    <span className="ml-1 text-orange-600 font-medium">
                      ({payment.daysUntilRenewal === 0 ? 'Today!' :
                        payment.daysUntilRenewal === 1 ? 'Tomorrow' :
                        `${payment.daysUntilRenewal} days`})
                    </span>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Yearly Breakdown Footer */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Total yearly recurring expenses
          </span>
          <span className="text-lg font-bold text-gray-900">
            {CURRENCY_SYMBOL}{totals.grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}/year
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          That's {CURRENCY_SYMBOL}{(totals.grandTotal / 12).toLocaleString(undefined, { maximumFractionDigits: 0 })}/month in recurring charges
        </p>
      </div>
    </div>
  );
};
