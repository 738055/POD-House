'use client';

import { AlertTriangle, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
  destructive?: boolean;
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  onConfirm,
  onCancel,
  destructive = true,
}: ConfirmModalProps) {
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onCancel}
      />
      <div className="relative bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 fade-in duration-200">
        <div className="p-6 flex items-start gap-4">
          <div className={`p-3 rounded-2xl shrink-0 ${destructive ? 'bg-red-500/10' : 'bg-yellow-500/10'}`}>
            <AlertTriangle size={22} className={destructive ? 'text-red-400' : 'text-yellow-400'} />
          </div>
          <div>
            <h3 className="font-black text-white text-lg leading-tight">{title}</h3>
            {description && <p className="text-gray-400 text-sm mt-1">{description}</p>}
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-5 py-2.5 text-sm font-bold text-gray-300 hover:bg-gray-800 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`px-5 py-2.5 text-sm font-bold text-white rounded-xl transition-colors flex items-center gap-2 disabled:opacity-70 ${
              destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
