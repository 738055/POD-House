'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { DeliveryZone } from '@/lib/supabase/types';
import type { ZoneMapZone } from './ZoneMap';
import {
  Truck, Plus, Pencil, Trash2, Check, X, Loader2,
  Navigation, Clock, DollarSign, Layers, Search,
  PenLine, Undo2, CheckCircle2, MapPin,
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
  delivery_fee: 5.0,
  estimated_minutes: 30,
  color: '#8B5CF6',
  sort_order: 0,
  active: true,
};

type ZoneForm = typeof EMPTY_ZONE;

interface NominatimResult {
  place_id: number;
  display_name: string;
  geojson: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][];
  } | null;
}

/** Converte coordenadas GeoJSON [lng, lat] para [[lat, lng]] */
function geojsonToLatLng(geojson: NominatimResult['geojson']): [number, number][] | null {
  if (!geojson) return null;
  let ring: number[][];
  if (geojson.type === 'Polygon') {
    ring = geojson.coordinates[0];
  } else if (geojson.type === 'MultiPolygon') {
    // Pega o maior anel do MultiPolygon
    ring = geojson.coordinates.reduce(
      (biggest, poly) => poly[0].length > biggest.length ? poly[0] : biggest,
      geojson.coordinates[0][0],
    );
  } else {
    return null;
  }
  return ring.map(([lng, lat]) => [lat, lng] as [number, number]);
}

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

  // Localização da loja
  const [storeLat, setStoreLat] = useState<number | null>(null);
  const [storeLng, setStoreLng] = useState<number | null>(null);
  const [storeAddress, setStoreAddress] = useState('');
  const [editingLocation, setEditingLocation] = useState(false);
  const [locForm, setLocForm] = useState({ lat: '', lng: '', address: '' });
  const [savingLoc, setSavingLoc] = useState(false);

  // Polígono da zona
  const [polygonDraft, setPolygonDraft] = useState<[number, number][] | null>(null);
  const [polygonSource, setPolygonSource] = useState<'nominatim' | 'manual' | null>(null);

  // Busca de bairro
  const [neighborQuery, setNeighborQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Modo de desenho manual
  const [drawMode, setDrawMode] = useState(false);
  const [drawPoints, setDrawPoints] = useState<[number, number][]>([]);

  async function load() {
    const [zonesRes, settingsRes] = await Promise.all([
      supabase.from('delivery_zones').select('*').order('sort_order'),
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

  function resetPolygonState() {
    setPolygonDraft(null);
    setPolygonSource(null);
    setDrawMode(false);
    setDrawPoints([]);
    setNeighborQuery('');
    setSearchResults([]);
  }

  function startEdit(zone?: DeliveryZone) {
    resetPolygonState();
    if (zone) {
      setForm({
        name: zone.name,
        delivery_fee: zone.delivery_fee,
        estimated_minutes: zone.estimated_minutes,
        color: zone.color,
        sort_order: zone.sort_order,
        active: zone.active,
      });
      if (zone.polygon) {
        setPolygonDraft(zone.polygon);
        setPolygonSource(zone.polygon_source as 'nominatim' | 'manual' | null);
      }
      setEditId(zone.id);
      setSelectedId(zone.id);
    } else {
      setForm({ ...EMPTY_ZONE, color: COLORS[zones.length % COLORS.length] });
      setEditId('new');
      setSelectedId(null);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditId(null);
    resetPolygonState();
  }

  async function saveZone() {
    if (!form.name.trim()) return;
    if (!polygonDraft || polygonDraft.length < 3) {
      toast('Defina a área de entrega no mapa antes de salvar.', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      delivery_fee: Number(form.delivery_fee),
      estimated_minutes: Number(form.estimated_minutes),
      color: form.color,
      sort_order: Number(form.sort_order),
      active: form.active,
      polygon: polygonDraft,
      polygon_source: polygonSource,
    };
    const { error } = editId === 'new'
      ? await supabase.from('delivery_zones').insert(payload)
      : await supabase.from('delivery_zones').update(payload).eq('id', editId!);

    if (error) {
      toast(`Erro: ${error.message}`, 'error');
    } else {
      toast(editId === 'new' ? 'Zona criada!' : 'Zona atualizada!');
      setEditId(null);
      resetPolygonState();
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

  /** Busca polígono do bairro via Nominatim */
  async function searchNeighborhood() {
    if (!neighborQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const q = encodeURIComponent(neighborQuery.trim());
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${q}&format=json&polygon_geojson=1&limit=6&accept-language=pt-BR`,
        { headers: { 'User-Agent': 'POD-House/1.0' } },
      );
      const data: NominatimResult[] = await res.json();
      const withPolygon = data.filter(
        r => r.geojson && (r.geojson.type === 'Polygon' || r.geojson.type === 'MultiPolygon'),
      );
      setSearchResults(withPolygon);
      if (withPolygon.length === 0) toast('Nenhum polígono encontrado. Tente um nome mais específico.', 'error');
    } catch {
      toast('Erro ao buscar bairro.', 'error');
    }
    setSearching(false);
  }

  function applySearchResult(result: NominatimResult) {
    const coords = geojsonToLatLng(result.geojson);
    if (!coords) return;
    setPolygonDraft(coords);
    setPolygonSource('nominatim');
    setSearchResults([]);
    setNeighborQuery(result.display_name.split(',')[0]);
    setDrawMode(false);
    setDrawPoints([]);
  }

  const handleDrawPoint = useCallback((point: [number, number]) => {
    setDrawPoints(prev => [...prev, point]);
  }, []);

  function undoLastPoint() {
    setDrawPoints(prev => prev.slice(0, -1));
  }

  function concludeDrawing() {
    if (drawPoints.length < 3) {
      toast('Desenhe pelo menos 3 pontos.', 'error');
      return;
    }
    setPolygonDraft(drawPoints);
    setPolygonSource('manual');
    setDrawMode(false);
    setDrawPoints([]);
  }

  function startDrawMode() {
    setDrawMode(true);
    setDrawPoints([]);
    setPolygonDraft(null);
    setSearchResults([]);
  }

  const mapZones: ZoneMapZone[] = zones.map(z => ({
    id: z.id,
    name: z.name,
    radius_meters: z.radius_meters,
    delivery_fee: z.delivery_fee,
    estimated_minutes: z.estimated_minutes,
    color: z.color,
    active: z.active,
    polygon: z.polygon,
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
            <p className="text-gray-400 text-sm">Delimite bairros e regiões no mapa</p>
          </div>
        </div>
        <button
          onClick={() => startEdit()}
          className="flex items-center gap-2 bg-purple-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-purple-700 transition-colors"
        >
          <Plus size={16} /> Nova Zona
        </button>
      </div>

      {/* Banner: loja sem localização */}
      {!storeLat && !editingLocation && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Navigation className="text-amber-400 flex-shrink-0" size={20} />
            <p className="text-amber-300 text-sm font-semibold">
              Localização da loja não configurada. Necessária para exibir o mapa.
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

      {/* Painel: localização da loja */}
      {editingLocation && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-white font-bold mb-1 flex items-center gap-2">
            <Navigation size={16} className="text-purple-400" /> Localização da Loja
          </h3>
          <p className="text-gray-500 text-xs mb-4">
            💡 Abra o Google Maps, clique com botão direito e copie as coordenadas.
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
              {savingLoc ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Salvar
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

      {/* Painel: edição de zona */}
      {editId && (
        <div className="bg-gray-900 border border-purple-500/30 rounded-2xl p-6 space-y-5">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Layers size={16} className="text-purple-400" />
            {editId === 'new' ? 'Nova Zona de Entrega' : 'Editar Zona'}
          </h3>

          {/* Campos básicos */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2 md:col-span-4">
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Nome da Zona *</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Centro, Zona Norte, Jardim América..."
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Taxa de Entrega (R$)</label>
              <input
                type="number" step="0.50" min="0"
                value={form.delivery_fee}
                onChange={e => setForm(f => ({ ...f, delivery_fee: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500"
              />
              <p className="text-gray-500 text-[10px] mt-1">
                {form.delivery_fee === 0 ? 'Entrega grátis' : `R$ ${Number(form.delivery_fee).toFixed(2)}`}
              </p>
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

          {/* Cor */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">Cor no Mapa</label>
            <div className="flex gap-3 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                  style={{ backgroundColor: c }}
                  className={`w-9 h-9 rounded-full border-2 transition-all ${form.color === c ? 'border-white scale-125 shadow-lg' : 'border-transparent hover:scale-110'}`}
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

          {/* ─── Área de Cobertura ─── */}
          <div className="border border-gray-800 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-white flex items-center gap-2">
                <MapPin size={14} className="text-purple-400" /> Área de Cobertura
              </p>
              {polygonDraft && (
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 font-bold uppercase tracking-wide flex items-center gap-1">
                  <CheckCircle2 size={10} />
                  {polygonSource === 'nominatim' ? 'Importado do mapa' : 'Desenhado manualmente'}
                  &nbsp;·&nbsp;{polygonDraft.length} pontos
                </span>
              )}
            </div>

            {/* Busca de bairro */}
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1.5 block">
                Buscar bairro / região
              </label>
              <div className="flex gap-2">
                <input
                  value={neighborQuery}
                  onChange={e => setNeighborQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchNeighborhood()}
                  placeholder="Ex: Pinheiros, São Paulo"
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={searchNeighborhood}
                  disabled={searching || !neighborQuery.trim()}
                  className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors"
                >
                  {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                  Buscar
                </button>
              </div>
              <p className="text-gray-600 text-[10px] mt-1">
                Busca no OpenStreetMap — inclua a cidade para melhores resultados
              </p>

              {/* Resultados da busca */}
              {searchResults.length > 0 && (
                <div className="mt-2 border border-gray-700 rounded-xl overflow-hidden">
                  {searchResults.map(r => (
                    <button
                      key={r.place_id}
                      onClick={() => applySearchResult(r)}
                      className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors border-b border-gray-800 last:border-0 flex items-center gap-2"
                    >
                      <MapPin size={12} className="text-purple-400 flex-shrink-0" />
                      <span className="truncate">{r.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Separador */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-800" />
              <span className="text-xs text-gray-600">ou</span>
              <div className="flex-1 h-px bg-gray-800" />
            </div>

            {/* Desenho manual */}
            {!drawMode ? (
              <button
                onClick={startDrawMode}
                className="w-full flex items-center justify-center gap-2 border border-dashed border-gray-700 hover:border-purple-500/50 text-gray-400 hover:text-purple-400 rounded-xl py-3 text-sm font-semibold transition-all"
              >
                <PenLine size={14} />
                Desenhar manualmente no mapa
              </button>
            ) : (
              <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-3">
                <p className="text-purple-300 text-xs font-bold mb-2 flex items-center gap-1.5">
                  <PenLine size={12} /> Modo de desenho ativo — clique no mapa para adicionar pontos
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={concludeDrawing}
                    disabled={drawPoints.length < 3}
                    className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-colors"
                  >
                    <CheckCircle2 size={12} />
                    Concluir ({drawPoints.length} pts)
                  </button>
                  <button
                    onClick={undoLastPoint}
                    disabled={drawPoints.length === 0}
                    className="flex items-center gap-1.5 border border-gray-700 hover:bg-gray-800 disabled:opacity-40 text-gray-300 px-3 py-1.5 rounded-lg text-xs transition-colors"
                  >
                    <Undo2 size={12} /> Desfazer
                  </button>
                  <button
                    onClick={() => { setDrawMode(false); setDrawPoints([]); }}
                    className="flex items-center gap-1.5 border border-gray-700 hover:bg-gray-800 text-gray-400 px-3 py-1.5 rounded-lg text-xs transition-colors ml-auto"
                  >
                    <X size={12} /> Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Zona ativa */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox" id="zone-active" checked={form.active}
              onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
              className="w-4 h-4 accent-purple-600"
            />
            <label htmlFor="zone-active" className="text-sm text-gray-300">Zona ativa</label>
          </div>

          <div className="flex gap-3">
            <button
              onClick={saveZone}
              disabled={saving || !form.name.trim()}
              className="flex items-center gap-2 bg-white text-black font-black px-6 py-2.5 rounded-xl text-sm disabled:opacity-40 hover:bg-gray-100 transition-colors"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {editId === 'new' ? 'Criar Zona' : 'Salvar Alterações'}
            </button>
            <button
              onClick={cancelEdit}
              className="flex items-center gap-2 border border-gray-700 text-gray-300 px-5 py-2.5 rounded-xl text-sm hover:bg-gray-800 transition-colors"
            >
              <X size={14} /> Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Conteúdo principal */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-gray-400" size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          {/* Mapa */}
          <div className="lg:col-span-3 h-[540px] rounded-2xl overflow-hidden border border-gray-800 bg-gray-900 relative">
            {drawMode && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[999] bg-purple-900 border border-purple-500 text-purple-200 text-xs font-bold px-4 py-2 rounded-full shadow-lg pointer-events-none">
                Clique no mapa para adicionar pontos
              </div>
            )}
            <ZoneMap
              storeLat={storeLat}
              storeLng={storeLng}
              zones={mapZones}
              selectedId={selectedId}
              onZoneClick={id => {
                const zone = zones.find(z => z.id === id);
                if (zone) startEdit(zone);
              }}
              drawMode={drawMode}
              drawPoints={drawPoints}
              onDrawPoint={handleDrawPoint}
              previewPolygon={drawMode ? null : polygonDraft}
              previewColor={form.color}
            />
          </div>

          {/* Lista de zonas */}
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

            <div className="space-y-3 max-h-[540px] overflow-y-auto pr-0.5" style={{ scrollbarWidth: 'thin' }}>
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
                      <div className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: zone.color }} />
                      <div>
                        <p className="font-bold text-white text-sm leading-tight">{zone.name}</p>
                        <p className="text-gray-500 text-xs mt-0.5">
                          {zone.polygon
                            ? `Polígono · ${zone.polygon.length} pontos`
                            : `${(zone.radius_meters / 1000).toFixed(1)} km raio`}
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
