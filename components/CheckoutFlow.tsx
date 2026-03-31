'use client';

import { useState, useEffect } from 'react';
import { X, ChevronLeft, Loader2, Check, MapPin, Tag, Star, MessageCircle, Send } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth }  from '@/hooks/use-auth';
import { useCart }  from '@/hooks/use-cart';
import type { Address, Neighborhood, CouponValidation } from '@/lib/supabase/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

type Step = 'info' | 'address' | 'delivery' | 'extras' | 'summary';

interface FormAddress {
  logradouro: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  uf: string;
  cep: string;
}

const EMPTY_ADDR: FormAddress = { logradouro: '', number: '', complement: '', neighborhood: '', city: 'Londrina', uf: 'PR', cep: '' };

export default function CheckoutFlow({ isOpen, onClose }: Props) {
  const supabase = createClient();
  const { user, profile, refreshProfile } = useAuth();
  const { items, totalPrice, clearCart } = useCart();

  const [step, setStep] = useState<Step>('info');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<{ orderId: string; total: number } | null>(null);

  // Step info
  const [name, setName]     = useState('');
  const [phone, setPhone]   = useState('');

  // Step address
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [selectedAddrId, setSelectedAddrId] = useState<string | null>(null);
  const [formAddr, setFormAddr] = useState<FormAddress>(EMPTY_ADDR);
  const [loadingCep, setLoadingCep] = useState(false);

  // Step delivery
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<Neighborhood | null>(null);

  // Step extras
  const [couponCode, setCouponCode]   = useState('');
  const [couponResult, setCouponResult] = useState<CouponValidation | null>(null);
  const [loadingCoupon, setLoadingCoupon] = useState(false);
  const [usePoints, setUsePoints]     = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);

  // Calculos
  const deliveryFee     = selectedNeighborhood?.delivery_fee ?? 0;
  const couponDiscount  = couponResult?.valid ? (couponResult.type === 'free_delivery' ? deliveryFee : (couponResult.discount ?? 0)) : 0;
  const pointsDiscount  = usePoints ? Math.round((pointsToRedeem / 100) * 5 * 100) / 100 : 0;
  const maxPoints       = profile ? Math.min(profile.points_balance, Math.floor(totalPrice / 5) * 100) : 0;
  const total           = Math.max(0, totalPrice + deliveryFee - couponDiscount - pointsDiscount);

  useEffect(() => {
    if (isOpen) {
      setStep(user ? 'address' : 'info');
      setError(null);
      setOrderSuccess(null);
      if (user) {
        setName(profile?.full_name ?? '');
        setPhone(profile?.phone ?? '');
      }
    }
  }, [isOpen, user, profile]);

  useEffect(() => {
    if (isOpen && user) {
      supabase.from('addresses').select('*').eq('user_id', user.id).order('is_default', { ascending: false })
        .then(({ data }) => { if (data) setSavedAddresses(data as Address[]); });
    }
    supabase.from('neighborhoods').select('*').order('name').then(({ data }) => {
      if (data) setNeighborhoods(data as Neighborhood[]);
    });
  }, [isOpen, user]);

  if (!isOpen) return null;

  // ── CEP lookup ──
  async function lookupCep(cep: string) {
    const clean = cep.replace(/\D/g, '');
    if (clean.length !== 8) return;
    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setFormAddr(prev => ({
          ...prev, cep: clean,
          logradouro: data.logradouro ?? prev.logradouro,
          neighborhood: data.bairro ?? prev.neighborhood,
          city: data.localidade ?? prev.city,
          uf: data.uf ?? prev.uf,
        }));
        const bairro = data.bairro?.toLowerCase() ?? '';
        const found = neighborhoods.find(n => bairro.includes(n.name_normalized));
        if (found) setSelectedNeighborhood(found);
      }
    } finally {
      setLoadingCep(false);
    }
  }

  // ── Aplicar cupom ──
  async function applyCoupon() {
    if (!couponCode.trim()) return;
    setLoadingCoupon(true);
    setError(null);
    const { data, error } = await (supabase.rpc as any)('validate_coupon', {
      p_code: couponCode,
      p_user_id: user?.id ?? '00000000-0000-0000-0000-000000000000',
      p_subtotal: totalPrice,
    });
    if (error) setError(error.message);
    else setCouponResult(data as CouponValidation);
    setLoadingCoupon(false);
  }

  // ── Finalizar pedido: salva no banco + abre WhatsApp ──
  async function submitOrder() {
    setLoading(true);
    setError(null);

    const addr: FormAddress = selectedAddrId
      ? (() => {
          const a = savedAddresses.find(x => x.id === selectedAddrId)!;
          return { logradouro: a.logradouro, number: a.number, complement: a.complement ?? '',
                   neighborhood: a.neighborhood, city: a.city, uf: a.uf, cep: a.cep };
        })()
      : formAddr;

    const orderItems = items.map(i => ({
      variant_id: i.variantId,
      product_name: i.productName,
      variant_name: i.variantName,
      unit_price: i.unitPrice,
      quantity: i.quantity,
    }));

    // Salvar pedido no banco (status: pending, sem pontos)
    const { data, error: rpcError } = await (supabase.rpc as any)('place_order', {
      p_user_id:          user?.id ?? null,
      p_address:          addr,
      p_items:            orderItems,
      p_delivery_fee:     deliveryFee,
      p_coupon_code:      couponResult?.valid ? couponCode : null,
      p_points_to_redeem: usePoints ? pointsToRedeem : 0,
      p_customer_name:    name,
      p_customer_phone:   phone.replace(/\D/g, ''),
      p_notes:            null,
    });

    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    const result = data as { order_id: string; total: number; points_earned: number };
    if (user) await refreshProfile();
    await clearCart();

    // Montar mensagem WhatsApp
    const itemsText = items.map(i =>
      `  ${i.quantity}x ${i.productName} — ${i.variantName} = ${fmt(i.unitPrice * i.quantity)}`
    ).join('\n');

    const addrText = `${addr.logradouro}, ${addr.number}${addr.complement ? ', ' + addr.complement : ''} — ${addr.neighborhood}, ${addr.city}-${addr.uf} CEP ${addr.cep}`;

    const msg = [
      `*NOVO PEDIDO - POD HOUSE* 🛒`,
      ``,
      `*Pedido:* #${result.order_id.slice(0, 8)}`,
      `*Cliente:* ${name}`,
      `*Telefone:* ${phone}`,
      ``,
      `*Itens:*`,
      itemsText,
      ``,
      `*Endereço:* ${addrText}`,
      selectedNeighborhood ? `*Bairro:* ${selectedNeighborhood.name}` : null,
      `*Frete:* ${deliveryFee === 0 ? 'Grátis' : fmt(deliveryFee)}`,
      couponDiscount > 0 ? `*Cupom (${couponCode}):* -${fmt(couponDiscount)}` : null,
      pointsDiscount > 0 ? `*Pontos:* -${fmt(pointsDiscount)}` : null,
      ``,
      `💰 *TOTAL: ${fmt(result.total)}*`,
      ``,
      `_Pagamento: a combinar_`,
      `_Aguardando confirmação do vendedor_`,
    ].filter(Boolean).join('\n');

    const wp = process.env.NEXT_PUBLIC_WHATSAPP_PHONE ?? '5543999999999';
    window.open(`https://wa.me/${wp}?text=${encodeURIComponent(msg)}`, '_blank');

    setOrderSuccess({ orderId: result.order_id, total: result.total });
    setLoading(false);
  }

  // ── Navegação entre steps ──
  const STEPS: Step[] = ['info', 'address', 'delivery', 'extras', 'summary'];
  const stepIndex = STEPS.indexOf(step);

  function canNext(): boolean {
    if (step === 'info')     return name.trim().length > 0 && phone.replace(/\D/g, '').length >= 10;
    if (step === 'address')  return !!(selectedAddrId || (formAddr.logradouro && formAddr.number && formAddr.cep.length === 8));
    if (step === 'delivery') return !!selectedNeighborhood;
    if (step === 'extras')   return true;
    return false;
  }

  function nextStep() {
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next);
  }

  function prevStep() {
    const prev = STEPS[stepIndex - 1];
    if (prev) setStep(prev);
  }

  const stepsToShow = user ? STEPS.filter(s => s !== 'info') : STEPS;
  const currentStepIndex = stepsToShow.indexOf(step);
  const totalSteps = stepsToShow.length;

  // ── Tela de sucesso ──
  if (orderSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-end" style={{ maxWidth: '480px', left: 0, right: 0, margin: '0 auto' }}>
        <div className="absolute inset-0 bg-black/60" onClick={onClose} />
        <div className="relative w-full bg-white rounded-t-2xl animate-slide-up p-6 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={40} className="text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Pedido enviado!</h2>
          <p className="text-gray-500 mb-1">
            Pedido <strong>#{orderSuccess.orderId.slice(0, 8)}</strong> no valor de <strong>{fmt(orderSuccess.total)}</strong>
          </p>
          <p className="text-gray-400 text-sm mb-6">
            Seu pedido foi salvo e enviado via WhatsApp. O vendedor irá confirmar e você receberá seus pontos de fidelidade!
          </p>

          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-center gap-2 text-purple-700 mb-1">
              <Star size={16} />
              <span className="font-bold">Pontos de fidelidade</span>
            </div>
            <p className="text-sm text-purple-600">
              Você receberá <strong>{Math.floor(orderSuccess.total)} pontos</strong> quando o vendedor confirmar seu pedido!
            </p>
          </div>

          <button onClick={onClose}
            className="w-full bg-black text-white font-bold py-4 rounded-xl">
            Voltar para a loja
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ maxWidth: '480px', left: 0, right: 0, margin: '0 auto' }}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-2xl animate-slide-up max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-100 flex-shrink-0">
          {stepIndex > (user ? 1 : 0) && (
            <button onClick={prevStep} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
              <ChevronLeft size={20} />
            </button>
          )}
          <div className="flex-1">
            <h2 className="text-base font-bold text-gray-900">
              {step === 'info' ? 'Seus dados' : step === 'address' ? 'Endereço' : step === 'delivery' ? 'Entrega' : step === 'extras' ? 'Cupom & Pontos' : 'Resumo'}
            </h2>
            <p className="text-xs text-gray-400">Etapa {currentStepIndex + 1} de {totalSteps}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        {/* Progress */}
        <div className="h-1 bg-gray-100 flex-shrink-0">
          <div className="h-full bg-purple-600 transition-all duration-300"
            style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }} />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {/* STEP: INFO */}
          {step === 'info' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Nome completo</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">WhatsApp</label>
                <input type="tel" value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="(43) 9 9999-9999"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500" />
              </div>
              <div className="bg-gray-50 rounded-xl p-3 flex items-start gap-2">
                <MessageCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-500">Seu pedido será enviado via WhatsApp para o vendedor confirmar.</p>
              </div>
            </div>
          )}

          {/* STEP: ADDRESS */}
          {step === 'address' && (
            <div className="space-y-4">
              {savedAddresses.length > 0 && (
                <div className="space-y-2 mb-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Endereços salvos</p>
                  {savedAddresses.map(a => (
                    <button key={a.id} onClick={() => setSelectedAddrId(a.id)}
                      className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                        selectedAddrId === a.id ? 'border-purple-600 bg-purple-50' : 'border-gray-200'
                      }`}>
                      <MapPin size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        {a.label && <p className="text-xs font-bold text-gray-700 uppercase">{a.label}</p>}
                        <p className="text-sm text-gray-800">{a.logradouro}, {a.number}</p>
                        <p className="text-xs text-gray-500">{a.neighborhood} — {a.city}-{a.uf}</p>
                      </div>
                      {selectedAddrId === a.id && <Check size={16} className="text-purple-600 ml-auto mt-0.5 flex-shrink-0" />}
                    </button>
                  ))}
                  <div className="relative flex items-center gap-2 py-1">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400">ou novo endereço</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                </div>
              )}

              <div onClick={() => setSelectedAddrId(null)} className={selectedAddrId ? 'opacity-60' : ''}>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">CEP</label>
                    <div className="relative">
                      <input type="text" value={formAddr.cep}
                        onChange={e => { const v = e.target.value.replace(/\D/g,'').slice(0,8); setFormAddr(p=>({...p,cep:v})); if (v.length===8) lookupCep(v); }}
                        placeholder="00000000" maxLength={8}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 pr-10"
                      />
                      {loadingCep && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Rua</label>
                    <input value={formAddr.logradouro} onChange={e => setFormAddr(p=>({...p,logradouro:e.target.value}))}
                      placeholder="Rua, Avenida..."
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Número</label>
                      <input value={formAddr.number} onChange={e => setFormAddr(p=>({...p,number:e.target.value}))}
                        placeholder="123"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Complemento</label>
                      <input value={formAddr.complement} onChange={e => setFormAddr(p=>({...p,complement:e.target.value}))}
                        placeholder="Apto, casa..."
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Bairro</label>
                    <input value={formAddr.neighborhood} onChange={e => setFormAddr(p=>({...p,neighborhood:e.target.value}))}
                      placeholder="Bairro"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP: DELIVERY */}
          {step === 'delivery' && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Selecione o bairro de entrega</p>
              {neighborhoods.map(n => (
                <button key={n.id} onClick={() => setSelectedNeighborhood(n)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border-2 text-left transition-all ${
                    selectedNeighborhood?.id === n.id ? 'border-purple-600 bg-purple-50' : 'border-gray-200'
                  }`}>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{n.name}</p>
                    <p className="text-xs text-gray-500">{n.estimated_minutes} min estimado</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{n.delivery_fee === 0 ? 'Grátis' : fmt(n.delivery_fee)}</p>
                    {selectedNeighborhood?.id === n.id && <Check size={14} className="text-purple-600 ml-auto" />}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* STEP: EXTRAS */}
          {step === 'extras' && (
            <div className="space-y-5">
              {/* Cupom */}
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block flex items-center gap-1.5">
                  <Tag size={12} /> Cupom de desconto
                </label>
                <div className="flex gap-2">
                  <input type="text" value={couponCode} onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponResult(null); }}
                    placeholder="CÓDIGO DO CUPOM"
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono uppercase focus:outline-none focus:border-purple-500" />
                  <button onClick={applyCoupon} disabled={loadingCoupon || !couponCode}
                    className="px-4 py-3 bg-purple-600 text-white text-sm font-bold rounded-xl disabled:opacity-40 flex items-center gap-1">
                    {loadingCoupon ? <Loader2 size={14} className="animate-spin" /> : 'Aplicar'}
                  </button>
                </div>
                {couponResult && (
                  <div className={`mt-2 rounded-xl p-3 flex items-center gap-2 ${couponResult.valid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    {couponResult.valid
                      ? <><Check size={14} className="text-green-600 flex-shrink-0" /><span className="text-sm text-green-700 font-medium">Desconto de {fmt(couponResult.type === 'free_delivery' ? deliveryFee : (couponResult.discount ?? 0))} aplicado!</span></>
                      : <><X size={14} className="text-red-600 flex-shrink-0" /><span className="text-sm text-red-700">{couponResult.error}</span></>
                    }
                  </div>
                )}
              </div>

              {/* Pontos */}
              {user && profile && profile.points_balance > 0 && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block flex items-center gap-1.5">
                    <Star size={12} /> Seus pontos ({profile.points_balance} pts)
                  </label>
                  <div className={`rounded-xl border-2 p-4 transition-all ${usePoints ? 'border-purple-600' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Usar pontos de fidelidade</p>
                        <p className="text-xs text-gray-500">100 pts = R$ 5,00 de desconto</p>
                      </div>
                      <button onClick={() => { setUsePoints(p => !p); if (!usePoints) setPointsToRedeem(maxPoints); else setPointsToRedeem(0); }}
                        className={`w-11 h-6 rounded-full transition-colors ${usePoints ? 'bg-purple-600' : 'bg-gray-300'}`}>
                        <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${usePoints ? 'translate-x-5' : ''}`} />
                      </button>
                    </div>
                    {usePoints && (
                      <div>
                        <input type="range" min={0} max={maxPoints} step={100} value={pointsToRedeem}
                          onChange={e => setPointsToRedeem(Number(e.target.value))}
                          className="w-full accent-purple-600" />
                        <div className="flex justify-between mt-1">
                          <span className="text-xs text-gray-500">0 pts</span>
                          <span className="text-xs font-bold text-gray-900">{pointsToRedeem} pts = -{fmt(pointsDiscount)}</span>
                          <span className="text-xs text-gray-500">{maxPoints} pts</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP: SUMMARY */}
          {step === 'summary' && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                {items.map(i => (
                  <div key={i.variantId} className="flex items-center justify-between text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{i.productName}</p>
                      <p className="text-xs text-gray-500">{i.variantName} x {i.quantity}</p>
                    </div>
                    <p className="font-bold text-gray-900 ml-3">{fmt(i.unitPrice * i.quantity)}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{fmt(totalPrice)}</span></div>
                <div className="flex justify-between text-gray-600"><span>Entrega ({selectedNeighborhood?.name})</span><span>{deliveryFee === 0 ? 'Grátis' : fmt(deliveryFee)}</span></div>
                {couponDiscount > 0 && <div className="flex justify-between text-green-600"><span>Cupom ({couponCode})</span><span>-{fmt(couponDiscount)}</span></div>}
                {pointsDiscount > 0 && <div className="flex justify-between text-green-600"><span>Pontos ({pointsToRedeem} pts)</span><span>-{fmt(pointsDiscount)}</span></div>}
                <div className="flex justify-between font-bold text-base text-gray-900 pt-2 border-t border-gray-200">
                  <span>Total</span><span>{fmt(total)}</span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500">
                <p><strong className="text-gray-800">{name}</strong> — {phone}</p>
                <p className="mt-0.5">
                  {selectedAddrId
                    ? (() => { const a = savedAddresses.find(x=>x.id===selectedAddrId); return a ? `${a.logradouro}, ${a.number} — ${a.neighborhood}` : ''; })()
                    : `${formAddr.logradouro}, ${formAddr.number} — ${formAddr.neighborhood}`
                  }
                </p>
              </div>

              {/* Info sobre pontos */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-start gap-2">
                <Star size={16} className="text-purple-500 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-purple-700">
                  <p className="font-semibold">Programa de fidelidade</p>
                  <p>Após o vendedor confirmar seu pedido, você ganhará <strong>{Math.floor(total)} pontos</strong>!</p>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-start gap-2">
                <MessageCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-green-700">
                  <p className="font-semibold">Envio via WhatsApp</p>
                  <p>Ao finalizar, seu pedido será enviado diretamente ao vendedor pelo WhatsApp para confirmação.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex-shrink-0">
          {step !== 'summary' ? (
            <button onClick={nextStep} disabled={!canNext()}
              className="w-full bg-purple-600 text-white font-bold py-4 rounded-xl disabled:opacity-40 transition-opacity hover:bg-purple-700">
              Continuar
            </button>
          ) : (
            <button onClick={submitOrder} disabled={loading}
              className="w-full bg-green-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:opacity-80 hover:bg-green-700">
              {loading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
              {loading ? 'Processando...' : 'Enviar Pedido no WhatsApp'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
