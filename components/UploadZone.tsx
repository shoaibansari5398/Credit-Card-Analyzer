import React, { useState, useRef } from 'react';

interface UploadZoneProps {
  onFileSelect: (files: File[]) => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onFileSelect }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      setSelectedFiles(files);
      onFileSelect(files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setSelectedFiles(files);
      onFileSelect(files);
    }
    if (e.target) e.target.value = '';
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 font-sans p-4 relative overflow-hidden">
        {/* Grid Background */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.035] pointer-events-none"></div>

        <div className="relative z-10 w-full max-w-xl mx-auto">
            <div className="text-center mb-10 animate-slide-up">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-xl text-emerald-600 mb-4">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Statements</h1>
                <p className="text-gray-500">Upload one or multiple PDF statements at once.</p>
            </div>

            <div
                className={`w-full transition-all duration-300 bg-white shadow-xl ${
                isDragOver ? 'border-emerald-500 ring-4 ring-emerald-50 scale-[1.02]' : 'border-gray-100 hover:border-emerald-200 hover:shadow-2xl'
                } border-2 border-dashed rounded-3xl p-12 cursor-pointer text-center group animate-slide-up delay-100`}
                onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".csv,.pdf,image/*"
                    multiple
                    onChange={handleFileChange}
                />

                <div className="bg-emerald-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                    <svg className={`w-10 h-10 text-emerald-500 transition-colors ${isDragOver ? 'animate-bounce' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-emerald-700 transition-colors">
                    {isDragOver ? 'Drop files to upload' : 'Click or Drag files here'}
                </h3>
                <p className="text-gray-400 text-sm mb-8">
                    Select multiple files to analyze them together.
                </p>

                <div className="flex items-center justify-center gap-6 text-xs text-gray-400 border-t border-gray-100 pt-6">
                    <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Multi-File Support</span>
                    <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> 100% Private</span>
                </div>
            </div>

            <button
                onClick={(e) => { e.stopPropagation(); window.location.reload(); }}
                className="mt-8 mx-auto flex items-center gap-2 text-gray-400 hover:text-gray-600 transition-colors text-sm"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                Back to Home
            </button>
        </div>
    </div>
  );
};
