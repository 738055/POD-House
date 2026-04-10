'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { ImageUpload } from '../components/ImageUpload';
import {
  Settings, Loader2, CheckCircle, AlertCircle,
  MapPin, Search, Navigation, Phone, MessageCircle,
  Clock, Store, Truck, Save, Megaphone, CalendarDays,
} from 'lucide-react';

// ── Helpers de máscara ────────────────────────────────────────────────────────

function maskPhone(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function rawDigits(v: string): string {
  return v.replace(/\D/g, '');
}

function maskCep(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

type StoreSettings = {
  store_name: string;
  logo_url: string | null;
  cover_url: string | null;
  /** sempre só dígitos, ex: "43999991234" */
  whatsapp_number: string;
  /** sempre só dígitos */
  phone_number: string;
  address_display: string;
  opening_hours: string;
  min_order_value: number;
  delivery_info: string;
  is_open: boolean;
  default_delivery_fee: number | null;
  default_delivery_minutes: number;
  store_address: string;
  store_lat: number | null;
  store_lng: number | null;
  promo_banner_enabled: boolean;
  promo_banner_text: string;
  promo_banner_bg_color: string;
  open_time: string;
  close_time: string;
  open_days: number[];
};

const ALL_DAYS = [
  { label: 'Dom', value: 0 },
  { label: 'Seg', value: 1 },
  { label: 'Ter', value: 2 },
  { label: 'Qua', value: 3 },
  { label: 'Qui', value: 4 },
  { label: 'Sex', value: 5 },
  { label: 'Sáb', value: 6 },
];

const DEFAULT_SETTINGS: StoreSettings = {
  store_name: '', logo_url: null, cover_url: null,
  whatsapp_number: '', phone_number: '', address_display: '',
  opening_hours: '', min_order_value: 0, delivery_info: '', is_open: true,
  default_delivery_fee: null, default_delivery_minutes: 60,
  store_address: '', store_lat: null, store_lng: null,
  promo_banner_enabled: false,
  promo_banner_text: 'Temos cupons disponíveis! Aproveite nos descontos.',
  promo_banner_bg_color: '#0EAD69',
  open_time: '08:00',
  close_time: '23:00',
  open_days: [0, 1, 2, 3, 4, 5, 6],
};

// ── Componente principal ──────────────────────────────────────────────────────

export default function SettingsPage() {
  const { supabase } = useAuth();

  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  // Campos de endereço (estado local — compõem store_address)
  const [cep, setCep] = useState('');
  const [cepParts, setCepParts] = useState({
    logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '',
  });
  const [cepLoading, setCepLoading] = useState(false);
  const [cepFetched, setCepFetched] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);

  // ── Carregamento ────────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      if (!supabase) { setLoading(false); return; }
      const { data } = await supabase
        .from('store_settings')
        .select('*')
        .eq('id', 'default')
        .single();

      if (data) {
        setSettings({
          store_name: data.store_name || '',
          logo_url: data.logo_url ?? null,
          cover_url: data.cover_url ?? null,
          // Normaliza para só dígitos ao carregar
          whatsapp_number: rawDigits(data.whatsapp_number || ''),
          phone_number: rawDigits(data.phone_number || ''),
          address_display: data.address_display || '',
          opening_hours: data.opening_hours || '',
          min_order_value: data.min_order_value ?? 0,
          delivery_info: data.delivery_info || '',
          is_open: data.is_open ?? true,
          default_delivery_fee: data.default_delivery_fee ?? null,
          default_delivery_minutes: data.default_delivery_minutes ?? 60,
          store_address: data.store_address || '',
          store_lat: data.store_lat ?? null,
          store_lng: data.store_lng ?? null,
          promo_banner_enabled: data.promo_banner_enabled ?? false,
          promo_banner_text: data.promo_banner_text || 'Temos cupons disponíveis! Aproveite nos descontos.',
          promo_banner_bg_color: data.promo_banner_bg_color || '#0EAD69',
          open_time: data.open_time || '08:00',
          close_time: data.close_time || '23:00',
          open_days: data.open_days ?? [0, 1, 2, 3, 4, 5, 6],
        });

        // Tenta extrair CEP do endereço salvo para repopular o campo
        const cepMatch = (data.store_address || '').match(/(\d{5}-?\d{3})/);
        if (cepMatch) {
          const cleanCep = rawDigits(cepMatch[1]);
          setCep(cleanCep);
        }
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  // ── Salvar ──────────────────────────────────────────────────────────────────

  async function save() {
    if (!supabase) { setError('Conexão com o banco não estabelecida.'); return; }
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const { error: upsertError } = await supabase
        .from('store_settings')
        .upsert({ id: 'default', ...settings });
      if (upsertError) throw upsertError;
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      setError(`Erro ao salvar: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  // ── Geocoding ───────────────────────────────────────────────────────────────

  async function geocodeAddress() {
    setGeocoding(true);
    setGeocodeError(null);
    try {
      let url: string;
      if (cepParts.logradouro && cepParts.cidade) {
        const params = new URLSearchParams({
          street: `${cepParts.logradouro} ${cepParts.numero}`.trim(),
          city: cepParts.cidade,
          state: cepParts.uf,
          countrycodes: 'br',
          format: 'json',
          limit: '1',
        });
        if (cep.length === 8) params.set('postalcode', cep);
        url = `https://nominatim.openstreetmap.org/search?${params}`;
      } else if (settings.store_address.trim()) {
        url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(settings.store_address.trim())}&countrycodes=br&format=json&limit=1`;
      } else {
        setGeocodeError('Preencha o endereço ou o CEP antes de geocodificar.');
        return;
      }

      const res = await fetch(url, {
        headers: { 'Accept-Language': 'pt-BR', 'User-Agent': 'POD-House/1.0' },
      });
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        setGeocodeError('Endereço não encontrado. Tente incluir cidade e estado.');
        return;
      }
      setSettings(s => ({ ...s, store_lat: parseFloat(data[0].lat), store_lng: parseFloat(data[0].lon) }));
    } catch {
      setGeocodeError('Erro ao buscar coordenadas. Verifique sua conexão.');
    } finally {
      setGeocoding(false);
    }
  }

  // ── Endereço composto ───────────────────────────────────────────────────────

  function composeAddress(parts: typeof cepParts, rawCep: string) {
    return [
      parts.logradouro,
      parts.numero ? `nº ${parts.numero}` : '',
      parts.complemento,
      parts.bairro,
      parts.cidade && parts.uf ? `${parts.cidade} - ${parts.uf}` : (parts.cidade || parts.uf),
      rawCep ? maskCep(rawCep) : '',
    ].filter(Boolean).join(', ');
  }

  function updatePart(key: keyof typeof cepParts, value: string) {
    const v = { ...cepParts, [key]: value };
    setCepParts(v);
    setSettings(s => ({ ...s, store_address: composeAddress(v, cep), store_lat: null, store_lng: null }));
  }

  // ── Busca CEP ───────────────────────────────────────────────────────────────

  async function lookupCep(digits: string) {
    if (digits.length !== 8) return;
    setCepLoading(true);
    setCepError(null);
    setCepFetched(false);
    try {
      const viaRes = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const viaData = await viaRes.json();
      if (viaData.erro) { setCepError('CEP não encontrado. Verifique e tente novamente.'); return; }

      const newParts = {
        ...cepParts,
        logradouro: viaData.logradouro || '',
        bairro: viaData.bairro || '',
        cidade: viaData.localidade || '',
        uf: viaData.uf || '',
      };
      setCepParts(newParts);
      setCepFetched(true);
      setSettings(s => ({
        ...s,
        store_address: composeAddress(newParts, digits),
        store_lat: null,
        store_lng: null,
      }));

      // Geocoding automático pelo CEP
      setGeocoding(true);
      setGeocodeError(null);
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?postalcode=${digits}&city=${encodeURIComponent(viaData.localidade || '')}&state=${viaData.uf || ''}&countrycodes=br&format=json&limit=1`,
        { headers: { 'Accept-Language': 'pt-BR', 'User-Agent': 'POD-House/1.0' } },
      );
      const geoData = await geoRes.json();
      if (Array.isArray(geoData) && geoData.length > 0) {
        setSettings(s => ({ ...s, store_lat: parseFloat(geoData[0].lat), store_lng: parseFloat(geoData[0].lon) }));
      } else {
        setGeocodeError('CEP encontrado, mas coordenadas não localizadas. Use o botão "Geocodificar" após preencher os dados.');
      }
    } catch {
      setCepError('Erro de conexão ao buscar o CEP.');
    } finally {
      setCepLoading(false);
      setGeocoding(false);
    }
  }

  // ── UI ──────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors';
  const labelCls = 'block text-sm font-medium text-gray-300 mb-1.5';
  const sectionCls = 'p-6 bg-gray-900 border border-gray-800 rounded-2xl space-y-5';

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-purple-600/10 rounded-2xl">
          <Settings className="text-purple-500" size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Configurações</h1>
          <p className="text-gray-400 text-sm mt-0.5">Identidade, contato e operação da loja.</p>
        </div>
      </div>

      {/* Feedback */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-center gap-3">
          <AlertCircle size={18} className="flex-shrink-0" />
          <span className="text-sm font-bold">{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-2xl flex items-center gap-3">
          <CheckCircle size={18} className="flex-shrink-0" />
          <span className="text-sm font-bold">Configurações salvas com sucesso!</span>
        </div>
      )}

      {/* ── 1. Informações da loja ── */}
      <div className={sectionCls}>
        <div className="flex items-center gap-2 mb-1">
          <Store size={16} className="text-purple-400" />
          <h2 className="text-base font-bold text-white">Informações da Loja</h2>
        </div>

        <div>
          <label className={labelCls}>Nome da Loja</label>
          <input
            value={settings.store_name}
            onChange={e => setSettings(s => ({ ...s, store_name: e.target.value }))}
            placeholder="PODS"
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelCls}>Endereço (exibição no app)</label>
            <input
              value={settings.address_display}
              onChange={e => setSettings(s => ({ ...s, address_display: e.target.value }))}
              placeholder="Londrina - PR"
              className={inputCls}
            />
            <p className="text-xs text-gray-600 mt-1">Texto curto exibido no cabeçalho da loja</p>
          </div>
          <div>
            <label className={labelCls}>Horário de Funcionamento</label>
            <input
              value={settings.opening_hours}
              onChange={e => setSettings(s => ({ ...s, opening_hours: e.target.value }))}
              placeholder="Seg a Dom, 08:00 às 23:59"
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelCls}>Info de Entrega</label>
            <input
              value={settings.delivery_info}
              onChange={e => setSettings(s => ({ ...s, delivery_info: e.target.value }))}
              placeholder="Taxa a partir de R$ 5,00 · 30-60 min"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Pedido Mínimo</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium pointer-events-none">R$</span>
              <input
                type="number" min="0" step="0.50"
                value={settings.min_order_value}
                onChange={e => setSettings(s => ({ ...s, min_order_value: parseFloat(e.target.value) || 0 }))}
                className={`${inputCls} pl-9`}
                placeholder="0,00"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => setSettings(s => ({ ...s, is_open: !s.is_open }))}
            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${settings.is_open ? 'bg-green-600' : 'bg-gray-700'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.is_open ? 'left-5' : 'left-0.5'}`} />
          </button>
          <div>
            <p className="text-sm font-semibold text-white">{settings.is_open ? 'Loja aberta' : 'Loja fechada'}</p>
            <p className="text-xs text-gray-500">{settings.is_open ? 'Aceitando pedidos normalmente' : 'Pedidos pausados para o cliente'}</p>
          </div>
        </div>
      </div>

      {/* ── 2. Imagens ── */}
      <div className={sectionCls}>
        <h2 className="text-base font-bold text-white">Identidade Visual</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelCls}>Logo <span className="text-gray-600 font-normal text-xs ml-1">quadrado · mín. 256×256px</span></label>
            <div className="max-w-[160px]">
              <ImageUpload
                bucket="store-assets" folder="logo"
                currentUrl={settings.logo_url}
                onUpload={url => setSettings(s => ({ ...s, logo_url: url }))}
                onRemove={() => setSettings(s => ({ ...s, logo_url: null }))}
                aspectRatio="square"
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Foto de Capa <span className="text-gray-600 font-normal text-xs ml-1">1200×400px</span></label>
            <ImageUpload
              bucket="store-assets" folder="cover"
              currentUrl={settings.cover_url}
              onUpload={url => setSettings(s => ({ ...s, cover_url: url }))}
              onRemove={() => setSettings(s => ({ ...s, cover_url: null }))}
              aspectRatio="wide"
            />
          </div>
        </div>
      </div>

      {/* ── 3. Contato ── */}
      <div className={sectionCls}>
        <div className="flex items-center gap-2 mb-1">
          <Phone size={16} className="text-purple-400" />
          <h2 className="text-base font-bold text-white">Contato</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelCls}>
              <MessageCircle size={13} className="inline mr-1.5 text-green-400" />
              WhatsApp
            </label>
            <input
              type="tel"
              inputMode="numeric"
              value={maskPhone(settings.whatsapp_number)}
              onChange={e => setSettings(s => ({ ...s, whatsapp_number: rawDigits(e.target.value) }))}
              placeholder="(43) 9 9999-9999"
              maxLength={16}
              className={inputCls}
            />
            <p className="text-xs text-gray-600 mt-1">
              {settings.whatsapp_number
                ? `wa.me/${settings.whatsapp_number}`
                : 'Ex: 43999991234'}
            </p>
          </div>
          <div>
            <label className={labelCls}>
              <Phone size={13} className="inline mr-1.5 text-blue-400" />
              Telefone / Fixo
            </label>
            <input
              type="tel"
              inputMode="numeric"
              value={maskPhone(settings.phone_number)}
              onChange={e => setSettings(s => ({ ...s, phone_number: rawDigits(e.target.value) }))}
              placeholder="(43) 3333-3333"
              maxLength={16}
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* ── 4. Taxa padrão ── */}
      <div className={sectionCls}>
        <div className="flex items-center gap-2 mb-1">
          <Truck size={16} className="text-purple-400" />
          <h2 className="text-base font-bold text-white">Taxa Padrão de Entrega</h2>
        </div>
        <p className="text-sm text-gray-500 -mt-2">
          Aplicada quando o endereço do cliente não está coberto por nenhuma zona cadastrada.
          Deixe o valor em branco para recusar pedidos fora das zonas.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelCls}>Taxa padrão</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium pointer-events-none">R$</span>
              <input
                type="number" min="0" step="0.50"
                value={settings.default_delivery_fee ?? ''}
                onChange={e => setSettings(s => ({
                  ...s,
                  default_delivery_fee: e.target.value === '' ? null : parseFloat(e.target.value),
                }))}
                placeholder="vazio = recusa pedido"
                className={`${inputCls} pl-9`}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Tempo estimado padrão</label>
            <div className="relative">
              <input
                type="number" min="10" step="5"
                value={settings.default_delivery_minutes}
                onChange={e => setSettings(s => ({ ...s, default_delivery_minutes: parseInt(e.target.value) || 60 }))}
                className={`${inputCls} pr-12`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">min</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. Banner Promocional ── */}
      <div className={sectionCls}>
        <div className="flex items-center gap-2 mb-1">
          <Megaphone size={16} className="text-purple-400" />
          <h2 className="text-base font-bold text-white">Banner Promocional</h2>
        </div>
        <p className="text-sm text-gray-500 -mt-2">
          Faixa exibida no topo da loja (mobile) e no carrinho (desktop). Use para anunciar cupons, promoções ou qualquer mensagem.
        </p>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => setSettings(s => ({ ...s, promo_banner_enabled: !s.promo_banner_enabled }))}
            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${settings.promo_banner_enabled ? 'bg-green-600' : 'bg-gray-700'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.promo_banner_enabled ? 'left-5' : 'left-0.5'}`} />
          </button>
          <div>
            <p className="text-sm font-semibold text-white">{settings.promo_banner_enabled ? 'Banner ativo' : 'Banner inativo'}</p>
            <p className="text-xs text-gray-500">{settings.promo_banner_enabled ? 'Visível para os clientes' : 'Oculto para os clientes'}</p>
          </div>
        </div>

        <div>
          <label className={labelCls}>Texto do banner</label>
          <input
            value={settings.promo_banner_text}
            onChange={e => setSettings(s => ({ ...s, promo_banner_text: e.target.value }))}
            placeholder="Temos cupons disponíveis! Aproveite nos descontos."
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Cor de fundo</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={settings.promo_banner_bg_color}
              onChange={e => setSettings(s => ({ ...s, promo_banner_bg_color: e.target.value }))}
              className="w-10 h-10 rounded-lg border border-gray-700 bg-transparent cursor-pointer p-0.5"
            />
            <input
              value={settings.promo_banner_bg_color}
              onChange={e => setSettings(s => ({ ...s, promo_banner_bg_color: e.target.value }))}
              placeholder="#0EAD69"
              className={`${inputCls} font-mono uppercase max-w-[160px]`}
            />
            {/* Preview */}
            <div
              className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-white text-xs font-semibold truncate"
              style={{ backgroundColor: settings.promo_banner_bg_color || '#0EAD69' }}
            >
              {settings.promo_banner_text || 'Prévia do banner'}
            </div>
          </div>
        </div>
      </div>

      {/* ── 6. Horário de Funcionamento ── */}
      <div className={sectionCls}>
        <div className="flex items-center gap-2 mb-1">
          <CalendarDays size={16} className="text-purple-400" />
          <h2 className="text-base font-bold text-white">Horário de Funcionamento</h2>
        </div>
        <p className="text-sm text-gray-500 -mt-2">
          A loja abre e fecha automaticamente conforme os horários abaixo.
          O toggle "Loja fechada" da seção acima sobrepõe tudo e força o fechamento imediato.
        </p>

        {/* Dias da semana */}
        <div>
          <label className={labelCls}>Dias de atendimento</label>
          <div className="flex gap-2 flex-wrap">
            {ALL_DAYS.map(d => {
              const active = settings.open_days.includes(d.value);
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => {
                    const next = active
                      ? settings.open_days.filter(x => x !== d.value)
                      : [...settings.open_days, d.value].sort((a, b) => a - b);
                    setSettings(s => ({ ...s, open_days: next }));
                  }}
                  className={`w-12 h-10 rounded-lg text-sm font-bold transition-colors ${
                    active
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-500 hover:bg-gray-700 border border-gray-700'
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Horário de abertura e encerramento */}
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className={labelCls}>Abertura</label>
            <input
              type="time"
              value={settings.open_time}
              onChange={e => setSettings(s => ({ ...s, open_time: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Encerramento</label>
            <input
              type="time"
              value={settings.close_time}
              onChange={e => setSettings(s => ({ ...s, close_time: e.target.value }))}
              className={inputCls}
            />
          </div>
        </div>

        {/* Preview */}
        <div className="flex items-center gap-2 bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-300">
          <Clock size={14} className="text-purple-400 flex-shrink-0" />
          <span>
            {settings.open_days.length === 0
              ? 'Nenhum dia selecionado — loja sempre fechada'
              : `${ALL_DAYS.filter(d => settings.open_days.includes(d.value)).map(d => d.label).join(', ')} · ${settings.open_time} às ${settings.close_time}`}
          </span>
        </div>
      </div>

      {/* ── 7. Localização ── */}
      <div className={sectionCls}>
        <div className="flex items-center gap-2 mb-1">
          <MapPin size={16} className="text-purple-400" />
          <h2 className="text-base font-bold text-white">Localização da Loja</h2>
        </div>
        <p className="text-sm text-gray-500 -mt-2">
          Ponto de origem para cálculo de frete. Informe o CEP para preenchimento automático e geocoding.
        </p>

        {/* CEP */}
        <div>
          <label className={labelCls}>CEP</label>
          <div className="flex gap-2 max-w-xs">
            <input
              type="text"
              inputMode="numeric"
              value={maskCep(cep)}
              onChange={e => {
                const d = rawDigits(e.target.value).slice(0, 8);
                setCep(d);
                setCepFetched(false);
                setCepError(null);
                if (d.length === 8) lookupCep(d);
              }}
              placeholder="00000-000"
              maxLength={9}
              className={`${inputCls} font-mono tracking-wider`}
            />
            <button
              type="button"
              onClick={() => lookupCep(cep)}
              disabled={cepLoading || cep.length !== 8}
              className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap text-sm"
            >
              {cepLoading ? <Loader2 className="animate-spin" size={14} /> : <Search size={14} />}
              {cepLoading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
          {cepError && (
            <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
              <AlertCircle size={11} />{cepError}
            </p>
          )}
          {cepFetched && !cepError && (
            <p className="mt-1.5 text-xs text-green-400 flex items-center gap-1">
              <CheckCircle size={11} />Endereço encontrado — campos preenchidos automaticamente
            </p>
          )}
        </div>

        {/* Campos de endereço */}
        <div className="grid grid-cols-6 gap-3">
          <div className="col-span-6 md:col-span-4">
            <label className={labelCls}>Logradouro</label>
            <input value={cepParts.logradouro} onChange={e => updatePart('logradouro', e.target.value)} placeholder="Rua das Flores" className={inputCls} />
          </div>
          <div className="col-span-3 md:col-span-1">
            <label className={labelCls}>Número</label>
            <input value={cepParts.numero} onChange={e => updatePart('numero', e.target.value)} placeholder="123" className={inputCls} />
          </div>
          <div className="col-span-3 md:col-span-1">
            <label className={labelCls}>Compl.</label>
            <input value={cepParts.complemento} onChange={e => updatePart('complemento', e.target.value)} placeholder="Sl. 1" className={inputCls} />
          </div>
          <div className="col-span-6 md:col-span-3">
            <label className={labelCls}>Bairro</label>
            <input value={cepParts.bairro} onChange={e => updatePart('bairro', e.target.value)} placeholder="Centro" className={inputCls} />
          </div>
          <div className="col-span-4 md:col-span-2">
            <label className={labelCls}>Cidade</label>
            <input value={cepParts.cidade} onChange={e => updatePart('cidade', e.target.value)} placeholder="Londrina" className={inputCls} />
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className={labelCls}>UF</label>
            <input
              value={cepParts.uf}
              onChange={e => updatePart('uf', e.target.value.toUpperCase().slice(0, 2))}
              placeholder="PR" maxLength={2}
              className={`${inputCls} uppercase font-mono text-center`}
            />
          </div>
        </div>

        {/* Endereço composto + geocodificar */}
        <div className="space-y-3">
          <div>
            <label className={labelCls}>
              Endereço completo
              <span className="ml-2 text-[10px] text-gray-600 font-normal normal-case">
                composto automaticamente · editável
              </span>
            </label>
            <div className="flex gap-2">
              <input
                value={settings.store_address}
                onChange={e => setSettings(s => ({ ...s, store_address: e.target.value, store_lat: null, store_lng: null }))}
                placeholder="Preencha o CEP acima ou edite manualmente"
                className={`${inputCls} text-sm`}
              />
              <button
                type="button"
                onClick={geocodeAddress}
                disabled={geocoding || (!settings.store_address.trim() && !cepParts.cidade)}
                title="Obter coordenadas a partir do endereço"
                className="flex items-center gap-1.5 border border-gray-700 hover:bg-gray-800 disabled:opacity-40 text-gray-300 font-semibold px-3 py-2.5 rounded-lg transition-colors whitespace-nowrap text-sm flex-shrink-0"
              >
                {geocoding ? <Loader2 className="animate-spin" size={14} /> : <Navigation size={14} />}
                {geocoding ? 'Buscando...' : 'Geocodificar'}
              </button>
            </div>
          </div>

          {geocodeError && (
            <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2.5">
              <AlertCircle size={14} className="flex-shrink-0" />
              <span>{geocodeError}</span>
            </div>
          )}

          {settings.store_lat !== null && settings.store_lng !== null ? (
            <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle size={16} className="flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold">Coordenadas definidas</p>
                  <p className="text-xs font-mono text-green-500/70 mt-0.5">
                    {settings.store_lat.toFixed(6)}, {settings.store_lng.toFixed(6)}
                  </p>
                </div>
              </div>
              <span className="text-[10px] text-green-600 bg-green-500/10 px-2.5 py-1 rounded-full font-bold uppercase tracking-wide">
                Pronto para entrega
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3">
              <MapPin size={15} className="flex-shrink-0 text-gray-600" />
              <span>Coordenadas não definidas — informe o CEP ou use o botão Geocodificar.</span>
            </div>
          )}
        </div>
      </div>

      {/* Salvar */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-gray-600">
          {settings.whatsapp_number ? `WhatsApp: wa.me/${settings.whatsapp_number}` : ''}
        </p>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-wait text-white font-bold py-3 px-8 rounded-xl transition-colors"
        >
          {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>

    </div>
  );
}
