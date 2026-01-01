import React, { useMemo } from 'react';
import { Transaction } from '../types';

const CURRENCY_SYMBOL = '₹';

interface RiskLeakageDetectionProps {
  data: Transaction[];
}

interface RiskAlert {
  id: string;
  type: 'duplicate' | 'late_fee' | 'high_value' | 'foreign' | 'suspicious' | 'interest';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  amount?: number;
  transactions?: Transaction[];
  recommendation?: string;
}

// Keywords for detecting fees and charges
const LATE_FEE_KEYWORDS = ['late fee', 'late payment', 'penalty', 'overdue', 'delayed payment'];
const INTEREST_KEYWORDS = ['interest', 'finance charge', 'interest charge', 'revolving'];
const FOREIGN_KEYWORDS = ['forex', 'foreign', 'international', 'currency conversion', 'cross border'];

export const RiskLeakageDetection: React.FC<RiskLeakageDetectionProps> = ({ data }) => {
  // Filter expenses only (positive amounts = money spent, negative = credits/refunds)
  const debits = useMemo(() => data.filter(t => t.amount > 0), [data]);

  // Detect all risks
  const risks = useMemo(() => {
    const alerts: RiskAlert[] = [];

    // 1. Duplicate Charges Detection
    const txByKey = new Map<string, Transaction[]>();
    debits.forEach(t => {
      // Key: same merchant + same amount (dates checked separately)
      const key = `${t.merchant.toLowerCase()}_${t.amount.toFixed(2)}`;
      const existing = txByKey.get(key) || [];
      existing.push(t);
      txByKey.set(key, existing);
    });

    txByKey.forEach((transactions, key) => {
      if (transactions.length >= 2) {
        // Check if they're on the same day or consecutive days
        const dates = transactions.map(t => new Date(t.date).getTime()).sort();
        const minDate = dates[0];
        const maxDate = dates[dates.length - 1];
        const samePeriod = (maxDate - minDate) <= 2 * 24 * 60 * 60 * 1000; // all within 2 days

        if (samePeriod) {
          const totalAmount = transactions.reduce((acc, t) => acc + t.amount, 0);
          alerts.push({
            id: `dup_${key}`,
            type: 'duplicate',
            severity: 'high',
            title: 'Potential Duplicate Charge',
            description: `${transactions.length} identical charges of ${CURRENCY_SYMBOL}${transactions[0].amount.toFixed(2)} at ${transactions[0].merchant}`,
            amount: totalAmount,
            transactions,
            recommendation: 'Verify with your bank if these are legitimate charges.'
          });
        }
      }
    });

    // 2. Late Fee & Interest Detection
    const lateFees: Transaction[] = [];
    const interestCharges: Transaction[] = [];

    debits.forEach(t => {
      const merchantLower = t.merchant.toLowerCase();
      const categoryLower = t.category.toLowerCase();

      if (LATE_FEE_KEYWORDS.some(kw => merchantLower.includes(kw) || categoryLower.includes(kw))) {
        lateFees.push(t);
      }
      if (INTEREST_KEYWORDS.some(kw => merchantLower.includes(kw) || categoryLower.includes(kw))) {
        interestCharges.push(t);
      }
    });

    if (lateFees.length > 0) {
      const totalLateFees = lateFees.reduce((acc, t) => acc + t.amount, 0);
      alerts.push({
        id: 'late_fees',
        type: 'late_fee',
        severity: 'critical',
        title: `${lateFees.length} Late Payment Fee(s) Detected`,
        description: `You've been charged ${CURRENCY_SYMBOL}${totalLateFees.toFixed(2)} in late fees.`,
        amount: totalLateFees,
        transactions: lateFees,
        recommendation: 'Set up autopay to avoid future late fees.'
      });
    }

    if (interestCharges.length > 0) {
      const totalInterest = interestCharges.reduce((acc, t) => acc + t.amount, 0);
      alerts.push({
        id: 'interest',
        type: 'interest',
        severity: 'high',
        title: `${interestCharges.length} Interest Charge(s) Detected`,
        description: `${CURRENCY_SYMBOL}${totalInterest.toFixed(2)} paid in interest charges.`,
        amount: totalInterest,
        transactions: interestCharges,
        recommendation: 'Pay full balance each month to avoid interest.'
      });
    }

    // 3. High-Value Transaction Detection
    const amounts = debits.map(t => t.amount);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = Math.sqrt(amounts.reduce((sum, a) => sum + Math.pow(a - avgAmount, 2), 0) / amounts.length);
    const threshold = avgAmount + 2 * stdDev;

    const highValueTx = debits.filter(t => t.amount > threshold || t.amount > 10000);
    if (highValueTx.length > 0) {
      alerts.push({
        id: 'high_value',
        type: 'high_value',
        severity: 'medium',
        title: `${highValueTx.length} High-Value Transaction(s)`,
        description: `Transactions significantly above your average of ${CURRENCY_SYMBOL}${avgAmount.toFixed(0)}`,
        transactions: highValueTx.slice(0, 5),
        recommendation: 'Review these charges to ensure they are legitimate.'
      });
    }

    // 4. Foreign Transaction Detection
    const foreignTx = debits.filter(t =>
      FOREIGN_KEYWORDS.some(kw =>
        t.merchant.toLowerCase().includes(kw) ||
        t.category.toLowerCase().includes(kw)
      )
    );

    if (foreignTx.length > 0) {
      const totalForeign = foreignTx.reduce((acc, t) => acc + t.amount, 0);
      // Estimate 3.5% forex markup
      const estimatedSurcharge = totalForeign * 0.035;
      alerts.push({
        id: 'foreign',
        type: 'foreign',
        severity: 'low',
        title: `${foreignTx.length} Foreign Transaction(s)`,
        description: `Estimated forex surcharge: ${CURRENCY_SYMBOL}${estimatedSurcharge.toFixed(2)} (3.5%)`,
        amount: estimatedSurcharge,
        transactions: foreignTx,
        recommendation: 'Use a card with no forex markup for international purchases.'
      });
    }

    // 5. Suspicious New Merchant Pattern
    const merchantFirstSeen = new Map<string, string>();
    const sortedDebits = [...debits].sort((a, b) => a.date.localeCompare(b.date));

    sortedDebits.forEach(t => {
      const key = t.merchant.toLowerCase();
      if (!merchantFirstSeen.has(key)) {
        merchantFirstSeen.set(key, t.date);
      }
    });

    // Find merchants that appeared in the last 30 days with high amounts
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const newHighSpendMerchants: { merchant: string; total: number; firstSeen: string }[] = [];
    const merchantTotals = new Map<string, number>();

    debits.forEach(t => {
      const key = t.merchant.toLowerCase();
      merchantTotals.set(key, (merchantTotals.get(key) || 0) + t.amount);
    });

    merchantFirstSeen.forEach((firstDate, merchant) => {
      if (new Date(firstDate) >= thirtyDaysAgo) {
        const total = merchantTotals.get(merchant) || 0;
        if (total > avgAmount * 3) { // More than 3x average transaction
          newHighSpendMerchants.push({
            merchant: merchant.charAt(0).toUpperCase() + merchant.slice(1),
            total,
            firstSeen: firstDate
          });
        }
      }
    });

    if (newHighSpendMerchants.length > 0) {
      alerts.push({
        id: 'suspicious_new',
        type: 'suspicious',
        severity: 'medium',
        title: 'New High-Spend Merchant(s) Detected',
        description: `${newHighSpendMerchants.length} new merchant(s) with unusual spending in the last 30 days.`,
        recommendation: 'Verify these are legitimate purchases you made.'
      });
    }

    return alerts.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }, [debits]);

  const getSeverityStyle = (severity: RiskAlert['severity']) => {
    switch (severity) {
      case 'critical': return { bg: 'bg-red-50 dark:bg-red-900/10', border: 'border-red-200 dark:border-red-800/30', text: 'text-red-700 dark:text-red-300', badge: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200' };
      case 'high': return { bg: 'bg-orange-50 dark:bg-orange-900/10', border: 'border-orange-200 dark:border-orange-800/30', text: 'text-orange-700 dark:text-orange-300', badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200' };
      case 'medium': return { bg: 'bg-amber-50 dark:bg-amber-900/10', border: 'border-amber-200 dark:border-amber-800/30', text: 'text-amber-700 dark:text-amber-300', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' };
      case 'low': return { bg: 'bg-blue-50 dark:bg-blue-900/10', border: 'border-blue-200 dark:border-blue-800/30', text: 'text-blue-700 dark:text-blue-300', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200' };
    }
  };

  const getTypeIcon = (type: RiskAlert['type']) => {
    switch (type) {
      case 'duplicate': return '🔄';
      case 'late_fee': return '⏰';
      case 'interest': return '💸';
      case 'high_value': return '💰';
      case 'foreign': return '🌍';
      case 'suspicious': return '🚨';
    }
  };

  // Calculate total leakage
  const totalLeakage = useMemo(() => {
    return risks
      .filter(r => r.amount && (r.type === 'late_fee' || r.type === 'interest' || r.type === 'foreign'))
      .reduce((acc, r) => acc + (r.amount || 0), 0);
  }, [risks]);

  if (data.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            🛡️ High-Risk & Leakage Detection
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Financial red flags and money leakage alerts</p>
        </div>
        {totalLeakage > 0 && (
          <div className="text-right">
            <p className="text-xs text-red-500 uppercase tracking-wide">Potential Leakage</p>
            <p className="text-2xl font-bold text-red-600">
              {CURRENCY_SYMBOL}{totalLeakage.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className={`rounded-lg p-3 text-center ${risks.some(r => r.severity === 'critical') ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            {risks.filter(r => r.severity === 'critical').length}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Critical</p>
        </div>
        <div className={`rounded-lg p-3 text-center ${risks.some(r => r.severity === 'high') ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {risks.filter(r => r.severity === 'high').length}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">High</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {risks.filter(r => r.severity === 'medium').length}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Medium</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {risks.filter(r => r.severity === 'low').length}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Low</p>
        </div>
      </div>

      {/* Risk Alerts */}
      {risks.length === 0 ? (
        <div className="text-center py-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
          <span className="text-4xl mb-3 block">✅</span>
          <p className="font-semibold text-emerald-800 dark:text-emerald-300">All Clear!</p>
          <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">No financial red flags detected in your transactions.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {risks.map(risk => {
            const style = getSeverityStyle(risk.severity);
            return (
              <div
                key={risk.id}
                className={`rounded-lg p-4 border ${style.bg} ${style.border}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{getTypeIcon(risk.type)}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={`font-semibold ${style.text}`}>{risk.title}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.badge}`}>
                        {risk.severity.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{risk.description}</p>

                    {risk.amount && risk.amount > 0 && (
                      <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                        Amount: {CURRENCY_SYMBOL}{risk.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </p>
                    )}

                    {risk.transactions && risk.transactions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {risk.transactions.slice(0, 3).map((t, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-1 bg-white/70 dark:bg-black/20 text-gray-700 dark:text-gray-300 rounded border border-gray-200 dark:border-gray-600"
                          >
                            {t.merchant} - {CURRENCY_SYMBOL}{t.amount.toFixed(0)} ({t.date})
                          </span>
                        ))}
                        {risk.transactions.length > 3 && (
                          <span className="text-xs px-2 py-1 text-gray-500">
                            +{risk.transactions.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {risk.recommendation && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 flex items-center gap-1">
                        <span>💡</span>
                        <strong>Tip:</strong> {risk.recommendation}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Summary */}
      {risks.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-semibold">{risks.length} issue(s)</span> detected.
            Review and address high-severity items to protect your finances.
          </p>
        </div>
      )}
    </div>
  );
};
