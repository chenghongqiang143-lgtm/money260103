
import React from 'react';
import { 
  Utensils, 
  Car, 
  ShoppingBag, 
  Home, 
  Film, 
  Coffee, 
  Activity, 
  Briefcase,
  Smartphone,
  Gift,
  MoreHorizontal
} from 'lucide-react';
import { CategoryInfo } from './types';

export const CATEGORIES: CategoryInfo[] = [
  { id: 'food', name: '餐饮', icon: 'Utensils', color: 'bg-orange-500' },
  { id: 'transport', name: '交通', icon: 'Car', color: 'bg-blue-500' },
  { id: 'shopping', name: '购物', icon: 'ShoppingBag', color: 'bg-pink-500' },
  { id: 'housing', name: '居住', icon: 'Home', color: 'bg-indigo-500' },
  { id: 'entertainment', name: '娱乐', icon: 'Film', color: 'bg-purple-500' },
  { id: 'coffee', name: '咖啡饮料', icon: 'Coffee', color: 'bg-amber-600' },
  { id: 'health', name: '健康医疗', icon: 'Activity', color: 'bg-red-500' },
  { id: 'work', name: '职业技能', icon: 'Briefcase', color: 'bg-slate-700' },
  { id: 'digital', name: '数码充值', icon: 'Smartphone', color: 'bg-cyan-500' },
  { id: 'gift', name: '人情往来', icon: 'Gift', color: 'bg-rose-400' },
  { id: 'other', name: '其他', icon: 'MoreHorizontal', color: 'bg-gray-400' },
];

export const getIcon = (iconName: string, className?: string) => {
  const icons: Record<string, React.ElementType> = {
    Utensils, Car, ShoppingBag, Home, Film, Coffee, Activity, Briefcase, Smartphone, Gift, MoreHorizontal
  };
  const IconComponent = icons[iconName] || MoreHorizontal;
  return <IconComponent className={className} />;
};
