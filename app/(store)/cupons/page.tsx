'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { createClient } from '@/lib/supabase/client';
import type { Coupon } from '@/lib/supabase/types';
import { ArrowLeft, Gift, Copy, Check, Loader2, Tag, Percent, Truck, Calendar } from 'lucide-react';

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR');
}

function couponLabel(c: Coupon) {
  if (c.type === 'free_delivery') return 'Frete grátis';
  if (c.type === 'percentage') return `${c.value}% de desconto`;
  return `${fmt(c.value)} de desconto`;
}

function CouponIcon({ type }: { type: Coupon['type'] }) {
  if (type === 'free_delivery') return <Truck size={18} className="text-purple-600" />;
  if (type === 'percentage') return <Percent size={18} className="text-purple-600" />;
  return <Tag size={18} className="text-purple-600" />;
}

export default function CuponsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) loadCoupons();
  }, [user]);

  async function loadCoupons() {
    setLoading(true);
    const now = new Date().toISOString();
    const { data } = await supabase
      .from('coupons')
      .select('*')
      .eq('active', true)
      .or(`valid_until.is.null,valid_until.gte.${now}`)
      .lte('valid_from', now)
      .order('valid_until', { ascending: true, nullsFirst: false });

    setCoupons((data as Coupon[]) ?? []);
    setLoading(false);
  }

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white px-4 py-4 flex items-center gap-3 border-b border-gray-200 sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 flex-1">Cupons Disponíveis</h1>
      </div>

      <div className="px-4 py-4 space-y-3">
        {coupons.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center">
            <Gift size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Nenhum cupom disponível</p>
            <p className="text-gray-400 text-sm mt-1">Fique de olho! Novos cupons podem aparecer em breve.</p>
          </div>
        ) : (
          coupons.map(coupon => {
            const isCopied = copied === coupon.code;
            const expiresLabel = coupon.valid_until ? `Válido até ${formatDate(coupon.valid_until)}` : 'Sem prazo de expiração';
            return (
              <div key={coupon.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100">
                {/* Dashed divider effect */}
                <div className="px-4 py-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <CouponIcon type={coupon.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900">{couponLabel(coupon)}</p>
                      {coupon.description && <p className="text-sm text-gray-500 mt-0.5">{coupon.description}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                    <Calendar size={12} />
                    <span>{expiresLabel}</span>
                    {coupon.min_order_value > 0 && (
                      <>
                        <span>·</span>
                        <span>Pedido mínimo {fmt(coupon.min_order_value)}</span>
                      </>
                    )}
                  </div>

                  {/* Code copy row */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-50 border border-dashed border-purple-300 rounded-xl px-3 py-2 font-mono text-sm font-bold text-purple-700 tracking-widest text-center">
                      {coupon.code}
                    </div>
                    <button
                      onClick={() => copyCode(coupon.code)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        isCopied ? 'bg-green-100 text-green-700' : 'bg-purple-600 text-white hover:bg-purple-700'
                      }`}
                    >
                      {isCopied ? <Check size={14} /> : <Copy size={14} />}
                      {isCopied ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
