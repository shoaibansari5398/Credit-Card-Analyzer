import React from 'react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ title, children, className = "", action }) => {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 flex flex-col ${className}`}>
      {(title || action) && (
        <div className="flex justify-between items-center mb-4">
          {title && <h3 className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase tracking-wide">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="flex-1 w-full h-full min-h-0">
        {children}
      </div>
    </div>
  );
};

export const KPICard: React.FC<{ label: string; value: string; subValue?: string; trend?: 'up' | 'down' | 'neutral' }> = ({ label, value, subValue, trend }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
      <h3 className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">{label}</h3>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">{value}</span>
        {subValue && (
          <span className={`text-xs mb-1 font-medium px-1.5 py-0.5 rounded ${
            trend === 'up' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
            trend === 'down' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
            'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
          }`}>
            {subValue}
          </span>
        )}
      </div>
    </div>
  );
};
