import React, { useMemo } from 'react';
import { Transaction } from '../types';
import { CURRENCY_SYMBOL } from '../config/constants';

interface AlertsAnomaliesProps {
  data: Transaction[];
}

interface Alert {
  id: string;
  type: 'anomaly' | 'warning' | 'info';
  icon: string;
  title: string;
  description: string;
  amount?: number;
  date?: string;
}

export const AlertsAnomalies: React.FC<AlertsAnomaliesProps> = ({ data }) => {
  // Filter expenses only (positive amounts = money spent, negative = credits/refunds)
  const expenses = useMemo(() => data.filter(t => t.amount > 0), [data]);

  // Detect anomalies and generate alerts
  const alerts = useMemo(() => {
    if (expenses.length === 0) return [];

    const result: Alert[] = [];
    const amounts = expenses.map(t => t.amount);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = Math.sqrt(amounts.reduce((sum, a) => sum + Math.pow(a - avgAmount, 2), 0) / amounts.length);
    const threshold = avgAmount + 2 * stdDev;

    // 1. Outlier Transactions (> 2 std dev)
    const outliers = expenses.filter(t => t.amount > threshold);
    outliers.slice(0, 3).forEach((t, i) => {
      result.push({
        id: `outlier-${i}`,
        type: 'anomaly',
        icon: '⚠️',
        title: 'Unusually Large Transaction',
        description: `${t.merchant} - This transaction is ${((t.amount / avgAmount - 1) * 100).toFixed(0)}% above your average.`,
        amount: t.amount,
        date: t.date
      });
    });

    // 2. Spending Spikes (Month-over-Month)
    const monthMap = new Map<string, number>();
    expenses.forEach(t => {
      const month = t.date.substring(0, 7);
      monthMap.set(month, (monthMap.get(month) || 0) + t.amount);
    });

    const monthlyAmounts = Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]));

    for (let i = 1; i < monthlyAmounts.length; i++) {
      const [prevMonth, prevAmount] = monthlyAmounts[i - 1];
      const [currMonth, currAmount] = monthlyAmounts[i];

      if (currAmount > prevAmount * 1.5) {
        const [year, mon] = currMonth.split('-');
        const date = new Date(parseInt(year), parseInt(mon) - 1);
        result.push({
          id: `spike-${currMonth}`,
          type: 'warning',
          icon: '📈',
          title: 'Spending Spike Detected',
          description: `${date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })} spending was ${((currAmount / prevAmount - 1) * 100).toFixed(0)}% higher than the previous month.`,
          amount: currAmount
        });
      }
    }

    // 3. Category Concentration Warning
    const catMap = new Map<string, number>();
    const totalSpend = expenses.reduce((acc, t) => acc + t.amount, 0);
    expenses.forEach(t => catMap.set(t.category, (catMap.get(t.category) || 0) + t.amount));

    catMap.forEach((amount, category) => {
      const percentage = (amount / totalSpend) * 100;
      if (percentage > 40) {
        result.push({
          id: `cat-${category}`,
          type: 'warning',
          icon: '🎯',
          title: 'High Category Concentration',
          description: `${category} represents ${percentage.toFixed(0)}% of your total spending. Consider diversifying.`,
          amount
        });
      }
    });

    // 4. Weekend Overspend
    const weekendSpend = expenses
      .filter(t => {
        const day = new Date(t.date).getDay();
        return day === 0 || day === 6;
      })
      .reduce((acc, t) => acc + t.amount, 0);

    if (weekendSpend > totalSpend * 0.4) {
      result.push({
        id: 'weekend',
        type: 'info',
        icon: '🎉',
        title: 'Weekend Heavy Spender',
        description: `${((weekendSpend / totalSpend) * 100).toFixed(0)}% of your spending happens on weekends. Plan weekend budgets carefully.`,
        amount: weekendSpend
      });
    }

    // 5. Frequent Small Transactions
    const smallTx = expenses.filter(t => t.amount < 200);
    if (smallTx.length > expenses.length * 0.4) {
      const smallTotal = smallTx.reduce((acc, t) => acc + t.amount, 0);
      result.push({
        id: 'small-tx',
        type: 'info',
        icon: '💸',
        title: 'Many Small Transactions',
        description: `${smallTx.length} transactions under ₹200 totaling ${CURRENCY_SYMBOL}${smallTotal.toLocaleString()}. These add up!`
      });
    }

    return result.slice(0, 6); // Limit to 6 alerts
  }, [expenses]);

  const getAlertStyle = (type: Alert['type']) => {
    switch (type) {
      case 'anomaly': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-amber-50 border-amber-200';
      case 'info': return 'bg-blue-50 border-blue-200';
    }
  };

  if (expenses.length === 0 || alerts.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
          🔔 Alerts & Anomalies
        </h2>
        <div className="text-center py-8 bg-emerald-50 rounded-lg">
          <span className="text-4xl mb-2 block">✅</span>
          <p className="font-semibold text-emerald-800">All Clear!</p>
          <p className="text-sm text-emerald-600">No unusual spending patterns detected.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            🔔 Alerts & Anomalies
          </h2>
          <p className="text-sm text-gray-500 mt-1">Notable patterns in your spending</p>
        </div>
        <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-1 rounded-full">
          {alerts.length} Alert{alerts.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {alerts.map(alert => (
          <div
            key={alert.id}
            className={`p-4 rounded-lg border ${getAlertStyle(alert.type)}`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{alert.icon}</span>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{alert.title}</h4>
                <p className="text-sm text-gray-600 mt-0.5">{alert.description}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  {alert.amount && (
                    <span className="font-medium">
                      {CURRENCY_SYMBOL}{alert.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  )}
                  {alert.date && (
                    <span>{new Date(alert.date).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
