
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, BarChart3, LayoutDashboard, X, Trash2, ChevronRight, ChevronLeft, 
  ChevronDown, TrendingUp, Settings, 
  Wallet, CreditCard, Landmark, Coins, PlusCircle, 
  Pencil, RefreshCw, BarChart, List, BadgePercent, GripVertical, 
  Calendar as CalendarIcon, AlertCircle, Target, Tag,
  // Added missing imports for Save and FileUp icons
  Save, FileUp
} from 'lucide-react';
import { Transaction, Budget, CategoryInfo, Account } from './types';
import { CATEGORIES as INITIAL_CATEGORIES, getIcon } from './constants';
import StatsCards from './components/StatsCards';
import BudgetTracker from './components/BudgetTracker';
import { 
  ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, 
  BarChart as ReBarChart, Bar, AreaChart, Area
} from 'recharts';

type Tab = 'dashboard' | 'stats' | 'assets' | 'settings';
type AssetPeriod = '1m' | '3m' | '1y';

const DEFAULT_ACCOUNTS: Account[] = [
  { id: '1', name: '现金', type: '现金', initialBalance: 0, color: '#7d513d' },
  { id: '2', name: '支付宝', type: '第三方支付', initialBalance: 0, color: '#1677ff' },
  { id: '3', name: '微信支付', type: '第三方支付', initialBalance: 0, color: '#07c160' },
  { id: '4', name: '招商银行', type: '银行储蓄', initialBalance: 0, color: '#333333' },
];

const DEFAULT_ACCOUNT_TYPES = ['现金', '第三方支付', '银行储蓄', '信用卡/负债', '理财/投资'];
const PRESET_COLORS = ['#7d513d', '#1677ff', '#07c160', '#333333', '#e11d48', '#7c3aed', '#ea580c', '#0891b2', '#4b5563'];

const COLOR_MAP: Record<string, string> = {
  'bg-orange-500': '#f97316',
  'bg-blue-500': '#3b82f6',
  'bg-pink-500': '#ec4899',
  'bg-indigo-500': '#6366f1',
  'bg-purple-500': '#a855f7',
  'bg-amber-600': '#d97706',
  'bg-red-500': '#ef4444',
  'bg-slate-700': '#334155',
  'bg-cyan-500': '#06b6d4',
  'bg-rose-400': '#fb7185',
  'bg-gray-400': '#9ca3af',
};

