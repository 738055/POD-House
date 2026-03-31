'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface StatusToggleProps {
  id: string;
  table: string;
  active: boolean;
  onToggle?: (newValue: boolean) => void;
}

export function StatusToggle({ id, table, active: initialActive, onToggle }: StatusToggleProps) {
  const { supabase } = useAuth();
  const { toast } = useToast();
  const [active, setActive] = useState(initialActive);
  const [loading, setLoading] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    setLoading(true);
    const next = !active;
    const { error } = await supabase.from(table).update({ active: next }).eq('id', id);
    if (error) {
      toast('Erro ao atualizar status.', 'error');
    } else {
      setActive(next);
      onToggle?.(next);
    }
    setLoading(false);
  }

  if (loading) {
    return <Loader2 size={16} className="animate-spin text-gray-500" />;
  }

  return (
    <button
      onClick={toggle}
      title={active ? 'Desativar' : 'Ativar'}
      className={`relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none ${
        active ? 'bg-green-500' : 'bg-gray-700'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
          active ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
