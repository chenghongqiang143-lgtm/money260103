
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, BarChart3, LayoutDashboard, X, Trash2, ChevronRight, ChevronLeft, 
  ChevronsLeft, ChevronsRight, ChevronDown, TrendingUp, Settings, 
  Wallet, CreditCard, Landmark, Coins, PlusCircle, 
  Pencil, RefreshCw, BarChart, List, BadgePercent, GripVertical, 
  Settings2, Palette, PlusSquare, Save, FileUp, Calendar as CalendarIcon
} from 'lucide-react';
import { Transaction, Budget, CategoryInfo, Account } from './types';
import { CATEGORIES as INITIAL_CATEGORIES, getIcon } from './constants';
import StatsCards from './components/StatsCards';
import BudgetTracker from './components/BudgetTracker';
import { 
  ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, 
  BarChart as ReBarChart, Bar, AreaChart, Area, Cell, Legend
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

const getAccountIcon = (type: string) => {
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
  
  const [confirmDeleteTxId, setConfirmDeleteTxId] = useState<string | null>(null);
  const [confirmDeleteAccId, setConfirmDeleteAccId] = useState<string | null>(null);
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

  const openAddAccount = () => {
    setEditingAccount(null);
    setAccName('');
    setAccType(accountTypes[0]);
    setAccInitialBalance('0');
    setAccColor(PRESET_COLORS[0]);
    setAccIsLiability(false);
    setAccIsSavings(false);
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

  // Fix: Explicitly typed memo for account balances to prevent inference issues
  const accountBalances = useMemo(() => {
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

  // Fix: Explicit return type for periodStats memo to prevent "unknown" inference in JSX
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
    } as {
      income: number;
      expense: number;
      categoryData: { name: string; value: number; color: string }[];
      trendData: { date: string; income: number; expense: number }[];
      stackedData: any[];
    };
  }, [transactions, categories, startDate, endDate]);

  const activeTrendData = useMemo(() => {
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
    const newAcc: Account = { id: editingAccount?.id || Date.now().toString(), name: accName, type: accType, initialBalance: Number(accInitialBalance), color: accColor, isLiability: accIsLiability, isSavings: accIsSavings };
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
        const imported = JSON.parse(event.target?.result as string) as any;
        if (imported.transactions) setTransactions(imported.transactions);
        if (imported.budgets) setBudgets(imported.budgets);
        if (imported.accounts) setAccounts(imported.accounts);
        alert('恢复成功！');
      } catch (err) { alert('无效文件'); }
    };
    reader.readAsText(file);
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
      <main className="max-w-4xl mx-auto px-4 pt-[calc(env(safe-area-inset-top)+2.5rem)]">
        {activeTab === 'dashboard' ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
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
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#999', fontSize: 9}} width={40} />
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
                    <p className="text-[8px] text-[#ccc] font-bold">占比 {((cat.value / periodStats.expense) * 100).toFixed(1)}%</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : activeTab === 'assets' ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Top Balance Block Restored to Original Background and Color */}
            <div className="hammer-card p-6 bg-[#7d513d] text-white relative h-32 flex items-end justify-between shadow-xl overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Wallet size={120} />
              </div>
              <div className="z-10">
                <p className="text-[10px] font-bold uppercase opacity-60 mb-1 tracking-[0.2em]">净资产</p>
                <h2 className="text-3xl font-light">
                  <span className="text-lg font-serif italic opacity-40 mr-1">¥</span>
                  {totalAssets.toLocaleString()}
                </h2>
              </div>
              <div className="flex gap-2 z-10">
                <button onClick={(e) => { e.stopPropagation(); setIsAccountManagerOpen(true); }} className="bg-white/10 text-white p-2 rounded hover:bg-white/20 transition-all"><List size={20} /></button>
                <button onClick={(e) => { e.stopPropagation(); setAnalyzingAccount(null); setIsAssetStatsVisible(true); }} className="bg-white/10 text-white p-2 rounded hover:bg-white/20 transition-all"><BarChart size={20} /></button>
              </div>
            </div>
            
            <div className="space-y-8">
               {Object.entries(groupedAccounts).map(([type, accs], typeIdx) => (
                 <div key={type} className="space-y-4">
                    {/* Visual dashed divider with increased prominence */}
                    {typeIdx !== 0 && (
                      <div className="hammer-stitch w-full opacity-40 my-6"></div>
                    )}
                    <div className="flex items-center gap-2 px-1 mb-2">
                       <div className="w-1 h-3 bg-[#7d513d]/30"></div>
                       <h3 className="text-[10px] font-bold text-[#999] uppercase tracking-[0.2em]">{type}</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {accs.map(acc => (
                        <div key={acc.id} className="hammer-card p-5 relative transition-shadow hover:shadow-md" style={{ borderBottom: `2px solid ${acc.color}` }}>
                          <button onClick={(e) => { e.stopPropagation(); setAnalyzingAccount(acc); setIsAssetStatsVisible(true); }} className="absolute top-4 right-4 p-1.5 text-[#ccc] hover:text-[#7d513d] hover:bg-[#f9f9f9] rounded-full transition-all">
                            <TrendingUp size={16} />
                          </button>
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded border border-[#e0ddd5] flex items-center justify-center text-white" style={{ backgroundColor: acc.color }}>{getAccountIcon(acc.type)}</div>
                            <div><h4 className="text-sm font-bold text-[#333]">{acc.name}</h4><p className="text-[10px] text-[#999] font-bold uppercase tracking-widest">{acc.type}</p></div>
                          </div>
                          <div onClick={(e) => { e.stopPropagation(); setIsEditBalanceModalOpen(acc); setManualBalanceValue(acc.currentBalance.toString()); }} className="cursor-pointer group">
                            <p className={`text-xl font-mono font-bold ${acc.isLiability ? 'text-[#b94a48]' : 'text-[#333]'} group-hover:text-[#7d513d] transition-colors`}>
                              <span className="text-xs mr-1 opacity-40 font-sans italic">¥</span>{Math.abs(acc.currentBalance).toLocaleString()}
                              <Pencil size={10} className="inline ml-2 opacity-0 group-hover:opacity-40" />
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                 </div>
               ))}
               <div className="hammer-stitch pt-6 opacity-40"></div>
               <div className="pt-2">
                 <button onClick={(e) => { e.stopPropagation(); openAddAccount(); }} className="w-full hammer-card p-5 border-2 border-dashed border-[#e0ddd5] bg-transparent flex flex-col items-center justify-center gap-2 text-[#999] hover:text-[#7d513d] transition-all"><PlusCircle size={24} /><span className="text-[10px] font-bold uppercase">新增资产账户</span></button>
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

      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
          <div className="bg-[#fafafa] w-full max-w-sm rounded border border-[#e0ddd5] shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6"><h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#333]">新增交易</h2><button onClick={() => setIsModalOpen(false)}><X size={24} className="text-[#ccc]" /></button></div>
            <form onSubmit={handleAddTransaction} className="space-y-6">
              <div className="flex p-1 bg-[#f0eee8] rounded border border-[#e0ddd5]">
                <button type="button" onClick={() => setType('expense')} className={`flex-1 py-1.5 rounded text-[10px] font-bold uppercase transition-all ${type === 'expense' ? 'bg-white text-[#333]' : 'text-[#999]'}`}>支出</button>
                <button type="button" onClick={() => setType('income')} className={`flex-1 py-1.5 rounded text-[10px] font-bold uppercase transition-all ${type === 'income' ? 'bg-white text-[#468847]' : 'text-[#999]'}`}>收入</button>
              </div>
              <div className="border-b border-[#e0ddd5] pb-2 flex items-baseline"><span className="text-[#ccc] text-lg font-serif italic mr-2">¥</span><input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" autoFocus className="bg-transparent text-4xl font-light w-full outline-none font-mono" /></div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#999] uppercase tracking-widest flex items-center gap-1">
                  <CalendarIcon size={12} /> 日期
                </label>
                <input type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} className="w-full bg-[#f0eee8] border border-[#e0ddd5] px-3 py-2 rounded text-xs font-mono font-bold text-[#333] outline-none" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#999] uppercase tracking-widest">分类</label>
                <div className="grid grid-cols-4 gap-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                    {/* Fix: Explicit check for categories to handle any potential unknown state, though typed at definition */}
                    {(categories as CategoryInfo[]).map(cat => (
                        <button key={cat.id} type="button" onClick={() => setCategoryName(cat.name)} className={`p-2 rounded border flex flex-col items-center gap-1.5 transition-all ${categoryName === cat.name ? 'border-[#7d513d] bg-[#fdfaf5]' : 'border-transparent opacity-60'}`}>
                            <div className="w-10 h-10 border rounded flex items-center justify-center bg-white text-[#7d513d] shadow-sm">{getIcon(cat.icon, 'w-4 h-4')}</div>
                            <span className="text-[8px] font-bold truncate w-full text-center uppercase tracking-tighter">{cat.name}</span>
                        </button>
                    ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#999] uppercase tracking-widest">备注</label>
                <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="写点什么..." className="w-full border-b border-[#e0ddd5] py-2 text-sm outline-none bg-transparent focus:border-[#7d513d]" />
              </div>

              <button type="submit" className="w-full py-4 bg-[#7d513d] text-white rounded text-[10px] font-bold uppercase tracking-[0.4em] shadow-xl">保存流水</button>
            </form>
          </div>
        </div>
      )}

      {/* Asset Trend Modal */}
      {isAssetStatsVisible && (
        <div className="fixed inset-0 z-[150] bg-white animate-in slide-in-from-right duration-500 overflow-y-auto" onClick={() => setIsAssetStatsVisible(false)}>
          <div className="max-w-4xl mx-auto min-h-full pb-32" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center bg-white sticky top-0 z-20">
              <div className="flex flex-col">
                <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-[#333]">{analyzingAccount ? `${analyzingAccount.name} 账户走势` : '资产大盘走势'}</h2>
                <p className="text-[10px] text-[#999] font-bold uppercase tracking-widest mt-0.5">净值数据回顾</p>
              </div>
              <button onClick={() => setIsAssetStatsVisible(false)} className="p-2 border rounded-full"><X size={24} /></button>
            </div>
            
            <div className="p-6 space-y-8">
              <div className="flex justify-center gap-2">
                {(['1m', '3m', '1y'] as AssetPeriod[]).map(p => (
                  <button key={p} onClick={() => setAssetTrendPeriod(p)} className={`px-4 py-1.5 rounded text-[10px] font-bold border transition-all ${assetTrendPeriod === p ? 'bg-[#7d513d] text-white border-[#7d513d]' : 'bg-white text-[#999] border-[#e0ddd5]'}`}>
                    {p === '1m' ? '30天' : p === '3m' ? '90天' : '1年'}
                  </button>
                ))}
              </div>

              <div className="h-[280px] w-full hammer-card p-4 shadow-lg bg-white">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activeTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs><linearGradient id="trendColor" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={analyzingAccount?.color || "#7d513d"} stopOpacity={0.1}/><stop offset="95%" stopColor={analyzingAccount?.color || "#7d513d"} stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0eee8" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#ccc', fontSize: 10}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#ccc', fontSize: 10}} width={50} />
                    <Tooltip content={({ active, payload }) => active && payload && payload.length ? (<div className="bg-[#333] text-white p-2 rounded text-[10px] font-mono">¥{payload[0].value.toLocaleString()}</div>) : null} />
                    <Area type="monotone" dataKey="value" stroke={analyzingAccount?.color || "#7d513d"} strokeWidth={3} fillOpacity={1} fill="url(#trendColor)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="hammer-card p-4 bg-white flex flex-col items-center gap-1">
                  <span className="text-[10px] text-[#999] font-bold uppercase tracking-widest">峰值</span>
                  <p className="text-lg font-mono font-bold text-[#468847]">¥{trendStats.max.toLocaleString()}</p>
                </div>
                <div className="hammer-card p-4 bg-white flex flex-col items-center gap-1">
                  <span className="text-[10px] text-[#999] font-bold uppercase tracking-widest">谷值</span>
                  <p className="text-lg font-mono font-bold text-[#b94a48]">¥{trendStats.min.toLocaleString()}</p>
                </div>
                <div className="hammer-card p-4 bg-white flex flex-col items-center gap-1">
                  <span className="text-[10px] text-[#999] font-bold uppercase tracking-widest">均值</span>
                  <p className="text-lg font-mono font-bold text-[#333]">¥{trendStats.avg.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isEditBalanceModalOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setIsEditBalanceModalOpen(null)}>
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
                  <span className="text-xs text-[#ccc] font-serif italic">¥</span>
                  <input type="number" step="0.01" value={manualBalanceValue} onChange={e => setManualBalanceValue(e.target.value)} autoFocus className="w-full text-3xl font-mono font-light outline-none bg-transparent" />
                </div>
              </div>
              <button type="submit" className="w-full py-4 bg-[#7d513d] text-white rounded text-[10px] font-bold uppercase tracking-[0.3em] shadow-lg">确认修正</button>
            </form>
          </div>
        </div>
      )}

      {isHistoryVisible && (
        <div className="fixed inset-0 z-[150] bg-[#f4f1ea] paper-texture overflow-y-auto pt-safe" onClick={() => setIsHistoryVisible(false)}>
          <div className="max-w-4xl mx-auto px-4 py-8 pb-32" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8 sticky top-0 bg-[#f4f1ea]/90 backdrop-blur pb-4 border-b border-[#e0ddd5]"><h2 className="text-sm font-bold tracking-[0.4em] uppercase text-[#333]">历史记录</h2><button onClick={() => setIsHistoryVisible(false)} className="p-2 border border-[#e0ddd5] rounded-full bg-white"><X size={20} /></button></div>
            <div className="hammer-card p-4 space-y-4">
                {transactions.length > 0 ? [...transactions].sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime()).map(t => (
                    <div key={t.id} className="flex items-center justify-between py-4 border-b last:border-0 border-[#f0eee8]">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-sm border border-[#e0ddd5] flex items-center justify-center text-[#7d513d] bg-white">{getIcon(categories.find(c => c.name === t.category)?.icon || 'MoreHorizontal', 'w-5 h-5')}</div>
                        <div><p className="text-sm font-bold text-[#333]">{t.category}</p><p className="text-[10px] text-[#999]">{new Date(t.date).toLocaleDateString()}</p></div>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <p className={`text-lg font-mono font-bold ${t.type === 'expense' ? 'text-[#333]' : 'text-[#468847]'}`}>{t.type === 'expense' ? '-' : '+'}¥{t.amount.toLocaleString()}</p>
                        <button onClick={(e) => { e.stopPropagation(); if (confirmDeleteTxId === t.id) { setTransactions(transactions.filter(tx => tx.id !== t.id)); setConfirmDeleteTxId(null); } else { clearConfirmStates(); setConfirmDeleteTxId(t.id); } }} className="delete-action text-[#ccc] hover:text-[#b94a48] transition-colors">{confirmDeleteTxId === t.id ? <span className="text-[10px] font-bold text-[#b94a48]">确认?</span> : <Trash2 size={18} />}</button>
                      </div>
                    </div>
                )) : (<div className="py-24 text-center text-[#ccc] text-xs font-bold uppercase italic">NO DATA</div>)}
            </div>
          </div>
        </div>
      )}

      {isBudgetModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setIsBudgetModalOpen(false)}>
          <div className="bg-white w-full max-w-lg rounded shadow-2xl border border-[#e0ddd5] flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-[#e0ddd5] flex justify-between items-center"><h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#333]">预算编排 (年/月/日)</h2><button onClick={() => setIsBudgetModalOpen(false)}><X size={24} className="text-[#ccc]" /></button></div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f4f1ea]/20">
              {categories.map((cat) => {
                const b = budgets.find(x => x.category === cat.name);
                const isExpanded = expandedBudgetCategory === cat.name;
                return (
                  <div key={cat.id} className="border border-[#e0ddd5] rounded bg-white shadow-sm overflow-hidden transition-all duration-300">
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3"><div className="w-8 h-8 rounded border border-[#e0ddd5] flex items-center justify-center bg-[#f9f9f9] text-[#7d513d]">{getIcon(cat.icon, 'w-4 h-4')}</div><span className="text-xs font-bold text-[#333]">{cat.name}</span></div>
                      <div className="flex items-center gap-4"><div className="text-right"><p className="text-[8px] text-[#999] font-bold uppercase">当前月预算</p><p className="text-xs font-mono font-bold text-[#333]">¥{(b?.limit || 0).toLocaleString()}</p></div><button onClick={(e) => { e.stopPropagation(); setExpandedBudgetCategory(isExpanded ? null : cat.name); }} className={`p-2 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-[#7d513d]' : 'text-[#ccc]'}`}><ChevronDown size={18} /></button></div>
                    </div>
                    {isExpanded && (
                      <div className="p-4 bg-[#fafafa] border-t border-[#f0eee8] space-y-4 animate-in slide-in-from-top duration-300">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] text-[#999] font-bold uppercase tracking-widest block">日预算</label>
                            <div className="flex items-baseline gap-1 border-b border-[#e0ddd5] pb-1"><span className="text-xs text-[#ccc] font-serif">¥</span><input type="number" className="w-full text-base font-mono font-bold outline-none bg-transparent" value={b?.dailyLimit || ''} onChange={(e) => handleUpdateBudget(cat.name, 'daily', Number(e.target.value))} /></div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] text-[#999] font-bold uppercase tracking-widest block">月预算</label>
                            <div className="flex items-baseline gap-1 border-b border-[#e0ddd5] pb-1"><span className="text-xs text-[#ccc] font-serif">¥</span><input type="number" className="w-full text-base font-mono font-bold outline-none bg-transparent" value={b?.limit || ''} onChange={(e) => handleUpdateBudget(cat.name, 'monthly', Number(e.target.value))} /></div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] text-[#999] font-bold uppercase tracking-widest block">年预算</label>
                            <div className="flex items-baseline gap-1 border-b border-[#e0ddd5] pb-1"><span className="text-xs text-[#ccc] font-serif">¥</span><input type="number" className="w-full text-base font-mono font-bold outline-none bg-transparent" value={b?.yearlyLimit || ''} onChange={(e) => handleUpdateBudget(cat.name, 'yearly', Number(e.target.value))} /></div>
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
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setIsAccountManagerOpen(false)}>
          <div className="bg-[#fafafa] w-full max-sm rounded shadow-2xl border border-[#e0ddd5] flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-[#e0ddd5] bg-white flex justify-between items-center"><h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#333]">资产账户</h2><button onClick={() => setIsAccountManagerOpen(false)}><X size={24} className="text-[#ccc]" /></button></div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {accounts.map((acc) => (
                <div key={acc.id} className="flex items-center justify-between p-3 border border-[#e0ddd5] rounded bg-white shadow-sm">
                  <div className="flex items-center gap-3"><div className="w-8 h-8 rounded border border-[#e0ddd5] flex items-center justify-center text-white" style={{ backgroundColor: acc.color }}>{getAccountIcon(acc.type)}</div><p className="text-xs font-bold text-[#333] leading-none">{acc.name}</p></div>
                  <div className="flex items-center gap-1.5"><p className="text-xs font-mono font-bold text-[#333]">¥{acc.initialBalance.toLocaleString()}</p><button onClick={(e) => { e.stopPropagation(); if (confirmDeleteAccId === acc.id) { setAccounts(accounts.filter(a => a.id !== acc.id)); setConfirmDeleteAccId(null); } else { clearConfirmStates(); setConfirmDeleteAccId(acc.id); } }} className="delete-action p-1.5 rounded text-[#ccc] hover:text-[#b94a48]">{confirmDeleteAccId === acc.id ? <span className="text-[8px] font-bold">确认?</span> : <Trash2 size={14} />}</button></div>
                </div>
              ))}
              <button onClick={(e) => { e.stopPropagation(); openAddAccount(); }} className="w-full py-3 border-2 border-dashed border-[#e0ddd5] rounded text-[10px] font-bold uppercase text-[#999] hover:text-[#7d513d] transition-all"><Plus size={16} className="inline mr-1" />添加账户</button>
            </div>
          </div>
        </div>
      )}

      {isAccountModalOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => { setIsAccountModalOpen(false); setEditingAccount(null); }}>
          <div className="bg-white w-full max-w-sm rounded shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#333] mb-6">{editingAccount ? '编辑账户' : '新增账户'}</h2>
            <form onSubmit={handleSaveAccount} className="space-y-4">
              <div className="space-y-1"><label className="text-[10px] font-bold text-[#999] uppercase">名称</label><input type="text" value={accName} onChange={e => setAccName(e.target.value)} required placeholder="如：现金、支付宝" className="w-full border-b border-[#e0ddd5] py-2 text-sm outline-none bg-transparent focus:border-[#7d513d]" /></div>
              <div className="space-y-1"><label className="text-[10px] font-bold text-[#999] uppercase">余额</label><div className="flex items-baseline border-b border-[#e0ddd5] py-1"><span className="text-xs text-[#ccc] mr-1">¥</span><input type="number" step="0.01" value={accInitialBalance} onChange={e => setAccInitialBalance(e.target.value)} className="w-full text-lg font-mono outline-none bg-transparent" /></div></div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#999] uppercase">类型</label>
                <select value={accType} onChange={e => setAccType(e.target.value)} className="w-full border-b border-[#e0ddd5] py-2 text-sm outline-none bg-transparent focus:border-[#7d513d]">
                   {accountTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1"><label className="text-[10px] font-bold text-[#999] uppercase">颜色</label><div className="flex flex-wrap gap-3 pt-1">{PRESET_COLORS.map(c => (<button key={c} type="button" onClick={() => setAccColor(c)} className={`w-6 h-6 rounded-full border-2 transition-all ${accColor === c ? 'border-[#333] scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />))}</div></div>
              <button type="submit" className="w-full py-4 bg-[#7d513d] text-white rounded text-[10px] font-bold uppercase tracking-[0.3em] shadow-lg mt-4">保存账户</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
