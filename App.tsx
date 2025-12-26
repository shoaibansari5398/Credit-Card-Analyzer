import React, { useState } from 'react';
import { AppState, Transaction } from './types';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { parseStatementFile } from './services/parsingService';
import { generateMockData } from './utils/mockData';

export const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.UPLOAD);
  const [data, setData] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
    setState(AppState.PROCESSING);
    setError(null);
    try {
      // Pass null for password initially; backend handles detection/retry if needed
      const transactions = await parseStatementFile(file);
      if (transactions.length === 0) {
        throw new Error("No transactions found in file. Please ensure the file is clear.");
      }
      setData(transactions);
      setState(AppState.DASHBOARD);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to parse file");
      // If error occurs, we might want to show a specific error UI or revert to simplified upload
      setState(AppState.UPLOAD);
    }
  };

  const handleUseDemoData = () => {
    const mockData = generateMockData();
    setData(mockData);
    setState(AppState.DASHBOARD);
  };

  const handleReset = () => {
    setData([]);
    setError(null);
    setState(AppState.UPLOAD);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {state === AppState.DASHBOARD ? (
        <Dashboard data={data} onReset={handleReset} />
      ) : state === AppState.PROCESSING ? (
          // Simple Loading State (can be improved later)
          <div className="flex flex-col items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-emerald-500 mb-4"></div>
            <p className="text-xl font-medium text-gray-700">Analyzing your finances...</p>
            <p className="text-sm text-gray-500 mt-2">Connecting to AI models...</p>
          </div>
      ) : (
        <LandingPage
            onFileSelect={handleFileSelect}
            onUseDemo={handleUseDemoData}
        />
      )}

      {/* Global Error Toast (if needed) */}
      {error && state === AppState.UPLOAD && (
          <div className="fixed bottom-4 right-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-lg max-w-md animate-slide-up z-50">
            <p className="font-bold">Error</p>
            <p>{error}</p>
            <button onClick={() => setError(null)} className="absolute top-2 right-2 text-red-700 hover:text-red-900">×</button>
          </div>
      )}
    </div>
  );
};
