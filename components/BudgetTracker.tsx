import React from 'react';
import { CATEGORIES } from '../constants';
import { Transaction, Budget } from '../types';
import { Settings2 } from 'lucide-react';

interface BudgetTrackerProps {
  transactions: Transaction[];
  budgets: Budget[];
  onOpenManagement: () => void;
  rolloverAdjustments?: Record<string, number>;
  enableRollover?: boolean;
}

const BudgetTracker: React.FC<BudgetTrackerProps> = ({ 
  transactions, 
  budgets, 
  onOpenManagement,
  rolloverAdjustments = {},
  enableRollover = false
}) => {
  const getSpent = (category: string) => {
    return transactions
      .filter(t => t.category === category && t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  };

  return (
    <div className="hammer-card p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold text-[#333] tracking-widest flex items-center gap-2">
          <div className="w-1 h-4 bg-[#7d513d]"></div>
          预算监控
        </h3>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onOpenManagement();
          }}
          className="text-[10px] text-[#7d513d] border border-[#7d513d]/20 px-2 py-1 rounded hover:bg-[#7d513d]/5 transition-colors flex items-center gap-1 font-bold"
        >
          <Settings2 size={12} />
          管理预算
        </button>
      </div>
      
      <div className="space-y-6">
        {budgets.length > 0 ? budgets.map((budget) => {
          const spent = getSpent(budget.category);
          const rolloverAmount = enableRollover ? (rolloverAdjustments[budget.category] || 0) : 0;
          const effectiveLimit = Math.max(0, budget.limit + rolloverAmount);
          const percent = effectiveLimit > 0 
              ? Math.min((spent / effectiveLimit) * 100, 100) 
              : (spent > 0 ? 100 : 0);
          const remaining = effectiveLimit - spent;
          const isOver = remaining < 0;

          return (
            <div key={budget.category} className="space-y-2">
              <div className="flex justify-between items-end">
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#666]">{budget.category}</span>
                    {enableRollover && rolloverAmount !== 0 && (
                        <span className={`text-[9px] font-bold ${rolloverAmount > 0 ? 'text-[#468847]' : 'text-[#b94a48]'}`}>
                            {rolloverAmount > 0 ? `(+${rolloverAmount})` : `(${rolloverAmount})`}
                        </span>
                    )}
                </div>
                <div className="text-[10px] tracking-tight">
                  {isOver ? (
                     <span className="font-bold text-[#b94a48]">超支 ¥{Math.abs(remaining).toLocaleString()}</span>
                  ) : (
                     <>
                        <span className="font-bold text-[#468847]">¥{spent.toLocaleString()}</span>
                        <span className="text-[#999]"> / ¥{effectiveLimit.toLocaleString()}</span>
                     </>
                  )}
                </div>
              </div>
              <div className="h-[6px] w-full bg-[#f0eee8] rounded-full overflow-hidden border border-[#e0ddd5]">
                <div className={`h-full transition-all duration-700 ${isOver ? 'bg-[#b94a48]' : 'bg-[#468847]'}`} style={{ width: `${percent}%` }}></div>
              </div>
            </div>
          );
        }) : (
          <div className="text-center py-10">
            <p className="text-[#999] text-xs mb-4">尚未设置分类预算</p>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onOpenManagement();
              }}
              className="text-xs bg-[#7d513d] text-white px-4 py-2 rounded shadow-sm hover:opacity-90 transition-opacity font-bold"
            >
              去设置
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BudgetTracker;