'use client';

import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  title: string;
  value: string | number;
  isLoading?: boolean;
}

export function StatCard({ icon: Icon, title, value, isLoading }: StatCardProps) {
  return (
    <div className="bg-gray-900 border border-gray-800/50 p-6 rounded-2xl shadow-xl shadow-black/20 hover:border-purple-500/30 transition-all duration-300 group">
      <div className="flex items-center gap-5">
        <div className="p-4 bg-purple-600/10 rounded-2xl group-hover:bg-purple-600/20 transition-colors">
          <Icon className="text-purple-500" size={28} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1 truncate">{title}</p>
          {isLoading ? (
            <div className="h-8 w-full max-w-[120px] bg-gray-800 animate-pulse rounded-lg" />
          ) : (
            <h3 className="text-2xl font-black text-white tracking-tight truncate">{value}</h3>
          )}
        </div>
      </div>
    </div>
  );
}
