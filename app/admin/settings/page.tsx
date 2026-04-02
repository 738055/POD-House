'use client';


import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { ImageUpload } from '../components/ImageUpload';
import { Settings, Loader2, CheckCircle, AlertCircle, MapPin, Search, Navigation } from 'lucide-react';

type StoreSettings = {
  store_name: string;
  logo_url: string | null;
  cover_url: string | null;
  whatsapp_number: string;
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
};

export default function SettingsPage() {
  const { supabase } = useAuth();
  const [settings, setSettings] = useState<StoreSettings>({
    store_name: '', logo_url: null, cover_url: null,
    whatsapp_number: '', phone_number: '', address_display: '',
    opening_hours: '', min_order_value: 0, delivery_info: '', is_open: true,
    default_delivery_fee: null, default_delivery_minutes: 60,
    store_address: '', store_lat: null, store_lng: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  // Campos de endereço da loja (locais, compõem store_address)
  const [cep, setCep] = useState('');
  const [cepParts, setCepParts] = useState({ logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' });
  const [cepLoading, setCepLoading] = useState(false);
  const [cepFetched, setCepFetched] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!supabase) return;
      const { data } = await supabase.from('store_settings').select('*').eq('id', 'default').single();
      if (data) setSettings({
        store_name: data.store_name || '',
        logo_url: data.logo_url,
        cover_url: data.cover_url,
        whatsapp_number: data.whatsapp_number || '',
        phone_number: data.phone_number || '',
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
      });
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function save() {
    if (!supabase) { setError('Cliente Supabase não inicializado.'); return; }
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const { error: upsertError } = await supabase
        .from('store_settings')
        .upsert({ id: 'default', ...settings });
      if (upsertError) throw upsertError;
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(`Erro ao salvar: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function geocodeAddress() {
    if (!settings.store_address.trim()) return;
    setGeocoding(true);
    setGeocodeError(null);
    try {
      let url = '';
      
      if (cepParts.logradouro && cepParts.cidade && cepParts.uf) {
        const street = encodeURIComponent(`${cepParts.logradouro} ${cepParts.numero}`.trim());
        const city = encodeURIComponent(cepParts.cidade);
        const state = encodeURIComponent(cepParts.uf);
        let params = `street=${street}&city=${city}&state=${state}&countrycodes=br&format=json&limit=1`;
        const cleanCep = cep.replace(/\D/g, '');
        if (cleanCep.length === 8) params += `&postalcode=${cleanCep}`;
        url = `https://nominatim.openstreetmap.org/search?${params}`;
      } else {
        const query = encodeURIComponent(settings.store_address.trim());
        url = `https://nominatim.openstreetmap.org/search?q=${query}&countrycodes=br&format=json&limit=1`;
      }

      const res = await fetch(url, { headers: { 'Accept-Language': 'pt-BR' } });
      const data = await res.json();
      if (!data || data.length === 0) {
        setGeocodeError('Endereço não encontrado. Tente incluir cidade e estado.');
        return;
      }
      const { lat, lon } = data[0];
      setSettings(s => ({ ...s, store_lat: parseFloat(lat), store_lng: parseFloat(lon) }));
    } catch {
      setGeocodeError('Erro ao buscar coordenadas. Verifique sua conexão.');
    } finally {
      setGeocoding(false);
    }
  }

  function composeAddress(parts: typeof cepParts, rawCep: string) {
    return [
      parts.logradouro,
      parts.numero ? `nº ${parts.numero}` : '',
      parts.complemento,
      parts.bairro,
      parts.cidade && parts.uf ? `${parts.cidade} - ${parts.uf}` : parts.cidade || parts.uf,
      rawCep ? rawCep.replace(/(\d{5})(\d{3})/, '$1-$2') : '',
    ].filter(Boolean).join(', ');
  }

  async function lookupCep(rawCep: string) {
    const clean = rawCep.replace(/\D/g, '');
    if (clean.length !== 8) return;
    setCepLoading(true);
    setCepError(null);
    setCepFetched(false);
    try {
      // 1. ViaCEP — endereço
      const viaRes = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
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

      const composed = composeAddress(newParts, clean);
      setSettings(s => ({ ...s, store_address: composed, store_lat: null, store_lng: null }));

      // 2. Nominatim — geocoding pelo CEP (mais preciso que endereço)
      setGeocoding(true);
      setGeocodeError(null);
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?postalcode=${clean}&countrycodes=br&format=json&limit=1`,
        { headers: { 'Accept-Language': 'pt-BR', 'User-Agent': 'POD-House/1.0' } }
      );
      const geoData = await geoRes.json();
      if (Array.isArray(geoData) && geoData.length > 0) {
        setSettings(s => ({ ...s, store_lat: parseFloat(geoData[0].lat), store_lng: parseFloat(geoData[0].lon) }));
      } else {
        setGeocodeError('CEP encontrado, mas coordenadas não localizadas. Tente geocodificar manualmente.');
      }
    } catch {
      setCepError('Erro de conexão ao buscar o CEP.');
    } finally {
      setCepLoading(false);
      setGeocoding(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-gray-400" size={32} /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-600/10 rounded-2xl">
            <Settings className="text-purple-500" size={28} />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">Configurações</h1>
        </div>
        <p className="text-gray-400 font-medium ml-1">Personalize a identidade visual da sua loja.</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-center gap-3">
          <AlertCircle size={18} />
          <span className="text-sm font-bold">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-2xl flex items-center gap-3">
          <CheckCircle size={18} />
          <span className="text-sm font-bold">Configurações salvas com sucesso!</span>
        </div>
      )}

      {/* Nome da loja */}
      <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl space-y-4">
        <h2 className="text-lg font-bold text-white">Informações da Loja</h2>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Nome da Loja</label>
          <input
            value={settings.store_name}
            onChange={e => setSettings(s => ({ ...s, store_name: e.target.value }))}
            placeholder="POD House"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Logo */}
      <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white">Logo da Loja</h2>
          <p className="text-sm text-gray-500 mt-1">Exibida no cabeçalho e ícone do app. Recomendado: quadrado, mín. 256×256px.</p>
        </div>
        <div className="max-w-[200px]">
          <ImageUpload
            bucket="store-assets"
            folder="logo"
            currentUrl={settings.logo_url}
            onUpload={(url) => setSettings(s => ({ ...s, logo_url: url }))}
            onRemove={() => setSettings(s => ({ ...s, logo_url: null }))}
            aspectRatio="square"
          />
        </div>
      </div>

      {/* Capa */}
      <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white">Foto de Capa</h2>
          <p className="text-sm text-gray-500 mt-1">Banner exibido na tela inicial da loja. Recomendado: 1200×400px.</p>
        </div>
        <ImageUpload
          bucket="store-assets"
          folder="cover"
          currentUrl={settings.cover_url}
          onUpload={(url) => setSettings(s => ({ ...s, cover_url: url }))}
          onRemove={() => setSettings(s => ({ ...s, cover_url: null }))}
          aspectRatio="wide"
        />
      </div>

      {/* Contato e Operação */}
      <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl space-y-4">
        <h2 className="text-lg font-bold text-white">Contato e Operação</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">WhatsApp</label>
            <input
              value={settings.whatsapp_number}
              onChange={e => setSettings(s => ({ ...s, whatsapp_number: e.target.value }))}
              placeholder="43999999999"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Telefone</label>
            <input
              value={settings.phone_number}
              onChange={e => setSettings(s => ({ ...s, phone_number: e.target.value }))}
              placeholder="(43) 9 9999-9999"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-1">Endereço (exibição)</label>
            <input
              value={settings.address_display}
              onChange={e => setSettings(s => ({ ...s, address_display: e.target.value }))}
              placeholder="Londrina - PR"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Horário de Funcionamento</label>
            <input
              value={settings.opening_hours}
              onChange={e => setSettings(s => ({ ...s, opening_hours: e.target.value }))}
              placeholder="Seg a Dom, 08:00 às 23:59"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Pedido Mínimo (R$)</label>
            <input
              type="number" min="0" step="0.50"
              value={settings.min_order_value}
              onChange={e => setSettings(s => ({ ...s, min_order_value: parseFloat(e.target.value) || 0 }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-1">Info de Entrega</label>
            <input
              value={settings.delivery_info}
              onChange={e => setSettings(s => ({ ...s, delivery_info: e.target.value }))}
              placeholder="Taxa a partir de R$ 5,00 · Tempo estimado: 30-60 min"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox" id="is_open" checked={settings.is_open}
              onChange={e => setSettings(s => ({ ...s, is_open: e.target.checked }))}
              className="w-4 h-4 accent-purple-600"
            />
            <label htmlFor="is_open" className="text-sm text-gray-300">Loja aberta</label>
          </div>
        </div>
      </div>

      {/* Taxa padrão (fora das zonas) */}
      <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white">Taxa Padrão (Fora das Zonas)</h2>
          <p className="text-sm text-gray-500 mt-1">
            Quando o CEP do cliente não está coberto por nenhuma zona cadastrada, usa esta taxa. Deixe em branco para recusar pedidos fora das zonas.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Taxa de entrega padrão (R$)</label>
            <input
              type="number" min="0" step="0.50"
              value={settings.default_delivery_fee ?? ''}
              onChange={e => setSettings(s => ({
                ...s,
                default_delivery_fee: e.target.value === '' ? null : parseFloat(e.target.value),
              }))}
              placeholder="Vazio = recusa pedido fora das zonas"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Tempo estimado padrão (min)</label>
            <input
              type="number" min="10" step="5"
              value={settings.default_delivery_minutes}
              onChange={e => setSettings(s => ({ ...s, default_delivery_minutes: parseInt(e.target.value) || 60 }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Localização da Loja */}
      <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="text-purple-400" size={20} />
            <h2 className="text-lg font-bold text-white">Localização da Loja</h2>
          </div>
          <p className="text-sm text-gray-500">
            Ponto de origem para cálculo de distância e frete. Informe o CEP para preenchimento automático.
          </p>
        </div>

        {/* CEP — busca automática */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">CEP</label>
          <div className="flex gap-2 max-w-xs">
            <input
              value={cep}
              onChange={e => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 8);
                setCep(v);
                setCepFetched(false);
                setCepError(null);
                if (v.length === 8) lookupCep(v);
              }}
              placeholder="00000-000"
              maxLength={9}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              type="button"
              onClick={() => lookupCep(cep)}
              disabled={cepLoading || cep.replace(/\D/g, '').length !== 8}
              className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap"
            >
              {cepLoading ? <Loader2 className="animate-spin" size={15} /> : <Search size={15} />}
              {cepLoading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
          {cepError && (
            <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1"><AlertCircle size={12} />{cepError}</p>
          )}
          {cepFetched && !cepError && (
            <p className="mt-1.5 text-xs text-green-400 flex items-center gap-1"><CheckCircle size={12} />Endereço encontrado</p>
          )}
        </div>

        {/* Campos de endereço */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-4">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Logradouro</label>
            <input
              value={cepParts.logradouro}
              onChange={e => {
                const v = { ...cepParts, logradouro: e.target.value };
                setCepParts(v);
                setSettings(s => ({ ...s, store_address: composeAddress(v, cep), store_lat: null, store_lng: null }));
              }}
              placeholder="Rua das Flores"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Número</label>
            <input
              value={cepParts.numero}
              onChange={e => {
                const v = { ...cepParts, numero: e.target.value };
                setCepParts(v);
                setSettings(s => ({ ...s, store_address: composeAddress(v, cep), store_lat: null, store_lng: null }));
              }}
              placeholder="123"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Complemento</label>
            <input
              value={cepParts.complemento}
              onChange={e => {
                const v = { ...cepParts, complemento: e.target.value };
                setCepParts(v);
                setSettings(s => ({ ...s, store_address: composeAddress(v, cep), store_lat: null, store_lng: null }));
              }}
              placeholder="Sala 1"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Bairro</label>
            <input
              value={cepParts.bairro}
              onChange={e => {
                const v = { ...cepParts, bairro: e.target.value };
                setCepParts(v);
                setSettings(s => ({ ...s, store_address: composeAddress(v, cep), store_lat: null, store_lng: null }));
              }}
              placeholder="Centro"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Cidade</label>
            <input
              value={cepParts.cidade}
              onChange={e => {
                const v = { ...cepParts, cidade: e.target.value };
                setCepParts(v);
                setSettings(s => ({ ...s, store_address: composeAddress(v, cep), store_lat: null, store_lng: null }));
              }}
              placeholder="Londrina"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">UF</label>
            <input
              value={cepParts.uf}
              onChange={e => {
                const v = { ...cepParts, uf: e.target.value.toUpperCase().slice(0, 2) };
                setCepParts(v);
                setSettings(s => ({ ...s, store_address: composeAddress(v, cep), store_lat: null, store_lng: null }));
              }}
              placeholder="PR"
              maxLength={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white uppercase font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Endereço completo composto + status geocoding */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Endereço completo
              <span className="ml-2 text-[10px] text-gray-600 font-normal normal-case">composto automaticamente · editável</span>
            </label>
            <div className="flex gap-2">
              <input
                value={settings.store_address}
                onChange={e => setSettings(s => ({ ...s, store_address: e.target.value, store_lat: null, store_lng: null }))}
                placeholder="Preencha o CEP acima ou edite manualmente"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="button"
                onClick={geocodeAddress}
                disabled={geocoding || !settings.store_address.trim()}
                title="Geocodificar manualmente"
                className="flex items-center gap-1.5 border border-gray-700 hover:bg-gray-800 disabled:opacity-40 text-gray-300 font-semibold px-3 py-2.5 rounded-lg transition-colors whitespace-nowrap text-sm"
              >
                {geocoding ? <Loader2 className="animate-spin" size={14} /> : <Navigation size={14} />}
                {geocoding ? 'Geocodificando...' : 'Geocodificar'}
              </button>
            </div>
          </div>

          {geocodeError && (
            <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2.5">
              <AlertCircle size={14} className="flex-shrink-0" />
              <span>{geocodeError}</span>
            </div>
          )}

          {/* Status das coordenadas */}
          {settings.store_lat !== null && settings.store_lng !== null ? (
            <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle size={16} className="flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold">Coordenadas definidas</p>
                  <p className="text-xs font-mono text-green-500/80 mt-0.5">
                    Lat: {settings.store_lat.toFixed(6)} · Lng: {settings.store_lng.toFixed(6)}
                  </p>
                </div>
              </div>
              <span className="text-[10px] text-green-600 bg-green-500/10 px-2 py-1 rounded-full font-bold uppercase">Pronto para entrega</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-800/50 border border-gray-700/50 rounded-lg px-4 py-3">
              <MapPin size={15} className="flex-shrink-0 text-gray-600" />
              <span>Coordenadas não definidas — informe o CEP ou geocodifique o endereço acima.</span>
            </div>
          )}
        </div>
      </div>

      {/* Salvar */}
      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="bg-purple-600 text-white font-bold py-2.5 px-8 rounded-xl flex items-center gap-2 hover:bg-purple-700 transition-colors disabled:bg-purple-400 disabled:cursor-wait"
        >
          {saving && <Loader2 className="animate-spin" size={18} />}
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>
    </div>
  );
}
