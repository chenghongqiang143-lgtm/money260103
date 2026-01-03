
export type TransactionType = 'expense' | 'income';

export interface Account {
  id: string;
  name: string;
  type: string; // Changed to string for customizability
  initialBalance: number;
  color: string;
  isLiability?: boolean; // 是否为负债账户
  repaymentMonths?: number; // 预计还款周期（月）
  isSavings?: boolean; // 是否为攒钱账户
  savingsMonths?: number; // 预计攒钱周期（月）
}

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  accountId: string; // Linked to Account.id
  note: string;
  date: string;
  type: TransactionType;
}

export interface Budget {
  category: string;
  limit: number;
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
