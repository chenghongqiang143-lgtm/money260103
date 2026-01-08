
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Plus, BarChart3, LayoutDashboard, X, Trash2, ChevronUp, ChevronDown, 
  ChevronRight, ChevronLeft, TrendingUp, Settings, 
  Wallet, CreditCard, Landmark, Coins, PlusCircle, 
  Pencil, RefreshCw, BarChart as BarChartIcon, List, 
  Calendar as CalendarIcon, AlertCircle, Target, Tag,
  Save, FileUp, Search, Layers, Download, Upload, Trash,
  ArrowRight, Copy, Clipboard
} from 'lucide-react';
import { Transaction, Budget, CategoryInfo, Account } from './types';
import { CATEGORIES as INITIAL_CATEGORIES, getIcon } from './constants';
import StatsCards from './components/StatsCards';
import BudgetTracker from './components/BudgetTracker';
import { 
  ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, 
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';

type Tab = 'dashboard' | 'stats' | 'assets' | 'settings';
type AssetPeriod = '1m' | '3m' | '1y';

const DEFAULT_ACCOUNTS: Account[] = [
  { id: '1', name: '现金', type: '现金', initialBalance: 0, color: '#7d513d', note: '日常零花' },
  { id: '2', name: '支付宝', type: '第三方支付', initialBalance: 0, color: '#1677ff' },
  { id: '3', name: '微信支付', type: '第三方支付', initialBalance: 0, color: '#07c160' },
  { id: '4', name: '招商银行', type: '银行储蓄', initialBalance: 0, color: '#333333', note: '工资卡' },
];

const DEFAULT_ACCOUNT_TYPES = ['现金', '第三方支付', '银行储蓄', '信用卡/负债', '理财/投资'];
const PRESET_COLORS = [
  '#7d513d', '#1677ff', '#07c160', '#333333', '#e11d48', '#7c3aed', 
  '#ea580c', '#0891b2', '#4b5563', '#f97316', '#ec4899', '#6366f1',
  '#84cc16', '#14b8a6', '#f59e0b', '#8b5cf6', '#d946ef', '#f43f5e',
  '#64748b', '#78716c', '#a8a29e', '#0f172a', '#1e293b', '#fbbf24',
  '#dc2626', '#ea580c', '#d97706', '#ca8a04', '#65a30d', '#16a34a',
  '#059669', '#0d9488', '#0891b2', '#0284c7', '#2563eb', '#4f46e5',
  '#7c3aed', '#9333ea', '#c026d3', '#db2777', '#e11d48', '#57534e'
];

const CHART_COLORS = ['#7d513d', '#1677ff', '#07c160', '#e11d48', '#7c3aed', '#ea580c', '#0891b2', '#4b5563', '#94a3b8', '#10b981', '#333333'];

// --- 子组件 ---

const getAccountIcon = (type: string, isLiability?: boolean, isSavings?: boolean) => {
  if (isLiability) return <AlertCircle size={18} />;
  if (isSavings) return <Target size={18} />;
  switch (type) {
    case '现金': return <Wallet size={18} />;
    case '第三方支付': return <CreditCard size={18} />;
    case '银行储蓄': return <Landmark size={18} />;
    case '信用卡/负债': return <CreditCard size={18} />;
    case '理财/投资': return <TrendingUp size={18} />;
    default: return <Coins size={18} />;
  }
};

const AccountCard: React.FC<{ 
  acc: Account & { currentBalance: number }, 
  onEdit: (acc: Account) => void,
  onAnalyze: (acc: Account) => void,
  onEditBalance: (acc: Account) => void
}> = ({ acc, onEdit, onAnalyze, onEditBalance }) => {
  const progress = useMemo(() => {
    if (acc.isLiability && acc.debtAmount) return Math.min((acc.currentBalance / acc.debtAmount) * 100, 100);
    if (acc.isSavings && acc.savingsGoal) return Math.min((acc.currentBalance / acc.savingsGoal) * 100, 100);
    return 0;
  }, [acc]);

  return (
    <div 
      onClick={() => onEditBalance(acc)}
      onContextMenu={(e) => { e.preventDefault(); onEdit(acc); }}
      className="hammer-card p-3 relative transition-all active:scale-[0.98] select-none cursor-pointer" 
      style={{ borderBottom: `2px solid ${acc.color}` }}
    >
      <button onClick={(e) => { e.stopPropagation(); onAnalyze(acc); }} className="absolute top-2 right-2 p-1 text-[#ccc] hover:text-[#7d513d]">
        <TrendingUp size={12} />
      </button>
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-7 h-7 rounded border border-[#e0ddd5] flex items-center justify-center text-white" style={{ backgroundColor: acc.color }}>
          {React.cloneElement(getAccountIcon(acc.type, acc.isLiability, acc.isSavings) as React.ReactElement, { size: 14 })}
        </div>
        <div className="truncate flex-1">
          <h4 className="text-[11px] font-bold text-[#333] truncate leading-tight">{acc.name}</h4>
          {acc.note && <p className="text-[8px] text-[#999] truncate mt-0.5">{acc.note}</p>}
          {(acc.isLiability || acc.isSavings) && (
            <div className="flex items-center gap-1 mt-0.5">
              <span className={`text-[7px] px-1 rounded-sm text-white font-bold uppercase ${acc.isLiability ? 'bg-[#b94a48]' : 'bg-[#7d513d]'}`}>
                {acc.isLiability ? `${acc.repaymentMonths}期还款` : `${acc.savingsMonths}期攒钱`}
              </span>
            </div>
          )}
        </div>
      </div>
      <div>
        <p className={`text-sm font-mono font-bold ${acc.isLiability ? 'text-[#b94a48]' : 'text-[#333]'}`}>
          <span className="text-[10px] mr-0.5 opacity-40">¥</span>{Math.abs(acc.currentBalance).toLocaleString()}
        </p>
      </div>
      {(acc.isLiability || acc.isSavings) && (
        <div className="mt-2 space-y-1">
          <div className="h-[3px] bg-[#f0eee8] rounded-full overflow-hidden">
            <div className={`h-full transition-all duration-700 ${acc.isLiability ? 'bg-[#b94a48]' : 'bg-[#7d513d]'}`} style={{ width: `${progress}%` }}></div>
          </div>
          <div className="flex justify-between items-center text-[7px] font-bold opacity-50 uppercase tracking-tighter">
            <span>{progress.toFixed(0)}%</span>
            <span>¥{(acc.isLiability ? (acc.debtAmount || 0) : (acc.savingsGoal || 0)).toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// --- 主应用 ---

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [assetTrendPeriod, setAssetTrendPeriod] = useState<AssetPeriod>('1m');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [expandedBudgetCategory, setExpandedBudgetCategory] = useState<string | null>(null);
  const [isAssetStatsVisible, setIsAssetStatsVisible] = useState(false);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isCategoryListExpanded, setIsCategoryListExpanded] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryInfo | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [backupText, setBackupText] = useState('');
  
  const [confirmDeleteTxId, setConfirmDeleteTxId] = useState<string | null>(null);
  const [confirmDeleteAccId, setConfirmDeleteAccId] = useState<string | null>(null);
  const [confirmDeleteCatId, setConfirmDeleteCatId] = useState<string | null>(null);
  const [confirmClearData, setConfirmClearData] = useState(false);
  
  const [dashboardMonth, setDashboardMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  });
  
  const [isAccountManagerOpen, setIsAccountManagerOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isEditBalanceModalOpen, setIsEditBalanceModalOpen] = useState<Account | null>(null);
  const [manualBalanceValue, setManualBalanceValue] = useState('');
  const [analyzingAccount, setAnalyzingAccount] = useState<Account | null>(null);

  const [historySearch, setHistorySearch] = useState('');
  
  // Safe localStorage initialization to prevent white screen on crash
  const [enableAccountLinking, setEnableAccountLinking] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('zen_enable_account_linking');
      return saved !== null ? JSON.parse(saved) : true;
    } catch (e) { return true; }
  });

  const [enableBudgetAccumulation, setEnableBudgetAccumulation] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('zen_enable_budget_accumulation');
      return saved !== null ? JSON.parse(saved) : false;
    } catch (e) { return false; }
  });

  const [enableExcessDeduction, setEnableExcessDeduction] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('zen_enable_excess_deduction');
      return saved !== null ? JSON.parse(saved) : false;
    } catch (e) { return false; }
  });

  const [categories, setCategories] = useState<CategoryInfo[]>(() => {
    try {
      const saved = localStorage.getItem('zen_categories');
      return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
    } catch (e) { return INITIAL_CATEGORIES; }
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('zen_transactions');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  
  const [budgets, setBudgets] = useState<Budget[]>(() => {
    try {
      const saved = localStorage.getItem('zen_budgets');
      return saved ? JSON.parse(saved) : [
        { category: '餐饮', limit: 2000 },
        { category: '交通', limit: 500 },
        { category: '购物', limit: 1500 }
      ];
    } catch (e) {
      return [
        { category: '餐饮', limit: 2000 },
        { category: '交通', limit: 500 },
        { category: '购物', limit: 1500 }
      ];
    }
  });

  const [accounts, setAccounts] = useState<Account[]>(() => {
    try {
      const saved = localStorage.getItem('zen_accounts');
      return saved ? JSON.parse(saved) : DEFAULT_ACCOUNTS;
    } catch (e) { return DEFAULT_ACCOUNTS; }
  });

  const [accountTypes] = useState<string[]>(DEFAULT_ACCOUNT_TYPES);

  // 账户表单临时状态
  const [accName, setAccName] = useState('');
  const [accNote, setAccNote] = useState('');
  const [accType, setAccType] = useState(accountTypes[0]);
  const [accInitialBalance, setAccInitialBalance] = useState('0');
  const [accColor, setAccColor] = useState(PRESET_COLORS[0]);
  const [accIsLiability, setAccIsLiability] = useState(false);
  const [accIsSavings, setAccIsSavings] = useState(false);
  const [accPeriod, setAccPeriod] = useState('12');
  const [accTargetAmount, setAccTargetAmount] = useState('0');

  // 交易表单临时状态
  const [amount, setAmount] = useState('');
  const [categoryName, setCategoryName] = useState(categories[0]?.name || '');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [note, setNote] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);

  // 分类编辑状态
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('Utensils');
  const [catColor, setCatColor] = useState(PRESET_COLORS[0]);

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  useEffect(() => { localStorage.setItem('zen_categories', JSON.stringify(categories)); }, [categories]);
  useEffect(() => { localStorage.setItem('zen_transactions', JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem('zen_budgets', JSON.stringify(budgets)); }, [budgets]);
  useEffect(() => { localStorage.setItem('zen_accounts', JSON.stringify(accounts)); }, [accounts]);
  useEffect(() => { localStorage.setItem('zen_enable_account_linking', JSON.stringify(enableAccountLinking)); }, [enableAccountLinking]);
  useEffect(() => { localStorage.setItem('zen_enable_budget_accumulation', JSON.stringify(enableBudgetAccumulation)); }, [enableBudgetAccumulation]);
  useEffect(() => { localStorage.setItem('zen_enable_excess_deduction', JSON.stringify(enableExcessDeduction)); }, [enableExcessDeduction]);

  const accountBalances = useMemo(() => {
    return accounts.map(acc => {
      const accTransactions = transactions.filter(t => t.accountId === acc.id);
      const balance = accTransactions.reduce((sum: number, t: Transaction): number => {
        if (acc.isLiability) return t.type === 'expense' ? sum + t.amount : sum - t.amount;
        return t.type === 'income' ? sum + t.amount : sum - t.amount;
      }, acc.initialBalance);
      return { ...acc, currentBalance: balance };
    });
  }, [accounts, transactions]);

  const totalAssets = useMemo(() => accountBalances.reduce((sum: number, acc): number => acc.isLiability ? sum - acc.currentBalance : sum + acc.currentBalance, 0), [accountBalances]);

  const groupedAccounts = useMemo(() => {
    const groups: Record<string, (Account & { currentBalance: number })[]> = {};
    accountBalances.forEach(acc => {
      if (!groups[acc.type]) groups[acc.type] = [];
      groups[acc.type].push(acc);
    });
    return groups;
  }, [accountBalances]);

  const dashboardTransactions = useMemo(() => {
    const [year, month] = dashboardMonth.split('-').map(Number);
    return transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === month - 1 && d.getFullYear() === year;
    });
  }, [transactions, dashboardMonth]);

  const monthlyStats = useMemo(() => {
    const income = dashboardTransactions.filter(t => t.type === 'income').reduce((s: number, t) => s + t.amount, 0);
    const expense = dashboardTransactions.filter(t => t.type === 'expense').reduce((s: number, t) => s + t.amount, 0);
    return { income, expense };
  }, [dashboardTransactions]);

  const periodStats = useMemo(() => {
    const start = new Date(startDate); start.setHours(0,0,0,0);
    const end = new Date(endDate); end.setHours(23,59,59,999);
    const txs: Transaction[] = transactions.filter((t: Transaction) => { 
        const d = new Date(t.date); 
        return d.getTime() >= start.getTime() && d.getTime() <= end.getTime(); 
    });
    
    const trendData: { date: string, income: number, expense: number }[] = [];
    const dailyStackedData: any[] = [];
    
    const curr = new Date(start);
    while (curr.getTime() <= end.getTime()) {
      const dateStr = curr.toISOString().split('T')[0];
      const dayTxs: Transaction[] = txs.filter((t: Transaction) => t.date.startsWith(dateStr));
      
      trendData.push({
        date: dateStr.slice(5), 
        income: dayTxs.filter((t: Transaction) => t.type === 'income').reduce((s: number, t: Transaction) => s + t.amount, 0),
        expense: dayTxs.filter((t: Transaction) => t.type === 'expense').reduce((s: number, t: Transaction) => s + t.amount, 0),
      });

      const dayExpenseEntry: Record<string, any> = { date: dateStr.slice(5) };
      dayTxs.filter((t: Transaction) => t.type === 'expense').forEach((t: Transaction) => {
        const currentVal = Number(dayExpenseEntry[t.category]) || 0;
        dayExpenseEntry[t.category] = currentVal + t.amount;
      });
      dailyStackedData.push(dayExpenseEntry);

      curr.setDate(curr.getDate() + 1);
    }

    const expenseByCategory = txs.filter(t => t.type === 'expense').reduce((acc: Record<string, number>, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
    }, {} as Record<string, number>);

    const totalExpense = txs.filter(t => t.type === 'expense').reduce((s: number, t) => s + t.amount, 0);
    const details = Object.entries(expenseByCategory).map(([name, value]) => ({ 
      name, 
      value,
      percent: totalExpense > 0 ? (value / totalExpense) * 100 : 0,
      icon: categories.find(c => c.name === name)?.icon || 'Tag'
    })).sort((a,b) => b.value - a.value);

    const categoryNamesInExpense = Array.from(new Set(txs.filter(t => t.type === 'expense').map(t => t.category)));
    
    // Total Composition Stacked Data (Single Bar)
    const totalCompositionData = [
      categoryNamesInExpense.reduce((acc: any, cat) => {
        acc[cat] = details.find(d => d.name === cat)?.value || 0;
        return acc;
      }, { name: '总支出' })
    ];

    return { 
      income: txs.filter(t => t.type === 'income').reduce((s: number, t) => s + t.amount, 0),
      expense: totalExpense,
      trendData,
      dailyStackedData,
      details,
      categoryNamesInExpense,
      totalCompositionData
    };
  }, [transactions, startDate, endDate, categories]);

  const assetHistoryData = useMemo(() => {
    const days = assetTrendPeriod === '1m' ? 30 : assetTrendPeriod === '3m' ? 90 : 365;
    const history: { date: string; balance: number }[] = [];
    const now = new Date();
    
    for (let i = days; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dateLimit = new Date(d);
      dateLimit.setHours(23,59,59,999);

      let balance = 0;
      if (analyzingAccount) {
        const acc = accounts.find(a => a.id === analyzingAccount.id);
        if (acc) {
          const txs = transactions.filter(t => t.accountId === acc.id && new Date(t.date).getTime() <= dateLimit.getTime());
          balance = txs.reduce((sum: number, t: Transaction): number => {
            const amt = Number(t.amount);
            if (acc.isLiability) return t.type === 'expense' ? sum + amt : sum - amt;
            return t.type === 'income' ? sum + amt : sum - amt;
          }, Number(acc.initialBalance));
        }
      } else {
        accounts.forEach(acc => {
          const txs = transactions.filter(t => t.accountId === acc.id && new Date(t.date).getTime() <= dateLimit.getTime());
          const accBal = txs.reduce((sum: number, t: Transaction): number => {
            const amt = Number(t.amount);
            if (acc.isLiability) return t.type === 'expense' ? sum + amt : sum - amt;
            return t.type === 'income' ? sum + amt : sum - amt;
          }, Number(acc.initialBalance));
          balance += acc.isLiability ? -accBal : accBal;
        });
      }
      history.push({ date: dateStr.slice(5), balance });
    }

    const balances = history.map(h => h.balance);
    const peak = Math.max(...balances);
    const trough = Math.min(...balances);
    const average = balances.reduce((a: number, b: number) => a + b, 0) / (balances.length || 1);

    return { history, peak, trough, average };
  }, [transactions, accounts, analyzingAccount, assetTrendPeriod]);

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;
    setTransactions([{ 
      id: Date.now().toString(), amount: Number(amount), category: categoryName, 
      accountId: enableAccountLinking ? selectedAccountId : 'unlinked', 
      note, type, date: new Date(transactionDate).toISOString() 
    }, ...transactions]);
    setAmount(''); setNote(''); setIsModalOpen(false);
  };

  const handleEditAccount = useCallback((acc: Account) => {
    setEditingAccount(acc);
    setAccName(acc.name);
    setAccNote(acc.note || '');
    setAccType(acc.type);
    setAccInitialBalance(acc.initialBalance.toString());
    setAccColor(acc.color);
    setAccIsLiability(acc.isLiability || false);
    setAccIsSavings(acc.isSavings || false);
    setAccPeriod((acc.isLiability ? acc.repaymentMonths : acc.savingsMonths)?.toString() || '12');
    setAccTargetAmount((acc.isLiability ? acc.debtAmount : acc.savingsGoal)?.toString() || '0');
    setIsAccountModalOpen(true);
  }, []);

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const newAcc: Account = { 
      id: editingAccount?.id || Date.now().toString(), 
      name: accName, type: accType, initialBalance: Number(accInitialBalance), color: accColor, 
      note: accNote,
      isLiability: accIsLiability, isSavings: accIsSavings,
      repaymentMonths: accIsLiability ? Number(accPeriod) : undefined,
      debtAmount: accIsLiability ? Number(accTargetAmount) : undefined,
      savingsMonths: accIsSavings ? Number(accPeriod) : undefined,
      savingsGoal: accIsSavings ? Number(accTargetAmount) : undefined
    };
    if (editingAccount) setAccounts(accounts.map(a => a.id === editingAccount.id ? newAcc : a));
    else setAccounts([...accounts, newAcc]);
    setIsAccountModalOpen(false); setEditingAccount(null);
  };

  const handleMoveAccount = (index: number, direction: 'up' | 'down') => {
    const newArr = [...accounts];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= accounts.length) return;
    [newArr[index], newArr[target]] = [newArr[target], newArr[index]];
    setAccounts(newArr);
  };

  const handleMoveCategory = (index: number, direction: 'up' | 'down') => {
    const newArr = [...categories];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= categories.length) return;
    [newArr[index], newArr[target]] = [newArr[target], newArr[index]];
    setCategories(newArr);
  };

  const handleUpdateBalance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditBalanceModalOpen) return;
    const targetVal = Number(manualBalanceValue);
    if (isNaN(targetVal)) return;

    if (enableAccountLinking) {
      const currentVal = accountBalances.find(a => a.id === isEditBalanceModalOpen.id)?.currentBalance || 0;
      const diff = targetVal - currentVal;
      if (diff !== 0) {
        setTransactions([{
          id: `adj-${Date.now()}`, amount: Math.abs(diff), category: '其他',
          accountId: isEditBalanceModalOpen.id, note: '余额校准',
          date: new Date().toISOString(),
          type: isEditBalanceModalOpen.isLiability ? (diff > 0 ? 'expense' : 'income') : (diff > 0 ? 'income' : 'expense')
        }, ...transactions]);
      }
    } else {
      const accTxs = transactions.filter(t => t.accountId === isEditBalanceModalOpen.id);
      const netTxs = accTxs.reduce((sum, t) => {
        if (isEditBalanceModalOpen.isLiability) return t.type === 'expense' ? sum + t.amount : sum - t.amount;
        return t.type === 'income' ? sum + t.amount : sum - t.amount;
      }, 0);
      setAccounts(accounts.map(a => a.id === isEditBalanceModalOpen.id ? { ...a, initialBalance: targetVal - netTxs } : a));
    }
    setIsEditBalanceModalOpen(null);
  };

  const handleUpdateBudget = (category: string, field: keyof Budget, value: number) => {
    setBudgets(prev => {
      let newItem: Budget = { category, limit: 0, dailyLimit: 0, yearlyLimit: 0 };
      const existing = prev.find(b => b.category === category);
      if (existing) {
        newItem = { ...existing };
      }

      if (field === 'dailyLimit') {
          newItem.dailyLimit = value;
          newItem.limit = Math.round(value * 30);
          newItem.yearlyLimit = Math.round(value * 365);
      } else if (field === 'limit') {
          newItem.limit = value;
          newItem.dailyLimit = Math.round(value / 30);
          newItem.yearlyLimit = Math.round(value * 12);
      } else if (field === 'yearlyLimit') {
          newItem.yearlyLimit = value;
          newItem.dailyLimit = Math.round(value / 365);
          newItem.limit = Math.round(value / 12);
      }

      if (existing) {
        return prev.map(b => b.category === category ? newItem : b);
      }
      return [...prev, newItem];
    });
  };

  const handleExportData = () => {
    const data = { transactions, budgets, accounts, categories, settings: { enableAccountLinking, enableBudgetAccumulation, enableExcessDeduction }, exportDate: new Date().toISOString() };
    const jsonString = JSON.stringify(data, null, 2);
    setBackupText(jsonString);
    setIsBackupModalOpen(true);
  };
  
  const copyBackupToClipboard = () => {
    navigator.clipboard.writeText(backupText).then(() => {
        alert("备份数据已复制到剪贴板！\n\n您可以将其粘贴到安全的地方保存。");
    }).catch(err => {
        console.error('Copy failed', err);
        alert("复制失败，请手动选择文本框内容并复制。");
    });
  };

  const handlePasteRestore = () => {
      try {
        const data = JSON.parse(importText);
        if (data.transactions) setTransactions(data.transactions);
        if (data.budgets) setBudgets(data.budgets);
        if (data.accounts) setAccounts(data.accounts);
        if (data.categories) setCategories(data.categories);
        if (data.settings) {
          setEnableAccountLinking(data.settings.enableAccountLinking);
          setEnableBudgetAccumulation(data.settings.enableBudgetAccumulation || false);
          setEnableExcessDeduction(data.settings.enableExcessDeduction || false);
        }
        setIsImportModalOpen(false);
        setImportText('');
        alert('数据恢复成功！');
      } catch (err) { 
          alert('恢复失败：数据格式不正确。请确保您粘贴的是完整的备份 JSON 内容。'); 
      }
  };

  const handleClearAllData = () => {
    setTransactions([]);
    setBudgets([]);
    setAccounts(DEFAULT_ACCOUNTS);
    setCategories(INITIAL_CATEGORIES);
    setConfirmClearData(false);
    alert('所有数据已清空。');
  };

  return (
    <div className="min-h-screen pb-24">
      <main className="max-w-4xl mx-auto px-4 pt-8">
        {activeTab === 'dashboard' ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button onClick={() => setDashboardMonth(prev => { const [y, m] = prev.split('-').map(Number); const d = new Date(y, m-2, 1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}`; })} className="p-1 text-[#ccc] hover:text-[#7d513d]"><ChevronLeft size={16} /></button>
                <div className="relative px-2 flex items-center gap-2 cursor-pointer">
                  <h2 className="text-xl font-serif font-bold text-[#333]">{dashboardMonth.split('-')[0]}年{parseInt(dashboardMonth.split('-')[1])}月</h2>
                  <CalendarIcon size={16} className="text-[#ccc]" />
                  <input type="month" value={dashboardMonth} onChange={(e) => setDashboardMonth(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
                <button onClick={() => setDashboardMonth(prev => { const [y, m] = prev.split('-').map(Number); const d = new Date(y, m, 1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}`; })} className="p-1 text-[#ccc] hover:text-[#7d513d]"><ChevronRight size={16} /></button>
              </div>
            </div>
            
            <StatsCards income={monthlyStats.income} expense={monthlyStats.expense} monthLabel={`${parseInt(dashboardMonth.split('-')[1])}月`} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 space-y-6">
                <div className="hammer-card p-6">
                  <div className="flex items-center justify-between mb-4 border-b border-[#e0ddd5] pb-3">
                    <h3 className="text-xs font-bold text-[#333] tracking-widest uppercase flex items-center gap-2"><div className="w-1 h-3.5 bg-[#7d513d]"></div>流水明细</h3>
                    <button onClick={() => setIsHistoryVisible(true)} className="text-[10px] text-[#999] font-bold uppercase hover:text-[#7d513d]">全部明细 <ChevronRight size={12} className="inline" /></button>
                  </div>
                  <div className="space-y-0">
                    {dashboardTransactions.slice(0, 8).map(t => {
                      const categoryColor = categories.find(c => c.name === t.category)?.color || '#9ca3af';
                      return (
                        <div key={t.id} className="flex items-center justify-between py-4 border-b border-[#e0ddd5] last:border-0 group">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded border border-[#e0ddd5] flex items-center justify-center text-white shadow-inner" style={{ backgroundColor: categoryColor }}>
                              {getIcon(categories.find(c => c.name === t.category)?.icon || 'MoreHorizontal', 'w-4 h-4')}
                            </div>
                            <div>
                              <div className="flex items-baseline gap-2">
                                  <p className="text-xs font-bold text-[#333]">{t.category}</p>
                                  <span className="text-[9px] font-mono text-[#ccc]">{new Date(t.date).getDate()}日</span>
                              </div>
                              <p className="text-[10px] text-[#999] mt-0.5">{t.note || '无备注'}</p>
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-4">
                            <p className={`text-sm font-mono font-bold ${t.type === 'expense' ? 'text-[#333]' : 'text-[#468847]'}`}>{t.type === 'expense' ? '-' : '+'}¥{t.amount.toLocaleString()}</p>
                            <button onClick={(e) => { e.stopPropagation(); if (confirmDeleteTxId === t.id) { setTransactions(transactions.filter(tx => tx.id !== t.id)); setConfirmDeleteTxId(null); } else { setConfirmDeleteTxId(t.id); } }} className={`p-1.5 rounded transition-all ${confirmDeleteTxId === t.id ? 'bg-[#b94a48] text-white' : 'text-[#ccc] hover:text-[#b94a48]'}`}>{confirmDeleteTxId === t.id ? <span className="text-[8px] font-bold px-1">确认?</span> : <Trash2 size={12} />}</button>
                          </div>
                        </div>
                      );
                    })}
                    {dashboardTransactions.length === 0 && <div className="py-12 text-center text-[#ccc] text-xs font-bold uppercase italic">暂无记录</div>}
                  </div>
                </div>
              </div>
              <div className="lg:col-span-4">
                <BudgetTracker 
                    transactions={dashboardTransactions} budgets={budgets} 
                    onOpenManagement={() => setIsBudgetModalOpen(true)} 
                />
              </div>
            </div>
          </div>
        ) : activeTab === 'stats' ? (
          <div className="space-y-6 animate-in fade-in duration-300">
             <div className="hammer-card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CalendarIcon size={18} className="text-[#7d513d]" />
                <h3 className="text-xs font-bold text-[#333] uppercase tracking-widest">统计周期</h3>
              </div>
              <div className="flex items-center gap-2">
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-[#f0eee8] border border-[#e0ddd5] px-3 py-1.5 rounded text-[10px] font-mono font-bold text-[#333] outline-none" />
                <span className="text-[#999] text-xs">至</span>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-[#f0eee8] border border-[#e0ddd5] px-3 py-1.5 rounded text-[10px] font-mono font-bold text-[#333] outline-none" />
              </div>
            </div>
            <StatsCards income={periodStats.income} expense={periodStats.expense} monthLabel="区间" />

            <div className="space-y-6">
                {/* 消费构成条形堆积图 (Horizontal Stacked Bar Chart) */}
                <div className="hammer-card p-6">
                    <h3 className="text-xs font-bold text-[#333] tracking-widest uppercase mb-6 flex items-center gap-2"><div className="w-1 h-3.5 bg-[#7d513d]"></div>期间总消费构成 (堆积占比)</h3>
                    <div className="w-full h-24">
                         {periodStats.expense > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart 
                                    data={periodStats.totalCompositionData} 
                                    layout="vertical" 
                                    margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                                >
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="name" hide width={1} />
                                    <Tooltip 
                                        contentStyle={{ fontSize: '10px', borderRadius: '4px' }} 
                                        formatter={(val: number) => `¥${val.toLocaleString()}`} 
                                        cursor={{ fill: 'transparent' }}
                                    />
                                    {periodStats.categoryNamesInExpense.map((cat, idx) => (
                                        <Bar 
                                            key={cat} 
                                            dataKey={cat} 
                                            stackId="a" 
                                            fill={CHART_COLORS[idx % CHART_COLORS.length]} 
                                            barSize={40}
                                        />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center">
                                <p className="text-[10px] font-bold uppercase text-[#ccc] italic">暂无支出数据</p>
                            </div>
                        )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 px-2">
                        {periodStats.categoryNamesInExpense.map((cat, idx) => (
                            <div key={cat} className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}></div>
                                <span className="text-[8px] font-bold text-[#999] uppercase">{cat}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 支出详情列表 */}
                <div className="hammer-card p-6">
                    <h3 className="text-xs font-bold text-[#333] tracking-widest uppercase mb-6 flex items-center gap-2"><div className="w-1 h-3.5 bg-[#7d513d]"></div>支出详情分布</h3>
                    <div className="space-y-4">
                        {periodStats.details.length > 0 ? periodStats.details.map((item, idx) => (
                            <div key={item.name} className="flex items-center gap-4 group">
                                <div className="w-10 h-10 rounded border border-[#e0ddd5] flex items-center justify-center text-white shrink-0" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}>
                                    {getIcon(item.icon, 'w-5 h-5')}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-end mb-1">
                                        <p className="text-xs font-bold text-[#333] truncate">{item.name}</p>
                                        <p className="text-xs font-mono font-bold text-[#333]">¥{item.value.toLocaleString()}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 h-1.5 bg-[#f0eee8] rounded-full overflow-hidden">
                                            <div 
                                                className="h-full transition-all duration-1000 ease-out" 
                                                style={{ 
                                                    width: `${item.percent}%`, 
                                                    backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] 
                                                }}
                                            />
                                        </div>
                                        <span className="text-[9px] font-mono font-bold text-[#999] w-8 text-right">{item.percent.toFixed(1)}%</span>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <p className="text-center py-10 text-[10px] font-bold text-[#ccc] uppercase italic">区间内无支出详情</p>
                        )}
                    </div>
                </div>
            </div>

            {/* 收支趋势图 - 维持降低后的高度 */}
            <div className="hammer-card p-6">
              <h3 className="text-xs font-bold text-[#333] tracking-widest uppercase mb-6 flex items-center gap-2"><div className="w-1 h-3.5 bg-[#7d513d]"></div>收支趋势统计</h3>
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={periodStats.trendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#468847" stopOpacity={0.1}/><stop offset="95%" stopColor="#468847" stopOpacity={0}/></linearGradient>
                      <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7d513d" stopOpacity={0.1}/><stop offset="95%" stopColor="#7d513d" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0eee8" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#999', fontSize: 9}} />
                    <YAxis axisLine={false} tickLine={false} width={40} tick={{fill: '#999', fontSize: 9}} />
                    <Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #e0ddd5', fontSize: '10px' }} />
                    <Area type="monotone" name="收入" dataKey="income" stroke="#468847" strokeWidth={2} fillOpacity={1} fill="url(#colorInc)" />
                    <Area type="monotone" name="支出" dataKey="expense" stroke="#7d513d" strokeWidth={2} fillOpacity={1} fill="url(#colorExp)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : activeTab === 'assets' ? (
          <div className="space-y-3 animate-in fade-in duration-300">
            <div className="hammer-card p-6 bg-[#7d513d] text-white relative h-44 flex flex-col justify-between shadow-2xl overflow-hidden">
              <div className="absolute top-[-20px] right-[-20px] opacity-10 pointer-events-none rotate-12"><Wallet size={180} /></div>
              <div className="z-10">
                <p className="text-[10px] font-bold uppercase opacity-60 mb-2 tracking-[0.4em]">净资产汇总 (结余)</p>
                <h2 className="text-4xl font-light tracking-tight flex items-baseline"><span className="text-2xl mr-2 opacity-50">¥</span>{totalAssets.toLocaleString()}</h2>
              </div>
              <div className="flex justify-end gap-3 z-10 w-full">
                <button onClick={() => setIsAccountManagerOpen(true)} className="bg-white/15 text-white px-4 py-2 rounded text-[10px] font-bold uppercase flex items-center gap-2 hover:bg-white/25 border border-white/10 backdrop-blur-sm"><List size={14} /> 账户管理</button>
                <button onClick={() => { setAnalyzingAccount(null); setIsAssetStatsVisible(true); }} className="bg-white/15 text-white px-4 py-2 rounded text-[10px] font-bold uppercase flex items-center gap-2 hover:bg-white/25 border border-white/10 backdrop-blur-sm"><BarChartIcon size={14} /> 趋势统计</button>
              </div>
            </div>
            
            <div className="space-y-3">
               {(Object.entries(groupedAccounts) as [string, (Account & { currentBalance: number })[]][]).map(([type, accs]) => (
                 <div key={type} className="space-y-1.5">
                    <div className="flex items-center gap-2 px-1">
                       <div className="w-1 h-2.5 bg-[#7d513d]/40"></div>
                       <h3 className="text-[9px] font-bold text-[#999] uppercase tracking-[0.2em]">{type}</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {accs.map(acc => (
                        <AccountCard 
                          key={acc.id} 
                          acc={acc} 
                          onEdit={handleEditAccount}
                          onAnalyze={(a) => { setAnalyzingAccount(a); setIsAssetStatsVisible(true); }}
                          onEditBalance={(a) => { setIsEditBalanceModalOpen(a); setManualBalanceValue(a.currentBalance.toString()); }}
                        />
                      ))}
                    </div>
                 </div>
               ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-300">
             {/* 基础设置 */}
             <div className="hammer-card overflow-hidden">
              <div className="p-4 bg-[#f9f9f9] border-b border-[#e0ddd5] flex items-center gap-2"><Settings size={14} className="text-[#7d513d]" /><h3 className="text-xs font-bold text-[#333] uppercase tracking-widest">基础设置</h3></div>
              <div className="p-6 flex items-center justify-between">
                <div><p className="text-sm font-bold text-[#333]">账户余额联动</p><p className="text-[10px] text-[#999] mt-1">记账时同步更新关联账户的余额</p></div>
                <button onClick={() => setEnableAccountLinking(!enableAccountLinking)} className={`w-10 h-5 rounded-full p-0.5 transition-all ${enableAccountLinking ? 'bg-[#7d513d]' : 'bg-[#e0ddd5]'}`}><div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${enableAccountLinking ? 'translate-x-5' : ''}`}></div></button>
              </div>
            </div>

            {/* 收支分类管理 - 默认折叠 */}
            <div className="hammer-card overflow-hidden">
              <div onClick={() => setIsCategoryListExpanded(!isCategoryListExpanded)} className="p-4 bg-[#f9f9f9] border-b border-[#e0ddd5] flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2"><Layers size={14} className="text-[#7d513d]" /><h3 className="text-xs font-bold text-[#333] uppercase tracking-widest">分类管理</h3></div>
                <ChevronDown size={14} className={`text-[#ccc] transition-transform ${isCategoryListExpanded ? 'rotate-180' : ''}`} />
              </div>
              {isCategoryListExpanded && (
                <div className="p-4 space-y-2 animate-in slide-in-from-top duration-300">
                    {categories.map((cat, index) => (
                    <div key={cat.id} className="flex items-center justify-between p-2 border-b border-[#f0eee8] last:border-0">
                        <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                            <button onClick={() => handleMoveCategory(index, 'up')} className="p-0.5 text-[#ccc] hover:text-[#7d513d] disabled:opacity-10" disabled={index === 0}><ChevronUp size={12} /></button>
                            <button onClick={() => handleMoveCategory(index, 'down')} className="p-0.5 text-[#ccc] hover:text-[#7d513d] disabled:opacity-10" disabled={index === categories.length - 1}><ChevronDown size={12} /></button>
                        </div>
                        <div className="w-8 h-8 rounded border flex items-center justify-center text-white" style={{ backgroundColor: cat.color }}>
                            {getIcon(cat.icon, 'w-4 h-4')}
                        </div>
                        <p className="text-xs font-bold">{cat.name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                        <button onClick={() => { setEditingCategory(cat); setCatName(cat.name); setCatIcon(cat.icon); setCatColor(cat.color); setIsCategoryManagerOpen(true); }} className="p-1.5 text-[#ccc] hover:text-[#7d513d]"><Pencil size={12} /></button>
                        <button onClick={() => { if (confirmDeleteCatId === cat.id) { setCategories(categories.filter(c => c.id !== cat.id)); setConfirmDeleteCatId(null); } else { setConfirmDeleteCatId(cat.id); } }} className="p-1.5 text-[#ccc] hover:text-[#b94a48]">{confirmDeleteCatId === cat.id ? <span className="text-[8px] font-bold">确认?</span> : <Trash2 size={12} />}</button>
                        </div>
                    </div>
                    ))}
                    <button onClick={() => { setEditingCategory(null); setCatName(''); setCatIcon('Utensils'); setCatColor(PRESET_COLORS[0]); setIsCategoryManagerOpen(true); }} className="w-full py-2.5 border-2 border-dashed border-[#e0ddd5] rounded text-[9px] font-bold uppercase text-[#999] hover:text-[#7d513d] transition-all"><Plus size={14} className="inline mr-1" />添加新分类</button>
                </div>
              )}
            </div>

            {/* 预算高级规则 */}
            <div className="hammer-card overflow-hidden">
              <div className="p-4 bg-[#f9f9f9] border-b border-[#e0ddd5] flex items-center gap-2"><Target size={14} className="text-[#7d513d]" /><h3 className="text-xs font-bold text-[#333] uppercase tracking-widest">预算高级规则</h3></div>
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm font-bold text-[#333]">余额结转</p><p className="text-[10px] text-[#999] mt-1">本月结余预算自动累计到下月</p></div>
                  <button onClick={() => setEnableBudgetAccumulation(!enableBudgetAccumulation)} className={`w-10 h-5 rounded-full p-0.5 transition-all ${enableBudgetAccumulation ? 'bg-[#7d513d]' : 'bg-[#e0ddd5]'}`}><div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${enableBudgetAccumulation ? 'translate-x-5' : ''}`}></div></button>
                </div>
                <div className="flex items-center justify-between">
                  <div><p className="text-sm font-bold text-[#333]">超支扣除</p><p className="text-[10px] text-[#999] mt-1">本月超支金额自动从下月预算中扣除</p></div>
                  <button onClick={() => setEnableExcessDeduction(!enableExcessDeduction)} className={`w-10 h-5 rounded-full p-0.5 transition-all ${enableExcessDeduction ? 'bg-[#7d513d]' : 'bg-[#e0ddd5]'}`}><div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${enableExcessDeduction ? 'translate-x-5' : ''}`}></div></button>
                </div>
              </div>
            </div>

            {/* 数据管理 */}
            <div className="hammer-card overflow-hidden">
              <div className="p-4 bg-[#f9f9f9] border-b border-[#e0ddd5] flex items-center gap-2"><RefreshCw size={14} className="text-[#7d513d]" /><h3 className="text-xs font-bold text-[#333] uppercase tracking-widest">数据管理</h3></div>
              <div className="divide-y divide-[#f0eee8]">
                <div className="p-6 flex items-center justify-between">
                  <div><p className="text-sm font-bold text-[#333]">数据备份</p><p className="text-[10px] text-[#999] mt-1">复制所有数据到剪贴板</p></div>
                  <button onClick={handleExportData} className="px-4 py-2 bg-[#7d513d] text-white rounded text-[10px] font-bold uppercase flex items-center gap-2 shadow-sm"><Copy size={14} /> 复制备份</button>
                </div>
                <div className="p-6 flex items-center justify-between">
                  <div><p className="text-sm font-bold text-[#333]">数据恢复</p><p className="text-[10px] text-[#999] mt-1">粘贴备份数据进行恢复 (覆盖当前数据)</p></div>
                  <button onClick={() => setIsImportModalOpen(true)} className="px-4 py-2 bg-white border border-[#7d513d] text-[#7d513d] rounded text-[10px] font-bold uppercase flex items-center gap-2 cursor-pointer hover:bg-[#7d513d]/5 transition-colors">
                    <Clipboard size={14} /> 粘贴恢复
                  </button>
                </div>
                <div className="p-6 flex items-center justify-between bg-red-50/20">
                    <div><p className="text-sm font-bold text-[#b94a48]">清空数据</p><p className="text-[10px] text-[#999] mt-1">彻底清除所有交易、账户和预算设置</p></div>
                    <button onClick={() => setConfirmClearData(true)} className="px-4 py-2 bg-[#b94a48] text-white rounded text-[10px] font-bold uppercase flex items-center gap-2 shadow-sm"><Trash size={14} /> 清空</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 底部导航 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#e0ddd5] px-4 py-4 flex items-center justify-around z-[50] shadow-lg pb-safe">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1.5 flex-1 ${activeTab === 'dashboard' ? 'text-[#7d513d]' : 'text-[#999]'}`}><LayoutDashboard size={20} /><span className="text-[9px] font-bold uppercase">首页</span></button>
        <button onClick={() => setActiveTab('stats')} className={`flex flex-col items-center gap-1.5 flex-1 ${activeTab === 'stats' ? 'text-[#7d513d]' : 'text-[#999]'}`}><BarChart3 size={20} /><span className="text-[9px] font-bold uppercase">统计</span></button>
        <div className="px-4"><button onClick={() => setIsModalOpen(true)} className="w-12 h-12 bg-[#7d513d] rounded shadow-xl flex items-center justify-center text-white active:scale-90"><Plus size={28} /></button></div>
        <button onClick={() => setActiveTab('assets')} className={`flex flex-col items-center gap-1.5 flex-1 ${activeTab === 'assets' ? 'text-[#7d513d]' : 'text-[#999]'}`}><Wallet size={20} /><span className="text-[9px] font-bold uppercase">资产</span></button>
        <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1.5 flex-1 ${activeTab === 'settings' ? 'text-[#7d513d]' : 'text-[#999]'}`}><Settings size={20} /><span className="text-[9px] font-bold uppercase">设置</span></button>
      </nav>

      {/* --- 弹窗层 --- */}

      {/* 备份复制弹窗 */}
      {isBackupModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setIsBackupModalOpen(false)}>
          <div className="bg-white w-full max-w-sm rounded border border-[#e0ddd5] shadow-2xl p-6" onClick={e => e.stopPropagation()}>
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-xs font-bold uppercase tracking-widest text-[#333]">复制备份数据</h2>
                <button onClick={() => setIsBackupModalOpen(false)}><X size={24} className="text-[#ccc]" /></button>
             </div>
             <textarea 
               readOnly
               value={backupText}
               className="w-full h-40 p-2 border border-[#e0ddd5] rounded text-[10px] font-mono text-[#333] bg-[#fafafa] outline-none resize-none mb-4 custom-scrollbar"
             />
             <button onClick={copyBackupToClipboard} className="w-full py-3 bg-[#7d513d] text-white rounded text-[10px] font-bold uppercase tracking-widest shadow-lg">复制到剪贴板</button>
          </div>
        </div>
      )}

      {/* 数据恢复弹窗 */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setIsImportModalOpen(false)}>
          <div className="bg-white w-full max-w-sm rounded border border-[#e0ddd5] shadow-2xl p-6" onClick={e => e.stopPropagation()}>
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-xs font-bold uppercase tracking-widest text-[#333]">粘贴备份数据</h2>
                <button onClick={() => setIsImportModalOpen(false)}><X size={24} className="text-[#ccc]" /></button>
             </div>
             <textarea 
               value={importText}
               onChange={e => setImportText(e.target.value)}
               placeholder="请在此处粘贴 JSON 备份内容..."
               className="w-full h-40 p-2 border border-[#e0ddd5] rounded text-[10px] font-mono text-[#333] bg-[#fafafa] outline-none resize-none mb-4 custom-scrollbar"
             />
             <button onClick={handlePasteRestore} className="w-full py-3 bg-[#7d513d] text-white rounded text-[10px] font-bold uppercase tracking-widest shadow-lg">确认恢复</button>
          </div>
        </div>
      )}

      {/* 清空数据确认弹窗 */}
      {confirmClearData && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <div className="bg-white w-full max-w-xs rounded-lg p-6 text-center shadow-2xl">
                <AlertCircle size={48} className="mx-auto text-[#b94a48] mb-4" />
                <h2 className="text-sm font-bold uppercase mb-2">清空全部数据？</h2>
                <p className="text-[10px] text-[#999] font-bold mb-6">此操作不可撤销，所有记录将永久删除。</p>
                <div className="flex gap-3">
                    <button onClick={() => setConfirmClearData(false)} className="flex-1 py-3 border border-[#e0ddd5] rounded text-[10px] font-bold uppercase">取消</button>
                    <button onClick={handleClearAllData} className="flex-1 py-3 bg-[#b94a48] text-white rounded text-[10px] font-bold uppercase">确认清空</button>
                </div>
            </div>
        </div>
      )}

      {/* 分类编辑弹窗 */}
      {isCategoryManagerOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setIsCategoryManagerOpen(false)}>
          <div className="bg-white w-full max-w-sm rounded shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xs font-bold uppercase tracking-widest">{editingCategory ? '编辑分类' : '新增分类'}</h2>
            <form onSubmit={(e) => {
                e.preventDefault();
                const newCat: CategoryInfo = {
                  id: editingCategory?.id || Date.now().toString(),
                  name: catName,
                  icon: catIcon,
                  color: catColor
                };
                if (editingCategory) setCategories(categories.map(c => c.id === editingCategory.id ? newCat : c));
                else setCategories([...categories, newCat]);
                setIsCategoryManagerOpen(false);
            }} className="space-y-4">
              <input type="text" value={catName} onChange={e => setCatName(e.target.value)} required placeholder="分类名称" className="w-full border-b py-2 text-sm outline-none" />
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#999] uppercase">选择图标</label>
                <div className="grid grid-cols-6 gap-2 pt-2">
                  {['Utensils', 'Car', 'ShoppingBag', 'Home', 'Film', 'Coffee', 'Activity', 'Briefcase', 'Smartphone', 'Gift', 'MoreHorizontal', 'Tag'].map(icon => (
                    <button key={icon} type="button" onClick={() => setCatIcon(icon)} className={`p-2 border rounded flex items-center justify-center transition-all ${catIcon === icon ? 'bg-[#7d513d] text-white border-[#7d513d]' : 'text-[#ccc] border-[#e0ddd5]'}`}>
                      {getIcon(icon, 'w-4 h-4')}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#999] uppercase">选择颜色</label>
                <div className="flex flex-wrap gap-2 pt-2">
                    {PRESET_COLORS.map(c => (
                        <button key={c} type="button" onClick={() => setCatColor(c)} className={`w-6 h-6 rounded-full border-2 transition-all ${catColor === c ? 'border-[#333] scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                    ))}
                </div>
              </div>
              <button type="submit" className="w-full py-4 bg-[#7d513d] text-white rounded text-[10px] font-bold uppercase tracking-[0.3em] shadow-lg mt-4">确认保存</button>
            </form>
          </div>
        </div>
      )}

      {/* 资产趋势统计弹窗 - 包含峰值谷值均值 */}
      {isAssetStatsVisible && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setIsAssetStatsVisible(false)}>
          <div className="bg-white w-full max-w-lg rounded shadow-2xl flex flex-col p-6 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
               <h2 className="text-sm font-bold uppercase tracking-widest">{analyzingAccount ? `${analyzingAccount.name} 趋势` : '资产趋势'}</h2>
               <button onClick={() => setIsAssetStatsVisible(false)}><X size={24} className="text-[#ccc]" /></button>
            </div>
            
            {/* 峰值谷值统计卡片 */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="hammer-card p-3 bg-[#fdfaf5]">
                    <p className="text-[8px] font-bold text-[#999] uppercase mb-1">峰值</p>
                    <p className="text-[11px] font-mono font-bold text-[#333]">¥{assetHistoryData.peak.toLocaleString()}</p>
                </div>
                <div className="hammer-card p-3 bg-[#fdfaf5]">
                    <p className="text-[8px] font-bold text-[#999] uppercase mb-1">谷值</p>
                    <p className="text-[11px] font-mono font-bold text-[#b94a48]">¥{assetHistoryData.trough.toLocaleString()}</p>
                </div>
                <div className="hammer-card p-3 bg-[#fdfaf5]">
                    <p className="text-[8px] font-bold text-[#999] uppercase mb-1">日均</p>
                    <p className="text-[11px] font-mono font-bold text-[#7d513d]">¥{assetHistoryData.average.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                </div>
            </div>

            <div className="flex gap-2 mb-6">
              {(['1m', '3m', '1y'] as AssetPeriod[]).map(p => (
                <button key={p} onClick={() => setAssetTrendPeriod(p)} className={`px-4 py-1 rounded text-[10px] font-bold uppercase border transition-all ${assetTrendPeriod === p ? 'bg-[#7d513d] text-white border-[#7d513d]' : 'text-[#999] border-[#e0ddd5]'}`}>
                  {p === '1m' ? '1个月' : p === '3m' ? '3个月' : '1年'}
                </button>
              ))}
            </div>

            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={assetHistoryData.history} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={analyzingAccount?.color || "#7d513d"} stopOpacity={0.2}/>
                      <stop offset="95%" stopColor={analyzingAccount?.color || "#7d513d"} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0eee8" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#999', fontSize: 8}} />
                  <YAxis axisLine={false} tickLine={false} width={45} tick={{fill: '#999', fontSize: 8}} />
                  <Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #e0ddd5', fontSize: '10px' }} />
                  <Area type="monotone" name="余额" dataKey="balance" stroke={analyzingAccount?.color || "#7d513d"} strokeWidth={2} fillOpacity={1} fill="url(#colorBalance)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* 历史明细弹窗 */}
      {isHistoryVisible && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setIsHistoryVisible(false)}>
          <div className="bg-white w-full max-w-2xl rounded shadow-2xl flex flex-col h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <h2 className="text-sm font-bold uppercase tracking-widest">流水历史</h2>
                    <div className="relative"><Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#ccc]" /><input type="text" placeholder="搜索备注..." value={historySearch} onChange={e => setHistorySearch(e.target.value)} className="pl-7 pr-2 py-1 bg-[#f0eee8] rounded text-[10px] outline-none w-32 md:w-48" /></div>
                </div>
                <button onClick={() => setIsHistoryVisible(false)}><X size={24} className="text-[#ccc]" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {transactions
                .filter(t => (t.note || '').toLowerCase().includes(historySearch.toLowerCase()) || (t.category || '').toLowerCase().includes(historySearch.toLowerCase()))
                .map(t => (
                  <div key={t.id} className="flex items-center justify-between p-3 border-b border-[#f0eee8] hover:bg-[#fafafa]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded border border-[#e0ddd5] flex items-center justify-center text-white bg-white" style={{ backgroundColor: categories.find(c => c.name === t.category)?.color || '#9ca3af' }}>
                          {getIcon(categories.find(c => c.name === t.category)?.icon || 'MoreHorizontal', 'w-4 h-4')}
                      </div>
                      <div>
                        <p className="text-xs font-bold">{t.category}</p>
                        <p className="text-[9px] text-[#999]">{t.date.split('T')[0]} {t.note}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className={`text-sm font-mono font-bold ${t.type === 'income' ? 'text-[#468847]' : 'text-[#333]'}`}>{t.type === 'income' ? '+' : '-'}¥{t.amount.toLocaleString()}</p>
                      <button onClick={() => setTransactions(transactions.filter(tx => tx.id !== t.id))} className="text-[#ccc] hover:text-[#b94a48]"><Trash2 size={14} /></button>
                    </div>
                  </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 新增流水弹窗 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
          <div className="bg-[#fafafa] w-full max-sm:w-[95%] max-w-sm rounded border border-[#e0ddd5] shadow-2xl p-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4"><h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#333]">记一笔</h2><button onClick={() => setIsModalOpen(false)}><X size={20} className="text-[#ccc]" /></button></div>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div className="flex p-1 bg-[#f0eee8] rounded border border-[#e0ddd5]">
                <button type="button" onClick={() => setType('expense')} className={`flex-1 py-1 rounded text-[9px] font-bold uppercase ${type === 'expense' ? 'bg-white text-[#333]' : 'text-[#999]'}`}>支出</button>
                <button type="button" onClick={() => setType('income')} className={`flex-1 py-1 rounded text-[9px] font-bold uppercase ${type === 'income' ? 'bg-white text-[#468847]' : 'text-[#999]'}`}>收入</button>
              </div>
              <div className="border-b border-[#e0ddd5] pb-1.5 flex items-baseline"><span className="text-[#ccc] text-base mr-1.5">¥</span><input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" autoFocus className="bg-transparent text-3xl font-light w-full outline-none font-mono" /></div>
              <div className="grid grid-cols-2 gap-4">
                <input type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} className="w-full bg-[#f0eee8] border border-[#e0ddd5] px-2 py-1.5 rounded text-[10px] font-mono font-bold text-[#333] outline-none" />
                <select value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)} className="w-full bg-[#f0eee8] border border-[#e0ddd5] px-2 py-1.5 rounded text-[10px] font-bold text-[#333] outline-none">
                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <div className="grid grid-cols-5 gap-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                    {categories.map((cat: CategoryInfo) => (
                        <button key={cat.id} type="button" onClick={() => setCategoryName(cat.name)} className={`py-1.5 rounded border flex flex-col items-center gap-1 transition-all ${categoryName === cat.name ? 'border-[#7d513d] bg-[#fdfaf5]' : 'border-transparent opacity-60'}`}>
                            <div className="w-8 h-8 border rounded flex items-center justify-center bg-white text-white" style={{ backgroundColor: cat.color }}>{getIcon(cat.icon, 'w-3.5 h-3.5')}</div>
                            <span className="text-[7px] font-bold truncate w-full text-center uppercase">{cat.name}</span>
                        </button>
                    ))}
                </div>
              </div>
              <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="写点什么..." className="w-full border-b border-[#e0ddd5] py-1.5 text-xs outline-none bg-transparent" />
              <button type="submit" className="w-full py-3 bg-[#7d513d] text-white rounded text-[9px] font-bold uppercase tracking-[0.3em] shadow-lg">保存</button>
            </form>
          </div>
        </div>
      )}

      {/* 账户排序管理弹窗 */}
      {isAccountManagerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setIsAccountManagerOpen(false)}>
          <div className="bg-white w-full max-w-sm rounded shadow-2xl flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center"><h2 className="text-xs font-bold uppercase tracking-widest">账户管理</h2><button onClick={() => setIsAccountManagerOpen(false)}><X size={24} className="text-[#ccc]" /></button></div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {accounts.map((acc, index) => (
                <div key={acc.id} className="flex items-center justify-between p-2 border rounded bg-white">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                        <button onClick={() => handleMoveAccount(index, 'up')} className="p-0.5 text-[#ccc] hover:text-[#7d513d] disabled:opacity-20" disabled={index === 0}><ChevronUp size={12} /></button>
                        <button onClick={() => handleMoveAccount(index, 'down')} className="p-0.5 text-[#ccc] hover:text-[#7d513d] disabled:opacity-20" disabled={index === accounts.length - 1}><ChevronDown size={12} /></button>
                    </div>
                    <div className="w-8 h-8 rounded border flex items-center justify-center text-white" style={{ backgroundColor: acc.color }}>
                        {React.cloneElement(getAccountIcon(acc.type, acc.isLiability, acc.isSavings) as React.ReactElement, { size: 14 })}
                    </div>
                    <p className="text-xs font-bold">{acc.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEditAccount(acc)} className="p-1.5 text-[#ccc] hover:text-[#7d513d]"><Pencil size={12} /></button>
                    <button onClick={() => { if (confirmDeleteAccId === acc.id) { setAccounts(accounts.filter(a => a.id !== acc.id)); setConfirmDeleteAccId(null); } else { setConfirmDeleteAccId(acc.id); } }} className="p-1 rounded text-[#ccc] hover:text-[#b94a48]">{confirmDeleteAccId === acc.id ? <span className="text-[7px]">确认?</span> : <Trash2 size={14} />}</button>
                  </div>
                </div>
              ))}
              <button onClick={() => { setEditingAccount(null); setAccName(''); setAccNote(''); setAccInitialBalance('0'); setAccType(accountTypes[0]); setAccIsLiability(false); setAccIsSavings(false); setAccPeriod('12'); setAccTargetAmount('0'); setIsAccountModalOpen(true); }} className="w-full py-2.5 border-2 border-dashed border-[#e0ddd5] rounded text-[9px] font-bold uppercase text-[#999] hover:text-[#7d513d]"><Plus size={14} className="inline mr-1" />新增账户</button>
            </div>
          </div>
        </div>
      )}

      {/* 账户编辑弹窗 */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => { setIsAccountModalOpen(false); setEditingAccount(null); }}>
          <div className="bg-white w-full max-w-sm rounded shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xs font-bold uppercase tracking-widest mb-6">{editingAccount ? '编辑账户' : '新增账户'}</h2>
            <form onSubmit={handleSaveAccount} className="space-y-4">
              <input type="text" value={accName} onChange={e => setAccName(e.target.value)} required placeholder="账户名称" className="w-full border-b py-2 text-sm outline-none" />
              <input type="text" value={accNote} onChange={e => setAccNote(e.target.value)} placeholder="备注 (选填)" className="w-full border-b py-2 text-xs outline-none text-[#666]" />
              <div className="flex items-baseline border-b py-1"><span className="text-xs text-[#ccc] mr-1">¥</span><input type="number" step="0.01" value={accInitialBalance} onChange={e => setAccInitialBalance(e.target.value)} className="w-full text-lg font-mono outline-none" /></div>
              <select value={accType} onChange={e => setAccType(e.target.value)} className="w-full border-b py-2 text-sm">
                   {accountTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => { setAccIsLiability(!accIsLiability); if(!accIsLiability) setAccIsSavings(false); }} className={`p-2 border rounded text-[10px] font-bold transition-colors ${accIsLiability ? 'bg-[#b94a48] text-white border-[#b94a48]' : 'text-[#999] border-[#e0ddd5]'}`}>负债账户</button>
                <button type="button" onClick={() => { setAccIsSavings(!accIsSavings); if(!accIsSavings) setAccIsLiability(false); }} className={`p-2 border rounded text-[10px] font-bold transition-colors ${accIsSavings ? 'bg-[#7d513d] text-white border-[#7d513d]' : 'text-[#999] border-[#e0ddd5]'}`}>攒钱账户</button>
              </div>
              {(accIsLiability || accIsSavings) && (
                <div className="space-y-4 p-4 bg-[#fdfaf5] border border-[#e0ddd5] rounded animate-in slide-in-from-top duration-300">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#7d513d] uppercase tracking-tighter">{accIsLiability ? '总债务金额' : '攒钱目标金额'}</label>
                        <div className="flex items-center border-b border-[#e0ddd5]"><span className="text-xs text-[#ccc] mr-1">¥</span><input type="number" value={accTargetAmount} onChange={e => setAccTargetAmount(e.target.value)} className="w-full bg-transparent py-1 text-sm font-mono font-bold outline-none" /></div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#7d513d] uppercase tracking-tighter">{accIsLiability ? '还款周期 (月)' : '攒钱周期 (月)'}</label>
                        <div className="flex items-center border-b border-[#e0ddd5]"><input type="number" min="1" value={accPeriod} onChange={e => setAccPeriod(e.target.value)} className="w-full bg-transparent py-1 text-sm font-mono font-bold outline-none" /><span className="text-[10px] text-[#ccc] ml-2">月</span></div>
                    </div>
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-1">{PRESET_COLORS.map(c => (<button key={c} type="button" onClick={() => setAccColor(c)} className={`w-6 h-6 rounded-full border-2 transition-all ${accColor === c ? 'border-[#333] scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />))}</div>
              <button type="submit" className="w-full py-4 bg-[#7d513d] text-white rounded text-[10px] font-bold uppercase tracking-[0.3em] shadow-lg">确认保存</button>
            </form>
          </div>
        </div>
      )}

      {/* 预算管理弹窗 */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setIsBudgetModalOpen(false)}>
          <div className="bg-white w-full max-w-lg rounded shadow-2xl flex flex-col h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex justify-between items-center"><h2 className="text-xs font-bold uppercase tracking-widest">预算编排与排序</h2><button onClick={() => setIsBudgetModalOpen(false)}><X size={24} className="text-[#ccc]" /></button></div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f4f1ea]/20 custom-scrollbar">
              {categories.map((cat, index) => {
                const b = budgets.find(x => x.category === cat.name);
                const isExp = expandedBudgetCategory === cat.name;
                return (
                  <div key={cat.id} className="border rounded bg-white overflow-hidden shadow-sm">
                    <div className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => setExpandedBudgetCategory(isExp ? null : cat.name)}>
                        <div className="w-8 h-8 rounded border flex items-center justify-center text-white" style={{ backgroundColor: cat.color }}>{getIcon(cat.icon, 'w-4 h-4')}</div>
                        <span className="text-xs font-bold">{cat.name}</span>
                        <ChevronDown size={14} className={`transition-transform duration-300 ${isExp ? 'rotate-180' : ''}`} />
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                           <button onClick={(e) => { e.stopPropagation(); handleMoveCategory(index, 'up'); }} className="p-0.5 text-[#ccc] hover:text-[#7d513d] disabled:opacity-10" disabled={index === 0}><ChevronUp size={14} /></button>
                           <button onClick={(e) => { e.stopPropagation(); handleMoveCategory(index, 'down'); }} className="p-0.5 text-[#ccc] hover:text-[#7d513d] disabled:opacity-10" disabled={index === categories.length - 1}><ChevronDown size={14} /></button>
                        </div>
                        <div className="text-right min-w-[60px]"><p className="text-[10px] font-mono font-bold">¥{(b?.limit || 0).toLocaleString()}</p></div>
                      </div>
                    </div>
                    {isExp && (
                      <div className="p-4 bg-[#fafafa] border-t border-[#f0eee8] animate-in slide-in-from-top duration-300 grid grid-cols-1 gap-4">
                        <div className="flex items-baseline gap-1 border-b pb-1">
                            <span className="text-[10px] text-[#999] w-12">日预算</span>
                            <span className="text-[10px] text-[#ccc]">¥</span>
                            <input type="number" className="w-full text-xs font-mono font-bold outline-none bg-transparent" value={b?.dailyLimit || ''} onChange={(e) => handleUpdateBudget(cat.name, 'dailyLimit', Number(e.target.value))} placeholder="可选" />
                        </div>
                        <div className="flex items-baseline gap-1 border-b pb-1">
                            <span className="text-[10px] text-[#7d513d] font-bold w-12">月预算</span>
                            <span className="text-[10px] text-[#ccc]">¥</span>
                            <input type="number" className="w-full text-xs font-mono font-bold outline-none bg-transparent" value={b?.limit || ''} onChange={(e) => handleUpdateBudget(cat.name, 'limit', Number(e.target.value))} placeholder="0" />
                        </div>
                        <div className="flex items-baseline gap-1 border-b pb-1">
                            <span className="text-[10px] text-[#999] w-12">年预算</span>
                            <span className="text-[10px] text-[#ccc]">¥</span>
                            <input type="number" className="w-full text-xs font-mono font-bold outline-none bg-transparent" value={b?.yearlyLimit || ''} onChange={(e) => handleUpdateBudget(cat.name, 'yearlyLimit', Number(e.target.value))} placeholder="可选" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t flex justify-end">
                <button onClick={() => setIsBudgetModalOpen(false)} className="px-8 py-3 bg-[#7d513d] text-white rounded text-[10px] font-bold uppercase tracking-widest">保存退出</button>
            </div>
          </div>
        </div>
      )}

      {/* 余额校准弹窗 */}
      {isEditBalanceModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setIsEditBalanceModalOpen(null)}>
          <div className="bg-white w-full max-w-sm rounded border border-[#e0ddd5] shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <div><h2 className="text-xs font-bold uppercase tracking-widest text-[#333]">校准余额</h2><p className="text-[10px] text-[#999] font-bold mt-0.5">{isEditBalanceModalOpen.name}</p></div>
              <button onClick={() => setIsEditBalanceModalOpen(null)}><X size={24} className="text-[#ccc]" /></button>
            </div>
            <form onSubmit={handleUpdateBalance} className="space-y-6">
              <div className="flex items-baseline gap-1 border-b py-2"><span className="text-xs text-[#ccc]">¥</span><input type="number" step="0.01" value={manualBalanceValue} onChange={e => setManualBalanceValue(e.target.value)} autoFocus className="w-full text-3xl font-mono font-light outline-none" /></div>
              <button type="submit" className="w-full py-4 bg-[#7d513d] text-white rounded text-[10px] font-bold uppercase tracking-widest shadow-lg">确认修正</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
