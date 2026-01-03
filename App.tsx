
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, BarChart3, LayoutDashboard, X, Trash2, Calendar, ChevronRight, ChevronDown, TrendingUp, TrendingDown, Settings, Download, Upload, Trash, Wallet, CreditCard, Landmark, Coins, PlusCircle, Tag, PieChart as PieChartIcon, AlertCircle, Pencil, RefreshCw, BarChart, ArrowUp, ArrowDown, List, ToggleLeft, ToggleRight, BadgePercent, PiggyBank } from 'lucide-react';
import { Transaction, Budget, CategoryInfo, Account } from './types';
import { CATEGORIES as INITIAL_CATEGORIES, getIcon } from './constants';
import StatsCards from './components/StatsCards';
import BudgetTracker from './components/BudgetTracker';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, BarChart as ReBarChart, Bar, AreaChart, Area } from 'recharts';

type Period = 'week' | 'month' | 'year';
type Tab = 'dashboard' | 'stats' | 'assets' | 'settings';
type AssetPeriod = '1m' | '3m' | '1y';

const DEFAULT_ACCOUNTS: Account[] = [
  { id: '1', name: '现金', type: '现金', initialBalance: 0, color: '#7d513d' },
  { id: '2', name: '支付宝', type: '第三方支付', initialBalance: 0, color: '#1677ff' },
  { id: '3', name: '微信支付', type: '第三方支付', initialBalance: 0, color: '#07c160' },
  { id: '4', name: '招商银行', type: '银行储蓄', initialBalance: 0, color: '#333333' },
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [assetTrendPeriod, setAssetTrendPeriod] = useState<AssetPeriod>('1m');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isAssetStatsVisible, setIsAssetStatsVisible] = useState(false);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  
  // Dashboard selected month
  const [dashboardMonth, setDashboardMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // 统计日期范围 (Stats Tab)
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  });
  
  // 账户管理相关状态
  const [isAccountManagerOpen, setIsAccountManagerOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null); // 如果为null则是新增，否则是编辑
  const [isEditBalanceModalOpen, setIsEditBalanceModalOpen] = useState<Account | null>(null); // 单独的余额同步
  
  // 设置状态
  const [enableAccountLinking, setEnableAccountLinking] = useState<boolean>(() => {
    const saved = localStorage.getItem('zen_enable_account_linking');
    return saved !== null ? JSON.parse(saved) : false; // Default: false
  });

  const [enableBudgetRollover, setEnableBudgetRollover] = useState<boolean>(() => {
    const saved = localStorage.getItem('zen_enable_budget_rollover');
    return saved !== null ? JSON.parse(saved) : true; // Default: true
  });

  // 单个账户趋势分析状态
  const [analyzingAccount, setAnalyzingAccount] = useState<Account | null>(null);
  const [accountTrendPeriod, setAccountTrendPeriod] = useState<AssetPeriod>('1m');
  
  // 二次确认状态
  const [confirmDeleteTxId, setConfirmDeleteTxId] = useState<string | null>(null);
  const [confirmDeleteAccId, setConfirmDeleteAccId] = useState<string | null>(null); // 在模态框内使用
  const [confirmDeleteCatId, setConfirmDeleteCatId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  // 动态分类状态
  const [categories, setCategories] = useState<CategoryInfo[]>(() => {
    const saved = localStorage.getItem('zen_categories');
    return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('zen_transactions');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [budgets, setBudgets] = useState<Budget[]>(() => {
    const saved = localStorage.getItem('zen_budgets');
    return saved ? JSON.parse(saved) : [
      { category: '餐饮', limit: 2000 },
      { category: '交通', limit: 500 },
      { category: '购物', limit: 1500 }
    ];
  });

  const [accounts, setAccounts] = useState<Account[]>(() => {
    const saved = localStorage.getItem('zen_accounts');
    return saved ? JSON.parse(saved) : DEFAULT_ACCOUNTS;
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Transaction form
  const [amount, setAmount] = useState('');
  const [categoryName, setCategoryName] = useState(categories[0]?.name || '');
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '1');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [note, setNote] = useState('');

  // Account form
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState('');
  const [accInitialBalance, setAccInitialBalance] = useState('');
  const [accIsLiability, setAccIsLiability] = useState(false);
  const [accRepaymentMonths, setAccRepaymentMonths] = useState('');
  const [accIsSavings, setAccIsSavings] = useState(false);
  const [accSavingsMonths, setAccSavingsMonths] = useState('');

  // Category form (in budget modal)
  const [newCatName, setNewCatName] = useState('');

  useEffect(() => {
    localStorage.setItem('zen_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('zen_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('zen_budgets', JSON.stringify(budgets));
  }, [budgets]);

  useEffect(() => {
    localStorage.setItem('zen_accounts', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem('zen_enable_account_linking', JSON.stringify(enableAccountLinking));
  }, [enableAccountLinking]);

  useEffect(() => {
    localStorage.setItem('zen_enable_budget_rollover', JSON.stringify(enableBudgetRollover));
  }, [enableBudgetRollover]);

  // 当打开账户模态框时，初始化表单数据
  useEffect(() => {
    if (isAccountModalOpen) {
      if (editingAccount) {
        setAccName(editingAccount.name);
        setAccType(editingAccount.type);
        setAccInitialBalance(editingAccount.initialBalance.toString());
        setAccIsLiability(editingAccount.isLiability || false);
        setAccRepaymentMonths(editingAccount.repaymentMonths ? editingAccount.repaymentMonths.toString() : '');
        setAccIsSavings(editingAccount.isSavings || false);
        setAccSavingsMonths(editingAccount.savingsMonths ? editingAccount.savingsMonths.toString() : '');
      } else {
        setAccName('');
        setAccType('');
        setAccInitialBalance('');
        setAccIsLiability(false);
        setAccRepaymentMonths('');
        setAccIsSavings(false);
        setAccSavingsMonths('');
      }
      setConfirmDeleteAccId(null); // 重置删除确认状态
    }
  }, [isAccountModalOpen, editingAccount]);

  const accountBalances = useMemo(() => {
    return accounts.map(acc => {
      const accTransactions = transactions.filter(t => t.accountId === acc.id);
      const balance = accTransactions.reduce((sum, t) => {
        if (acc.isLiability) {
            // 负债账户：支出(消费)增加负债，收入(还款)减少负债
            return t.type === 'expense' ? sum + t.amount : sum - t.amount;
        }
        // 普通账户/攒钱账户：收入增加余额，支出减少余额
        return t.type === 'income' ? sum + t.amount : sum - t.amount;
      }, acc.initialBalance);
      return { ...acc, currentBalance: balance };
    });
  }, [accounts, transactions]);

  const totalAssets = useMemo(() => {
    return accountBalances.reduce((sum, acc) => {
      if (acc.isLiability) {
        return sum - acc.currentBalance;
      }
      return sum + acc.currentBalance;
    }, 0);
  }, [accountBalances]);

  // 资产总趋势 (逻辑调整：区分负债)
  const assetTrendHistory = useMemo(() => {
    const dates: Date[] = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (assetTrendPeriod === '1m') {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        d.setHours(23, 59, 59, 999);
        dates.push(d);
      }
    } else if (assetTrendPeriod === '3m') {
      for (let i = 89; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        d.setHours(23, 59, 59, 999);
        dates.push(d);
      }
    } else { // 1y
      for (let i = 11; i >= 0; i--) {
        if (i === 0) {
           dates.push(new Date(today));
        } else {
           const d = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
           d.setHours(23, 59, 59, 999);
           dates.push(d);
        }
      }
    }

    return dates.map(date => {
      let currentNetWorth = 0;
      
      accounts.forEach(acc => {
        // 计算该账户截止当日的余额
        const accNetChange = transactions
          .filter(t => t.accountId === acc.id && new Date(t.date).getTime() <= date.getTime())
          .reduce((sum, t) => {
             if (acc.isLiability) {
                return t.type === 'expense' ? sum + t.amount : sum - t.amount;
             }
             return t.type === 'income' ? sum + t.amount : sum - t.amount;
          }, 0);
        
        const currentAccBalance = acc.initialBalance + accNetChange;
        
        if (acc.isLiability) {
          currentNetWorth -= currentAccBalance;
        } else {
          currentNetWorth += currentAccBalance;
        }
      });
      
      let dateStr = '';
      if (assetTrendPeriod === '1y') {
          dateStr = date.toLocaleDateString('zh-CN', { year: '2-digit', month: '2-digit' });
      } else {
          dateStr = date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
      }

      return {
        date: dateStr,
        value: currentNetWorth
      };
    });
  }, [accounts, transactions, assetTrendPeriod]);

  // 单个账户趋势
  const accountTrendHistory = useMemo(() => {
    if (!analyzingAccount) return [];

    const dates: Date[] = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (accountTrendPeriod === '1m') {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        d.setHours(23, 59, 59, 999);
        dates.push(d);
      }
    } else if (accountTrendPeriod === '3m') {
      for (let i = 89; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        d.setHours(23, 59, 59, 999);
        dates.push(d);
      }
    } else { // 1y
      for (let i = 11; i >= 0; i--) {
        if (i === 0) {
           dates.push(new Date(today));
        } else {
           const d = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
           d.setHours(23, 59, 59, 999);
           dates.push(d);
        }
      }
    }

    // 获取当前分析账户的最新信息（确保 initialBalance 准确）
    const account = accounts.find(a => a.id === analyzingAccount.id) || analyzingAccount;

    return dates.map(date => {
      const netChange = transactions
        .filter(t => t.accountId === account.id && new Date(t.date).getTime() <= date.getTime())
        .reduce((sum, t) => {
           if (account.isLiability) {
               return t.type === 'expense' ? sum + t.amount : sum - t.amount;
           }
           return t.type === 'income' ? sum + t.amount : sum - t.amount;
        }, 0);
      
      let dateStr = '';
      if (accountTrendPeriod === '1y') {
          dateStr = date.toLocaleDateString('zh-CN', { year: '2-digit', month: '2-digit' });
      } else {
          dateStr = date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
      }

      return {
        date: dateStr,
        value: account.initialBalance + netChange
      };
    });
  }, [analyzingAccount, accountTrendPeriod, transactions, accounts]);

  // Dashboard 专用的当前月统计
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

  // Dashboard filtered transactions
  const dashboardTransactions = useMemo(() => {
      const [year, month] = dashboardMonth.split('-').map(Number);
      return transactions.filter(t => {
          const d = new Date(t.date);
          return d.getMonth() === month - 1 && d.getFullYear() === year;
      });
  }, [transactions, dashboardMonth]);
  
  // 计算上月结转数据 (Budget Rollover)
  const rolloverData = useMemo(() => {
    if (!enableBudgetRollover) return {};
    
    // 计算上一个月的年份和月份
    const [currentY, currentM] = dashboardMonth.split('-').map(Number);
    // currentM is 1-12. Date constructor uses 0-11 for month.
    // So to get prev month: new Date(year, currentM - 2, 1)
    const prevDate = new Date(currentY, currentM - 2, 1);
    const prevY = prevDate.getFullYear();
    const prevM = prevDate.getMonth() + 1; // back to 1-12

    // 筛选上个月的支出记录
    const prevTransactions = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getFullYear() === prevY && (d.getMonth() + 1) === prevM;
    });

    const adjustments: Record<string, number> = {};
    
    budgets.forEach(b => {
        // 计算上月该分类的总支出
        const spent = prevTransactions
            .filter(t => t.category === b.category && t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
        
        // 结转额 = 上月预算 - 上月支出
        // 如果预算是 1000, 支出 800 -> 结余 +200
        // 如果预算是 1000, 支出 1200 -> 超支 -200
        adjustments[b.category] = b.limit - spent;
    });

    return adjustments;
  }, [dashboardMonth, transactions, budgets, enableBudgetRollover]);

  // Stats Tab 专用的自定义周期统计
  const periodStats = useMemo(() => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const txs = transactions.filter(t => {
      const d = new Date(t.date);
      return d >= start && d <= end;
    });

    const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    const categoryData = categories.map(c => {
      const value = txs
        .filter(t => t.category === c.name && t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      return { name: c.name, value, color: c.color.replace('bg-', '') };
    }).filter(d => d.value > 0).sort((a,b) => b.value - a.value);

    return { income, expense, categoryData };
  }, [transactions, categories, startDate, endDate]);

  const trendData = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    let data: { name: string; income: number; expense: number }[] = [];

    // 如果时间跨度超过 60 天，则按月聚合
    if (diffDays > 60) {
       let current = new Date(start);
       current.setDate(1); // 从当月1号开始迭代，方便计算
       
       const endMonth = new Date(end);
       endMonth.setDate(1);

       while (current <= endMonth || (current.getMonth() === endMonth.getMonth() && current.getFullYear() === endMonth.getFullYear())) {
          const year = current.getFullYear();
          const month = current.getMonth();
          const label = `${year}年${month + 1}月`;
          
          // 计算当月的有效时间范围（交集）
          const mStart = new Date(year, month, 1);
          const mEnd = new Date(year, month + 1, 0, 23, 59, 59);
          
          const effStart = mStart < start ? start : mStart;
          const effEnd = mEnd > end ? end : mEnd;

          const periodT = transactions.filter(t => {
            const d = new Date(t.date);
            // 简单判断：必须在当前月份内，且在全局选择范围内
            return d.getFullYear() === year && d.getMonth() === month && d >= new Date(startDate) && d <= new Date(endDate);
          });
          
          if (periodT.length > 0 || (mEnd >= start && mStart <= end)) {
              data.push({
                name: label,
                income: periodT.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
                expense: periodT.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
              });
          }
          current.setMonth(current.getMonth() + 1);
       }
    } else {
       // 按日聚合
       let current = new Date(start);
       current.setHours(0,0,0,0);
       const endLoop = new Date(end);
       endLoop.setHours(23,59,59,999);
       
       while(current <= endLoop) {
          const dateStr = current.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
          const dayStart = new Date(current);
          dayStart.setHours(0,0,0,0);
          const dayEnd = new Date(current);
          dayEnd.setHours(23,59,59,999);
          
          const dayT = transactions.filter(t => {
             const d = new Date(t.date);
             return d >= dayStart && d <= dayEnd;
          });

          data.push({
             name: dateStr,
             income: dayT.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
             expense: dayT.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
          });
          current.setDate(current.getDate() + 1);
       }
    }
    return data;
  }, [transactions, startDate, endDate]);

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      amount: Number(amount),
      category: categoryName,
      accountId: enableAccountLinking ? selectedAccountId : 'unlinked', // 根据设置决定是否关联账户
      note,
      type,
      date: new Date().toISOString(),
    };
    setTransactions([newTransaction, ...transactions]);
    setAmount('');
    setNote('');
    setIsModalOpen(false);
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName || !accType) return;

    // 确定颜色：负债红，攒钱绿，默认褐
    let accountColor = '#7d513d';
    if (accIsLiability) accountColor = '#b94a48';
    if (accIsSavings) accountColor = '#468847';

    const accountData = {
        name: accName,
        type: accType,
        initialBalance: Number(accInitialBalance) || 0,
        isLiability: accIsLiability,
        repaymentMonths: accIsLiability ? (Number(accRepaymentMonths) || 0) : undefined,
        isSavings: accIsSavings,
        savingsMonths: accIsSavings ? (Number(accSavingsMonths) || 0) : undefined,
        color: accountColor
    };

    if (editingAccount) {
      // 编辑模式
      setAccounts(accounts.map(acc => 
        acc.id === editingAccount.id 
          ? { ...acc, ...accountData }
          : acc
      ));
    } else {
      // 新增模式
      const newAccount: Account = {
        id: Date.now().toString(),
        ...accountData
      };
      setAccounts([...accounts, newAccount]);
    }
    
    setIsAccountModalOpen(false);
    setEditingAccount(null);
  };

  const handleDeleteAccount = () => {
    if (editingAccount) {
        setAccounts(accounts.filter(acc => acc.id !== editingAccount.id));
        setIsAccountModalOpen(false);
        setEditingAccount(null);
    }
  };

  const moveAccount = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === accounts.length - 1) return;
    
    const newAccounts = [...accounts];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newAccounts[index], newAccounts[targetIndex]] = [newAccounts[targetIndex], newAccounts[index]];
    setAccounts(newAccounts);
  };

  const handleUpdateBalance = (accountId: string, newBalance: number) => {
    const acc = accountBalances.find(a => a.id === accountId);
    if (!acc) return;
    const delta = newBalance - acc.currentBalance;
    if (delta === 0) return;

    // 添加一条修正流水
    // 针对负债账户的特殊逻辑：
    // 如果余额增加了（delta > 0），意味着欠款增加了，这通常是消费（expense）。
    // 如果余额减少了（delta < 0），意味着欠款减少了，这通常是还款（income）。
    
    // 针对普通账户：
    // 如果余额增加了，是收入（income）。
    // 如果余额减少了，是支出（expense）。
    
    let adjustmentType: 'expense' | 'income';
    
    if (acc.isLiability) {
        adjustmentType = delta > 0 ? 'expense' : 'income';
    } else {
        adjustmentType = delta > 0 ? 'income' : 'expense';
    }

    const adjustment: Transaction = {
      id: `adj-${Date.now()}`,
      amount: Math.abs(delta),
      category: '其他',
      accountId: accountId,
      note: '余额手动同步修正',
      date: new Date().toISOString(),
      type: adjustmentType
    };
    setTransactions([adjustment, ...transactions]);
    setIsEditBalanceModalOpen(null);
  };

  const handleUpdateBudget = (catName: string, limit: number) => {
    const existing = budgets.find(b => b.category === catName);
    if (existing) {
      if (limit <= 0) {
        setBudgets(budgets.filter(b => b.category !== catName));
      } else {
        setBudgets(budgets.map(b => b.category === catName ? { ...b, limit } : b));
      }
    } else if (limit > 0) {
      setBudgets([...budgets, { category: catName, limit }]);
    }
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    if (categories.some(c => c.name === newCatName.trim())) return;

    const newCategory: CategoryInfo = {
      id: `cat-${Date.now()}`,
      name: newCatName.trim(),
      icon: 'MoreHorizontal',
      color: 'bg-gray-400'
    };
    setCategories([...categories, newCategory]);
    setNewCatName('');
  };

  const handleDeleteCategory = (id: string, name: string) => {
    setCategories(categories.filter(c => c.id !== id));
    setBudgets(budgets.filter(b => b.category !== name));
  };

  const handleBackup = () => {
    const data = JSON.stringify({ transactions, budgets, accounts, categories, enableAccountLinking }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zenbudget_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.transactions && json.budgets) {
          setTransactions(json.transactions);
          setBudgets(json.budgets);
          if (json.accounts) setAccounts(json.accounts);
          if (json.categories) setCategories(json.categories);
          if (json.enableAccountLinking !== undefined) setEnableAccountLinking(json.enableAccountLinking);
          if (json.enableBudgetRollover !== undefined) setEnableBudgetRollover(json.enableBudgetRollover);
          alert('数据恢复成功！');
        } else {
          alert('无效的备份文件格式。');
        }
      } catch (err) {
        alert('读取文件失败。');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClearData = () => {
    setTransactions([]);
    setBudgets([]);
    setAccounts(DEFAULT_ACCOUNTS);
    setCategories(INITIAL_CATEGORIES);
    setEnableAccountLinking(true);
    setEnableBudgetRollover(false);
    localStorage.clear();
    setConfirmClearAll(false);
  };

  const getAccountIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('现金')) return <Coins size={20} />;
    if (t.includes('银行') || t.includes('卡') || t.includes('储蓄')) return <Landmark size={20} />;
    if (t.includes('支付') || t.includes('宝') || t.includes('微信')) return <CreditCard size={20} />;
    if (t.includes('理财') || t.includes('投资') || t.includes('基金') || t.includes('股票')) return <TrendingUp size={20} />;
    if (t.includes('负债') || t.includes('贷') || t.includes('借')) return <BadgePercent size={20} />;
    if (t.includes('攒钱') || t.includes('梦想') || t.includes('目标')) return <PiggyBank size={20} />;
    return <Wallet size={20} />;
  };

  return (
    <div className="min-h-screen pb-24" onClick={() => {
      setConfirmDeleteTxId(null);
      setConfirmDeleteAccId(null);
      setConfirmDeleteCatId(null);
      setConfirmClearAll(false);
    }}>
      <header className="hammer-header sticky top-0 z-30 py-3 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#7d513d] rounded-lg flex items-center justify-center text-white font-serif text-2xl shadow-inner border border-[#6d4635]">¥</div>
            <div>
              <h1 className="text-sm font-bold tracking-[0.2em] text-[#333] uppercase">ZenBudget</h1>
              <p className="text-[10px] text-[#999] tracking-wider uppercase">财务管理</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8">
        {activeTab === 'dashboard' ? (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-2">
                <div className="relative group cursor-pointer inline-block">
                   <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-serif font-bold text-[#333] group-hover:text-[#7d513d] transition-colors">
                            {dashboardMonth.split('-')[0]}年{parseInt(dashboardMonth.split('-')[1])}月
                        </h2>
                        <div className="text-[#ccc] group-hover:text-[#7d513d] transition-colors">
                            <ChevronDown size={20} />
                        </div>
                   </div>
                   <p className="text-[10px] text-[#999] font-bold uppercase tracking-widest mt-1">
                      账单概览
                   </p>
                   
                   <input 
                        type="month" 
                        value={dashboardMonth}
                        onChange={(e) => setDashboardMonth(e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        title="切换月份"
                    />
                </div>
            </div>

            <StatsCards 
                income={monthlyStats.income} 
                expense={monthlyStats.expense} 
                monthLabel={`${parseInt(dashboardMonth.split('-')[1])}月`} 
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-8 space-y-8">
                <div className="hammer-card p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold text-[#333] tracking-widest flex items-center gap-2 uppercase">
                      <div className="w-1 h-4 bg-[#7d513d]"></div>
                      {parseInt(dashboardMonth.split('-')[1])}月流水
                    </h3>
                    <button onClick={() => setIsHistoryVisible(true)} className="text-[10px] text-[#999] hover:text-[#7d513d] flex items-center font-bold">
                      查看全部流水 <ChevronRight size={12} />
                    </button>
                  </div>
                  <div className="space-y-0 border-t border-[#e0ddd5]">
                    {dashboardTransactions.slice(0, 5).map(t => (
                      <div key={t.id} className="flex items-center justify-between py-4 border-b border-[#e0ddd5] group">
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded border border-[#e0ddd5] flex items-center justify-center text-[#7d513d] bg-[#f9f9f9]`}>
                            {getIcon(categories.find(c => c.name === t.category)?.icon || 'MoreHorizontal', 'w-4 h-4')}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[#333]">{t.category}</p>
                            <p className="text-[10px] text-[#999]">{new Date(t.date).toLocaleDateString()} {t.note && `· ${t.note}`}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className={`text-lg font-mono ${t.type === 'expense' ? 'text-[#333]' : 'text-[#468847]'}`}>
                            {t.type === 'expense' ? '-' : '+'}¥{t.amount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    {dashboardTransactions.length === 0 && <div className="py-12 text-center text-[#ccc] text-xs font-bold italic">本月暂无记录</div>}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 h-full">
                <BudgetTracker 
                  transactions={dashboardTransactions} 
                  budgets={budgets} 
                  onOpenManagement={() => setIsBudgetModalOpen(true)}
                  rolloverAdjustments={rolloverData}
                  enableRollover={enableBudgetRollover}
                />
              </div>
            </div>
          </div>
        ) : activeTab === 'stats' ? (
          // ... keep stats tab content ...
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex justify-center mb-6">
              <div className="flex items-center gap-2 bg-[#f0eee8] p-1.5 rounded border border-[#e0ddd5] shadow-inner">
                  <div className="relative group">
                    <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#999] group-focus-within:text-[#7d513d] transition-colors pointer-events-none" />
                    <input 
                      type="date" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)}
                      className="pl-8 pr-2 py-1.5 bg-white rounded border border-transparent focus:border-[#7d513d] text-xs font-bold text-[#333] outline-none transition-all w-40 cursor-pointer hover:bg-white/80 shadow-sm"
                    />
                  </div>
                  <span className="text-[#ccc] font-bold">-</span>
                  <div className="relative group">
                    <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#999] group-focus-within:text-[#7d513d] transition-colors pointer-events-none" />
                    <input 
                      type="date" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)}
                      className="pl-8 pr-2 py-1.5 bg-white rounded border border-transparent focus:border-[#7d513d] text-xs font-bold text-[#333] outline-none transition-all w-40 cursor-pointer hover:bg-white/80 shadow-sm"
                    />
                  </div>
              </div>
            </div>

            <div className="hammer-card p-6 w-full overflow-hidden">
              <h3 className="text-sm font-bold text-[#333] mb-8 tracking-widest uppercase flex items-center gap-2">
                <div className="w-1 h-4 bg-[#7d513d]"></div>
                收支趋势分析
              </h3>
              <div className="h-[180px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0ddd5" />
                    <XAxis dataKey="name" axisLine={{ stroke: '#e0ddd5' }} tickLine={false} tick={{ fill: '#999', fontSize: 10, fontWeight: 'bold' }} />
                    <YAxis width={30} axisLine={false} tickLine={false} tick={{ fill: '#999', fontSize: 10, fontWeight: 'bold' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#fafafa', border: '1px solid #e0ddd5', borderRadius: '4px', fontSize: '12px' }} itemStyle={{ fontWeight: 'bold' }} />
                    <Legend verticalAlign="top" align="right" height={30} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', paddingBottom: '10px' }} />
                    <Line name="收入" type="monotone" dataKey="income" stroke="#468847" strokeWidth={2} dot={{ r: 3, fill: '#468847', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 5 }} />
                    <Line name="支出" type="monotone" dataKey="expense" stroke="#b94a48" strokeWidth={2} dot={{ r: 3, fill: '#b94a48', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="grid grid-cols-2 gap-4 content-start">
                <div className="hammer-card p-4 border-l-4 border-l-[#468847] flex flex-col justify-center">
                  <div className="flex items-center gap-2 text-[#999] text-[10px] font-bold uppercase tracking-wider mb-2">
                    <TrendingUp size={14} className="text-[#468847]" />
                    期间总收入
                  </div>
                  <p className="text-xl md:text-2xl font-light text-[#333]">
                    <span className="text-sm mr-1 text-[#999]">¥</span>
                    {periodStats.income.toLocaleString()}
                  </p>
                </div>
                <div className="hammer-card p-4 border-l-4 border-l-[#b94a48] flex flex-col justify-center">
                  <div className="flex items-center gap-2 text-[#999] text-[10px] font-bold uppercase tracking-wider mb-2">
                    <TrendingDown size={14} className="text-[#b94a48]" />
                    期间总支出
                  </div>
                  <p className="text-xl md:text-2xl font-light text-[#333]">
                    <span className="text-sm mr-1 text-[#999]">¥</span>
                    {periodStats.expense.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="hammer-card p-6 flex flex-col min-h-[300px]">
                <h3 className="text-sm font-bold text-[#333] mb-4 tracking-widest flex items-center gap-2 uppercase">
                  <PieChartIcon size={16} className="text-[#7d513d]" />
                  支出构成明细
                </h3>
                <div className="flex-1 min-h-[220px]">
                  {periodStats.categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={periodStats.categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} stroke="none" dataKey="value">
                          {periodStats.categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#7d513d' : '#a68c7e'} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{borderRadius: '4px', border: '1px solid #e0ddd5', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', fontSize: '12px'}} formatter={(value: any) => [`¥${value.toLocaleString()}`, '金额']} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-[#ccc] border-2 border-dashed border-[#e0ddd5] rounded-xl">
                      <p className="text-xs font-bold tracking-widest">暂无支出明细数据</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'assets' ? (
          // ... keep assets tab content ...
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* 核心资产总览卡片 - 紧凑版 */}
            <div className="hammer-card p-6 bg-[#7d513d] text-white relative overflow-hidden shadow-md">
               <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                 <Wallet size={120} />
               </div>
               <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                 <div>
                   <p className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-60 mb-1">资产净值总览</p>
                   <h2 className="text-3xl font-light tracking-tighter flex items-baseline">
                      <span className="text-lg mr-1 font-normal opacity-50 font-serif italic">¥</span>
                      {totalAssets.toLocaleString()}
                   </h2>
                 </div>
                 <div className="flex gap-4">
                   <button 
                     onClick={(e) => { 
                       e.stopPropagation(); 
                       setIsAccountManagerOpen(true); 
                     }}
                     className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded text-[10px] font-bold transition-all border border-white/20 backdrop-blur-sm shadow-sm"
                   >
                     <List size={12} /> 编辑账户
                   </button>
                   <button 
                     onClick={(e) => { e.stopPropagation(); setIsAssetStatsVisible(true); }}
                     className="flex items-center gap-1.5 bg-black/20 hover:bg-black/30 px-3 py-1.5 rounded text-[10px] font-bold transition-all border border-white/10"
                   >
                     <BarChart size={12} /> 资产统计
                   </button>
                 </div>
               </div>
            </div>

            {/* 账户列表 - 紧凑网格 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {accountBalances.map(acc => (
                <div key={acc.id} className="hammer-card group hover:shadow-md transition-all duration-300 overflow-hidden border-b-[3px]" style={{borderBottomColor: acc.color || '#7d513d'}}>
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded border border-[#e0ddd5] flex items-center justify-center bg-[#f9f9f9] group-hover:bg-white transition-colors ${acc.isLiability ? 'text-[#b94a48]' : (acc.isSavings ? 'text-[#468847]' : 'text-[#7d513d]')}`}>
                          {getAccountIcon(acc.type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                             <h4 className={`text-xs font-bold transition-colors ${acc.isSavings ? 'text-[#333] group-hover:text-[#468847]' : 'text-[#333] group-hover:text-[#7d513d]'}`}>{acc.name}</h4>
                             {acc.isLiability && <span className="text-[8px] bg-[#b94a48]/10 text-[#b94a48] px-1 rounded font-bold">负债</span>}
                             {acc.isSavings && <span className="text-[8px] bg-[#468847]/10 text-[#468847] px-1 rounded font-bold">攒钱</span>}
                          </div>
                          <p className="text-[9px] text-[#999] font-bold uppercase tracking-widest">{acc.type}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setAnalyzingAccount(acc);
                          }}
                          className={`text-[#ccc] transition-colors p-1.5 ${acc.isSavings ? 'hover:text-[#468847]' : 'hover:text-[#7d513d]'}`}
                          title="资金趋势"
                        >
                          <TrendingUp size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="hammer-stitch pt-3 flex justify-between items-end">
                      <div>
                          <p className="text-[9px] font-bold text-[#999] uppercase">当前余额</p>
                          <p 
                            className={`text-lg font-mono font-bold cursor-pointer hover:opacity-80 transition-all border-b border-dashed border-transparent hover:border-[#e0ddd5] group/balance ${acc.isLiability ? 'text-[#b94a48]' : (acc.isSavings ? 'text-[#468847]' : 'text-[#333]')}`}
                            onClick={(e) => { e.stopPropagation(); setIsEditBalanceModalOpen(acc); }}
                            title="点击修改余额"
                          >
                            <span className="text-[10px] mr-1 font-normal opacity-60">¥</span>
                            {acc.isLiability ? '-' : ''}{acc.currentBalance.toLocaleString()}
                            <Pencil size={10} className="inline ml-1 opacity-0 group-hover/balance:opacity-30 text-[#999]" />
                          </p>
                      </div>
                      {acc.isLiability && acc.repaymentMonths && acc.repaymentMonths > 0 && acc.currentBalance > 0 && (
                          <div className="text-right">
                             <p className="text-[9px] font-bold text-[#999] uppercase">月均需还</p>
                             <p className="text-xs font-mono font-bold text-[#b94a48]">
                                <span className="text-[9px] mr-0.5 font-normal opacity-60">¥</span>
                                {(acc.currentBalance / acc.repaymentMonths).toLocaleString(undefined, {maximumFractionDigits: 0})}
                                <span className="text-[9px] ml-1 text-[#999] font-normal">/ {acc.repaymentMonths}期</span>
                             </p>
                          </div>
                      )}
                      {acc.isSavings && acc.savingsMonths && acc.savingsMonths > 0 && acc.currentBalance > 0 && (
                          <div className="text-right">
                             <p className="text-[9px] font-bold text-[#999] uppercase">月均攒钱</p>
                             <p className="text-xs font-mono font-bold text-[#468847]">
                                <span className="text-[9px] mr-0.5 font-normal opacity-60">¥</span>
                                {(acc.currentBalance / acc.savingsMonths).toLocaleString(undefined, {maximumFractionDigits: 0})}
                                <span className="text-[9px] ml-1 text-[#999] font-normal">/ {acc.savingsMonths}月</span>
                             </p>
                          </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // ... keep settings tab content ...
          <div className="space-y-6 animate-in fade-in duration-300">
             <div className="hammer-card overflow-hidden mb-6">
                <div className="p-4 bg-[#f9f9f9] border-b border-[#e0ddd5]">
                   <h3 className="text-xs font-bold text-[#333] tracking-[0.2em] uppercase">常规设置</h3>
                </div>
                
                {/* 预算自动结转设置 */}
                <div className="p-6 flex items-center justify-between border-b border-[#e0ddd5]">
                    <div>
                        <p className="text-sm font-bold text-[#333]">预算自动结转</p>
                        <p className="text-xs text-[#999] mt-1">多余预算累加至下月，超额支出从下月扣除</p>
                    </div>
                    <button 
                        onClick={() => setEnableBudgetRollover(!enableBudgetRollover)}
                        className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${enableBudgetRollover ? 'bg-[#7d513d]' : 'bg-[#e0ddd5]'}`}
                    >
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${enableBudgetRollover ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                </div>

                {/* 记账关联资产账户设置 (已重命名) */}
                <div className="p-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-bold text-[#333]">记账关联资产账户</p>
                        <p className="text-xs text-[#999] mt-1">关闭后，新增流水将不扣减或增加账户余额</p>
                    </div>
                    <button 
                        onClick={() => setEnableAccountLinking(!enableAccountLinking)}
                        className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${enableAccountLinking ? 'bg-[#7d513d]' : 'bg-[#e0ddd5]'}`}
                    >
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${enableAccountLinking ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                </div>
             </div>

             <div className="hammer-card overflow-hidden">
                <div className="p-4 bg-[#f9f9f9] border-b border-[#e0ddd5]">
                   <h3 className="text-xs font-bold text-[#333] tracking-[0.2em] uppercase">数据管理</h3>
                </div>
                <div className="divide-y divide-[#e0ddd5]">
                   <button onClick={(e) => { e.stopPropagation(); handleBackup(); }} className="w-full flex items-center justify-between p-6 hover:bg-[#fafafa] transition-colors group">
                     <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded border border-[#e0ddd5] flex items-center justify-center text-[#7d513d] bg-white"><Download size={20} /></div>
                       <div className="text-left">
                         <p className="text-sm font-bold text-[#333]">备份数据</p>
                         <p className="text-xs text-[#999]">导出所有账单、预算和账户为 JSON 文件</p>
                       </div>
                     </div>
                     <ChevronRight size={16} className="text-[#ccc] group-hover:text-[#999]" />
                   </button>
                   <button onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="w-full flex items-center justify-between p-6 hover:bg-[#fafafa] transition-colors group">
                     <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded border border-[#e0ddd5] flex items-center justify-center text-[#7d513d] bg-white"><Upload size={20} /></div>
                       <div className="text-left">
                         <p className="text-sm font-bold text-[#333]">恢复数据</p>
                         <p className="text-xs text-[#999]">从备份文件导入数据</p>
                       </div>
                     </div>
                     <ChevronRight size={16} className="text-[#ccc] group-hover:text-[#999]" /><input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleRestore} />
                   </button>
                   <button onClick={(e) => { e.stopPropagation(); if (confirmClearAll) handleClearData(); else setConfirmClearAll(true); }} className={`w-full flex items-center justify-between p-6 transition-colors group ${confirmClearAll ? 'bg-[#b94a48]/10' : 'hover:bg-rose-50'}`}>
                     <div className="flex items-center gap-4">
                       <div className={`w-10 h-10 rounded border border-[#e0ddd5] flex items-center justify-center bg-white transition-colors ${confirmClearAll ? 'text-[#b94a48] border-[#b94a48]' : 'text-[#b94a48]'}`}>{confirmClearAll ? <AlertCircle size={20} /> : <Trash size={20} />}</div>
                       <div className="text-left">
                         <p className="text-sm font-bold text-[#b94a48]">{confirmClearAll ? '再次点击确认清空所有数据' : '清空数据'}</p>
                         <p className="text-xs text-[#999]">永久删除所有本地记账数据</p>
                       </div>
                     </div>
                     {confirmClearAll ? <span className="text-[10px] font-bold text-[#b94a48] uppercase tracking-widest">二次确认中...</span> : <ChevronRight size={16} className="text-[#ccc] group-hover:text-[#b94a48]" />}
                   </button>
                </div>
             </div>

             <div className="hammer-card p-6 bg-[#fffdf0] border-l-4 border-l-[#7d513d]">
               <h3 className="text-xs font-bold text-[#333] mb-2 uppercase tracking-widest">关于 ZENBUDGET</h3>
               <p className="text-xs text-[#666] leading-relaxed">这是一款致敬经典“锤子便签”设计的记账工具。理财是一种生活态度。数据本地存储，安全可控。</p>
               <p className="text-[10px] text-[#999] mt-4 font-mono">v2.1.0</p>
             </div>
          </div>
        )}
      </main>
      
      {/* ... keeping other parts of JSX same ... */}
      {/* 底部导航 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#e0ddd5] px-4 py-4 flex items-center justify-around z-[50] shadow-[0_-2px_10px_rgba(0,0,0,0.03)] pb-safe">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 flex-1 ${activeTab === 'dashboard' ? 'text-[#7d513d]' : 'text-[#999]'}`}><LayoutDashboard size={20} /><span className="text-[9px] font-bold tracking-tighter">消费</span></button>
        <button onClick={() => setActiveTab('stats')} className={`flex flex-col items-center gap-1 flex-1 ${activeTab === 'stats' ? 'text-[#7d513d]' : 'text-[#999]'}`}><BarChart3 size={20} /><span className="text-[9px] font-bold tracking-tighter">统计</span></button>
        <div className="px-4 relative z-[51]">
            <button 
                type="button"
                onClick={() => setIsModalOpen(true)} 
                className="w-12 h-12 bg-[#7d513d] rounded shadow-lg flex items-center justify-center text-white active:scale-95 transition-all border border-[#6d4635]"
            >
                <Plus size={24} />
            </button>
        </div>
        <button onClick={() => setActiveTab('assets')} className={`flex flex-col items-center gap-1 flex-1 ${activeTab === 'assets' ? 'text-[#7d513d]' : 'text-[#999]'}`}><Wallet size={20} /><span className="text-[9px] font-bold tracking-tighter">资产</span></button>
        <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 flex-1 ${activeTab === 'settings' ? 'text-[#7d513d]' : 'text-[#999]'}`}><Settings size={20} /><span className="text-[9px] font-bold tracking-tighter">设置</span></button>
      </nav>

      {/* Modals and Overlays with updated z-index */}
      
      {/* 交易历史流水覆盖层 */}
      {isHistoryVisible && (
        <div className="fixed inset-0 z-[60] bg-[#f4f1ea] paper-texture overflow-y-auto animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8 sticky top-0 bg-[#f4f1ea]/80 backdrop-blur pb-4 z-10 border-b border-[#e0ddd5]">
               <h2 className="text-xs font-bold tracking-[0.4em] uppercase text-[#333]">近期交易流水</h2>
               <button onClick={() => setIsHistoryVisible(false)} className="bg-white border border-[#e0ddd5] rounded-full p-2 text-[#999] hover:text-[#333] transition-colors">
                 <X size={20} />
               </button>
            </div>
            <div className="hammer-card p-6">
              <div className="space-y-0">
                {transactions.map(t => {
                  const acc = accounts.find(a => a.id === t.accountId);
                  return (
                    <div key={t.id} className="flex items-center justify-between py-5 border-b border-[#e0ddd5] hover:bg-[#fbfbfb] px-2 transition-colors group">
                      <div className="flex items-center gap-6">
                        <span className="text-[10px] font-mono text-[#999] w-16">{new Date(t.date).toLocaleDateString('zh-CN', {month: '2-digit', day: '2-digit'})}</span>
                        <div className="w-10 h-10 border border-[#e0ddd5] rounded flex items-center justify-center text-[#7d513d] bg-white">
                          {getIcon(categories.find(c => c.name === t.category)?.icon || 'MoreHorizontal', 'w-5 h-5')}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-[#333]">{t.category}</p>
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] bg-[#f0eee8] text-[#999] px-1.5 py-0.5 rounded uppercase font-bold tracking-tighter">
                                {acc?.name || (t.accountId === 'unlinked' ? '未关联账户' : '未知账户')}
                             </span>
                             <p className="text-[11px] text-[#999] truncate max-w-[120px]">{t.note || '无备注'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className={`text-lg font-mono ${t.type === 'expense' ? 'text-[#333]' : 'text-[#468847]'}`}>
                          {t.type === 'expense' ? '-' : '+'}¥{t.amount.toLocaleString()}
                        </p>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirmDeleteTxId === t.id) {
                              setTransactions(transactions.filter(tr => tr.id !== t.id));
                              setConfirmDeleteTxId(null);
                            } else {
                              setConfirmDeleteTxId(t.id);
                            }
                          }} 
                          className={`transition-all p-1.5 rounded flex items-center gap-1 ${
                            confirmDeleteTxId === t.id 
                              ? 'bg-[#b94a48] text-white' 
                              : 'text-[#ccc] hover:text-[#b94a48]'
                          }`}
                        >
                          {confirmDeleteTxId === t.id ? <span className="text-[10px] font-bold">确认?</span> : <Trash2 size={16} />}
                        </button>
                      </div>
                    </div>
                  );
                })}
                {transactions.length === 0 && <div className="py-20 text-center text-[#ccc] font-bold">暂无流水记录</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 预算管理 & 分类自定义模态框 */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30 backdrop-blur-[2px]" onClick={() => setIsBudgetModalOpen(false)}>
          <div className="bg-[#fafafa] w-full max-md:max-w-none max-w-lg rounded-lg shadow-2xl border border-[#e0ddd5] overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <div className="p-8 border-b border-[#e0ddd5] bg-white">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xs font-bold tracking-[0.3em] uppercase text-[#333]">预算与分类配置</h2>
                  <p className="text-[10px] text-[#999] mt-1 font-bold uppercase tracking-widest">分类限额设置</p>
                </div>
                <button onClick={() => setIsBudgetModalOpen(false)} className="text-[#ccc] hover:text-[#999] p-1"><X size={24} /></button>
              </div>
              
              <form onSubmit={handleAddCategory} className="flex gap-2">
                <div className="flex-1 relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ccc]" size={14} />
                  <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="输入新分类名称..." className="w-full pl-9 pr-3 py-3 bg-[#f9f9f9] border border-[#e0ddd5] rounded text-xs font-bold focus:bg-white focus:border-[#7d513d] outline-none transition-all" />
                </div>
                <button type="submit" className="bg-[#7d513d] text-white px-5 rounded hover:bg-[#6d4635] transition-colors font-bold text-xs uppercase tracking-widest">
                  添加
                </button>
              </form>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-3 custom-scrollbar bg-[#f4f1ea]/30 paper-texture">
              {categories.map(cat => {
                const currentBudget = budgets.find(b => b.category === cat.name);
                return (
                  <div key={cat.id} className="p-4 border border-[#e0ddd5] rounded-lg bg-white shadow-sm group hover:border-[#7d513d] transition-all">
                    {/* Header Row: Icon, Name, Delete */}
                    <div className="flex items-center justify-between mb-3">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg border border-[#e0ddd5] flex items-center justify-center text-[#7d513d] bg-[#f9f9f9] group-hover:bg-[#7d513d]/5 transition-colors shadow-inner">
                             {getIcon(cat.icon, 'w-4 h-4')}
                          </div>
                          <span className="text-sm font-bold text-[#333] tracking-wide">{cat.name}</span>
                       </div>
                       <button onClick={(e) => { e.stopPropagation(); if (confirmDeleteCatId === cat.id) { handleDeleteCategory(cat.id, cat.name); setConfirmDeleteCatId(null); } else setConfirmDeleteCatId(cat.id); }} className={`p-1.5 rounded transition-all ${confirmDeleteCatId === cat.id ? 'bg-[#b94a48] text-white' : 'text-[#ccc] hover:text-[#b94a48]'}`}>
                          {confirmDeleteCatId === cat.id ? <span className="text-[10px] font-bold px-1">确认?</span> : <Trash2 size={14} />}
                       </button>
                    </div>

                    {/* Input Row: Yearly, Monthly, Daily */}
                    <div className="flex items-stretch divide-x divide-[#e0ddd5] bg-[#fafafa] rounded border border-[#e0ddd5]">
                        {/* Yearly */}
                        <div className="flex-1 p-2 flex flex-col items-center justify-center gap-1 group/input">
                           <span className="text-[9px] text-[#999] uppercase tracking-wider font-bold">每年</span>
                           <div className="relative w-full">
                              <input
                                 key={`y-${currentBudget?.limit}`}
                                 type="number"
                                 placeholder="-"
                                 className="w-full text-center text-xs font-bold text-[#999] bg-transparent border-b border-transparent group-hover/input:border-[#e0ddd5] focus:border-[#7d513d] outline-none py-1 transition-colors focus:text-[#333]"
                                 defaultValue={currentBudget?.limit ? Math.round(currentBudget.limit * 12) : ''}
                                 onBlur={(e) => handleUpdateBudget(cat.name, Number(e.target.value) / 12)}
                              />
                           </div>
                        </div>

                        {/* Monthly (Highlight) */}
                        <div className="flex-1 p-2 flex flex-col items-center justify-center gap-1 group/input relative bg-white">
                           <span className="text-[9px] text-[#7d513d] font-bold uppercase tracking-wider">每月</span>
                           <div className="relative w-full">
                              <input
                                 key={`m-${currentBudget?.limit}`}
                                 type="number"
                                 placeholder="未设置"
                                 className="w-full text-center text-sm font-bold text-[#333] bg-transparent border-b border-[#7d513d]/20 focus:border-[#7d513d] outline-none py-1 transition-colors placeholder:text-[#ccc] placeholder:text-xs placeholder:font-normal"
                                 defaultValue={currentBudget?.limit || ''}
                                 onBlur={(e) => handleUpdateBudget(cat.name, Number(e.target.value))}
                              />
                           </div>
                        </div>

                        {/* Daily */}
                        <div className="flex-1 p-2 flex flex-col items-center justify-center gap-1 group/input">
                           <span className="text-[9px] text-[#999] uppercase tracking-wider font-bold">每日</span>
                           <div className="relative w-full">
                              <input
                                 key={`d-${currentBudget?.limit}`}
                                 type="number"
                                 placeholder="-"
                                 className="w-full text-center text-xs font-bold text-[#999] bg-transparent border-b border-transparent group-hover/input:border-[#e0ddd5] focus:border-[#7d513d] outline-none py-1 transition-colors focus:text-[#333]"
                                 defaultValue={currentBudget?.limit ? Math.round(currentBudget.limit / 30) : ''}
                                 onBlur={(e) => handleUpdateBudget(cat.name, Number(e.target.value) * 30)}
                              />
                           </div>
                        </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-8 bg-white border-t border-[#e0ddd5] flex justify-end">
              <button onClick={() => setIsBudgetModalOpen(false)} className="px-8 py-3 bg-[#7d513d] text-white rounded text-xs font-bold tracking-[0.3em] uppercase shadow-lg hover:bg-[#6d4635] transition-all">
                保存并退出
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 资产统计覆盖层 */}
      {isAssetStatsVisible && (
        <div className="fixed inset-0 z-[60] bg-[#f4f1ea] paper-texture flex flex-col" onClick={e => e.stopPropagation()}>
           <div className="p-4 border-b border-[#e0ddd5] bg-white flex justify-between items-center">
              <div>
                 <h2 className="text-xs font-bold tracking-[0.3em] uppercase text-[#333]">净资产趋势</h2>
                 <p className="text-[10px] text-[#999] mt-1">总资产变化曲线</p>
              </div>
              <button onClick={() => setIsAssetStatsVisible(false)} className="text-[#ccc] hover:text-[#999]"><X size={24} /></button>
           </div>
           <div className="flex-1 flex flex-col p-4">
              <div className="flex justify-center mb-6">
                 <div className="flex bg-[#e0ddd5] p-1 rounded">
                    {(['1m', '3m', '1y'] as AssetPeriod[]).map(p => (
                       <button
                          key={p}
                          onClick={() => setAssetTrendPeriod(p)}
                          className={`px-4 py-1 rounded text-xs font-bold transition-all ${assetTrendPeriod === p ? 'bg-white text-[#7d513d] shadow-sm' : 'text-[#999] hover:text-[#666]'}`}
                       >
                          {p === '1m' ? '近1月' : (p === '3m' ? '近3月' : '近1年')}
                       </button>
                    ))}
                 </div>
              </div>
              <div className="flex-1 min-h-0 hammer-card p-4 bg-white">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={assetTrendHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                       <defs>
                          <linearGradient id="colorAssets" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="#7d513d" stopOpacity={0.1}/>
                             <stop offset="95%" stopColor="#7d513d" stopOpacity={0}/>
                          </linearGradient>
                       </defs>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0eee8" />
                       <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#ccc', fontSize: 10}} />
                       <YAxis axisLine={false} tickLine={false} tick={{fill: '#ccc', fontSize: 10}} />
                       <Tooltip contentStyle={{backgroundColor: '#fff', border: '1px solid #e0ddd5', borderRadius: 4, fontSize: 12}} />
                       <Area type="monotone" dataKey="value" stroke="#7d513d" strokeWidth={2} fillOpacity={1} fill="url(#colorAssets)" />
                    </AreaChart>
                 </ResponsiveContainer>
              </div>
           </div>
        </div>
      )}
      
      {/* ... keeping other modals ... */}
      
      {/* 账户详情与趋势覆盖层 */}
      {analyzingAccount && (
        <div className="fixed inset-0 z-[60] bg-[#f4f1ea] paper-texture flex flex-col" onClick={e => e.stopPropagation()}>
           <div className="p-4 border-b border-[#e0ddd5] bg-white flex justify-between items-center" style={{borderBottomColor: analyzingAccount.color}}>
              <div className="flex items-center gap-3">
                 <div className={`w-10 h-10 rounded border border-[#e0ddd5] flex items-center justify-center bg-[#f9f9f9] ${analyzingAccount.isLiability ? 'text-[#b94a48]' : (analyzingAccount.isSavings ? 'text-[#468847]' : 'text-[#7d513d]')}`}>
                    {getAccountIcon(analyzingAccount.type)}
                 </div>
                 <div>
                    <h2 className="text-sm font-bold text-[#333]">{analyzingAccount.name}</h2>
                    <p className="text-[10px] text-[#999]">{analyzingAccount.type} · 资金趋势</p>
                 </div>
              </div>
              <button onClick={() => setAnalyzingAccount(null)} className="text-[#ccc] hover:text-[#999]"><X size={24} /></button>
           </div>
           
           <div className="flex-1 flex flex-col p-4">
              <div className="flex justify-center mb-6">
                 <div className="flex bg-[#e0ddd5] p-1 rounded">
                    {(['1m', '3m', '1y'] as AssetPeriod[]).map(p => (
                       <button
                          key={p}
                          onClick={() => setAccountTrendPeriod(p)}
                          className={`px-4 py-1 rounded text-xs font-bold transition-all ${accountTrendPeriod === p ? 'bg-white text-[#7d513d] shadow-sm' : 'text-[#999] hover:text-[#666]'}`}
                       >
                          {p === '1m' ? '近1月' : (p === '3m' ? '近3月' : '近1年')}
                       </button>
                    ))}
                 </div>
              </div>

              <div className="hammer-card p-6 bg-white mb-6">
                 <p className="text-[10px] text-[#999] font-bold uppercase tracking-widest mb-1">当前余额</p>
                 <p className={`text-3xl font-light ${analyzingAccount.isLiability ? 'text-[#b94a48]' : 'text-[#333]'}`}>
                    <span className="text-lg mr-1 text-[#ccc] font-normal">¥</span>
                    {analyzingAccount.isLiability ? '-' : ''}{accountBalances.find(a => a.id === analyzingAccount.id)?.currentBalance.toLocaleString()}
                 </p>
              </div>

              <div className="flex-1 min-h-0 hammer-card p-4 bg-white">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={accountTrendHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                       <defs>
                          <linearGradient id="colorAccount" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor={analyzingAccount.color} stopOpacity={0.1}/>
                             <stop offset="95%" stopColor={analyzingAccount.color} stopOpacity={0}/>
                          </linearGradient>
                       </defs>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0eee8" />
                       <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#ccc', fontSize: 10}} />
                       <YAxis axisLine={false} tickLine={false} tick={{fill: '#ccc', fontSize: 10}} />
                       <Tooltip contentStyle={{backgroundColor: '#fff', border: '1px solid #e0ddd5', borderRadius: 4, fontSize: 12}} />
                       <Area type="monotone" dataKey="value" stroke={analyzingAccount.color} strokeWidth={2} fillOpacity={1} fill="url(#colorAccount)" />
                    </AreaChart>
                 </ResponsiveContainer>
              </div>
           </div>
        </div>
      )}

      {isAccountManagerOpen && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30 backdrop-blur-[2px]" onClick={() => setIsAccountManagerOpen(false)}>
            {/* ... keep content ... */}
           <div className="bg-[#fafafa] w-full max-w-sm rounded-lg shadow-2xl border border-[#e0ddd5] overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-[#e0ddd5] bg-white flex justify-between items-center">
                 <div>
                    <h2 className="text-xs font-bold tracking-[0.3em] uppercase text-[#333]">账户排序与管理</h2>
                    <p className="text-[10px] text-[#999] mt-1">调整顺序或编辑账户</p>
                 </div>
                 <button onClick={() => setIsAccountManagerOpen(false)} className="text-[#ccc] hover:text-[#999]"><X size={20} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-2 bg-[#f4f1ea]/30 paper-texture custom-scrollbar">
                 {accounts.map((acc, index) => (
                    <div key={acc.id} className="flex items-center justify-between p-3 border border-[#e0ddd5] rounded bg-white group hover:border-[#7d513d] transition-all">
                       <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded border border-[#e0ddd5] flex items-center justify-center bg-[#f9f9f9] ${acc.isLiability ? 'text-[#b94a48]' : (acc.isSavings ? 'text-[#468847]' : 'text-[#7d513d]')}`}>{getAccountIcon(acc.type)}</div>
                          <div>
                             <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-[#333]">{acc.name}</p>
                                {acc.isLiability && <span className="text-[8px] bg-[#b94a48]/10 text-[#b94a48] px-1 rounded font-bold">负债</span>}
                                {acc.isSavings && <span className="text-[8px] bg-[#468847]/10 text-[#468847] px-1 rounded font-bold">攒钱</span>}
                             </div>
                             <p className="text-[9px] text-[#999]">{acc.type}</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-1">
                          <button 
                             onClick={() => moveAccount(index, 'up')}
                             disabled={index === 0}
                             className="p-1.5 rounded hover:bg-[#f0eee8] text-[#999] disabled:opacity-20 transition-colors"
                          >
                             <ArrowUp size={14} />
                          </button>
                          <button 
                             onClick={() => moveAccount(index, 'down')}
                             disabled={index === accounts.length - 1}
                             className="p-1.5 rounded hover:bg-[#f0eee8] text-[#999] disabled:opacity-20 transition-colors"
                          >
                             <ArrowDown size={14} />
                          </button>
                          <button 
                             onClick={() => {
                                setEditingAccount(acc);
                                setIsAccountModalOpen(true);
                             }}
                             className="p-1.5 rounded hover:bg-[#7d513d] hover:text-white text-[#ccc] transition-colors ml-1"
                          >
                             <Settings size={14} />
                          </button>
                       </div>
                    </div>
                 ))}
              </div>
              <div className="p-6 bg-white border-t border-[#e0ddd5]">
                 <button 
                    onClick={() => {
                       setEditingAccount(null);
                       setIsAccountModalOpen(true);
                    }}
                    className="w-full py-3 bg-[#7d513d] text-white rounded text-xs font-bold tracking-[0.3em] uppercase shadow-lg hover:bg-[#6d4635] transition-all flex items-center justify-center gap-2"
                 >
                    <PlusCircle size={14} /> 添加新账户
                 </button>
              </div>
           </div>
         </div>
      )}

      {/* 记账模态框 (z-60) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30 backdrop-blur-[2px]" onClick={() => setIsModalOpen(false)}>
          <div className="bg-[#fafafa] w-full max-sm:max-w-none max-w-sm rounded-lg shadow-2xl border border-[#e0ddd5] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xs font-bold tracking-[0.3em] uppercase text-[#333]">新增流水记录</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-[#ccc] hover:text-[#999]"><X size={20} /></button>
              </div>
              <form onSubmit={handleAddTransaction} className="space-y-6">
                <div className="flex p-1 bg-[#f0eee8] rounded border border-[#e0ddd5]">
                  <button type="button" onClick={() => setType('expense')} className={`flex-1 py-1.5 rounded text-[10px] font-bold uppercase transition-all ${type === 'expense' ? 'bg-white text-[#333] shadow-sm' : 'text-[#999]'}`}>支出</button>
                  <button type="button" onClick={() => setType('income')} className={`flex-1 py-1.5 rounded text-[10px] font-bold uppercase transition-all ${type === 'income' ? 'bg-white text-[#468847] shadow-sm' : 'text-[#999]'}`}>收入</button>
                </div>
                <div className="border-b border-[#e0ddd5] pb-2 flex items-baseline">
                  <span className="text-[#ccc] text-lg font-serif italic mr-2">¥</span>
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" autoFocus className="bg-transparent text-3xl font-light w-full outline-none" />
                </div>
                
                {/* 仅当开启关联账户时显示选择框 */}
                {enableAccountLinking && (
                  <div className="space-y-2">
                     <label className="text-[10px] font-bold text-[#999] uppercase tracking-widest">选择账户</label>
                     <select value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)} className="w-full p-3 bg-white border border-[#e0ddd5] rounded text-xs font-bold text-[#666] outline-none cursor-pointer hover:border-[#7d513d] transition-colors">
                       {accountBalances.map(acc => (
                         <option key={acc.id} value={acc.id}>{acc.name} (余额: {acc.isLiability ? '-' : ''}¥{acc.currentBalance.toLocaleString()})</option>
                       ))}
                     </select>
                  </div>
                )}

                <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto custom-scrollbar">
                  {categories.map(cat => (
                    <button key={cat.id} type="button" onClick={() => setCategoryName(cat.name)} className={`p-2 rounded border flex flex-col items-center gap-2 transition-all ${categoryName === cat.name ? 'border-[#7d513d] bg-[#7d513d]/5' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                      <div className={`w-12 h-12 rounded-lg border border-[#e0ddd5] flex items-center justify-center text-[#7d513d] bg-white`}>{getIcon(cat.icon, 'w-6 h-6')}</div>
                      <span className="text-[10px] font-bold truncate w-full text-center">{cat.name}</span>
                    </button>
                  ))}
                </div>
                <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="添加备注..." className="w-full border-b border-[#e0ddd5] bg-transparent text-xs py-2 focus:border-[#7d513d] outline-none" />
                <button type="submit" className="w-full py-3 bg-[#7d513d] text-white rounded text-xs font-bold tracking-widest uppercase shadow-md hover:bg-[#6d4635] transition-colors">保存记录</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 编辑余额模态框 (z-60) */}
      {isEditBalanceModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]" onClick={() => setIsEditBalanceModalOpen(null)}>
           <div className="bg-[#fafafa] w-full max-w-sm rounded-lg shadow-2xl border border-[#e0ddd5] overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="p-8">
                 <div className="flex justify-between items-center mb-8">
                    <div>
                      <h2 className="text-xs font-bold tracking-[0.3em] uppercase text-[#333]">同步账户余额</h2>
                      <p className="text-[10px] text-[#999] mt-1">手动修正“{isEditBalanceModalOpen.name}”的实际余额</p>
                    </div>
                    <button onClick={() => setIsEditBalanceModalOpen(null)} className="text-[#ccc] hover:text-[#999]"><X size={20} /></button>
                 </div>
                 <div className="space-y-8">
                    <div className="p-4 bg-[#f0eee8] rounded border border-[#e0ddd5] flex justify-between items-center">
                       <span className="text-[10px] font-bold text-[#999] uppercase">账面当前余额</span>
                       <span className="text-sm font-mono font-bold text-[#666]">¥{accountBalances.find(ab => ab.id === isEditBalanceModalOpen.id)?.currentBalance.toLocaleString()}</span>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-[#999] uppercase tracking-widest">输入实际余额</label>
                       <div className="flex items-baseline border-b-2 border-[#7d513d] pb-2">
                          <span className="text-2xl font-serif italic text-[#ccc] mr-3">¥</span>
                          <input 
                            type="number" 
                            autoFocus
                            placeholder="0.00"
                            className="bg-transparent text-4xl font-light w-full outline-none"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleUpdateBalance(isEditBalanceModalOpen.id, Number((e.target as HTMLInputElement).value));
                              }
                            }}
                          />
                       </div>
                    </div>
                    <p className="text-[10px] text-[#999] italic">* 系统将自动生成一条差额修正记录以使账面余额与输入一致。</p>
                    <button 
                      onClick={() => {
                        const val = (document.querySelector('input[type="number"]') as HTMLInputElement).value;
                        handleUpdateBalance(isEditBalanceModalOpen.id, Number(val));
                      }}
                      className="w-full py-4 bg-[#7d513d] text-white rounded text-xs font-bold tracking-[0.3em] uppercase shadow-lg hover:bg-[#6d4635] transition-all"
                    >
                      确认同步
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* 账户编辑模态框 */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]" onClick={() => setIsAccountModalOpen(false)}>
           <div className="bg-[#fafafa] w-full max-w-sm rounded-lg shadow-2xl border border-[#e0ddd5] overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-[#e0ddd5] bg-white flex justify-between items-center">
                 <div>
                    <h2 className="text-xs font-bold tracking-[0.3em] uppercase text-[#333]">{editingAccount ? '编辑账户' : '添加新账户'}</h2>
                    <p className="text-[10px] text-[#999] mt-1">配置账户属性</p>
                 </div>
                 <button onClick={() => setIsAccountModalOpen(false)} className="text-[#ccc] hover:text-[#999]"><X size={20} /></button>
              </div>
              <form onSubmit={handleSaveAccount} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                  <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#999] uppercase tracking-widest">账户名称</label>
                      <input type="text" value={accName} onChange={e => setAccName(e.target.value)} className="w-full p-3 bg-white border border-[#e0ddd5] rounded text-xs font-bold focus:border-[#7d513d] outline-none" placeholder="例如：招商银行、支付宝..." />
                  </div>
                  <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#999] uppercase tracking-widest">账户类型</label>
                      <select value={accType} onChange={e => setAccType(e.target.value)} className="w-full p-3 bg-white border border-[#e0ddd5] rounded text-xs font-bold text-[#666] outline-none">
                          <option value="">选择类型...</option>
                          <option value="现金">现金</option>
                          <option value="银行储蓄">银行储蓄</option>
                          <option value="第三方支付">第三方支付 (微信/支付宝)</option>
                          <option value="信用卡">信用卡 / 借贷</option>
                          <option value="理财投资">理财投资</option>
                          <option value="其他">其他</option>
                      </select>
                  </div>
                  {!editingAccount && (
                      <div className="space-y-1">
                          <label className="text-[10px] font-bold text-[#999] uppercase tracking-widest">初始余额</label>
                          <input type="number" value={accInitialBalance} onChange={e => setAccInitialBalance(e.target.value)} className="w-full p-3 bg-white border border-[#e0ddd5] rounded text-xs font-bold focus:border-[#7d513d] outline-none" placeholder="0.00" />
                      </div>
                  )}
                  
                  <div className="p-4 bg-[#f9f9f9] rounded border border-[#e0ddd5] space-y-4">
                      <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-[#333] flex items-center gap-2">
                             <div className={`w-3 h-3 rounded-full border border-[#e0ddd5] ${accIsLiability ? 'bg-[#b94a48]' : 'bg-white'}`}></div>
                             设为负债账户
                          </label>
                          <button type="button" onClick={() => { setAccIsLiability(!accIsLiability); if(!accIsLiability) setAccIsSavings(false); }} className={`w-8 h-4 rounded-full p-0.5 transition-colors ${accIsLiability ? 'bg-[#b94a48]' : 'bg-[#e0ddd5]'}`}>
                              <div className={`w-3 h-3 bg-white rounded-full shadow transition-transform ${accIsLiability ? 'translate-x-4' : ''}`}></div>
                          </button>
                      </div>
                      {accIsLiability && (
                          <div className="space-y-1 animate-in fade-in slide-in-from-top-1">
                              <label className="text-[10px] font-bold text-[#999]">分期期数 (用于计算月供)</label>
                              <input type="number" value={accRepaymentMonths} onChange={e => setAccRepaymentMonths(e.target.value)} className="w-full p-2 bg-white border border-[#e0ddd5] rounded text-xs" placeholder="0" />
                          </div>
                      )}

                      <div className="flex items-center justify-between border-t border-[#e0ddd5] pt-4">
                          <label className="text-[10px] font-bold text-[#333] flex items-center gap-2">
                             <div className={`w-3 h-3 rounded-full border border-[#e0ddd5] ${accIsSavings ? 'bg-[#468847]' : 'bg-white'}`}></div>
                             设为攒钱目标
                          </label>
                          <button type="button" onClick={() => { setAccIsSavings(!accIsSavings); if(!accIsSavings) setAccIsLiability(false); }} className={`w-8 h-4 rounded-full p-0.5 transition-colors ${accIsSavings ? 'bg-[#468847]' : 'bg-[#e0ddd5]'}`}>
                              <div className={`w-3 h-3 bg-white rounded-full shadow transition-transform ${accIsSavings ? 'translate-x-4' : ''}`}></div>
                          </button>
                      </div>
                      {accIsSavings && (
                          <div className="space-y-1 animate-in fade-in slide-in-from-top-1">
                              <label className="text-[10px] font-bold text-[#999]">目标周期 (月)</label>
                              <input type="number" value={accSavingsMonths} onChange={e => setAccSavingsMonths(e.target.value)} className="w-full p-2 bg-white border border-[#e0ddd5] rounded text-xs" placeholder="12" />
                          </div>
                      )}
                  </div>

                  <div className="pt-4 flex gap-3">
                      {editingAccount && (
                          <button 
                            type="button" 
                            onClick={() => {
                                if (confirmDeleteAccId === editingAccount.id) {
                                    handleDeleteAccount();
                                } else {
                                    setConfirmDeleteAccId(editingAccount.id);
                                }
                            }}
                            className={`flex-1 py-3 rounded text-xs font-bold tracking-widest uppercase border transition-all ${confirmDeleteAccId === editingAccount.id ? 'bg-[#b94a48] text-white border-[#b94a48]' : 'bg-white text-[#b94a48] border-[#e0ddd5] hover:bg-[#b94a48]/5'}`}
                          >
                              {confirmDeleteAccId === editingAccount.id ? '确认删除?' : '删除账户'}
                          </button>
                      )}
                      <button type="submit" className="flex-[2] py-3 bg-[#7d513d] text-white rounded text-xs font-bold tracking-widest uppercase shadow-md hover:bg-[#6d4635] transition-colors">
                          保存账户
                      </button>
                  </div>
              </form>
           </div>
        </div>
      )}

    </div>
  );
};

export default App;
