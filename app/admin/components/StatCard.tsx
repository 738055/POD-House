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
    <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-blue-600/10 rounded-lg">
          <Icon className="text-blue-500" size={24} />
        </div>
        <div>
          <p className="text-sm text-gray-400 font-medium">{title}</p>
          {isLoading ? (
            <div className="h-8 w-24 bg-gray-800 animate-pulse rounded mt-1" />
          ) : (
            <h3 className="text-2xl font-bold text-white mt-1">{value}</h3>
          )}
        </div>
      </div>
    </div>
  );
}
