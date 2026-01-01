import { Transaction } from '../types';

export const exportToCSV = (data: Transaction[], filename: string = 'financial_report.csv') => {
  if (!data || data.length === 0) {
    console.warn("No data to export");
    return;
  }

  // Define headers
  const headers = ['Date', 'Merchant', 'Amount', 'Category', 'Is Recurring'];

  // Map data to rows
  const rows = data.map(t => [
    `"${(t.date ?? '').toString().replace(/"/g, '""')}"`,
    `"${t.merchant.replace(/"/g, '""')}"`, // Escape quotes in merchant name
    (t.amount ?? 0).toFixed(2),
    `"${(t.category ?? '').replace(/"/g, '""')}"`,
    t.isRecurring ? 'Yes' : 'No'
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Create blob and download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Delay cleanup to ensure download completes
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 100);
};
