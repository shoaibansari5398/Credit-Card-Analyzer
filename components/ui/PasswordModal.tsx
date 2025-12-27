import React, { useState, useEffect, useRef } from 'react';

interface PasswordModalProps {
  isOpen: boolean;
  fileName: string;
  onSubmit: (password: string) => void;
  onCancel: () => void;
  error?: string | null;
  isLoading?: boolean;
}

export const PasswordModal: React.FC<PasswordModalProps> = ({
  isOpen,
  fileName,
  onSubmit,
  onCancel,
  error,
  isLoading = false
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && !isLoading) {
      setPassword('');
      setProgress(0);
      // Focus input when modal opens
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isLoading]);

  // Simulate progress when loading
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) return prev;
          // Vary the increment for realism
          const increment = Math.random() * 5 + 1;
          return Math.min(prev + increment, 95);
        });
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      onSubmit(password);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500/75 transition-opacity"
          aria-hidden="true"
          onClick={!isLoading ? onCancel : undefined}
        ></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6 animate-scale-in">
          <div className="sm:flex sm:items-start">
            <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${isLoading ? 'bg-blue-100' : 'bg-emerald-100'} sm:mx-0 sm:h-10 sm:w-10 mb-4 sm:mb-0`}>
              {isLoading ? (
                  <svg className="h-6 w-6 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
              ) : (
                  <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
              )}
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
              <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                {isLoading ? 'Unlocking & Analyzing...' : 'Password Protected PDF'}
              </h3>

              {isLoading ? (
                  <div className="mt-4">
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                        <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                          <span>Processing content...</span>
                          <span className="font-semibold text-gray-700">{Math.round(progress)}%</span>
                      </div>
                  </div>
              ) : (
                <div className="mt-2">
                    <p className="text-sm text-gray-500">
                    The file <span className="font-semibold text-gray-700">{fileName}</span> is encrypted. Please enter the password to unlock and analyze it.
                    </p>

                    {error && (
                        <div className="mt-3 mb-1 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-xs font-medium">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="mt-4">
                    <div className="relative rounded-md shadow-sm">
                        <input
                        ref={inputRef}
                        type={showPassword ? "text" : "password"}
                        className="block w-full pr-10 border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm py-2 px-3 border"
                        placeholder="Enter PDF password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        />
                        <button
                        type="button"
                        className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600"
                        onClick={() => setShowPassword(!showPassword)}
                        >
                        {showPassword ? (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                        ) : (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        )}
                        </button>
                    </div>

                    <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                        <button
                        type="submit"
                        disabled={!password}
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-emerald-600 text-base font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                        Unlock Statement
                        </button>
                        <button
                        type="button"
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 sm:mt-0 sm:w-auto sm:text-sm"
                        onClick={onCancel}
                        >
                        Cancel
                        </button>
                    </div>
                    </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
