import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SplashCursor from './SplashCursor';
import VariableProximity from './VariableProximity';
import { ContactModal } from './ContactModal';
import { useState } from 'react';
import { ThemeToggle } from './ui/ThemeToggle';

interface LandingPageProps {
  onGetStarted: () => void;
  onUseDemo: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onUseDemo }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col font-sans relative overflow-hidden transition-colors duration-200" ref={containerRef}>
      {/* Grid Background */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.035] dark:opacity-[0.05] dark:invert pointer-events-none"></div>

      {/* Navbar */}
      <nav className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
        <div
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate('/')}
        >
            <div className="bg-emerald-500 rounded-lg p-1.5">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
            </div>
            <span className="font-bold text-gray-900 dark:text-white text-lg tracking-tight">CCIA</span>
        </div>
        <div className="flex items-center gap-6">
            <ThemeToggle />
            <button
                onClick={() => setIsContactModalOpen(true)}
                className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
            >
                Contact Us
            </button>
            <button onClick={onUseDemo} className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer">
                Demo
            </button>
            <button
                onClick={onGetStarted}
                className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold py-2.5 px-5 rounded-lg transition-all shadow-sm hover:shadow-md cursor-pointer"
            >
                Get Started
            </button>
        </div>
      </nav>

      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />

      {/* Splash Cursor */}
      <SplashCursor />

      {/* Hero Section */}
      <main className="relative z-10 flex-grow flex flex-col items-center justify-center text-center px-4 -mt-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium mb-8 border border-emerald-100 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
            100% Privacy-First • Local Processing
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-gray-900 dark:text-white tracking-tight leading-[1.1] mb-6 max-w-4xl animate-slide-up" style={{ animationDelay: '0.2s', cursor: 'default' }}>
            <VariableProximity
                label={'Your Credit Card'}
                className={'block'}
                fromFontVariationSettings="'wght' 500, 'opsz' 9"
                toFontVariationSettings="'wght' 1000, 'opsz' 40"
                containerRef={containerRef}
                radius={100}
                falloff='linear'
            />
            <div className="text-emerald-500">
                <VariableProximity
                    label={'Financial Story'}
                    className={'block'}
                    fromFontVariationSettings="'wght' 600, 'opsz' 9"
                    toFontVariationSettings="'wght' 1000, 'opsz' 40"
                    containerRef={containerRef}
                    radius={100}
                    falloff='linear'
                />
            </div>
            <VariableProximity
                label={'Visualized'}
                className={'block'}
                fromFontVariationSettings="'wght' 500, 'opsz' 9"
                toFontVariationSettings="'wght' 1000, 'opsz' 40"
                containerRef={containerRef}
                radius={100}
                falloff='linear'
            />
        </h1>

        <p className="text-gray-500 dark:text-gray-400 text-lg md:text-xl max-w-2xl mb-10 leading-relaxed animate-slide-up" style={{ animationDelay: '0.3s' }}>
            Upload your credit card statements and discover powerful insights.
            Interactive charts, spending patterns, and anomaly detection — all processed locally on your device.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md sm:max-w-none justify-center animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <button
                onClick={onGetStarted}
                className="bg-emerald-500 hover:bg-emerald-600 text-white text-lg font-semibold py-3.5 px-8 rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
                Get Started
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </button>
            <button
                onClick={onUseDemo}
                className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white text-lg font-semibold py-3.5 px-8 rounded-xl transition-all border border-gray-200 dark:border-gray-700"
            >
                View Demo Dashboard
            </button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 max-w-5xl w-full px-4 text-left animate-slide-up" style={{ animationDelay: '0.5s' }}>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">Multi-Bank Support</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">HDFC, SBI, ICICI, Amex & more. One dashboard for all your cards.</p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/></svg>
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">Deep Analytics</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">Treemaps, Sankey diagrams, and Heatmaps to visualize flow.</p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">Privacy First</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">No data leaves your browser without your explicit upload consent.</p>
            </div>
        </div>

      </main>
    </div>
  );
};
