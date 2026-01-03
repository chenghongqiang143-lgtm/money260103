
import React from 'react';
import { Wallet, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

interface StatsCardsProps {
  income: number;
  expense: number;
  monthLabel?: string;
}

const StatsCards: React.FC<StatsCardsProps> = ({ income, expense, monthLabel = '本月' }) => {
  const balance = income - expense;

  return (
    <div className="grid grid-cols-3 gap-0 mb-8 hammer-card divide-x divide-[#e0ddd5] overflow-hidden">
      {/* Account Balance */}
      <div className="p-3 md:p-6 flex flex-col gap-1 md:gap-2 bg-white">
        <div className="flex items-center gap-1 md:gap-2 text-[#999] text-[9px] md:text-xs font-bold tracking-tight md:tracking-widest uppercase truncate">
          <Wallet size={12} className="shrink-0" />
          <span className="truncate">结余</span>
        </div>
        <p className={`text-sm md:text-3xl font-light ${balance >= 0 ? 'text-[#333]' : 'text-[#b94a48]'} truncate`}>
          <span className="text-[10px] md:text-lg mr-0.5 md:mr-1 font-normal text-[#999]">¥</span>
          {balance.toLocaleString()}
        </p>
      </div>

      {/* Monthly Income */}
      <div className="p-3 md:p-6 flex flex-col gap-1 md:gap-2 bg-white">
        <div className="flex items-center gap-1 md:gap-2 text-[#999] text-[9px] md:text-xs font-bold tracking-tight md:tracking-widest uppercase truncate">
          <ArrowUpCircle size={12} className="text-[#468847] shrink-0" />
          <span className="truncate">{monthLabel}收入</span>
        </div>
        <p className="text-sm md:text-3xl font-light text-[#333] truncate">
          <span className="text-[10px] md:text-lg mr-0.5 md:mr-1 font-normal text-[#999]">¥</span>
          {income.toLocaleString()}
        </p>
      </div>

      {/* Monthly Expense */}
      <div className="p-3 md:p-6 flex flex-col gap-1 md:gap-2 bg-white">
        <div className="flex items-center gap-1 md:gap-2 text-[#999] text-[9px] md:text-xs font-bold tracking-tight md:tracking-widest uppercase truncate">
          <ArrowDownCircle size={12} className="text-[#b94a48] shrink-0" />
          <span className="truncate">{monthLabel}支出</span>
        </div>
        <p className="text-sm md:text-3xl font-light text-[#333] truncate">
          <span className="text-[10px] md:text-lg mr-0.5 md:mr-1 font-normal text-[#999]">¥</span>
          {expense.toLocaleString()}
        </p>
      </div>
    </div>
  );
};

export default StatsCards;
