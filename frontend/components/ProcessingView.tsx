import React from 'react';

interface ProcessingViewProps {
  progress: {
    current: number;
    total: number;
    fileName: string;
  };
}

export const ProcessingView: React.FC<ProcessingViewProps> = ({ progress }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-emerald-500 mb-4"></div>
      <p className="text-xl font-medium text-gray-700 dark:text-gray-300">Analyzing your finances...</p>
      {progress.total > 0 && (
        <div className="mt-4 text-center">
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
            Processing file {progress.current} of {progress.total}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs truncate">
            {progress.fileName}
          </p>
          <div className="w-64 h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">Connecting to AI models...</p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">This might take up to 30 seconds per file</p>
    </div>
  );
};
