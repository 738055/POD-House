'use client';

import { useToast, ToastType } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const CONFIG: Record<ToastType, { icon: React.ElementType; classes: string }> = {
  success: { icon: CheckCircle2, classes: 'bg-gray-900 border-green-500/30 text-green-400' },
  error:   { icon: XCircle,      classes: 'bg-gray-900 border-red-500/30 text-red-400' },
  info:    { icon: Info,          classes: 'bg-gray-900 border-blue-500/30 text-blue-400' },
  warning: { icon: AlertTriangle, classes: 'bg-gray-900 border-yellow-500/30 text-yellow-400' },
};

export function ToastContainer() {
  const { toasts, dismiss } = useToast();
  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      {toasts.map(t => {
        const { icon: Icon, classes } = CONFIG[t.type];
        return (
          <div
            key={t.id}
            className={cn(
              'flex items-center gap-3 px-4 py-3.5 rounded-2xl border shadow-2xl pointer-events-auto',
              'animate-in slide-in-from-bottom-3 fade-in duration-300',
              classes
            )}
          >
            <Icon size={18} className="shrink-0" />
            <p className="text-sm font-semibold text-white flex-1">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="text-gray-500 hover:text-white transition-colors shrink-0"
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
