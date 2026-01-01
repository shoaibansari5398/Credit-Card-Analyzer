import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Transaction, KPIStats } from '../types';
import { Card, KPICard } from './ui/Card';
import { TransactionTable } from './TransactionTable';
import { WeeklyRadar } from './charts/StandardCharts';

import { CalendarHeatmap } from './charts/D3Charts';
import { ThemeToggle } from './ui/ThemeToggle';

// Core components (non-redundant)
import { MonthlyTrendGraph } from './MonthlyTrendGraph';
import { CategoryDistribution } from './CategoryDistribution';
import { MerchantBreakdown } from './MerchantBreakdown';
import { RiskLeakageDetection } from './RiskLeakageDetection';
import { SavingSuggestions } from './SavingSuggestions';
import { CategoryDeepDrill } from './CategoryDeepDrill';
import { CreditUtilization } from './CreditUtilization';
import { YearlySummary } from './YearlySummary';

import { analyzeSpending } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { exportToCSV } from '../utils/exportUtils';

// Currency symbol - change this for different regions (e.g., '₹', '€', '£')
const CURRENCY_SYMBOL = '₹';

interface DashboardProps {
  data: Transaction[];
  onReset: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ data, onReset }) => {
  const navigate = useNavigate();
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // --- STATS CALCULATION ---
  const stats: KPIStats = useMemo(() => {
    const totalSpend = data.reduce((acc, curr) => curr.amount > 0 ? acc + curr.amount : acc, 0);
    const sortedByAmt = [...data].sort((a, b) => b.amount - a.amount);

    // Group by category
    const catMap = new Map<string, number>();
    data.forEach(t => catMap.set(t.category, (catMap.get(t.category) || 0) + t.amount));

    let topCatName = '';
    let topCatVal = 0;
    catMap.forEach((val, key) => {
        if (val > topCatVal) {
            topCatVal = val;
            topCatName = key;
        }
    });

    // Calculate months for burn rate
    const months = new Set(data.filter(t => t.amount > 0).map(t => t.date.substring(0, 7)));
    const monthCount = months.size || 1;

    return {
      totalSpend,
      burnRate: totalSpend / (monthCount * 30),
      largestTx: sortedByAmt[0],
      topCategory: {
        name: topCatName,
        percentage: (topCatVal / totalSpend) * 100
      }
    };
  }, [data]);

  const handleAiAnalysis = async () => {
    setLoadingAi(true);
    const topTx = [...data].sort((a,b) => b.amount - a.amount).slice(0, 10);
    const result = await analyzeSpending(stats, topTx);
    setAiInsight(result);
    setLoadingAi(false);
  };

  return (
    <div className="min-h-screen pb-20 bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* HEADER */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate('/')}
          >
            <span className="bg-emerald-500 text-white p-1.5 rounded-lg font-bold text-lg">CC</span>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Insight Analyzer</h1>
          </div>
          <div className="flex items-center gap-4">
             <ThemeToggle />
             <button
              onClick={onReset}
              className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Upload New
            </button>
            <button
              onClick={() => exportToCSV(data)}
              className="bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors shadow-sm"
            >
              Export Report
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ============================================ */}
        {/* SECTION 1: STATS SUMMARY CARDS (Quick View) */}
        {/* ============================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard
              label="Total Spend"
              value={`${CURRENCY_SYMBOL}${stats.totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              subValue="All transactions"
              trend="neutral"
            />
             <KPICard
              label="Daily Average"
              value={`${CURRENCY_SYMBOL}${stats.burnRate.toFixed(0)}`}
              subValue="Per day spend"
              trend="neutral"
            />
             <KPICard
              label="Largest Transaction"
              value={`${CURRENCY_SYMBOL}${stats.largestTx.amount.toFixed(0)}`}
              subValue={stats.largestTx.merchant}
              trend="neutral"
            />
             <KPICard
              label="Top Category"
              value={`${stats.topCategory.percentage.toFixed(0)}%`}
              subValue={stats.topCategory.name}
              trend="neutral"
            />
          </div>

          {/* AI Copilot */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-xl p-5 text-white h-full flex flex-col justify-between shadow-lg">
              <div>
                <h3 className="font-bold text-lg mb-1">💡 AI Copilot</h3>
                <p className="text-emerald-100/90 text-sm mb-4">Get AI-driven spending insights.</p>
              </div>
              <button
                onClick={handleAiAnalysis}
                disabled={loadingAi}
                className="w-full bg-white text-emerald-700 font-semibold py-2 px-4 rounded-lg text-sm hover:bg-emerald-50 transition-colors disabled:opacity-70 flex justify-center items-center"
              >
                {loadingAi ? (
                  <span className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mr-2"></span>
                ) : (
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                )}
                {loadingAi ? 'Analyzing...' : 'Generate Insight'}
              </button>
            </div>
          </div>
        </div>

        {/* AI RESULT DRAWER */}
        {aiInsight && (
            <div className="mb-8 bg-white dark:bg-gray-800 border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-6 shadow-sm ring-1 ring-emerald-50 dark:ring-emerald-900/10 relative overflow-hidden animate-slide-up">
               <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-500 to-teal-500"></div>
               <div className="flex justify-between items-start mb-4">
                   <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                     <span className="text-xl">✨</span> AI Analysis Results
                   </h3>
                   <button onClick={() => setAiInsight(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">×</button>
               </div>
               <div className="prose prose-sm max-w-none text-gray-600 dark:text-gray-300 prose-headings:font-bold prose-headings:text-gray-800 dark:prose-headings:text-gray-100 prose-strong:text-gray-800 dark:prose-strong:text-gray-100">
                 <ReactMarkdown>{aiInsight}</ReactMarkdown>
               </div>
            </div>
        )}

        {/* ================================ */}
        {/* SECTION 2: MONTHLY TREND GRAPH */}
        {/* ================================ */}
        <div className="mb-8">
          <MonthlyTrendGraph data={data} />
        </div>

        {/* ============================================ */}
        {/* SECTION 3 & 4: CATEGORY & MERCHANT (Side by Side) */}
        {/* ============================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <CategoryDistribution data={data} />
          <MerchantBreakdown data={data} />
        </div>

        {/* ================================== */}
        {/* SECTION 5: RISK & LEAKAGE DETECTION */}
        {/* ================================== */}
        <div className="mb-8">
          <RiskLeakageDetection data={data} />
        </div>

        {/* ========================= */}
        {/* SECTION 7: SAVING SUGGESTIONS */}
        {/* ========================= */}
        <div className="mb-8">
          <SavingSuggestions data={data} />
        </div>

        {/* ================================== */}
        {/* SECTION 8: ADVANCED ANALYTICS (Expandable) */}
        {/* ================================== */}
        <div className="mb-8">
            <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">📊</span>
              <div className="text-left">
                <h3 className="font-bold text-gray-900 dark:text-white">Advanced Analytics</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Deep drill into categories, credit utilization, and spending heatmaps</p>
              </div>
            </div>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showAdvanced && (
            <div className="mt-4 space-y-8">
              {/* Category Deep Drill */}
              <CategoryDeepDrill data={data} />

              {/* Credit Utilization */}
              <CreditUtilization data={data} />

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Weekly Spending Habits" className="min-h-[300px]">
                  <WeeklyRadar data={data} />
                </Card>
                <Card title="Spending Intensity (Heatmap)" className="min-h-[300px]">
                  <CalendarHeatmap data={data} />
                </Card>
              </div>
            </div>
          )}
        </div>

        {/* ======================================== */}
        {/* SECTION 9: YEARLY SUMMARY REPORT + EXPORT */}
        {/* ======================================== */}
        <div className="mb-8">
          <YearlySummary data={data} />
        </div>

        {/* TRANSACTION LEDGER */}
        <Card title="📋 Transaction Ledger">
            <div className="max-h-[512px] overflow-y-auto custom-scrollbar">
                <TransactionTable transactions={data} />
            </div>
        </Card>

      </main>
    </div>
  );
};
