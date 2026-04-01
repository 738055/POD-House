'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { DeliveryZone } from '@/lib/supabase/types';
import type { ZoneMapZone } from './ZoneMap';
import {
  Truck, Plus, Pencil, Trash2, Check, X, Loader2,
  Navigation, Clock, DollarSign, Layers,
} from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

const ZoneMap = dynamic(() => import('./ZoneMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-800 rounded-2xl">
      <Loader2 className="animate-spin text-gray-400" size={32} />
    </div>
  ),
});

const COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#F97316'];

const EMPTY_ZONE = {
  name: '',
  radius_meters: 2000,
  delivery_fee: 5.0,
  estimated_minutes: 30,
  color: '#8B5CF6',
  sort_order: 0,
  active: true,
};

type ZoneForm = typeof EMPTY_ZONE;

export default function DeliveryZonesPage() {
  const supabase = createClient();
  const { toast } = useToast();

  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<ZoneForm>(EMPTY_ZONE);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  // Store location
  const [storeLat, setStoreLat] = useState<number | null>(null);
  const [storeLng, setStoreLng] = useState<number | null>(null);
  const [storeAddress, setStoreAddress] = useState('');
  const [editingLocation, setEditingLocation] = useState(false);
  const [locForm, setLocForm] = useState({ lat: '', lng: '', address: '' });
  const [savingLoc, setSavingLoc] = useState(false);

  async function load() {
    const [zonesRes, settingsRes] = await Promise.all([
      supabase.from('delivery_zones').select('*').order('radius_meters'),
      supabase.from('store_settings').select('store_lat,store_lng,store_address').eq('id', 'default').single(),
    ]);
    if (zonesRes.data) setZones(zonesRes.data as DeliveryZone[]);
    if (settingsRes.data) {
      setStoreLat(settingsRes.data.store_lat ?? null);
      setStoreLng(settingsRes.data.store_lng ?? null);
      setStoreAddress(settingsRes.data.store_address ?? '');
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startEdit(zone?: DeliveryZone) {
    if (zone) {
      setForm({
        name: zone.name,
        radius_meters: zone.radius_meters,
        delivery_fee: zone.delivery_fee,
        estimated_minutes: zone.estimated_minutes,
        color: zone.color,
        sort_order: zone.sort_order,
        active: zone.active,
      });
      setEditId(zone.id);
      setSelectedId(zone.id);
    } else {
      setForm({ ...EMPTY_ZONE, color: COLORS[zones.length % COLORS.length] });
      setEditId('new');
      setSelectedId(null);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveZone() {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      radius_meters: Number(form.radius_meters),
      delivery_fee: Number(form.delivery_fee),
      estimated_minutes: Number(form.estimated_minutes),
      color: form.color,
      sort_order: Number(form.sort_order),
      active: form.active,
    };
    const { error } = editId === 'new'
      ? await supabase.from('delivery_zones').insert(payload)
      : await supabase.from('delivery_zones').update(payload).eq('id', editId!);

    if (error) {
      toast(`Erro: ${error.message}`, 'error');
    } else {
      toast(editId === 'new' ? 'Zona criada!' : 'Zona atualizada!');
      setEditId(null);
      await load();
    }
    setSaving(false);
  }

  async function removeZone(id: string) {
    const { error } = await supabase.from('delivery_zones').delete().eq('id', id);
    if (error) toast('Erro ao excluir.', 'error');
    else {
      toast('Zona excluída.');
      setZones(z => z.filter(x => x.id !== id));
      if (selectedId === id) setSelectedId(null);
    }
    setConfirmId(null);
  }

  async function saveLocation() {
    const lat = parseFloat(locForm.lat.replace(',', '.'));
    const lng = parseFloat(locForm.lng.replace(',', '.'));
    if (isNaN(lat) || isNaN(lng)) {
      toast('Coordenadas inválidas.', 'error');
      return;
    }
    setSavingLoc(true);
    const { error } = await supabase.from('store_settings').upsert({
      id: 'default',
      store_lat: lat,
      store_lng: lng,
      store_address: locForm.address,
    });
    if (error) {
      toast(`Erro: ${error.message}`, 'error');
    } else {
      setStoreLat(lat);
      setStoreLng(lng);
      setStoreAddress(locForm.address);
      setEditingLocation(false);
      toast('Localização salva!');
    }
    setSavingLoc(false);
  }

  const mapZones: ZoneMapZone[] = zones.map(z => ({
    id: z.id,
    name: z.name,
    radius_meters: z.radius_meters,
    delivery_fee: z.delivery_fee,
    estimated_minutes: z.estimated_minutes,
    color: z.color,
    active: z.active,
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-600/10 rounded-2xl">
            <Truck className="text-purple-500" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Zonas de Entrega</h1>
            <p className="text-gray-400 text-sm">Áreas de cobertura e taxas de entrega por raio</p>
          </div>
        </div>
        <button
          onClick={() => startEdit()}
          className="flex items-center gap-2 bg-purple-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-purple-700 transition-colors"
        >
          <Plus size={16} /> Nova Zona
        </button>
      </div>

      {/* Store Location Banner */}
      {!storeLat && !editingLocation && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Navigation className="text-amber-400 flex-shrink-0" size={20} />
            <p className="text-amber-300 text-sm font-semibold">
              Localização da loja não configurada. O mapa precisa das coordenadas para exibir as zonas corretamente.
            </p>
          </div>
          <button
            onClick={() => { setLocForm({ lat: '', lng: '', address: '' }); setEditingLocation(true); }}
            className="text-amber-400 text-sm font-bold hover:text-amber-300 whitespace-nowrap underline"
          >
            Configurar agora
          </button>
        </div>
      )}

      {/* Location Edit Panel */}
      {editingLocation && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-white font-bold mb-1 flex items-center gap-2">
            <Navigation size={16} className="text-purple-400" /> Localização da Loja
          </h3>
          <p className="text-gray-500 text-xs mb-4">
            💡 Abra o Google Maps, clique com botão direito no local da loja e copie as coordenadas.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Latitude</label>
              <input
                value={locForm.lat}
                onChange={e => setLocForm(f => ({ ...f, lat: e.target.value }))}
                placeholder="-23.550520"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Longitude</label>
              <input
                value={locForm.lng}
                onChange={e => setLocForm(f => ({ ...f, lng: e.target.value }))}
                placeholder="-46.633309"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Endereço (exibição)</label>
              <input
                value={locForm.address}
                onChange={e => setLocForm(f => ({ ...f, address: e.target.value }))}
                placeholder="Rua Principal, 123 — Centro"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={saveLocation}
              disabled={savingLoc}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm disabled:opacity-50 transition-colors"
            >
              {savingLoc ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Salvar Localização
            </button>
            <button
              onClick={() => setEditingLocation(false)}
              className="flex items-center gap-2 border border-gray-700 text-gray-300 px-5 py-2.5 rounded-xl text-sm"
            >
              <X size={14} /> Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Zone Edit Panel */}
      {editId && (
        <div className="bg-gray-900 border border-purple-500/30 rounded-2xl p-6">
          <h3 className="text-white font-bold mb-5 flex items-center gap-2">
            <Layers size={16} className="text-purple-400" />
            {editId === 'new' ? 'Nova Zona de Entrega' : 'Editar Zona'}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2 md:col-span-4">
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Nome da Zona *</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Centro, Zona Norte, Bairro Jardim..."
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Raio (metros)</label>
              <input
                type="number" min="100" step="100"
                value={form.radius_meters}
                onChange={e => setForm(f => ({ ...f, radius_meters: parseInt(e.target.value) || 0 }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500"
              />
              <p className="text-gray-500 text-[10px] mt-1">{(form.radius_meters / 1000).toFixed(2)} km</p>
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Taxa de Entrega (R$)</label>
              <input
                type="number" step="0.50" min="0"
                value={form.delivery_fee}
                onChange={e => setForm(f => ({ ...f, delivery_fee: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500"
              />
              <p className="text-gray-500 text-[10px] mt-1">{form.delivery_fee === 0 ? 'Entrega grátis' : `R$ ${Number(form.delivery_fee).toFixed(2)}`}</p>
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Tempo Estimado (min)</label>
              <input
                type="number" min="5" step="5"
                value={form.estimated_minutes}
                onChange={e => setForm(f => ({ ...f, estimated_minutes: parseInt(e.target.value) || 0 }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Ordem</label>
              <input
                type="number" min="0"
                value={form.sort_order}
                onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500"
              />
            </div>
          </div>

          {/* Color picker */}
          <div className="mt-4">
            <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">Cor no Mapa</label>
            <div className="flex gap-3 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                  style={{ backgroundColor: c }}
                  className={`w-9 h-9 rounded-full border-2 transition-all duration-150 ${form.color === c ? 'border-white scale-125 shadow-lg' : 'border-transparent hover:scale-110'}`}
                />
              ))}
              <div className="flex items-center gap-2 ml-1">
                <input
                  type="color"
                  value={form.color}
                  onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                  className="w-9 h-9 rounded-full cursor-pointer bg-transparent border-2 border-gray-600"
                />
                <span className="text-gray-500 text-xs">Personalizar</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <input
              type="checkbox" id="zone-active" checked={form.active}
              onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
              className="w-4 h-4 accent-purple-600"
            />
            <label htmlFor="zone-active" className="text-sm text-gray-300">Zona ativa</label>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={saveZone}
              disabled={saving || !form.name.trim()}
              className="flex items-center gap-2 bg-white text-black font-black px-6 py-2.5 rounded-xl text-sm disabled:opacity-40 hover:bg-gray-100 transition-colors"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {editId === 'new' ? 'Criar Zona' : 'Salvar Alterações'}
            </button>
            <button
              onClick={() => setEditId(null)}
              className="flex items-center gap-2 border border-gray-700 text-gray-300 px-5 py-2.5 rounded-xl text-sm hover:bg-gray-800 transition-colors"
            >
              <X size={14} /> Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-gray-400" size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          {/* Map */}
          <div className="lg:col-span-3 h-[520px] rounded-2xl overflow-hidden border border-gray-800 bg-gray-900">
            <ZoneMap
              storeLat={storeLat}
              storeLng={storeLng}
              zones={mapZones}
              selectedId={selectedId}
              onZoneClick={id => {
                const zone = zones.find(z => z.id === id);
                if (zone) startEdit(zone);
              }}
            />
          </div>

          {/* Zone cards */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-bold">
                {zones.length} zona{zones.length !== 1 ? 's' : ''} configurada{zones.length !== 1 ? 's' : ''}
              </p>
              {storeLat && (
                <button
                  onClick={() => { setLocForm({ lat: String(storeLat), lng: String(storeLng), address: storeAddress }); setEditingLocation(true); }}
                  className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors"
                >
                  <Navigation size={11} />
                  {storeAddress ? storeAddress.substring(0, 28) + (storeAddress.length > 28 ? '…' : '') : 'Editar local'}
                </button>
              )}
            </div>

            {zones.length === 0 && (
              <div className="text-center py-16 text-gray-500 bg-gray-900 rounded-2xl border border-gray-800">
                <Truck size={40} className="mx-auto mb-3 opacity-20" />
                <p className="font-semibold">Nenhuma zona configurada</p>
                <p className="text-sm mt-1">Clique em &quot;Nova Zona&quot; para começar</p>
              </div>
            )}

            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-0.5" style={{ scrollbarWidth: 'thin' }}>
              {zones.map(zone => (
                <div
                  key={zone.id}
                  onClick={() => setSelectedId(selectedId === zone.id ? null : zone.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
                    selectedId === zone.id
                      ? 'border-purple-500 bg-gray-800 shadow-lg shadow-purple-900/10'
                      : 'border-gray-800 bg-gray-900 hover:border-gray-700 hover:bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: zone.color }} />
                      <div>
                        <p className="font-bold text-white text-sm leading-tight">{zone.name}</p>
                        <p className="text-gray-500 text-xs mt-0.5">
                          {(zone.radius_meters / 1000).toFixed(1)} km de raio
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded-full font-black uppercase tracking-wide ${zone.active ? 'bg-green-500/15 text-green-400' : 'bg-gray-700/60 text-gray-400'}`}>
                      {zone.active ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-gray-800 rounded-xl p-2.5 flex items-center gap-2">
                      <DollarSign size={13} className="text-green-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-gray-500 text-[9px] uppercase font-bold">Frete</p>
                        <p className="text-white font-black text-sm truncate">
                          {zone.delivery_fee === 0 ? 'Grátis' : `R$ ${zone.delivery_fee.toFixed(2)}`}
                        </p>
                      </div>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-2.5 flex items-center gap-2">
                      <Clock size={13} className="text-blue-400 flex-shrink-0" />
                      <div>
                        <p className="text-gray-500 text-[9px] uppercase font-bold">Tempo</p>
                        <p className="text-white font-black text-sm">{zone.estimated_minutes} min</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => startEdit(zone)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-xl py-2 transition-all font-semibold"
                    >
                      <Pencil size={11} /> Editar
                    </button>
                    <button
                      onClick={() => setConfirmId(zone.id)}
                      className="flex items-center justify-center gap-1.5 px-3 text-xs text-gray-400 hover:text-red-400 bg-gray-800 hover:bg-red-500/10 rounded-xl py-2 transition-all"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmId}
        title="Excluir zona?"
        description="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={() => removeZone(confirmId!)}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
