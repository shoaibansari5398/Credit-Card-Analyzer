/**
 * Centralized configuration constants for the Credit Card Analyzer.
 * Change these values to customize the application for different regions/use cases.
 */

// Currency symbol - change this for different regions (e.g., '$', '€', '£', '¥')
export const CURRENCY_SYMBOL = '₹';

// Transaction categories used for classification
// These must match the categories in the backend AI prompt (backend/main.py)
export const TRANSACTION_CATEGORIES = [
  'Food',
  'Transport',
  'Shopping',
  'Utilities',
  'Entertainment',
  'Health',
  'Travel',
  'Other'
] as const;

// Type for transaction categories
export type TransactionCategory = typeof TRANSACTION_CATEGORIES[number];
