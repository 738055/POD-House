'use client';


import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { ImageUpload } from '../components/ImageUpload';
import { Settings, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

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
};

export default function SettingsPage() {
  const { supabase } = useAuth();
  const [settings, setSettings] = useState<StoreSettings>({
    store_name: '', logo_url: null, cover_url: null,
    whatsapp_number: '', phone_number: '', address_display: '',
    opening_hours: '', min_order_value: 0, delivery_info: '', is_open: true,
    default_delivery_fee: null, default_delivery_minutes: 60,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      });
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function save() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const { error: upsertError } = await supabase
        .from('store_settings')
        .upsert({ id: 'default', ...settings, updated_at: new Date().toISOString() });
      if (upsertError) throw upsertError;
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(`Erro ao salvar: ${err.message}`);
    } finally {
      setSaving(false);
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
