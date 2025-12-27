import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, KPIStats } from '../types';
import { Card, KPICard } from './ui/Card';
import { TransactionTable } from './TransactionTable';
import { SpendTreemap, WeeklyRadar, AnomalyScatter } from './charts/StandardCharts';
import { CalendarHeatmap } from './charts/D3Charts';
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
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

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

    return {
      totalSpend,
      burnRate: totalSpend / 30, // Approx for demo
      largestTx: sortedByAmt[0],
      topCategory: {
        name: topCatName,
        percentage: (topCatVal / totalSpend) * 100
      }
    };
  }, [data]);

  const handleAiAnalysis = async () => {
    setLoadingAi(true);
    // Send top 10 transactions for context
    const topTx = [...data].sort((a,b) => b.amount - a.amount).slice(0, 10);
    const result = await analyzeSpending(stats, topTx);
    setAiInsight(result);
    setLoadingAi(false);
  };

  return (
    <div className="min-h-screen pb-20">
      {/* HEADER */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="bg-blue-600 text-white p-1.5 rounded-lg font-bold text-lg">CC</span>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Insight Analyzer</h1>
          </div>
          <div className="flex items-center gap-4">
             <button
              onClick={onReset}
              className="text-sm font-medium text-gray-500 hover:text-gray-900"
            >
              Upload New
            </button>
            <button
              onClick={() => exportToCSV(data)}
              className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm"
            >
              Export Report
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* SECTION 1: AI INSIGHT & KPI */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">

          {/* LEFT: KPIS */}
          <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard
              label="Total Spend"
              value={`${CURRENCY_SYMBOL}${stats.totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              subValue="+12% vs last mo"
              trend="up"
            />
             <KPICard
              label="Burn Rate / Day"
              value={`${CURRENCY_SYMBOL}${stats.burnRate.toFixed(0)}`}
              subValue="High Velocity"
              trend="up"
            />
             <KPICard
              label="Whale Tx"
              value={`${CURRENCY_SYMBOL}${stats.largestTx.amount.toFixed(0)}`}
              subValue={stats.largestTx.merchant}
              trend="neutral"
            />
             <KPICard
              label="Top Category"
              value={`${stats.topCategory.percentage.toFixed(0)}%`}
              subValue={stats.topCategory.name}
              trend="down"
            />
          </div>

          {/* RIGHT: AI ACTION */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-5 text-white h-full flex flex-col justify-between shadow-lg">
              <div>
                <h3 className="font-bold text-lg mb-1">Financial Copilot</h3>
                <p className="text-indigo-100 text-sm mb-4">Get AI-driven insights on your spending patterns.</p>
              </div>
              <button
                onClick={handleAiAnalysis}
                disabled={loadingAi}
                className="w-full bg-white text-indigo-700 font-semibold py-2 px-4 rounded-lg text-sm hover:bg-indigo-50 transition-colors disabled:opacity-70 flex justify-center items-center"
              >
                {loadingAi ? (
                  <span className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mr-2"></span>
                ) : (
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                )}
                {loadingAi ? 'Analyzing...' : 'Generate Insight'}
              </button>
            </div>
          </div>
        </div>

        {/* AI RESULT DRAWER (Conditional) */}
        {aiInsight && (
           <div className="mb-8 bg-white border border-indigo-100 rounded-xl p-6 shadow-sm ring-1 ring-indigo-50 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-purple-500"></div>
              <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <span className="text-xl">✨</span> Analysis Results
                  </h3>
                  <button onClick={() => setAiInsight(null)} className="text-gray-400 hover:text-gray-600">×</button>
              </div>
              <div className="prose prose-sm max-w-none text-gray-600 prose-headings:font-bold prose-headings:text-gray-800">
                <ReactMarkdown>{aiInsight}</ReactMarkdown>
              </div>
           </div>
        )}

        {/* SECTION 2: CHARTS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 h-[500px] lg:h-[400px]">
          {/* MAIN CHART: TREEMAP */}
          <Card title="Category Concentration" className="lg:col-span-2 min-h-[300px]">
            <SpendTreemap data={data} />
          </Card>

          {/* SECONDARY: RADAR */}
          <Card title="Weekly Spending Habits" className="min-h-[300px]">
            <WeeklyRadar data={data} />
          </Card>
        </div>

        {/* SECTION 3: TIME & ANOMALIES */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
           <Card title="Spending Intensity (Heatmap)" className="h-64">
              <CalendarHeatmap data={data} />
           </Card>
           <Card title="Anomaly Detection (Outliers)" className="h-64">
              <AnomalyScatter data={data} />
           </Card>
        </div>

        {/* SECTION 4: DATA TABLE */}
        <Card title="Transaction Ledger">
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
                <TransactionTable transactions={data} />
            </div>
        </Card>

      </main>
    </div>
  );
};
