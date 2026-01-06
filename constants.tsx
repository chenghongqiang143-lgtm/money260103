
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

// Using Hex codes to match the App's color picker system
export const CATEGORIES: CategoryInfo[] = [
  { id: 'food', name: '餐饮', icon: 'Utensils', color: '#f97316' }, // orange-500
  { id: 'transport', name: '交通', icon: 'Car', color: '#3b82f6' }, // blue-500
  { id: 'shopping', name: '购物', icon: 'ShoppingBag', color: '#ec4899' }, // pink-500
  { id: 'housing', name: '居住', icon: 'Home', color: '#6366f1' }, // indigo-500
  { id: 'entertainment', name: '娱乐', icon: 'Film', color: '#a855f7' }, // purple-500
  { id: 'coffee', name: '咖啡饮料', icon: 'Coffee', color: '#d97706' }, // amber-600
  { id: 'health', name: '健康医疗', icon: 'Activity', color: '#ef4444' }, // red-500
  { id: 'work', name: '职业技能', icon: 'Briefcase', color: '#334155' }, // slate-700
  { id: 'digital', name: '数码充值', icon: 'Smartphone', color: '#06b6d4' }, // cyan-500
  { id: 'gift', name: '人情往来', icon: 'Gift', color: '#fb7185' }, // rose-400
  { id: 'other', name: '其他', icon: 'MoreHorizontal', color: '#9ca3af' }, // gray-400
];

export const getIcon = (iconName: string, className?: string) => {
  const icons: Record<string, React.ElementType> = {
    Utensils, Car, ShoppingBag, Home, Film, Coffee, Activity, Briefcase, Smartphone, Gift, MoreHorizontal
  };
  const IconComponent = icons[iconName] || MoreHorizontal;
  return <IconComponent className={className} />;
};
