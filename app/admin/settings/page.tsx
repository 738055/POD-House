'use client';


import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { ImageUpload } from '../components/ImageUpload';
import { Settings, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

type StoreSettings = {
  store_name: string;
  logo_url: string | null;
  cover_url: string | null;
};

export default function SettingsPage() {
  const { supabase } = useAuth();
  const [settings, setSettings] = useState<StoreSettings>({ store_name: '', logo_url: null, cover_url: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!supabase) return;
      const { data } = await supabase.from('store_settings').select('*').eq('id', 'default').single();
      if (data) setSettings({ store_name: data.store_name || '', logo_url: data.logo_url, cover_url: data.cover_url });
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
