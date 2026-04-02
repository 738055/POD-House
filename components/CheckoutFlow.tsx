'use client';

import { useState, useEffect } from 'react';
import { X, ChevronLeft, Loader2, Check, MapPin, Tag, Star, MessageCircle, Send, Truck, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth }  from '@/hooks/use-auth';
import { useCart }  from '@/hooks/use-cart';
import type { Address, CouponValidation } from '@/lib/supabase/types';

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

interface ZoneResult {
  zone_name: string;
  delivery_fee: number;
  estimated_minutes: number;
  distance_meters: number;
  is_default: boolean; // true = taxa padrão (fora das zonas cadastradas)
}

const EMPTY_ADDR: FormAddress = { logradouro: '', number: '', complement: '', neighborhood: '', city: 'Londrina', uf: 'PR', cep: '' };

export default function CheckoutFlow({ isOpen, onClose }: Props) {
  const supabase = createClient();
  const { user, profile, refreshSession } = useAuth();
  const { items, totalPrice, clearCart } = useCart();

  const [step, setStep] = useState<Step>('info');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<{ orderId: string; total: number } | null>(null);

  // Step info
  const [name, setName]     = useState('');
  const [phone, setPhone]   = useState('');
  const [email, setEmail]   = useState('');

  // Step address
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [selectedAddrId, setSelectedAddrId] = useState<string | null>(null);
  const [formAddr, setFormAddr] = useState<FormAddress>(EMPTY_ADDR);
  const [loadingCep, setLoadingCep] = useState(false);

  // Zona detectada automaticamente via GPS/raio
  const [zoneLoading, setZoneLoading]   = useState(false);
  const [zoneResult, setZoneResult]     = useState<ZoneResult | null>(null);
  const [zoneError, setZoneError]       = useState<string | null>(null);

  // Step extras
  const [couponCode, setCouponCode]       = useState('');
  const [couponResult, setCouponResult]   = useState<CouponValidation | null>(null);
  const [loadingCoupon, setLoadingCoupon] = useState(false);
  const [usePoints, setUsePoints]         = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);

  // Frete: detectado automaticamente via polígono/zona
  const deliveryFee    = zoneResult?.delivery_fee ?? 0;
  const couponDiscount = couponResult?.valid ? (couponResult.type === 'free_delivery' ? deliveryFee : (couponResult.discount ?? 0)) : 0;
  const pointsDiscount = usePoints ? Math.round((pointsToRedeem / 100) * 5 * 100) / 100 : 0;
  const maxPoints      = profile ? Math.min(profile.points_balance, Math.floor(totalPrice / 5) * 100) : 0;
  const total          = Math.max(0, totalPrice + deliveryFee - couponDiscount - pointsDiscount);

  // Sem etapa de seleção manual de bairro — detecção automática por polígono
  const ALL_STEPS: Step[] = ['info', 'address', 'extras', 'summary'];
  const stepsToShow = user ? ALL_STEPS.filter(s => s !== 'info') : ALL_STEPS;

  useEffect(() => {
    if (isOpen) {
      setStep(user ? 'address' : 'info');
      setError(null);
      setOrderSuccess(null);
      setZoneResult(null);
      setZoneError(null);
      if (user) {
        setName(profile?.full_name ?? '');
        setPhone(profile?.phone ?? '');
        setEmail(user.email ?? '');
      }
    }
  }, [isOpen, user, profile]);

  useEffect(() => {
    if (isOpen && user) {
      supabase.from('addresses').select('*').eq('user_id', user.id).order('is_default', { ascending: false })
        .then(({ data }) => { if (data) setSavedAddresses(data as Address[]); });
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  // ── 1. ViaCEP → preenche endereço ──
  async function lookupCep(cep: string) {
    const clean = cep.replace(/\D/g, '');
    if (clean.length !== 8) return;
    setLoadingCep(true);
    setZoneResult(null);
    setZoneError(null);
    try {
      const res  = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setFormAddr(prev => ({
          ...prev,
          cep: clean,
          logradouro:   data.logradouro   ?? prev.logradouro,
          neighborhood: data.bairro       ?? prev.neighborhood,
          city:         data.localidade   ?? prev.city,
          uf:           data.uf           ?? prev.uf,
        }));
        // Inicia geocoding em paralelo
        geocodeAndCheckZone(clean, data.localidade, data.uf);
      }
    } finally {
      setLoadingCep(false);
    }
  }

  // ── 2. Nominatim geocode → RPC frete por coordenadas ──
  async function geocodeAndCheckZone(cep: string, city?: string, uf?: string) {
    setZoneLoading(true);
    try {
      const params = new URLSearchParams({
        postalcode: cep,
        countrycodes: 'br',
        format: 'json',
        limit: '1',
        addressdetails: '0',
      });
      if (city) params.set('city', city);
      if (uf)   params.set('state', uf);
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        { headers: { 'User-Agent': 'POD-House/1.0', 'Accept-Language': 'pt-BR' } }
      );
      const geoData = await geoRes.json();

      if (!Array.isArray(geoData) || geoData.length === 0) {
        // CEP não encontrado no mapa — sem erro visível, apenas usa seleção manual
        return;
      }

      const lat = parseFloat(geoData[0].lat);
      const lng = parseFloat(geoData[0].lon);

      const { data, error: rpcError } = await (supabase.rpc as any)('get_delivery_fee_by_coords', {
        p_lat: lat,
        p_lng: lng,
      });

      if (rpcError) {
        // RPC falhou — modo silencioso, mantém seleção manual
        return;
      }

      if (data?.error) {
        // "Fora da área" ou "loja não configurada"
        if (data.error.toLowerCase().includes('não configurada')) {
          // Loja sem zonas configuradas — fallback silencioso
          return;
        }
        setZoneError(data.error);
        if (data.distance_meters) {
          setZoneError(`${data.error} (${(data.distance_meters / 1000).toFixed(1)} km de distância)`);
        }
      } else if (data) {
        setZoneResult(data as ZoneResult);
      }
    } catch {
      // Falha de rede — modo silencioso
    } finally {
      setZoneLoading(false);
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

  // ── Finalizar pedido ──
  async function submitOrder() {
    setLoading(true);
    setError(null);

    let finalUserId = user?.id ?? null;

    // Cadastro silencioso se for visitante e tiver e-mail
    if (!finalUserId && email) {
      const { data: authData } = await supabase.auth.signUp({
        email: email.trim(),
        password: Math.random().toString(36).slice(-10) + 'Aa1@', // Senha forte aleatória
        options: {
          data: { full_name: name.trim(), phone: phone.replace(/\D/g, '') }
        }
      });
      if (authData?.user) {
        finalUserId = authData.user.id;
      }
    }

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

    const { data, error: rpcError } = await (supabase.rpc as any)('place_order', {
      p_user_id:          finalUserId,
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
    if (user) await refreshSession();
    await clearCart();

    const itemsText = items.map(i =>
      `  ${i.quantity}x ${i.productName} — ${i.variantName} = ${fmt(i.unitPrice * i.quantity)}`
    ).join('\n');

    const addrText = `${addr.logradouro}, ${addr.number}${addr.complement ? ', ' + addr.complement : ''} — ${addr.neighborhood}, ${addr.city}-${addr.uf} CEP ${addr.cep}`;

    const entregaText = zoneResult
      ? `*Zona:* ${zoneResult.zone_name}${zoneResult.distance_meters ? ` (${(zoneResult.distance_meters / 1000).toFixed(1)} km)` : ''}`
      : null;

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
      entregaText,
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

  // ── Navegação ──
  const stepIndex     = ALL_STEPS.indexOf(step);
  const shownIndex    = stepsToShow.indexOf(step);
  const totalShownSteps = stepsToShow.length;

  function canNext(): boolean {
    if (step === 'info')     return name.trim().length > 0 && phone.replace(/\D/g, '').length >= 10 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (step === 'address')  return !!(selectedAddrId || (formAddr.logradouro && formAddr.number && formAddr.cep.length === 8)) && !zoneLoading;
    if (step === 'extras')   return true;
    return false;
  }

  function nextStep() {
    const curShownIdx = stepsToShow.indexOf(step);
    const next = stepsToShow[curShownIdx + 1];
    if (next) setStep(next);
  }

  function prevStep() {
    const curShownIdx = stepsToShow.indexOf(step);
    const prev = stepsToShow[curShownIdx - 1];
    if (prev) setStep(prev);
  }

  function getStepTitle() {
    switch (step) {
      case 'info':     return 'Seus dados';
      case 'address':  return 'Endereço de entrega';
        case 'extras':   return 'Cupom & Pontos';
      case 'summary':  return 'Confirmar pedido';
    }
  }

  // ── Tela de sucesso ──
  if (orderSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black/60" onClick={onClose} />
        <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl animate-slide-up p-6 text-center">
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
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-center gap-2 text-green-700 mb-1">
              <Star size={16} />
              <span className="font-bold">Pontos de fidelidade</span>
            </div>
            <p className="text-sm text-green-700">
              Você receberá <strong>{Math.floor(orderSuccess.total)} pontos</strong> quando o vendedor confirmar seu pedido!
            </p>
          </div>
          <button onClick={onClose} className="w-full bg-black text-white font-bold py-4 rounded-xl">
            Voltar para a loja
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl animate-slide-up max-h-[92vh] sm:max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-100 flex-shrink-0">
          {shownIndex > 0 && (
            <button onClick={prevStep} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
              <ChevronLeft size={20} />
            </button>
          )}
          <div className="flex-1">
            <h2 className="text-base font-bold text-gray-900">{getStepTitle()}</h2>
            <p className="text-xs text-gray-400">Etapa {shownIndex + 1} de {totalShownSteps}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        {/* Progress */}
        <div className="h-1 bg-gray-100 flex-shrink-0">
          <div className="h-full bg-black transition-all duration-300"
            style={{ width: `${((shownIndex + 1) / totalShownSteps) * 100}%` }} />
        </div>

        {/* Content */}
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
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">WhatsApp</label>
                <input type="tel" value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="(43) 9 9999-9999"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">E-mail</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400" />
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
                    <button key={a.id} onClick={() => { setSelectedAddrId(a.id); setZoneResult(null); setZoneError(null); geocodeAndCheckZone(a.cep, a.city, a.uf); }}
                      className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                        selectedAddrId === a.id ? 'border-black bg-gray-50' : 'border-gray-200'
                      }`}>
                      <MapPin size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        {a.label && <p className="text-xs font-bold text-gray-700 uppercase">{a.label}</p>}
                        <p className="text-sm text-gray-800">{a.logradouro}, {a.number}</p>
                        <p className="text-xs text-gray-500">{a.neighborhood} — {a.city}-{a.uf}</p>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">CEP {a.cep}</p>
                      </div>
                      {selectedAddrId === a.id && <Check size={16} className="text-black mt-0.5 flex-shrink-0" />}
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
                  {/* CEP */}
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">CEP</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formAddr.cep}
                        onChange={e => {
                          const v = e.target.value.replace(/\D/g, '').slice(0, 8);
                          setFormAddr(p => ({ ...p, cep: v }));
                          if (v.length === 8) lookupCep(v);
                          if (v.length < 8) { setZoneResult(null); setZoneError(null); }
                        }}
                        placeholder="00000-000"
                        maxLength={9}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400 pr-10"
                      />
                      {(loadingCep || zoneLoading) && (
                        <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
                      )}
                    </div>
                  </div>

                  {/* Feedback de zona de entrega logo após o CEP */}
                  {!zoneLoading && (zoneResult || zoneError) && (
                    <div className={`rounded-xl px-4 py-3 flex items-start gap-3 ${
                      zoneResult
                        ? zoneResult.is_default
                          ? 'bg-amber-50 border border-amber-200'
                          : 'bg-green-50 border border-green-200'
                        : 'bg-red-50 border border-red-200'
                    }`}>
                      {zoneResult ? (
                        <>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${zoneResult.is_default ? 'bg-amber-100' : 'bg-green-100'}`}>
                            <Truck size={15} className={zoneResult.is_default ? 'text-amber-600' : 'text-green-600'} />
                          </div>
                          <div className="flex-1">
                            <p className={`text-sm font-bold ${zoneResult.is_default ? 'text-amber-800' : 'text-green-800'}`}>
                              {zoneResult.is_default ? 'Entrega fora da área padrão' : 'Entrega disponível!'}
                            </p>
                            <p className={`text-xs mt-0.5 ${zoneResult.is_default ? 'text-amber-700' : 'text-green-700'}`}>
                              {zoneResult.is_default
                                ? `Taxa de entrega geral · ${(zoneResult.distance_meters / 1000).toFixed(1)} km`
                                : `${zoneResult.zone_name} · ${(zoneResult.distance_meters / 1000).toFixed(1)} km`}
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className={`text-sm font-black ${zoneResult.is_default ? 'text-amber-900' : 'text-green-900'}`}>
                                {zoneResult.delivery_fee === 0 ? 'Grátis' : fmt(zoneResult.delivery_fee)}
                              </span>
                              <span className={`text-xs ${zoneResult.is_default ? 'text-amber-700' : 'text-green-700'}`}>
                                ~{zoneResult.estimated_minutes} min
                              </span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <AlertTriangle size={15} className="text-red-600" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-red-800">Fora da área de entrega</p>
                            <p className="text-xs text-red-600 mt-0.5">{zoneError}</p>
                            <p className="text-xs text-red-500 mt-1">Entre em contato pelo WhatsApp para verificar disponibilidade.</p>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Restante do formulário de endereço */}
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Rua</label>
                    <input value={formAddr.logradouro} onChange={e => setFormAddr(p => ({ ...p, logradouro: e.target.value }))}
                      placeholder="Rua, Avenida..."
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Número</label>
                      <input value={formAddr.number} onChange={e => setFormAddr(p => ({ ...p, number: e.target.value }))}
                        placeholder="123"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Complemento</label>
                      <input value={formAddr.complement} onChange={e => setFormAddr(p => ({ ...p, complement: e.target.value }))}
                        placeholder="Apto, casa..."
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Bairro</label>
                    <input value={formAddr.neighborhood} onChange={e => setFormAddr(p => ({ ...p, neighborhood: e.target.value }))}
                      placeholder="Bairro"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          )}


          {/* STEP: EXTRAS */}
          {step === 'extras' && (
            <div className="space-y-5">
              {/* Resumo do frete para referência */}
              <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                <Truck size={16} className="text-[#0EAD69] flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Frete</p>
                  <p className="text-sm font-bold text-gray-900">
                    {deliveryFee === 0 ? 'Grátis' : fmt(deliveryFee)}
                    {zoneResult && (
                      <span className="ml-2 text-xs text-gray-400 font-normal">
                        {zoneResult.zone_name} · ~{zoneResult.estimated_minutes} min
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Cupom */}
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block flex items-center gap-1.5">
                  <Tag size={12} /> Cupom de desconto
                </label>
                <div className="flex gap-2">
                  <input type="text" value={couponCode} onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponResult(null); }}
                    placeholder="CÓDIGO DO CUPOM"
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono uppercase focus:outline-none focus:border-gray-400" />
                  <button onClick={applyCoupon} disabled={loadingCoupon || !couponCode}
                    className="px-4 py-3 bg-black text-white text-sm font-bold rounded-xl disabled:opacity-40 flex items-center gap-1">
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
                  <div className={`rounded-xl border-2 p-4 transition-all ${usePoints ? 'border-black' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Usar pontos de fidelidade</p>
                        <p className="text-xs text-gray-500">100 pts = R$ 5,00 de desconto</p>
                      </div>
                      <button onClick={() => { setUsePoints(p => !p); if (!usePoints) setPointsToRedeem(maxPoints); else setPointsToRedeem(0); }}
                        className={`w-11 h-6 rounded-full transition-colors ${usePoints ? 'bg-[#0EAD69]' : 'bg-gray-300'}`}>
                        <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${usePoints ? 'translate-x-5' : ''}`} />
                      </button>
                    </div>
                    {usePoints && (
                      <div>
                        <input type="range" min={0} max={maxPoints} step={100} value={pointsToRedeem}
                          onChange={e => setPointsToRedeem(Number(e.target.value))}
                          className="w-full accent-black" />
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
                <div className="flex justify-between text-gray-600">
                  <span>
                    Entrega
                    {zoneResult && <span className="text-gray-400 text-xs ml-1">({zoneResult.zone_name})</span>}
                  </span>
                  <span>{deliveryFee === 0 ? 'Grátis' : fmt(deliveryFee)}</span>
                </div>
                {zoneResult && (
                  <div className="flex justify-between text-gray-400 text-xs">
                    <span>Distância</span>
                    <span>{(zoneResult.distance_meters / 1000).toFixed(1)} km · ~{zoneResult.estimated_minutes} min</span>
                  </div>
                )}
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
                    ? (() => { const a = savedAddresses.find(x => x.id === selectedAddrId); return a ? `${a.logradouro}, ${a.number} — ${a.neighborhood}` : ''; })()
                    : `${formAddr.logradouro}, ${formAddr.number} — ${formAddr.neighborhood}`
                  }
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-start gap-2">
                <Star size={16} className="text-[#0EAD69] mt-0.5 flex-shrink-0" />
                <div className="text-xs text-green-700">
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
            <>
              {zoneError && step === 'address' && (
                <p className="text-xs text-amber-600 text-center mb-2">
                  Fora da área padrão — você pode continuar e combinar frete pelo WhatsApp.
                </p>
              )}
              <button
                onClick={nextStep}
                disabled={!canNext()}
                className="w-full bg-black text-white font-bold py-4 rounded-xl disabled:opacity-40 transition-opacity hover:bg-gray-900 flex items-center justify-center gap-2"
              >
                {zoneLoading && step === 'address' && <Loader2 size={16} className="animate-spin" />}
                {zoneLoading && step === 'address' ? 'Verificando área...' : 'Continuar'}
              </button>
            </>
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
