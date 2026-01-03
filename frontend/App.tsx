import React, { useState, useRef, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { Transaction } from './types';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { UploadZone } from './components/UploadZone';
import { ProcessingView } from './components/ProcessingView';
import { parseStatementFile } from './services/parsingService';
import { generateMockData } from './utils/mockData';
import { PasswordModal } from './components/ui/PasswordModal';

const API_TIMEOUT_MS = 60000; // 60 seconds

export const App: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Password Handling State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Multi-file processing state
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0, fileName: '' });
  const [skippedFiles, setSkippedFiles] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Store files and password for processing
  const pendingFilesRef = useRef<File[]>([]);
  const storedPasswordRef = useRef<string>('');

  // Auto-reset if processing takes too long (60 seconds)
  useEffect(() => {
    if (!isProcessing) return;

    const timeoutId = setTimeout(() => {
      console.warn('Processing timeout - resetting UI');
      setIsProcessing(false);
      setError('Request timed out. Please try again.');
      setProcessingProgress({ current: 0, total: 0, fileName: '' });
      navigate('/upload');
    }, API_TIMEOUT_MS);

    return () => clearTimeout(timeoutId);
  }, [isProcessing, navigate]);

  const processFilesWithPassword = async (files: File[], password: string) => {
    setIsProcessing(true);
    navigate('/processing');
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
    setIsProcessing(false);

    if (allTransactions.length === 0) {
      setError("No transactions found in any of the uploaded files.");
      navigate('/upload');
      return;
    }

    setData(allTransactions);
    navigate('/dashboard');
    setProcessingProgress({ current: 0, total: 0, fileName: '' });
  };

  const handleFilesSelect = async (files: File[]) => {
    setSkippedFiles([]);
    setIsProcessing(true);
    navigate('/processing');
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
      setIsProcessing(false);
      navigate('/upload');
      setIsPasswordModalOpen(true);
      setModalError(null);
      return;
    }

    setIsProcessing(false);

    // All files processed without password
    if (allTransactions.length === 0) {
      setError("No transactions found in any of the uploaded files.");
      navigate('/upload');
      return;
    }

    setData(allTransactions);
    navigate('/dashboard');
  };

  const handlePasswordSubmit = async (password: string) => {
    setIsPasswordModalOpen(false);
    storedPasswordRef.current = password;
    await processFilesWithPassword(pendingFilesRef.current, password);
  };

  const handlePasswordCancel = () => {
    setIsPasswordModalOpen(false);
    pendingFilesRef.current = [];
    navigate('/upload');
    setError("Upload cancelled - password required for some files.");
  };

  const handleUseDemoData = () => {
    const mockData = generateMockData();
    setData(mockData);
    navigate('/dashboard');
  };

  const handleReset = () => {
    setData([]);
    setError(null);
    setSkippedFiles([]);
    pendingFilesRef.current = [];
    storedPasswordRef.current = '';
    navigate('/upload');
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <Routes>
        <Route
            path="/"
            element={
                <LandingPage
                    onGetStarted={() => navigate('/upload')}
                    onUseDemo={handleUseDemoData}
                />
            }
        />
        <Route
            path="/upload"
            element={<UploadZone onFileSelect={handleFilesSelect} />}
        />
        <Route
            path="/processing"
            element={<ProcessingView progress={processingProgress} />}
        />
        <Route
            path="/dashboard"
            element={<Dashboard data={data} onReset={handleReset} />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Password Modal */}
      <PasswordModal
        isOpen={isPasswordModalOpen}
        fileName={pendingFilesRef.current.length > 1
          ? `${pendingFilesRef.current.length} files`
          : pendingFilesRef.current[0]?.name || 'File'}
        onSubmit={handlePasswordSubmit}
        onCancel={handlePasswordCancel}
        error={modalError}
        isLoading={isProcessing}
      />

      {/* Skipped Files Warning - Show only on Dashboard */}
      {skippedFiles.length > 0 && (
        <div className="fixed bottom-4 left-4 bg-amber-50 border-l-4 border-amber-500 text-amber-800 p-4 rounded shadow-lg max-w-md z-50">
          <p className="font-bold mb-1">Some files were skipped</p>
          <ul className="text-sm">
            {skippedFiles.map((f, i) => <li key={i}>• {f}</li>)}
          </ul>
          <button onClick={() => setSkippedFiles([])} className="absolute top-2 right-2 text-amber-700 hover:text-amber-900 text-lg">×</button>
        </div>
      )}

      {/* Global Error Toast */}
      {error && !isPasswordModalOpen && (
          <div className="fixed bottom-4 right-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-lg max-w-md animate-slide-up z-50">
            <p className="font-bold">Error</p>
            <p>{error}</p>
            <button onClick={() => setError(null)} className="absolute top-2 right-2 text-red-700 hover:text-red-900">×</button>
          </div>
      )}
    </div>
  );
};
