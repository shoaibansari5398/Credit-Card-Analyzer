export interface Transaction {
  id: string;
  date: string; // ISO YYYY-MM-DD
  merchant: string;
  amount: number;
  category: string;
  isRecurring?: boolean;
}

export interface KPIStats {
  totalSpend: number;
  burnRate: number; // Daily average
  largestTx: Transaction;
  topCategory: {
    name: string;
    percentage: number;
  };
}

export interface CategoryNode {
  name: string;
  value: number;
  children?: CategoryNode[];
}

export enum AppState {
  LANDING = 'LANDING',
  UPLOAD = 'UPLOAD',
  PROCESSING = 'PROCESSING',
  DASHBOARD = 'DASHBOARD'
}
