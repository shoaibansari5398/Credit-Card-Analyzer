import React, { useState, useRef, useEffect } from 'react';

interface UploadZoneProps {
  onFileSelect: (file: File, password?: string) => void;
  isProcessing: boolean;
  error?: string | null;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onFileSelect, isProcessing, error }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clear password when file changes
  useEffect(() => {
    setPassword('');
    setShowPassword(false);
  }, [selectedFile]);

  const processFile = (file: File, pwd: string) => {
    setSelectedFile(file);
    // Do NOT trim password to allow for spaces if they are part of the password
    onFileSelect(file, pwd);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0], password);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0], password);
    }
    // Reset input so same file can be selected again if needed
    if (e.target) e.target.value = '';
  };

  const handleManualRetry = () => {
    if (selectedFile) {
      // Do NOT trim password
      onFileSelect(selectedFile, password);
    }
  };

  const handlePasswordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleManualRetry();
    }
  };

  const handleChangeFile = () => {
    setSelectedFile(null);
    setPassword('');
    // Slight delay to ensure UI updates before click
    setTimeout(() => fileInputRef.current?.click(), 50);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-2xl mx-auto px-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Credit Card Insight Analyzer</h1>
        <p className="text-gray-600">Securely analyze your spending habits. Upload a PDF statement or CSV.</p>
      </div>

      <div
        className={`w-full transition-all duration-200 bg-white ${
          !selectedFile ? 'p-10 border-2 border-dashed rounded-2xl cursor-pointer' : 'p-8 border border-gray-200 rounded-xl shadow-sm'
        } ${
          isDragOver ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-100' : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={(e) => {
          if (!selectedFile) {
            e.preventDefault();
            setIsDragOver(true);
          }
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={!selectedFile ? handleDrop : undefined}
        onClick={!selectedFile ? () => fileInputRef.current?.click() : undefined}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".csv,.pdf,image/*"
          onChange={handleFileChange}
        />

        {isProcessing ? (
          <div className="flex flex-col items-center py-8">
            <div className="h-12 w-12 bg-blue-200 rounded-full mb-4 flex items-center justify-center relative">
               <svg className="animate-spin h-6 w-6 text-blue-600 relative z-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
            </div>
            <div className="text-lg font-medium text-gray-700">AI is analyzing...</div>
            <div className="text-sm text-gray-500 mt-2">Decrypting & parsing transactions</div>
          </div>
        ) : !selectedFile ? (
          <div className="flex flex-col items-center justify-center">
            <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg font-medium text-gray-700 mb-1">Drop your Statement (PDF/CSV)</p>
            <p className="text-sm text-gray-500">or click to browse files</p>

            {error && (
              <div className="mt-6 mb-2 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2 rounded-lg max-w-md">
                {error}
              </div>
            )}

            <div className="mt-8 flex gap-4 text-xs text-gray-400">
               <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400"></span> Gemini 2.5 AI</span>
               <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400"></span> Bank Agnostic</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center w-full">
             <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center mb-4 text-red-600">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/></svg>
             </div>
             <h3 className="font-semibold text-gray-900 text-lg mb-1">{selectedFile.name}</h3>
             <p className="text-sm text-gray-500 mb-6">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>

             <div className="w-full max-w-sm space-y-4">

                {error && !error.toLowerCase().includes('password') && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-lg">
                    <div className="flex items-start gap-2 mb-2">
                       <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                       <span className="font-medium">Upload Error</span>
                    </div>
                    <p className="ml-7 text-xs text-red-600 leading-relaxed">
                       {error}
                    </p>
                  </div>
                )}

                <div>
                  <label htmlFor="pdf-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password (if protected)
                  </label>
                  <div className="relative">
                    <input
                      id="pdf-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={handlePasswordKeyDown}
                      placeholder="Enter PDF password"
                      style={{ colorScheme: 'light' }}
                      className="block w-full rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-4 py-3 pr-10 appearance-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showPassword ? (
                         <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                         </svg>
                      ) : (
                         <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                         </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3">
                   <button
                    onClick={handleChangeFile}
                    className="flex-1 py-2.5 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                   >
                     Change File
                   </button>
                   <button
                    onClick={handleManualRetry}
                    className="flex-1 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                   >
                     Analyze Statement
                   </button>
                </div>
             </div>
          </div>
        )}
      </div>

      {!selectedFile && !isProcessing && (
        <div className="mt-6 w-full max-w-xs">
          <div className="text-center">
            <p className="text-xs text-gray-400">Supported formats: CSV, PDF, Images</p>
          </div>
        </div>
      )}
    </div>
  );
};
