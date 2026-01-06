
export type TransactionType = 'expense' | 'income';

export interface Account {
  id: string;
  name: string;
  type: string;
  initialBalance: number;
  color: string;
  isLiability?: boolean;
  debtAmount?: number; // 负债总额
  repaymentMonths?: number;
  isSavings?: boolean;
  savingsGoal?: number; // 攒钱目标
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
