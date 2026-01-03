
export type TransactionType = 'expense' | 'income';

export interface Account {
  id: string;
  name: string;
  type: string;
  initialBalance: number;
  color: string;
  isLiability?: boolean;
  repaymentMonths?: number;
  isSavings?: boolean;
  savingsMonths?: number;
}

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  accountId: string;
  note: string;
  date: string;
  type: TransactionType;
}

export interface Budget {
  category: string;
  limit: number; // 默认为月预算
  dailyLimit?: number;
  yearlyLimit?: number;
}

export interface CategoryInfo {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface FinancialInsight {
  tip: string;
  analysis: string;
  recommendation: string;
}
