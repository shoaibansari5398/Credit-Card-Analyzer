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

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO string format for JSON serialization consistency
}
