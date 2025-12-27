import React, { useState, useRef } from 'react';
import { AppState, Transaction } from './types';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { UploadZone } from './components/UploadZone';
import { parseStatementFile } from './services/parsingService';
import { generateMockData } from './utils/mockData';
import { PasswordModal } from './components/ui/PasswordModal';

export const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.LANDING);
  const [data, setData] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Password Handling State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Multi-file processing state
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0, fileName: '' });
  const [skippedFiles, setSkippedFiles] = useState<string[]>([]);

  // Store files and password for processing
  const pendingFilesRef = useRef<File[]>([]);
  const storedPasswordRef = useRef<string>('');

  const processFilesWithPassword = async (files: File[], password: string) => {
    setState(AppState.PROCESSING);
    setError(null);

    let allTransactions: Transaction[] = [];
    const skipped: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProcessingProgress({ current: i + 1, total: files.length, fileName: file.name });

      try {
        // Try with password first, then without
        const transactions = await parseStatementFile(file, password);
        allTransactions = [...allTransactions, ...transactions];
      } catch (err: any) {
        console.error(`Error processing ${file.name}:`, err);
        const msg = err.message || "Failed to parse file";

        // If password error, try without password (in case file isn't protected)
        if (msg.toLowerCase().includes('password')) {
          try {
            const transactions = await parseStatementFile(file);
            allTransactions = [...allTransactions, ...transactions];
            continue;
          } catch {
            skipped.push(`${file.name} (incorrect password)`);
            continue;
          }
        }

        skipped.push(`${file.name} (${msg})`);
      }
    }

    setSkippedFiles(skipped);
    pendingFilesRef.current = [];
    storedPasswordRef.current = '';

    if (allTransactions.length === 0) {
      setError("No transactions found in any of the uploaded files.");
      setState(AppState.UPLOAD);
      return;
    }

    setData(allTransactions);
    setState(AppState.DASHBOARD);
    setProcessingProgress({ current: 0, total: 0, fileName: '' });
  };

  const handleFilesSelect = async (files: File[]) => {
    setSkippedFiles([]);
    setState(AppState.PROCESSING);
    setError(null);

    // First, try to process all files without password
    let allTransactions: Transaction[] = [];
    let needsPassword = false;
    let firstPasswordFile = '';

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProcessingProgress({ current: i + 1, total: files.length, fileName: file.name });

      try {
        const transactions = await parseStatementFile(file);
        allTransactions = [...allTransactions, ...transactions];
      } catch (err: any) {
        const msg = err.message || "";
        if (msg.toLowerCase().includes('password')) {
          needsPassword = true;
          firstPasswordFile = file.name;
          break;
        }
        // Other error - will handle in second pass
      }
    }

    // If any file needs password, prompt once and reprocess all
    if (needsPassword) {
      pendingFilesRef.current = files;
      setState(AppState.UPLOAD);
      setIsPasswordModalOpen(true);
      setModalError(null);
      return;
    }

    // All files processed without password
    if (allTransactions.length === 0) {
      setError("No transactions found in any of the uploaded files.");
      setState(AppState.UPLOAD);
      return;
    }

    setData(allTransactions);
    setState(AppState.DASHBOARD);
  };

  const handlePasswordSubmit = async (password: string) => {
    setIsPasswordModalOpen(false);
    storedPasswordRef.current = password;
    await processFilesWithPassword(pendingFilesRef.current, password);
  };

  const handlePasswordCancel = () => {
    setIsPasswordModalOpen(false);
    pendingFilesRef.current = [];
    setState(AppState.UPLOAD);
    setError("Upload cancelled - password required for some files.");
  };

  const handleUseDemoData = () => {
    const mockData = generateMockData();
    setData(mockData);
    setState(AppState.DASHBOARD);
  };

  const handleReset = () => {
    setData([]);
    setError(null);
    setSkippedFiles([]);
    pendingFilesRef.current = [];
    storedPasswordRef.current = '';
    setState(AppState.LANDING);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {state === AppState.DASHBOARD ? (
        <Dashboard data={data} onReset={handleReset} />
      ) : state === AppState.PROCESSING ? (
          <div className="flex flex-col items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-emerald-500 mb-4"></div>
            <p className="text-xl font-medium text-gray-700">Analyzing your finances...</p>
            {processingProgress.total > 0 && (
              <div className="mt-4 text-center">
                <p className="text-sm font-medium text-emerald-600">
                  Processing file {processingProgress.current} of {processingProgress.total}
                </p>
                <p className="text-xs text-gray-500 mt-1 max-w-xs truncate">
                  {processingProgress.fileName}
                </p>
                <div className="w-64 h-2 bg-gray-200 rounded-full mt-3 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${(processingProgress.current / processingProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
            <p className="text-sm text-gray-500 mt-4">Connecting to AI models...</p>
            <p className="text-xs text-gray-400 mt-1">This might take up to 30 seconds per file</p>
          </div>
      ) : state === AppState.UPLOAD ? (
        <UploadZone onFileSelect={handleFilesSelect} />
      ) : (
        <LandingPage
            onGetStarted={() => setState(AppState.UPLOAD)}
            onUseDemo={handleUseDemoData}
        />
      )}

      {/* Password Modal */}
      <PasswordModal
        isOpen={isPasswordModalOpen}
        fileName={pendingFilesRef.current.length > 1
          ? `${pendingFilesRef.current.length} files`
          : pendingFilesRef.current[0]?.name || 'File'}
        onSubmit={handlePasswordSubmit}
        onCancel={handlePasswordCancel}
        error={modalError}
        isLoading={state === AppState.PROCESSING}
      />

      {/* Skipped Files Warning */}
      {skippedFiles.length > 0 && state === AppState.DASHBOARD && (
        <div className="fixed bottom-4 left-4 bg-amber-50 border-l-4 border-amber-500 text-amber-800 p-4 rounded shadow-lg max-w-md z-50">
          <p className="font-bold mb-1">Some files were skipped</p>
          <ul className="text-sm">
            {skippedFiles.map((f, i) => <li key={i}>• {f}</li>)}
          </ul>
          <button onClick={() => setSkippedFiles([])} className="absolute top-2 right-2 text-amber-700 hover:text-amber-900 text-lg">×</button>
        </div>
      )}

      {/* Global Error Toast */}
      {error && state === AppState.UPLOAD && !isPasswordModalOpen && (
          <div className="fixed bottom-4 right-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-lg max-w-md animate-slide-up z-50">
            <p className="font-bold">Error</p>
            <p>{error}</p>
            <button onClick={() => setError(null)} className="absolute top-2 right-2 text-red-700 hover:text-red-900">×</button>
          </div>
      )}
    </div>
  );
};
