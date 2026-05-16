import React from 'react';
import { IconType } from 'react-icons';

interface ManagerStatsCardProps {
  icon: IconType;
  label: string;
  value: string | number;
  note: string;
  accent: 'blue' | 'amber' | 'emerald' | 'rose';
}

const ManagerStatsCard: React.FC<ManagerStatsCardProps> = ({
  icon: Icon,
  label,
  value,
  note,
  accent,
}) => {
  const colorMap: Record<string, string> = {
    blue: 'text-blue-600 bg-blue-50 border-blue-100',
    amber: 'text-amber-600 bg-amber-50 border-amber-100',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    rose: 'text-rose-600 bg-rose-50 border-rose-100',
  };

  return (
    <div className="p-5 rounded-[22px] bg-white border border-slate-200 shadow-sm flex flex-col gap-3 group hover:border-slate-300 transition-all">
      <div className={`w-12 h-12 flex items-center justify-center rounded-xl text-xl ${colorMap[accent]}`}>
        <Icon />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-bold text-slate-500">{label}</span>
        <strong className="text-3xl font-black text-slate-800">{value}</strong>
      </div>
      <p className="text-xs text-slate-400 m-0 border-t border-slate-100 pt-3">{note}</p>
    </div>
  );
};

export default ManagerStatsCard;