const BrandIcon = () => (
  <div className="relative w-10 h-10 flex items-center justify-center">
    <div className="absolute inset-0 bg-[#7d513d] rounded-lg shadow-md transform rotate-3"></div>
    <div className="absolute inset-0 bg-[#fafafa] rounded-lg border border-[#e0ddd5] flex items-center justify-center shadow-sm">
      <div className="w-5 h-5 border-2 border-[#7d513d] rounded-full flex items-center justify-center">
        <div className="w-1 h-1 bg-[#7d513d] rounded-full"></div>
      </div>
    </div>
  </div>
);

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

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [assetTrendPeriod, setAssetTrendPeriod] = useState<AssetPeriod>('1m');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [expandedBudgetCategory, setExpandedBudgetCategory] = useState<string | null>(null);
  const [isAssetStatsVisible, setIsAssetStatsVisible] = useState(false);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryInfo | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  
  const [confirmDeleteTxId, setConfirmDeleteTxId] = useState<string | null>(null);
  const [confirmDeleteAccId, setConfirmDeleteAccId] = useState<string | null>(null);
  const [confirmDeleteCatId, setConfirmDeleteCatId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  
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
  
  const [enableAccountLinking, setEnableAccountLinking] = useState<boolean>(() => {
    const saved = localStorage.getItem('zen_enable_account_linking');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [enableBudgetAccumulation, setEnableBudgetAccumulation] = useState<boolean>(() => {
    const saved = localStorage.getItem('zen_enable_budget_accumulation');
    return saved !== null ? JSON.parse(saved) : false;
  });

  const [enableExcessDeduction, setEnableExcessDeduction] = useState<boolean>(() => {
    const saved = localStorage.getItem('zen_enable_excess_deduction');
    return saved !== null ? JSON.parse(saved) : false;
  });

  const [categories, setCategories] = useState<CategoryInfo[]>(() => {
    const saved = localStorage.getItem('zen_categories');
    return saved ? (JSON.parse(saved) as CategoryInfo[]) : INITIAL_CATEGORIES;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('zen_transactions');
    return saved ? (JSON.parse(saved) as Transaction[]) : [];
  });
  
  const [budgets, setBudgets] = useState<Budget[]>(() => {
    const saved = localStorage.getItem('zen_budgets');
    return saved ? (JSON.parse(saved) as Budget[]) : [
      { category: '餐饮', limit: 2000, dailyLimit: 66, yearlyLimit: 24000 },
      { category: '交通', limit: 500, dailyLimit: 16, yearlyLimit: 6000 },
      { category: '购物', limit: 1500, dailyLimit: 50, yearlyLimit: 18000 }
    ];
  });

  const [accounts, setAccounts] = useState<Account[]>(() => {
    const saved = localStorage.getItem('zen_accounts');
    return saved ? (JSON.parse(saved) as Account[]) : DEFAULT_ACCOUNTS;
  });

  const [accountTypes, setAccountTypes] = useState<string[]>(() => {
    const saved = localStorage.getItem('zen_account_types');
    return saved ? (JSON.parse(saved) as string[]) : DEFAULT_ACCOUNT_TYPES;
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  const [amount, setAmount] = useState('');
  const [categoryName, setCategoryName] = useState(categories[0]?.name || '');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [note, setNote] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);

  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState(accountTypes[0]);
  const [accInitialBalance, setAccInitialBalance] = useState('0');
  const [accColor, setAccColor] = useState(PRESET_COLORS[0]);
  const [accIsLiability, setAccIsLiability] = useState(false);
  const [accIsSavings, setAccIsSavings] = useState(false);
  const [accPeriod, setAccPeriod] = useState('12');

  const openAddAccount = () => {
    setEditingAccount(null);
    setAccName('');
    setAccType(accountTypes[0]);
    setAccInitialBalance('0');
    setAccColor(PRESET_COLORS[0]);
    setAccIsLiability(false);
    setAccIsSavings(false);
    setAccPeriod('12');
    setIsAccountModalOpen(true);
  };

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  useEffect(() => { localStorage.setItem('zen_categories', JSON.stringify(categories)); }, [categories]);
  useEffect(() => { localStorage.setItem('zen_transactions', JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem('zen_budgets', JSON.stringify(budgets)); }, [budgets]);
  useEffect(() => { localStorage.setItem('zen_accounts', JSON.stringify(accounts)); }, [accounts]);
  useEffect(() => { localStorage.setItem('zen_account_types', JSON.stringify(accountTypes)); }, [accountTypes]);
  useEffect(() => { localStorage.setItem('zen_enable_account_linking', JSON.stringify(enableAccountLinking)); }, [enableAccountLinking]);
  useEffect(() => { localStorage.setItem('zen_enable_budget_accumulation', JSON.stringify(enableBudgetAccumulation)); }, [enableBudgetAccumulation]);
  useEffect(() => { localStorage.setItem('zen_enable_excess_deduction', JSON.stringify(enableExcessDeduction)); }, [enableExcessDeduction]);

  const accountBalances = useMemo<(Account & { currentBalance: number })[]>(() => {
    return accounts.map(acc => {
      const accTransactions = transactions.filter(t => t.accountId === acc.id);
      const balance = accTransactions.reduce((sum, t) => {
        if (acc.isLiability) return t.type === 'expense' ? sum + t.amount : sum - t.amount;
        return t.type === 'income' ? sum + t.amount : sum - t.amount;
      }, acc.initialBalance);
      return { ...acc, currentBalance: balance };
    });
  }, [accounts, transactions]);

  const totalAssets = useMemo(() => accountBalances.reduce((sum, acc) => acc.isLiability ? sum - acc.currentBalance : sum + acc.currentBalance, 0), [accountBalances]);

  const groupedAccounts = useMemo(() => {
    const groups: Record<string, (Account & { currentBalance: number })[]> = {};
    accountBalances.forEach(acc => {
      if (!groups[acc.type]) groups[acc.type] = [];
      groups[acc.type].push(acc);
    });
    return groups;
  }, [accountBalances]);

  const monthlyStats = useMemo(() => {
    const [year, month] = dashboardMonth.split('-').map(Number);
    const currentMonthTransactions = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === month - 1 && d.getFullYear() === year;
    });
    const income = currentMonthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = currentMonthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expense };
  }, [transactions, dashboardMonth]);

  const dashboardTransactions = useMemo(() => {
      const [year, month] = dashboardMonth.split('-').map(Number);
      return transactions.filter(t => {
          const d = new Date(t.date);
          return d.getMonth() === month - 1 && d.getFullYear() === year;
      });
  }, [transactions, dashboardMonth]);

  const periodStats = useMemo(() => {
    const start = new Date(startDate); start.setHours(0,0,0,0);
    const end = new Date(endDate); end.setHours(23,59,59,999);
    const txs = transactions.filter(t => { const d = new Date(t.date); return d >= start && d <= end; });
    const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);

    const categoryData = categories.map(c => {
      const value = txs.filter(t => t.category === c.name && t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      const tailwindColor = INITIAL_CATEGORIES.find(ic => ic.name === c.name)?.color || 'bg-gray-400';
      return { 
        name: c.name, 
        value, 
        color: COLOR_MAP[tailwindColor] || '#9ca3af'
      };
    }).filter(d => d.value > 0);

    const trendData: { date: string, income: number, expense: number }[] = [];
    const curr = new Date(start);
    while (curr <= end) {
      const dateStr = curr.toISOString().split('T')[0];
      const dayTxs = txs.filter(t => t.date.startsWith(dateStr));
      trendData.push({
        date: dateStr.slice(5), 
        income: dayTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        expense: dayTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      });
      curr.setDate(curr.getDate() + 1);
    }

    return { 
      income, 
      expense, 
      categoryData, 
      trendData,
      stackedData: [{ name: '支出占比', ...categoryData.reduce((acc, curr) => ({...acc, [curr.name]: curr.value}), {} as Record<string, number>) }] 
    };
  }, [transactions, categories, startDate, endDate]);

  const activeTrendData = useMemo<{ date: string; value: number }[]>(() => {
    const dates: {date: string, value: number}[] = [];
    const today = new Date();
    const count = assetTrendPeriod === '1m' ? 30 : (assetTrendPeriod === '3m' ? 90 : 12);
    
    for (let i = count; i >= 0; i--) {
      const d = new Date(today);
      if (assetTrendPeriod === '1y') d.setMonth(today.getMonth() - i); else d.setDate(today.getDate() - i);
      
      let val = 0;
      if (analyzingAccount) {
        const accNet = transactions.filter(t => t.accountId === analyzingAccount.id && new Date(t.date).getTime() <= d.getTime())
          .reduce((sum, t) => analyzingAccount.isLiability ? (t.type === 'expense' ? sum + t.amount : sum - t.amount) : (t.type === 'income' ? sum + t.amount : sum - t.amount), 0);
        val = analyzingAccount.initialBalance + accNet;
      } else {
        accounts.forEach(acc => {
          const accNet = transactions.filter(t => t.accountId === acc.id && new Date(t.date).getTime() <= d.getTime())
            .reduce((sum, t) => acc.isLiability ? (t.type === 'expense' ? sum + t.amount : sum - t.amount) : (t.type === 'income' ? sum + t.amount : sum - t.amount), 0);
          val += acc.isLiability ? -(acc.initialBalance + accNet) : (acc.initialBalance + accNet);
        });
      }
      dates.push({ date: d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }), value: val });
    }
    return dates;
  }, [accounts, transactions, assetTrendPeriod, analyzingAccount]);

  const budgetAdjustments = useMemo(() => {
    const adjustments: Record<string, number> = {};
    const [y, m] = dashboardMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    
    budgets.forEach(b => {
      const prevSpent = transactions
        .filter(t => t.date.startsWith(prevMonthStr) && t.category === b.category && t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const balance = b.limit - prevSpent;
      let adj = 0;
      if (balance > 0 && enableBudgetAccumulation) adj += balance;
      if (balance < 0 && enableExcessDeduction) adj += balance;
      adjustments[b.category] = adj;
    });
    return adjustments;
  }, [transactions, budgets, dashboardMonth, enableBudgetAccumulation, enableExcessDeduction]);

  const trendStats = useMemo(() => {
    if (activeTrendData.length === 0) return { max: 0, min: 0, avg: 0 };
    const values = activeTrendData.map(d => d.value);
    return {
      max: Math.max(...values),
      min: Math.min(...values),
      avg: Math.floor(values.reduce((a, b) => a + b, 0) / values.length)
    };
  }, [activeTrendData]);

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;
    setTransactions([{ 
      id: Date.now().toString(), 
      amount: Number(amount), 
      category: categoryName, 
      accountId: enableAccountLinking ? selectedAccountId : 'unlinked', 
      note, 
      type, 
      date: new Date(transactionDate).toISOString() 
    }, ...transactions]);
    setAmount(''); setNote(''); setIsModalOpen(false);
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const newAcc: Account = { 
      id: editingAccount?.id || Date.now().toString(), 
      name: accName, 
      type: accType, 
      initialBalance: Number(accInitialBalance), 
      color: accColor, 
      isLiability: accIsLiability, 
      isSavings: accIsSavings,
      repaymentMonths: accIsLiability ? Number(accPeriod) : undefined,
      savingsMonths: accIsSavings ? Number(accPeriod) : undefined
    };
    if (editingAccount) setAccounts(accounts.map(a => a.id === editingAccount.id ? newAcc : a));
    else setAccounts([...accounts, newAcc]);
    setIsAccountModalOpen(false); setEditingAccount(null);
  };

  const handleUpdateBalance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditBalanceModalOpen) return;
    const newVal = Number(manualBalanceValue);
    if (isNaN(newVal)) return;
    const currentVal = accountBalances.find(a => a.id === isEditBalanceModalOpen.id)?.currentBalance || 0;
    const diff = newVal - currentVal;
    if (diff !== 0) {
      setTransactions([{
        id: `adj-${Date.now()}`,
        amount: Math.abs(diff),
        category: '其他',
        accountId: isEditBalanceModalOpen.id,
        note: '余额手动校准',
        date: new Date().toISOString(),
        type: isEditBalanceModalOpen.isLiability ? (diff > 0 ? 'expense' : 'income') : (diff > 0 ? 'income' : 'expense')
      }, ...transactions]);
    }
    setIsEditBalanceModalOpen(null);
  };

  const handleUpdateBudget = (category: string, period: 'monthly' | 'daily' | 'yearly', value: number) => {
    setBudgets(prev => {
      const exists = prev.find(b => b.category === category);
      let updatedBudget: Budget;

      if (exists) {
        updatedBudget = { ...exists };
        if (period === 'daily') {
          updatedBudget.dailyLimit = value;
          updatedBudget.limit = value * 30;
          updatedBudget.yearlyLimit = value * 365;
        } else if (period === 'monthly') {
          updatedBudget.limit = value;
          updatedBudget.dailyLimit = Math.floor(value / 30);
          updatedBudget.yearlyLimit = value * 12;
        } else if (period === 'yearly') {
          updatedBudget.yearlyLimit = value;
          updatedBudget.limit = Math.floor(value / 12);
          updatedBudget.dailyLimit = Math.floor(value / 365);
        }
        return prev.map(b => b.category === category ? updatedBudget : b);
      } else {
        const newBudget: Budget = { category, limit: 0, dailyLimit: 0, yearlyLimit: 0 };
        if (period === 'daily') {
          newBudget.dailyLimit = value;
          newBudget.limit = value * 30;
          newBudget.yearlyLimit = value * 365;
        } else if (period === 'monthly') {
          newBudget.limit = value;
          newBudget.dailyLimit = Math.floor(value / 30);
          newBudget.yearlyLimit = value * 12;
        } else if (period === 'yearly') {
          newBudget.yearlyLimit = value;
          newBudget.limit = Math.floor(value / 12);
          newBudget.dailyLimit = Math.floor(value / 365);
        }
        return [...prev, newBudget];
      }
    });
  };

  const clearConfirmStates = () => {
    setConfirmDeleteTxId(null);
    setConfirmDeleteAccId(null);
    setConfirmDeleteCatId(null);
    setConfirmClearAll(false);
  };

  const handleExportData = () => {
    const data = { transactions, budgets, accounts, accountTypes, categories, settings: { enableAccountLinking, enableBudgetAccumulation, enableExcessDeduction }, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `ZenBudget_Backup.json`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result;
        if (typeof result !== 'string') return;
        const importedData = JSON.parse(result) as any;
        if (importedData && typeof importedData === 'object') {
          if (importedData.transactions && Array.isArray(importedData.transactions)) setTransactions(importedData.transactions);
          if (importedData.budgets && Array.isArray(importedData.budgets)) setBudgets(importedData.budgets);
          if (importedData.accounts && Array.isArray(importedData.accounts)) setAccounts(importedData.accounts);
          if (importedData.accountTypes && Array.isArray(importedData.accountTypes)) setAccountTypes(importedData.accountTypes);
          if (importedData.categories && Array.isArray(importedData.categories)) setCategories(importedData.categories);
          alert('恢复成功！');
        } else {
          throw new Error('Invalid data format');
        }
      } catch (err) { alert('无效文件'); }
    };
    reader.readAsText(file);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCategoryName) return;
    
    if (editingCategory) {
      const oldName = editingCategory.name;
      const newName = editCategoryName;
      setCategories(categories.map(c => c.id === editingCategory.id ? { ...c, name: newName } : c));
      setBudgets(budgets.map(b => b.category === oldName ? { ...b, category: newName } : b));
      setTransactions(transactions.map(t => t.category === oldName ? { ...t, category: newName } : t));
      if (categoryName === oldName) setCategoryName(newName);
    } else {
      const newCat: CategoryInfo = {
        id: Date.now().toString(),
        name: editCategoryName,
        icon: 'MoreHorizontal',
        color: 'bg-gray-400'
      };
      setCategories([...categories, newCat]);
    }
    setEditingCategory(null);
    setEditCategoryName('');
    setShowEditCategoryModal(false);
  };

  const onDragStart = (index: number) => setDraggedItemIndex(index);
  const onDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDropCategories = (index: number) => {
    if (draggedItemIndex === null) return;
    const updated = [...categories];
    const [removed] = updated.splice(draggedItemIndex, 1);
    updated.splice(index, 0, removed);
    setCategories(updated);
    setDraggedItemIndex(null);
  };

  const handleDropAccounts = (index: number) => {
    if (draggedItemIndex === null) return;
    const updated = [...accounts];
    const [removed] = updated.splice(draggedItemIndex, 1);
    updated.splice(index, 0, removed);
    setAccounts(updated);
    setDraggedItemIndex(null);
  };

  const handleClearAllData = () => {
    if (confirmClearAll) { localStorage.clear(); window.location.reload(); }
    else { setConfirmClearAll(true); }
  };

  return (
    <div className="min-h-screen pb-24" onMouseDown={(e) => {
       const target = e.target as HTMLElement;
       if (!target.closest('.delete-action') && !target.closest('.clear-action')) {
         clearConfirmStates();
       }
    }}>
      <main className="max-w-4xl mx-auto px-4 pt-[calc(env(safe-area-inset-top)+1rem)] md:pt-[calc(env(safe-area-inset-top)+2.5rem)]">
        {activeTab === 'dashboard' ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <button onClick={(e) => { e.stopPropagation(); setDashboardMonth(prev => { const [y, m] = prev.split('-').map(Number); const d = new Date(y, m-2, 1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}`; }); }} className="p-1 text-[#ccc] hover:text-[#7d513d] transition-colors"><ChevronLeft size={16} /></button>
                  <div className="relative cursor-pointer px-2 group flex items-center gap-2">
                    <h2 className="text-xl font-serif font-bold text-[#333] whitespace-nowrap">{dashboardMonth.split('-')[0]}年{parseInt(dashboardMonth.split('-')[1])}月</h2>
                    <CalendarIcon size={16} className="text-[#ccc] group-hover:text-[#7d513d] transition-colors" />
                    <input type="month" value={dashboardMonth} onChange={(e) => setDashboardMonth(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setDashboardMonth(prev => { const [y, m] = prev.split('-').map(Number); const d = new Date(y, m, 1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}`; }); }} className="p-1 text-[#ccc] hover:text-[#7d513d] transition-colors"><ChevronRight size={16} /></button>
                </div>
              </div>
            </div>
            
            <StatsCards income={monthlyStats.income} expense={monthlyStats.expense} monthLabel={`${parseInt(dashboardMonth.split('-')[1])}月`} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 space-y-6">
                <div className="hammer-card p-6">
                  <div className="flex items-center justify-between mb-4 border-b border-[#e0ddd5] pb-3">
                    <h3 className="text-xs font-bold text-[#333] tracking-widest uppercase flex items-center gap-2"><div className="w-1 h-3.5 bg-[#7d513d]"></div>流水明细</h3>
                    <button onClick={(e) => { e.stopPropagation(); setIsHistoryVisible(true); }} className="text-[10px] text-[#999] font-bold uppercase hover:text-[#7d513d] transition-colors">全部 <ChevronRight size={12} className="inline" /></button>
                  </div>
                  <div className="space-y-0">
                    {dashboardTransactions.slice(0, 10).map(t => (
                      <div key={t.id} className="flex items-center justify-between py-4 border-b border-[#e0ddd5] last:border-0 group">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded border border-[#e0ddd5] flex items-center justify-center text-[#7d513d] bg-[#f9f9f9] shadow-inner group-hover:scale-110 transition-transform">
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
                          <div><p className={`text-sm font-mono font-bold ${t.type === 'expense' ? 'text-[#333]' : 'text-[#468847]'}`}>{t.type === 'expense' ? '-' : '+'}¥{t.amount.toLocaleString()}</p></div>
                          <button onClick={(e) => { e.stopPropagation(); if (confirmDeleteTxId === t.id) { setTransactions(transactions.filter(tx => tx.id !== t.id)); setConfirmDeleteTxId(null); } else { clearConfirmStates(); setConfirmDeleteTxId(t.id); } }} className={`delete-action p-1.5 rounded transition-all group-hover:opacity-100 ${confirmDeleteTxId === t.id ? 'bg-[#b94a48] text-white' : 'text-[#ccc] hover:text-[#b94a48]'}`}>{confirmDeleteTxId === t.id ? <span className="text-[8px] font-bold px-1 uppercase">删除?</span> : <Trash2 size={12} />}</button>
                        </div>
                      </div>
                    ))}
                    {dashboardTransactions.length === 0 && <div className="py-12 text-center text-[#ccc] text-xs font-bold uppercase italic">暂无记录</div>}
                  </div>
                </div>
              </div>
              <div className="lg:col-span-4">
                <BudgetTracker 
                    transactions={dashboardTransactions} 
                    budgets={budgets} 
                    onOpenManagement={() => setIsBudgetModalOpen(true)} 
                    rolloverAdjustments={budgetAdjustments}
                    enableRollover={enableBudgetAccumulation || enableExcessDeduction}
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
                <div className="relative group">
                   <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-[#f0eee8] border border-[#e0ddd5] px-3 py-1.5 rounded text-[10px] font-mono font-bold text-[#333] outline-none" />
                </div>
                <span className="text-[#999] text-xs">至</span>
                <div className="relative group">
                   <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-[#f0eee8] border border-[#e0ddd5] px-3 py-1.5 rounded text-[10px] font-mono font-bold text-[#333] outline-none" />
                </div>
              </div>
            </div>

            <StatsCards income={periodStats.income} expense={periodStats.expense} monthLabel="区间" />

            <div className="hammer-card p-6">
              <h3 className="text-xs font-bold text-[#333] tracking-widest uppercase mb-6 flex items-center gap-2"><div className="w-1 h-3.5 bg-[#7d513d]"></div>收支趋势</h3>
              <div className="h-[240px] w-full">
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

            <div className="hammer-card p-6">
              <h3 className="text-xs font-bold text-[#333] tracking-widest uppercase mb-6 flex items-center gap-2"><div className="w-1 h-3.5 bg-[#7d513d]"></div>消费构成堆积图</h3>
              <div className="h-[100px] w-full mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <ReBarChart layout="vertical" data={periodStats.stackedData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" hide />
                    <Tooltip 
                      cursor={{fill: 'transparent'}} 
                      contentStyle={{ borderRadius: '4px', border: '1px solid #e0ddd5', fontSize: '10px' }}
                      formatter={(value: any, name: any) => [typeof value === 'number' ? `¥${value.toLocaleString()}` : value, name]}
                    />
                    {periodStats.categoryData.map((cat, index) => (
                      <Bar 
                        key={cat.name} 
                        dataKey={cat.name} 
                        stackId="a" 
                        fill={cat.color} 
                        radius={index === 0 ? [4, 0, 0, 4] : (index === periodStats.categoryData.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0])} 
                      />
                    ))}
                  </ReBarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {periodStats.categoryData.map(cat => (
                  <div key={cat.name} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }}></div>
                    <span className="text-[10px] font-bold text-[#666] uppercase">{cat.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="hammer-card p-6">
              <h3 className="text-xs font-bold text-[#333] tracking-widest uppercase mb-6 flex items-center gap-2"><div className="w-1 h-3.5 bg-[#7d513d]"></div>支出详情分布</h3>
              <div className="grid grid-cols-2 gap-4">
                {periodStats.categoryData.map(cat => (
                  <div key={cat.name} className="flex flex-col gap-1 p-2 border-b border-[#f0eee8]">
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }}></div>
                      <span className="text-[10px] font-bold text-[#666] truncate uppercase">{cat.name}</span>
                    </div>
                    <p className="text-sm font-mono font-bold text-[#333]">¥{cat.value.toLocaleString()}</p>
                    <p className="text-[8px] text-[#ccc] font-bold">占比 {((cat.value / (periodStats.expense || 1)) * 100).toFixed(1)}%</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : activeTab === 'assets' ? (
          <div className="space-y-3 animate-in fade-in duration-300">
            <div className="hammer-card p-6 bg-[#7d513d] text-white relative h-44 flex flex-col justify-between shadow-2xl overflow-hidden">
              <div className="absolute top-[-20px] right-[-20px] opacity-10 pointer-events-none rotate-12">
                <Wallet size={180} />
              </div>
              <div className="z-10">
                <p className="text-[10px] font-bold uppercase opacity-60 mb-2 tracking-[0.4em]">净资产汇总 (结余)</p>
                <h2 className="text-5xl font-light tracking-tight flex items-baseline">
                  <span className="text-2xl mr-2 opacity-50 select-none">¥</span>
                  {totalAssets.toLocaleString()}
                </h2>
              </div>
              <div className="flex justify-end gap-3 z-10 w-full">
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsAccountManagerOpen(true); }} 
                  className="bg-white/15 text-white px-4 py-2 rounded text-[10px] font-bold uppercase flex items-center gap-2 hover:bg-white/25 transition-all active:scale-95 border border-white/10 backdrop-blur-sm"
                >
                  <List size={14} /> 账户管理
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setAnalyzingAccount(null); setIsAssetStatsVisible(true); }} 
                  className="bg-white/15 text-white px-4 py-2 rounded text-[10px] font-bold uppercase flex items-center gap-2 hover:bg-white/25 transition-all active:scale-95 border border-white/10 backdrop-blur-sm"
                >
                  <BarChart size={14} /> 趋势统计
                </button>
              </div>
            </div>
            
            <div className="space-y-3">
               {Object.entries(groupedAccounts).map(([type, accs]) => (
                 <div key={type} className="space-y-1.5">
                    <div className="flex items-center gap-2 px-1">
                       <div className="w-1 h-2.5 bg-[#7d513d]/40"></div>
                       <h3 className="text-[9px] font-bold text-[#999] uppercase tracking-[0.2em]">{type}</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {accs.map(acc => (
                        <div key={acc.id} className="hammer-card p-3 relative transition-shadow hover:shadow-md" style={{ borderBottom: `2px solid ${acc.color}` }}>
                          <button onClick={(e) => { e.stopPropagation(); setAnalyzingAccount(acc); setIsAssetStatsVisible(true); }} className="absolute top-2 right-2 p-1 text-[#ccc] hover:text-[#7d513d] transition-all">
                            <TrendingUp size={12} />
                          </button>
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="w-7 h-7 rounded border border-[#e0ddd5] flex items-center justify-center text-white" style={{ backgroundColor: acc.color }}>
                              {React.cloneElement(getAccountIcon(acc.type, acc.isLiability, acc.isSavings) as React.ReactElement, { size: 14 })}
                            </div>
                            <div className="truncate flex-1">
                                <h4 className="text-[11px] font-bold text-[#333] truncate leading-tight">{acc.name}</h4>
                                {(acc.isLiability || acc.isSavings) && (
                                    <div className="flex items-center gap-1 mt-0.5">
                                      <span className={`text-[7px] px-1 rounded-sm text-white font-bold uppercase ${acc.isLiability ? 'bg-[#b94a48]' : 'bg-[#7d513d]'}`}>
                                        {acc.isLiability ? `${acc.repaymentMonths}M 还款` : `${acc.savingsMonths}M 攒钱`}
                                      </span>
                                    </div>
                                )}
                            </div>
                          </div>
                          <div onClick={(e) => { e.stopPropagation(); setIsEditBalanceModalOpen(acc); setManualBalanceValue(acc.currentBalance.toString()); }} className="cursor-pointer group">
                            <p className={`text-sm font-mono font-bold ${acc.isLiability ? 'text-[#b94a48]' : 'text-[#333]'} group-hover:text-[#7d513d] transition-colors`}>
                              <span className="text-[10px] mr-0.5 opacity-40">¥</span>{Math.abs(acc.currentBalance).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                 </div>
               ))}
               <div className="pt-1">
                 <button onClick={(e) => { e.stopPropagation(); openAddAccount(); }} className="w-full hammer-card p-3.5 border-2 border-dashed border-[#e0ddd5] bg-transparent flex flex-col items-center justify-center gap-1.5 text-[#999] hover:text-[#7d513d] transition-all active:scale-98"><PlusCircle size={20} /><span className="text-[9px] font-bold uppercase tracking-widest">新增资产账户</span></button>
               </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-300">
             <div className="hammer-card overflow-hidden shadow-sm">
              <div className="p-4 bg-[#f9f9f9] border-b border-[#e0ddd5] flex items-center gap-2"><Settings size={14} className="text-[#7d513d]" /><h3 className="text-xs font-bold text-[#333] uppercase tracking-widest">基础设置</h3></div>
              <div className="p-6 flex items-center justify-between"><div><p className="text-sm font-bold text-[#333]">账户余额联动</p><p className="text-[10px] text-[#999] mt-1">记账时同步更新关联账户的余额</p></div><button onClick={(e) => { e.stopPropagation(); setEnableAccountLinking(!enableAccountLinking); }} className={`w-10 h-5 rounded-full p-0.5 transition-all ${enableAccountLinking ? 'bg-[#7d513d]' : 'bg-[#e0ddd5]'}`}><div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${enableAccountLinking ? 'translate-x-5' : ''}`}></div></button></div>
            </div>

            <div className="hammer-card overflow-hidden shadow-sm">
              <div className="p-4 bg-[#f9f9f9] border-b border-[#e0ddd5] flex items-center gap-2"><Tag size={14} className="text-[#7d513d]" /><h3 className="text-xs font-bold text-[#333] uppercase tracking-widest">内容管理</h3></div>
              <div className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-[#333]">收支分类管理</p>
                  <p className="text-[10px] text-[#999] mt-1">编辑分类名称或管理已有分类</p>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsCategoryManagerOpen(true); }} 
                  className="px-4 py-2 border border-[#7d513d] text-[#7d513d] rounded text-[10px] font-bold uppercase hover:bg-[#7d513d] hover:text-white transition-all"
                >
                  进入管理
                </button>
              </div>
            </div>

            <div className="hammer-card overflow-hidden shadow-sm">
              <div className="p-4 bg-[#f9f9f9] border-b border-[#e0ddd5] flex items-center gap-2"><BadgePercent size={14} className="text-[#7d513d]" /><h3 className="text-xs font-bold text-[#333] uppercase tracking-widest">预算高级规则</h3></div>
              <div className="p-6 flex items-center justify-between border-b border-[#e0ddd5]"><div><p className="text-sm font-bold text-[#333]">多余预算累加</p><p className="text-[10px] text-[#999] mt-1">上月未使用的预算额度将加入到本月</p></div><button onClick={(e) => { e.stopPropagation(); setEnableBudgetAccumulation(!enableBudgetAccumulation); }} className={`w-10 h-5 rounded-full p-0.5 transition-all ${enableBudgetAccumulation ? 'bg-[#7d513d]' : 'bg-[#e0ddd5]'}`}><div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${enableBudgetAccumulation ? 'translate-x-5' : ''}`}></div></button></div>
              <div className="p-6 flex items-center justify-between"><div><p className="text-sm font-bold text-[#333]">超额支出扣除</p><p className="text-[10px] text-[#999] mt-1">上月超出预算的部分将从本月额度中扣除</p></div><button onClick={(e) => { e.stopPropagation(); setEnableExcessDeduction(!enableExcessDeduction); }} className={`w-10 h-5 rounded-full p-0.5 transition-all ${enableExcessDeduction ? 'bg-[#7d513d]' : 'bg-[#e0ddd5]'}`}><div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${enableExcessDeduction ? 'translate-x-5' : ''}`}></div></button></div>
            </div>

            <div className="hammer-card overflow-hidden shadow-sm">
              <div className="p-4 bg-[#f4f1ea] border-b border-[#e0ddd5] flex items-center gap-2"><RefreshCw size={14} className="text-[#7d513d]" /><h3 className="text-xs font-bold text-[#333] uppercase tracking-widest">数据管理</h3></div>
              <div className="p-6 flex items-center justify-between border-b border-[#e0ddd5]"><div><p className="text-sm font-bold text-[#333]">备份与恢复</p></div><div className="flex gap-2"><button onClick={(e) => { e.stopPropagation(); handleExportData(); }} className="p-2 border border-[#7d513d] text-[#7d513d] rounded hover:bg-[#7d513d] hover:text-white transition-all"><Save size={18} /></button><button onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="p-2 border border-[#7d513d] text-[#7d513d] rounded hover:bg-[#7d513d] hover:text-white transition-all"><FileUp size={18} /></button><input type="file" ref={fileInputRef} onChange={handleImportData} className="hidden" accept=".json" /></div></div>
              <div className="p-6 flex items-center justify-between bg-red-50/30"><div><p className="text-sm font-bold text-[#333]">清空数据</p></div><button onClick={(e) => { e.stopPropagation(); handleClearAllData(); }} className={`clear-action p-2 rounded transition-all shadow-sm ${confirmClearAll ? 'bg-[#b94a48] text-white' : 'bg-white border border-[#b94a48] text-[#b94a48] hover:bg-[#b94a48] hover:text-white'}`}>{confirmClearAll ? <span className="text-[9px] font-bold uppercase px-2">确认清空?</span> : <Trash2 size={18} />}</button></div>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#e0ddd5] px-4 py-4 flex items-center justify-around z-[110] shadow-lg pb-safe">
        <button onClick={(e) => { e.stopPropagation(); setActiveTab('dashboard'); }} className={`flex flex-col items-center gap-1.5 flex-1 transition-colors ${activeTab === 'dashboard' ? 'text-[#7d513d]' : 'text-[#999]'}`}><LayoutDashboard size={20} /><span className="text-[9px] font-bold uppercase">记账</span></button>
        <button onClick={(e) => { e.stopPropagation(); setActiveTab('stats'); }} className={`flex flex-col items-center gap-1.5 flex-1 transition-colors ${activeTab === 'stats' ? 'text-[#7d513d]' : 'text-[#999]'}`}><BarChart3 size={20} /><span className="text-[9px] font-bold uppercase">统计</span></button>
        <div className="px-4"><button onClick={(e) => { e.stopPropagation(); setIsModalOpen(true); }} className="w-12 h-12 bg-[#7d513d] rounded shadow-xl flex items-center justify-center text-white active:scale-90 transition-transform"><Plus size={28} /></button></div>
        <button onClick={(e) => { e.stopPropagation(); setActiveTab('assets'); }} className={`flex flex-col items-center gap-1.5 flex-1 transition-colors ${activeTab === 'assets' ? 'text-[#7d513d]' : 'text-[#999]'}`}><Wallet size={20} /><span className="text-[9px] font-bold uppercase">资产</span></button>
        <button onClick={(e) => { e.stopPropagation(); setActiveTab('settings'); }} className={`flex flex-col items-center gap-1.5 flex-1 transition-colors ${activeTab === 'settings' ? 'text-[#7d513d]' : 'text-[#999]'}`}><Settings size={20} /><span className="text-[9px] font-bold uppercase">设置</span></button>
      </nav>

      {/* 新增交易弹窗 - 优化尺寸 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
          <div className="bg-[#fafafa] w-full max-sm:w-[92%] max-w-sm rounded border border-[#e0ddd5] shadow-2xl p-4 md:p-5" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4"><h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#333]">新增交易</h2><button onClick={() => setIsModalOpen(false)}><X size={20} className="text-[#ccc]" /></button></div>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div className="flex p-1 bg-[#f0eee8] rounded border border-[#e0ddd5]">
                <button type="button" onClick={() => setType('expense')} className={`flex-1 py-1 rounded text-[9px] font-bold uppercase transition-all ${type === 'expense' ? 'bg-white text-[#333] shadow-sm' : 'text-[#999]'}`}>支出</button>
                <button type="button" onClick={() => setType('income')} className={`flex-1 py-1 rounded text-[9px] font-bold uppercase transition-all ${type === 'income' ? 'bg-white text-[#468847] shadow-sm' : 'text-[#999]'}`}>收入</button>
              </div>
              <div className="border-b border-[#e0ddd5] pb-1.5 flex items-baseline"><span className="text-[#ccc] text-base mr-1.5 select-none">¥</span><input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" autoFocus className="bg-transparent text-3xl font-light w-full outline-none font-mono" /></div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-[#999] uppercase tracking-widest flex items-center gap-1">
                    <CalendarIcon size={10} /> 日期
                  </label>
                  <input type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} className="w-full bg-[#f0eee8] border border-[#e0ddd5] px-2 py-1.5 rounded text-[10px] font-mono font-bold text-[#333] outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-[#999] uppercase tracking-widest flex items-center gap-1">
                    <CreditCard size={10} /> 账户
                  </label>
                  <select value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)} className="w-full bg-[#f0eee8] border border-[#e0ddd5] px-2 py-1.5 rounded text-[10px] font-bold text-[#333] outline-none appearance-none">
                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-[#999] uppercase tracking-widest">分类</label>
                <div className="grid grid-cols-5 gap-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-0.5">
                    {/* Fixed redundant/incorrect cast that caused unknown type error by explicitly casting to CategoryInfo[] */}
                    {(categories as CategoryInfo[]).map((cat: CategoryInfo) => (
                        <button key={cat.id} type="button" onClick={() => setCategoryName(cat.name)} className={`py-1.5 rounded border flex flex-col items-center gap-1 transition-all ${categoryName === cat.name ? 'border-[#7d513d] bg-[#fdfaf5]' : 'border-transparent opacity-60'}`}>
                            <div className="w-8 h-8 border rounded flex items-center justify-center bg-white text-[#7d513d] shadow-xs">{getIcon(cat.icon, 'w-3.5 h-3.5')}</div>
                            <span className="text-[7px] font-bold truncate w-full text-center uppercase tracking-tighter">{cat.name}</span>
                        </button>
                    ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-[#999] uppercase tracking-widest">备注</label>
                <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="记录点什么..." className="w-full border-b border-[#e0ddd5] py-1.5 text-xs outline-none bg-transparent focus:border-[#7d513d]" />
              </div>

              <button type="submit" className="w-full py-3 bg-[#7d513d] text-white rounded text-[9px] font-bold uppercase tracking-[0.3em] shadow-lg mt-2 active:scale-95 transition-transform">保存流水</button>
            </form>
          </div>
        </div>
      )}

      {/* 分类管理弹窗 */}
      {isCategoryManagerOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setIsCategoryManagerOpen(false)}>
          <div className="bg-[#fafafa] w-full max-sm:w-[95%] max-w-sm rounded shadow-2xl border border-[#e0ddd5] flex flex-col max-h-[70vh]" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-[#e0ddd5] bg-white flex justify-between items-center">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#333]">收支分类管理</h2>
              <button onClick={() => setIsCategoryManagerOpen(false)}><X size={24} className="text-[#ccc]" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-2 border border-[#e0ddd5] rounded bg-white shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded border border-[#e0ddd5] flex items-center justify-center bg-[#f9f9f9] text-[#7d513d]">
                      {getIcon(cat.icon, 'w-4 h-4')}
                    </div>
                    <p className="text-xs font-bold text-[#333]">{cat.name}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setEditingCategory(cat); setEditCategoryName(cat.name); setShowEditCategoryModal(true); }} className="p-1.5 text-[#ccc] hover:text-[#7d513d]"><Pencil size={14} /></button>
                    <button 
                      onClick={() => { if (confirmDeleteCatId === cat.id) { setCategories(categories.filter(c => c.id !== cat.id)); setConfirmDeleteCatId(null); } else { clearConfirmStates(); setConfirmDeleteCatId(cat.id); } }} 
                      className={`delete-action p-1.5 rounded transition-all ${confirmDeleteCatId === cat.id ? 'bg-[#b94a48] text-white' : 'text-[#ccc] hover:text-[#b94a48]'}`}
                    >
                      {confirmDeleteCatId === cat.id ? <span className="text-[8px] font-bold px-1">确认?</span> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={() => { setEditingCategory(null); setEditCategoryName(''); setShowEditCategoryModal(true); }} className="w-full py-2.5 border-2 border-dashed border-[#e0ddd5] rounded text-[9px] font-bold uppercase text-[#999] hover:text-[#7d513d] transition-all">
                <Plus size={14} className="inline mr-1" />创建新分类
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑/新建分类名称弹窗 - z-index 300 */}
      {showEditCategoryModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => { setEditingCategory(null); setEditCategoryName(''); setShowEditCategoryModal(false); }}>
          <div className="bg-white w-full max-w-xs rounded shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#333] mb-6">{editingCategory ? '重命名分类' : '新建分类'}</h2>
            <form onSubmit={handleSaveCategory} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#999] uppercase tracking-wider">分类名称</label>
                <input type="text" value={editCategoryName} onChange={e => setEditCategoryName(e.target.value)} required placeholder="输入分类名称" autoFocus className="w-full border-b border-[#e0ddd5] py-2 text-sm outline-none bg-transparent focus:border-[#7d513d]" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEditCategoryModal(false)} className="flex-1 py-3 border border-[#e0ddd5] rounded text-[10px] font-bold uppercase text-[#999]">取消</button>
                <button type="submit" className="flex-1 py-3 bg-[#7d513d] text-white rounded text-[10px] font-bold uppercase tracking-[0.3em] shadow-lg">确认保存</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 流水明细弹窗 */}
      {isHistoryVisible && (
        <div className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsHistoryVisible(false)}>
          <div className="bg-[#f4f1ea] paper-texture w-full max-w-lg max-h-[80vh] rounded shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-5 border-b border-[#e0ddd5] bg-white/80 backdrop-blur-sm sticky top-0 z-10">
              <h2 className="text-xs font-bold tracking-[0.3em] uppercase text-[#333]">全部流水记录</h2>
              <button onClick={() => setIsHistoryVisible(false)} className="p-1.5 border border-[#e0ddd5] rounded-full bg-white hover:bg-gray-100 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
              <div className="space-y-1.5">
                  {(transactions as Transaction[]).length > 0 ? [...(transactions as Transaction[])].sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime()).map(t => (
                      <div key={t.id} className="hammer-card flex items-center justify-between p-3 border-b last:border-0 border-[#f0eee8] group hover:bg-[#fafafa] transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded border border-[#e0ddd5] flex items-center justify-center text-[#7d513d] bg-white shadow-sm">
                            {getIcon(categories.find(c => c.name === t.category)?.icon || 'MoreHorizontal', 'w-4 h-4')}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[#333]">{t.category}</p>
                            <p className="text-[9px] text-[#999] flex items-center gap-1">
                              <CalendarIcon size={10} />
                              {new Date(t.date).toLocaleDateString()}
                              {t.note && <span className="ml-1 opacity-60">| {t.note}</span>}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <p className={`text-sm font-mono font-bold ${t.type === 'expense' ? 'text-[#333]' : 'text-[#468847]'}`}>
                            {t.type === 'expense' ? '-' : '+'}¥{t.amount.toLocaleString()}
                          </p>
                          <button onClick={(e) => { e.stopPropagation(); if (confirmDeleteTxId === t.id) { setTransactions(transactions.filter(tx => tx.id !== t.id)); setConfirmDeleteTxId(null); } else { clearConfirmStates(); setConfirmDeleteTxId(t.id); } }} className="delete-action p-1 text-[#ccc] hover:text-[#b94a48] transition-colors">
                            {confirmDeleteTxId === t.id ? <span className="text-[9px] font-bold text-[#b94a48] uppercase">确认?</span> : <Trash2 size={16} />}
                          </button>
                        </div>
                      </div>
                  )) : (<div className="py-24 text-center text-[#ccc] text-[10px] font-bold uppercase italic tracking-widest">NO DATA</div>)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 资产统计弹窗 */}
      {isAssetStatsVisible && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setIsAssetStatsVisible(false)}>
          <div className="bg-white w-full max-w-lg rounded shadow-2xl flex flex-col h-[70vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center bg-white sticky top-0 z-20">
              <div className="flex flex-col">
                <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-[#333]">{analyzingAccount ? `${analyzingAccount.name} 账户走势` : '资产大盘走势'}</h2>
                <p className="text-[10px] text-[#999] font-bold uppercase tracking-widest mt-0.5">净值数据回顾</p>
              </div>
              <button onClick={() => setIsAssetStatsVisible(false)} className="p-2 border rounded-full hover:bg-gray-100 transition-colors"><X size={20} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
              <div className="flex justify-center gap-2">
                {(['1m', '3m', '1y'] as AssetPeriod[]).map(p => (
                  <button key={p} onClick={() => setAssetTrendPeriod(p)} className={`px-4 py-1.5 rounded text-[10px] font-bold border transition-all ${assetTrendPeriod === p ? 'bg-[#7d513d] text-white border-[#7d513d]' : 'bg-white text-[#999] border-[#e0ddd5]'}`}>
                    {p === '1m' ? '30天' : p === '3m' ? '90天' : '1年'}
                  </button>
                ))}
              </div>

              <div className="h-[200px] w-full hammer-card p-4 bg-white">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activeTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs><linearGradient id="trendColor" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={analyzingAccount?.color || "#7d513d"} stopOpacity={0.1}/><stop offset="95%" stopColor={analyzingAccount?.color || "#7d513d"} stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0eee8" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#ccc', fontSize: 10}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#ccc', fontSize: 10}} width={45} />
                    <Tooltip content={({ active, payload }) => active && payload && payload.length ? (<div className="bg-[#333] text-white p-2 rounded text-[10px] font-mono">¥{payload[0].value.toLocaleString()}</div>) : null} />
                    <Area type="monotone" dataKey="value" stroke={analyzingAccount?.color || "#7d513d"} strokeWidth={2} fillOpacity={1} fill="url(#trendColor)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="hammer-card p-2 bg-white flex flex-col items-center gap-1">
                  <span className="text-[9px] text-[#999] font-bold uppercase tracking-widest">峰值</span>
                  <p className="text-[11px] font-mono font-bold text-[#468847]">¥{trendStats.max.toLocaleString()}</p>
                </div>
                <div className="hammer-card p-2 bg-white flex flex-col items-center gap-1">
                  <span className="text-[9px] text-[#999] font-bold uppercase tracking-widest">谷值</span>
                  <p className="text-[11px] font-mono font-bold text-[#b94a48]">¥{trendStats.min.toLocaleString()}</p>
                </div>
                <div className="hammer-card p-2 bg-white flex flex-col items-center gap-1">
                  <span className="text-[9px] text-[#999] font-bold uppercase tracking-widest">均值</span>
                  <p className="text-[11px] font-mono font-bold text-[#333]">¥{trendStats.avg.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 账户编辑/新增弹窗 */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => { setIsAccountModalOpen(false); setEditingAccount(null); }}>
          <div className="bg-white w-full max-sm:w-[95%] max-w-sm rounded shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#333] mb-6">{editingAccount ? '编辑账户' : '新增资产账户'}</h2>
            <form onSubmit={handleSaveAccount} className="space-y-4">
              <div className="space-y-1"><label className="text-[10px] font-bold text-[#999] uppercase">账户名称</label><input type="text" value={accName} onChange={e => setAccName(e.target.value)} required placeholder="如：备用金" className="w-full border-b border-[#e0ddd5] py-2 text-sm outline-none bg-transparent focus:border-[#7d513d]" /></div>
              <div className="space-y-1"><label className="text-[10px] font-bold text-[#999] uppercase">当前余额</label><div className="flex items-baseline border-b border-[#e0ddd5] py-1"><span className="text-xs text-[#ccc] mr-1 select-none">¥</span><input type="number" step="0.01" value={accInitialBalance} onChange={e => setAccInitialBalance(e.target.value)} className="w-full text-lg font-mono outline-none bg-transparent" /></div></div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#999] uppercase">账户类型</label>
                <select value={accType} onChange={e => setAccType(e.target.value)} className="w-full border-b border-[#e0ddd5] py-2 text-sm outline-none bg-transparent focus:border-[#7d513d]">
                   {accountTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-3 py-1">
                <button type="button" onClick={() => { setAccIsLiability(!accIsLiability); if(!accIsLiability) setAccIsSavings(false); }} className={`flex flex-col items-center justify-center gap-1 p-3 border rounded transition-all ${accIsLiability ? 'bg-[#b94a48] text-white border-[#b94a48]' : 'bg-white text-[#999] border-[#e0ddd5]'}`}>
                    <AlertCircle size={16} /> <span className="text-[10px] font-bold uppercase">负债账户</span>
                </button>
                <button type="button" onClick={() => { setAccIsSavings(!accIsSavings); if(!accIsSavings) setAccIsLiability(false); }} className={`flex flex-col items-center justify-center gap-1 p-3 border rounded transition-all ${accIsSavings ? 'bg-[#7d513d] text-white border-[#7d513d]' : 'bg-white text-[#999] border-[#e0ddd5]'}`}>
                    <Target size={16} /> <span className="text-[10px] font-bold uppercase">攒钱账户</span>
                </button>
              </div>

              {(accIsLiability || accIsSavings) && (
                <div className="space-y-2 p-3 bg-[#fdfaf5] border border-[#e0ddd5] rounded animate-in slide-in-from-top duration-300">
                    <label className="text-[10px] font-bold text-[#7d513d] uppercase flex items-center gap-1">
                        <CalendarIcon size={12} />
                        {accIsLiability ? '预计还清周期 (月)' : '攒钱目标周期 (月)'}
                    </label>
                    <div className="flex items-center">
                        <input 
                          type="number" 
                          min="1" 
                          value={accPeriod} 
                          onChange={e => setAccPeriod(e.target.value)} 
                          className="w-full border-b border-[#7d513d]/30 bg-transparent py-1 text-sm font-mono font-bold outline-none focus:border-[#7d513d]"
                          placeholder="请输入月数"
                        />
                        <span className="text-[10px] text-[#7d513d] ml-2 font-bold whitespace-nowrap">个月</span>
                    </div>
                </div>
              )}

              <div className="space-y-1"><label className="text-[10px] font-bold text-[#999] uppercase">识别色</label><div className="flex flex-wrap gap-2.5 pt-1">{PRESET_COLORS.map(c => (<button key={c} type="button" onClick={() => setAccColor(c)} className={`w-6 h-6 rounded-full border-2 transition-all ${accColor === c ? 'border-[#333] scale-110 shadow-md' : 'border-transparent'}`} style={{ backgroundColor: c }} />))}</div></div>
              <button type="submit" className="w-full py-4 bg-[#7d513d] text-white rounded text-[10px] font-bold uppercase tracking-[0.3em] shadow-lg mt-4 active:scale-95 transition-transform">保存账户</button>
            </form>
          </div>
        </div>
      )}

      {/* 预算编排弹窗 */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setIsBudgetModalOpen(false)}>
          <div className="bg-white w-full max-w-lg rounded shadow-2xl border border-[#e0ddd5] flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-[#e0ddd5] flex justify-between items-center"><h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#333]">预算编排 (年/月/日)</h2><button onClick={() => setIsBudgetModalOpen(false)}><X size={24} className="text-[#ccc]" /></button></div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f4f1ea]/20 custom-scrollbar">
              {categories.map((cat, index) => {
                const b = budgets.find(x => x.category === cat.name);
                const isExpanded = expandedBudgetCategory === cat.name;
                return (
                  <div 
                    key={cat.id} 
                    draggable 
                    onDragStart={() => onDragStart(index)}
                    onDragOver={onDragOver}
                    onDrop={() => handleDropCategories(index)}
                    className={`border border-[#e0ddd5] rounded bg-white shadow-sm overflow-hidden transition-all duration-300 ${draggedItemIndex === index ? 'opacity-30' : ''}`}
                  >
                    <div className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="cursor-grab active:cursor-grabbing text-[#ccc] hover:text-[#7d513d]"><GripVertical size={16} /></div>
                        <div className="w-8 h-8 rounded border border-[#e0ddd5] flex items-center justify-center bg-[#f9f9f9] text-[#7d513d]">{getIcon(cat.icon, 'w-4 h-4')}</div>
                        <span className="text-xs font-bold text-[#333]">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right"><p className="text-[7px] text-[#999] font-bold uppercase">月预算</p><p className="text-[10px] font-mono font-bold text-[#333]">¥{(b?.limit || 0).toLocaleString()}</p></div>
                        <button onClick={(e) => { e.stopPropagation(); setExpandedBudgetCategory(isExpanded ? null : cat.name); }} className={`p-1.5 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-[#7d513d]' : 'text-[#ccc]'}`}><ChevronDown size={14} /></button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="p-4 bg-[#fafafa] border-t border-[#f0eee8] space-y-4 animate-in slide-in-from-top duration-300">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] text-[#999] font-bold uppercase tracking-widest block">日</label>
                            <div className="flex items-baseline gap-1 border-b border-[#e0ddd5] pb-1"><span className="text-[10px] text-[#ccc] select-none">¥</span><input type="number" className="w-full text-xs font-mono font-bold outline-none bg-transparent" value={b?.dailyLimit || ''} onChange={(e) => handleUpdateBudget(cat.name, 'daily', Number(e.target.value))} /></div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] text-[#999] font-bold uppercase tracking-widest block">月</label>
                            <div className="flex items-baseline gap-1 border-b border-[#e0ddd5] pb-1"><span className="text-[10px] text-[#ccc] select-none">¥</span><input type="number" className="w-full text-xs font-mono font-bold outline-none bg-transparent" value={b?.limit || ''} onChange={(e) => handleUpdateBudget(cat.name, 'monthly', Number(e.target.value))} /></div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] text-[#999] font-bold uppercase tracking-widest block">年</label>
                            <div className="flex items-baseline gap-1 border-b border-[#e0ddd5] pb-1"><span className="text-[10px] text-[#ccc] select-none">¥</span><input type="number" className="w-full text-xs font-mono font-bold outline-none bg-transparent" value={b?.yearlyLimit || ''} onChange={(e) => handleUpdateBudget(cat.name, 'yearly', Number(e.target.value))} /></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="p-4 bg-white border-t flex justify-end">
                <button onClick={() => setIsBudgetModalOpen(false)} className="px-8 py-3 bg-[#7d513d] text-white rounded text-[10px] font-bold uppercase tracking-[0.2em] shadow-lg">完成设置</button>
            </div>
          </div>
        </div>
      )}

      {isAccountManagerOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setIsAccountManagerOpen(false)}>
          <div className="bg-[#fafafa] w-full max-sm:w-[95%] max-w-sm rounded shadow-2xl border border-[#e0ddd5] flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-[#e0ddd5] bg-white flex justify-between items-center"><h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#333]">资产排序与管理</h2><button onClick={() => setIsAccountManagerOpen(false)}><X size={24} className="text-[#ccc]" /></button></div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {accounts.map((acc, index) => (
                <div 
                    key={acc.id} 
                    draggable
                    onDragStart={() => onDragStart(index)}
                    onDragOver={onDragOver}
                    onDrop={() => handleDropAccounts(index)}
                    className={`flex items-center justify-between p-2 border border-[#e0ddd5] rounded bg-white shadow-sm transition-all ${draggedItemIndex === index ? 'opacity-30' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="cursor-grab active:cursor-grabbing text-[#ccc] hover:text-[#7d513d]"><GripVertical size={16} /></div>
                    <div className="w-7 h-7 rounded border border-[#e0ddd5] flex items-center justify-center text-white" style={{ backgroundColor: acc.color }}>
                        {React.cloneElement(getAccountIcon(acc.type, acc.isLiability, acc.isSavings) as React.ReactElement, { size: 14 })}
                    </div>
                    <p className="text-[11px] font-bold text-[#333] leading-none">{acc.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-mono font-bold text-[#333]">¥{acc.initialBalance.toLocaleString()}</p>
                    <button onClick={(e) => { e.stopPropagation(); if (confirmDeleteAccId === acc.id) { setAccounts(accounts.filter(a => a.id !== acc.id)); setConfirmDeleteAccId(null); } else { clearConfirmStates(); setConfirmDeleteAccId(acc.id); } }} className="delete-action p-1 rounded text-[#ccc] hover:text-[#b94a48]">{confirmDeleteAccId === acc.id ? <span className="text-[7px] font-bold">确认?</span> : <Trash2 size={14} />}</button>
                  </div>
                </div>
              ))}
              <button onClick={(e) => { e.stopPropagation(); openAddAccount(); }} className="w-full py-2.5 border-2 border-dashed border-[#e0ddd5] rounded text-[9px] font-bold uppercase text-[#999] hover:text-[#7d513d] transition-all"><Plus size={14} className="inline mr-1" />添加新账户</button>
            </div>
          </div>
        </div>
      )}

      {isEditBalanceModalOpen && (
        <div className="fixed inset-0 z-[170] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setIsEditBalanceModalOpen(null)}>
          <div className="bg-white w-full max-w-sm rounded border border-[#e0ddd5] shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#333]">校准余额</h2>
                <p className="text-[10px] text-[#999] font-bold uppercase tracking-widest mt-0.5">{isEditBalanceModalOpen.name}</p>
              </div>
              <button onClick={() => setIsEditBalanceModalOpen(null)}><X size={24} className="text-[#ccc]" /></button>
            </div>
            <form onSubmit={handleUpdateBalance} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#999] uppercase tracking-wider">当前实际余额</label>
                <div className="flex items-baseline gap-1 border-b border-[#e0ddd5] py-2">
                  <span className="text-xs text-[#ccc] select-none">¥</span>
                  <input type="number" step="0.01" value={manualBalanceValue} onChange={e => setManualBalanceValue(e.target.value)} autoFocus className="w-full text-3xl font-mono font-light outline-none bg-transparent" />
                </div>
              </div>
              <button type="submit" className="w-full py-4 bg-[#7d513d] text-white rounded text-[10px] font-bold uppercase tracking-[0.3em] shadow-lg">确认修正</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
