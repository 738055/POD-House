'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import type { DeliveryZone } from '@/lib/supabase/types';
import type { ZoneMapZone } from './ZoneMap';
import {
  Truck, Plus, Pencil, Trash2, Check, X, Loader2,
  Navigation, Clock, DollarSign, Layers, Search,
  PenLine, Undo2, CheckCircle2, MapPin, Building2,
  ChevronDown, ChevronUp, CheckSquare, Square,
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

interface OverpassNeighborhood {
  id: number;
  name: string;
  polygon: [number, number][];
}

interface InlineEdit {
  zoneId: string;
  field: 'delivery_fee' | 'estimated_minutes';
  value: string;
}

function geojsonToLatLng(geojson: NominatimResult['geojson']): [number, number][] | null {
  if (!geojson) return null;
  let ring: number[][];
  if (geojson.type === 'Polygon') {
    ring = geojson.coordinates[0];
  } else if (geojson.type === 'MultiPolygon') {
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
  const [confirmId, setConfirmId] = useState<string | null>(null);

  // Localização da loja
  const [storeLat, setStoreLat] = useState<number | null>(null);
  const [storeLng, setStoreLng] = useState<number | null>(null);
  const [storeAddress, setStoreAddress] = useState('');
  const [editingLocation, setEditingLocation] = useState(false);
  const [locForm, setLocForm] = useState({ lat: '', lng: '', address: '' });
  const [savingLoc, setSavingLoc] = useState(false);

  // Busca por cidade (Overpass API)
  const [cityQuery, setCityQuery] = useState('');
  const [cityNeighborhoods, setCityNeighborhoods] = useState<OverpassNeighborhood[]>([]);
  const [searchingCity, setSearchingCity] = useState(false);
  const [cityListExpanded, setCityListExpanded] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);

  // Inline edit de tarifas
  const [inlineEdit, setInlineEdit] = useState<InlineEdit | null>(null);
  const [savingInline, setSavingInline] = useState(false);

  // Painel de edição de polígono (secundário)
  const [editId, setEditId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<ZoneForm>(EMPTY_ZONE);
  const [saving, setSaving] = useState(false);
  const [polygonDraft, setPolygonDraft] = useState<[number, number][] | null>(null);
  const [polygonSource, setPolygonSource] = useState<'nominatim' | 'manual' | null>(null);
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

  // ── Busca de bairros por cidade ──────────────────────────────────────────────

  async function searchByCity() {
    if (!cityQuery.trim()) return;
    setSearchingCity(true);
    setCityNeighborhoods([]);
    setSelected(new Set());
    setCityListExpanded(true);
    try {
      const city = cityQuery.trim().replace(/"/g, '\\"');
      const query = `[out:json][timeout:30];area["name"="${city}"]->.a;(way["place"~"suburb|neighbourhood|quarter"](area.a);relation["place"~"suburb|neighbourhood|quarter"](area.a););out geom qt;`;
      const res = await fetch(
        `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,
        { headers: { 'User-Agent': 'POD-House/1.0' } },
      );
      const data = await res.json();
      const neighborhoods: OverpassNeighborhood[] = [];
      for (const el of data.elements ?? []) {
        const name: string | undefined = el.tags?.name;
        if (!name) continue;
        let polygon: [number, number][] | null = null;
        if (el.type === 'way' && el.geometry) {
          polygon = (el.geometry as { lat: number; lon: number }[]).map(p => [p.lat, p.lon] as [number, number]);
        } else if (el.type === 'relation' && el.members) {
          const outer = (el.members as { role: string; geometry?: { lat: number; lon: number }[] }[])
            .find(m => m.role === 'outer' && m.geometry && m.geometry.length > 0);
          if (outer?.geometry) {
            polygon = outer.geometry.map(p => [p.lat, p.lon] as [number, number]);
          }
        }
        if (polygon && polygon.length >= 3) {
          neighborhoods.push({ id: el.id as number, name, polygon });
        }
      }
      neighborhoods.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      setCityNeighborhoods(neighborhoods);
      if (neighborhoods.length === 0) {
        toast('Nenhum bairro encontrado. Use acentos, ex: "Foz do Iguaçu".', 'error');
      }
    } catch {
      toast('Erro ao buscar bairros.', 'error');
    }
    setSearchingCity(false);
  }

  function toggleSelect(id: number) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === cityNeighborhoods.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(cityNeighborhoods.map(n => n.id)));
    }
  }

  async function importSelected() {
    const toImport = cityNeighborhoods.filter(n => selected.has(n.id));
    if (toImport.length === 0) return;

    // Filtrar já existentes pelo nome
    const existingNames = new Set(zones.map(z => z.name.toLowerCase()));
    const newOnes = toImport.filter(n => !existingNames.has(n.name.toLowerCase()));
    if (newOnes.length === 0) {
      toast('Todos os bairros selecionados já existem como zonas.', 'error');
      return;
    }

    setImporting(true);
    const payload = newOnes.map((n, i) => ({
      name: n.name,
      delivery_fee: 5.0,
      estimated_minutes: 30,
      color: COLORS[(zones.length + i) % COLORS.length],
      sort_order: zones.length + i,
      active: true,
      radius_meters: 0,
      polygon: n.polygon,
      polygon_source: 'nominatim',
    }));

    const { error } = await supabase.from('delivery_zones').insert(payload);
    if (error) {
      toast(`Erro: ${error.message}`, 'error');
    } else {
      toast(`${newOnes.length} zona${newOnes.length > 1 ? 's' : ''} importada${newOnes.length > 1 ? 's' : ''}!`);
      setSelected(new Set());
      setCityNeighborhoods([]);
      setCityQuery('');
      await load();
    }
    setImporting(false);
  }

  // ── Inline edit de tarifas ───────────────────────────────────────────────────

  function startInline(zoneId: string, field: InlineEdit['field'], currentValue: number) {
    setInlineEdit({ zoneId, field, value: String(currentValue) });
  }

  async function commitInline() {
    if (!inlineEdit) return;
    const val = parseFloat(inlineEdit.value.replace(',', '.'));
    if (isNaN(val) || val < 0) { setInlineEdit(null); return; }
    setSavingInline(true);
    const { error } = await supabase
      .from('delivery_zones')
      .update({ [inlineEdit.field]: val })
      .eq('id', inlineEdit.zoneId);
    if (error) {
      toast(`Erro: ${error.message}`, 'error');
    } else {
      setZones(z => z.map(x => x.id === inlineEdit.zoneId ? { ...x, [inlineEdit.field]: val } : x));
    }
    setInlineEdit(null);
    setSavingInline(false);
  }

  async function toggleActive(zone: DeliveryZone) {
    const { error } = await supabase
      .from('delivery_zones')
      .update({ active: !zone.active })
      .eq('id', zone.id);
    if (!error) setZones(z => z.map(x => x.id === zone.id ? { ...x, active: !zone.active } : x));
  }

  // ── Edição de polígono (painel secundário) ────────────────────────────────────

  function startEdit(zone?: DeliveryZone) {
    if (zone) {
      setForm({
        name: zone.name,
        delivery_fee: zone.delivery_fee,
        estimated_minutes: zone.estimated_minutes,
        color: zone.color,
        sort_order: zone.sort_order,
        active: zone.active,
      });
      setPolygonDraft(zone.polygon ?? null);
      setPolygonSource((zone.polygon_source as 'nominatim' | 'manual' | null) ?? null);
      setEditId(zone.id);
      setSelectedId(zone.id);
    } else {
      setForm({ ...EMPTY_ZONE, color: COLORS[zones.length % COLORS.length] });
      setPolygonDraft(null);
      setPolygonSource(null);
      setEditId('new');
      setSelectedId(null);
    }
    setDrawMode(false);
    setDrawPoints([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditId(null);
    setPolygonDraft(null);
    setPolygonSource(null);
    setDrawMode(false);
    setDrawPoints([]);
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
      radius_meters: 0,
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
      cancelEdit();
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
    if (isNaN(lat) || isNaN(lng)) { toast('Coordenadas inválidas.', 'error'); return; }
    setSavingLoc(true);
    const { error } = await supabase.from('store_settings').upsert({
      id: 'default', store_lat: lat, store_lng: lng, store_address: locForm.address,
    });
    if (error) {
      toast(`Erro: ${error.message}`, 'error');
    } else {
      setStoreLat(lat); setStoreLng(lng); setStoreAddress(locForm.address);
      setEditingLocation(false);
      toast('Localização salva!');
    }
    setSavingLoc(false);
  }

  const handleDrawPoint = useCallback((point: [number, number]) => {
    setDrawPoints(prev => [...prev, point]);
  }, []);

  const mapZones: ZoneMapZone[] = zones.map(z => ({
    id: z.id, name: z.name, radius_meters: z.radius_meters,
    delivery_fee: z.delivery_fee, estimated_minutes: z.estimated_minutes,
    color: z.color, active: z.active, polygon: z.polygon,
  }));

  const allSelected = cityNeighborhoods.length > 0 && selected.size === cityNeighborhoods.length;
  const existingNames = new Set(zones.map(z => z.name.toLowerCase()));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-600/10 rounded-2xl">
            <Truck className="text-blue-400" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Zonas de Entrega</h1>
            <p className="text-gray-400 text-sm">
              {zones.length} zona{zones.length !== 1 ? 's' : ''} configurada{zones.length !== 1 ? 's' : ''}
              {storeLat && (
                <button
                  onClick={() => { setLocForm({ lat: String(storeLat), lng: String(storeLng), address: storeAddress }); setEditingLocation(true); }}
                  className="ml-3 text-gray-600 hover:text-gray-400 transition-colors"
                >
                  <Navigation size={11} className="inline mr-1" />
                  {storeAddress ? storeAddress.substring(0, 30) + (storeAddress.length > 30 ? '…' : '') : 'Editar localização'}
                </button>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={() => startEdit()}
          className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors"
        >
          <Plus size={15} /> Nova Zona Manual
        </button>
      </div>

      {/* Banner: loja sem localização */}
      {!storeLat && !editingLocation && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Navigation className="text-amber-400 flex-shrink-0" size={20} />
            <p className="text-amber-300 text-sm font-semibold">
              Localização da loja não configurada — necessária para exibir o mapa.
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
            <Navigation size={16} className="text-blue-400" /> Localização da Loja
          </h3>
          <p className="text-gray-500 text-xs mb-4">Abra o Google Maps, clique com botão direito e copie as coordenadas.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Latitude</label>
              <input value={locForm.lat} onChange={e => setLocForm(f => ({ ...f, lat: e.target.value }))} placeholder="-23.550520"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Longitude</label>
              <input value={locForm.lng} onChange={e => setLocForm(f => ({ ...f, lng: e.target.value }))} placeholder="-46.633309"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Endereço (exibição)</label>
              <input value={locForm.address} onChange={e => setLocForm(f => ({ ...f, address: e.target.value }))} placeholder="Rua Principal, 123 — Centro"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={saveLocation} disabled={savingLoc}
              className="flex items-center gap-2 bg-white text-black font-bold px-5 py-2.5 rounded-xl text-sm disabled:opacity-50 transition-colors hover:bg-gray-100">
              {savingLoc ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Salvar
            </button>
            <button onClick={() => setEditingLocation(false)}
              className="flex items-center gap-2 border border-gray-700 text-gray-300 px-5 py-2.5 rounded-xl text-sm hover:bg-gray-800 transition-colors">
              <X size={14} /> Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── PASSO 1: Busca por cidade ─────────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Building2 size={16} className="text-blue-400" />
          <p className="text-white font-bold text-sm">Importar bairros por cidade</p>
          <span className="text-[10px] text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full">via OpenStreetMap</span>
        </div>

        <div className="flex gap-2">
          <input
            value={cityQuery}
            onChange={e => setCityQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchByCity()}
            placeholder="Ex: Londrina, Foz do Iguaçu, Curitiba..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={searchByCity}
            disabled={searchingCity || !cityQuery.trim()}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors whitespace-nowrap"
          >
            {searchingCity ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            Buscar bairros
          </button>
        </div>

        {/* Lista de bairros com checkboxes */}
        {cityNeighborhoods.length > 0 && (
          <div className="space-y-2">
            {/* Controles da lista */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCityListExpanded(v => !v)}
                className="flex items-center gap-1.5 text-xs text-blue-400 font-bold hover:text-blue-300 transition-colors"
              >
                {cityListExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {cityNeighborhoods.length} bairro{cityNeighborhoods.length !== 1 ? 's' : ''} encontrado{cityNeighborhoods.length !== 1 ? 's' : ''}
              </button>
              <div className="flex items-center gap-3">
                <button onClick={toggleSelectAll} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
                  {allSelected ? <CheckSquare size={13} className="text-blue-400" /> : <Square size={13} />}
                  {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                </button>
                {selected.size > 0 && (
                  <button
                    onClick={importSelected}
                    disabled={importing}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-4 py-1.5 rounded-lg text-xs transition-colors"
                  >
                    {importing ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                    Inserir {selected.size} zona{selected.size > 1 ? 's' : ''}
                  </button>
                )}
              </div>
            </div>

            {cityListExpanded && (
              <div className="border border-gray-700 rounded-xl overflow-hidden max-h-64 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                {cityNeighborhoods.map(n => {
                  const alreadyExists = existingNames.has(n.name.toLowerCase());
                  const isSelected = selected.has(n.id);
                  return (
                    <button
                      key={n.id}
                      onClick={() => !alreadyExists && toggleSelect(n.id)}
                      disabled={alreadyExists}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors border-b border-gray-800 last:border-0 flex items-center gap-3 ${
                        alreadyExists
                          ? 'opacity-40 cursor-not-allowed'
                          : isSelected
                          ? 'bg-blue-600/20 hover:bg-blue-600/30'
                          : 'hover:bg-gray-800'
                      }`}
                    >
                      {alreadyExists ? (
                        <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
                      ) : isSelected ? (
                        <CheckSquare size={14} className="text-blue-400 flex-shrink-0" />
                      ) : (
                        <Square size={14} className="text-gray-600 flex-shrink-0" />
                      )}
                      <span className={isSelected ? 'text-white font-semibold' : 'text-gray-300'}>{n.name}</span>
                      {alreadyExists && <span className="ml-auto text-[10px] text-green-600">já existe</span>}
                      {!alreadyExists && <span className="ml-auto text-[10px] text-gray-600 flex-shrink-0">{n.polygon.length} pts</span>}
                    </button>
                  );
                })}
              </div>
            )}

            {/* CTA flutuante quando há seleção */}
            {selected.size > 0 && !cityListExpanded && (
              <div className="flex items-center justify-between bg-blue-600/10 border border-blue-600/30 rounded-xl px-4 py-3">
                <p className="text-blue-300 text-sm font-semibold">{selected.size} bairro{selected.size > 1 ? 's' : ''} selecionado{selected.size > 1 ? 's' : ''}</p>
                <button
                  onClick={importSelected}
                  disabled={importing}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-4 py-1.5 rounded-lg text-sm transition-colors"
                >
                  {importing ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  Inserir {selected.size} zona{selected.size > 1 ? 's' : ''}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Painel de edição de polígono (abre ao clicar "Editar mapa") ─────── */}
      {editId && (
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 space-y-5">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Layers size={16} className="text-gray-400" />
            {editId === 'new' ? 'Nova Zona de Entrega' : `Editar mapa — ${form.name}`}
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2 md:col-span-4">
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Nome da Zona *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Centro, Zona Norte..." className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Taxa (R$)</label>
              <input type="number" step="0.50" min="0" value={form.delivery_fee}
                onChange={e => setForm(f => ({ ...f, delivery_fee: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Tempo (min)</label>
              <input type="number" min="5" step="5" value={form.estimated_minutes}
                onChange={e => setForm(f => ({ ...f, estimated_minutes: parseInt(e.target.value) || 0 }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1 block">Ordem</label>
              <input type="number" min="0" value={form.sort_order}
                onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gray-500" />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">Cor no Mapa</label>
            <div className="flex gap-3 flex-wrap">
              {COLORS.map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} style={{ backgroundColor: c }}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${form.color === c ? 'border-white scale-125 shadow-lg' : 'border-transparent hover:scale-110'}`} />
              ))}
              <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                className="w-8 h-8 rounded-full cursor-pointer bg-transparent border-2 border-gray-600" />
            </div>
          </div>

          {/* Área de cobertura */}
          <div className="border border-gray-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-white flex items-center gap-2">
                <MapPin size={14} className="text-gray-400" /> Área de Cobertura
              </p>
              {polygonDraft && (
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 font-bold flex items-center gap-1">
                  <CheckCircle2 size={10} />
                  {polygonSource === 'nominatim' ? 'Importado' : 'Desenhado'} · {polygonDraft.length} pts
                </span>
              )}
            </div>

            {!drawMode ? (
              <button onClick={() => { setDrawMode(true); setDrawPoints([]); setPolygonDraft(null); }}
                className="w-full flex items-center justify-center gap-2 border border-dashed border-gray-700 hover:border-gray-500 text-gray-400 hover:text-gray-300 rounded-xl py-3 text-sm font-semibold transition-all">
                <PenLine size={14} /> Desenhar manualmente no mapa
              </button>
            ) : (
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-3">
                <p className="text-gray-300 text-xs font-bold mb-2 flex items-center gap-1.5">
                  <PenLine size={12} /> Modo de desenho — clique no mapa para adicionar pontos
                </p>
                <div className="flex gap-2">
                  <button onClick={() => { if (drawPoints.length < 3) { toast('Mínimo 3 pontos.', 'error'); return; } setPolygonDraft(drawPoints); setPolygonSource('manual'); setDrawMode(false); setDrawPoints([]); }}
                    disabled={drawPoints.length < 3}
                    className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-colors">
                    <CheckCircle2 size={12} /> Concluir ({drawPoints.length} pts)
                  </button>
                  <button onClick={() => setDrawPoints(prev => prev.slice(0, -1))} disabled={drawPoints.length === 0}
                    className="flex items-center gap-1.5 border border-gray-700 hover:bg-gray-800 disabled:opacity-40 text-gray-300 px-3 py-1.5 rounded-lg text-xs transition-colors">
                    <Undo2 size={12} /> Desfazer
                  </button>
                  <button onClick={() => { setDrawMode(false); setDrawPoints([]); }}
                    className="flex items-center gap-1.5 border border-gray-700 hover:bg-gray-800 text-gray-400 px-3 py-1.5 rounded-lg text-xs transition-colors ml-auto">
                    <X size={12} /> Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <input type="checkbox" id="zone-active" checked={form.active}
              onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4 accent-blue-600" />
            <label htmlFor="zone-active" className="text-sm text-gray-300">Zona ativa</label>
          </div>

          <div className="flex gap-3">
            <button onClick={saveZone} disabled={saving || !form.name.trim()}
              className="flex items-center gap-2 bg-white text-black font-black px-6 py-2.5 rounded-xl text-sm disabled:opacity-40 hover:bg-gray-100 transition-colors">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {editId === 'new' ? 'Criar Zona' : 'Salvar'}
            </button>
            <button onClick={cancelEdit}
              className="flex items-center gap-2 border border-gray-700 text-gray-300 px-5 py-2.5 rounded-xl text-sm hover:bg-gray-800 transition-colors">
              <X size={14} /> Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── PASSO 2: Mapa + lista de zonas ────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-gray-400" size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          {/* Mapa */}
          <div className="lg:col-span-3 h-[540px] rounded-2xl overflow-hidden border border-gray-800 bg-gray-900 relative">
            {drawMode && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[999] bg-gray-900 border border-gray-600 text-gray-200 text-xs font-bold px-4 py-2 rounded-full shadow-lg pointer-events-none">
                Clique no mapa para adicionar pontos
              </div>
            )}
            <ZoneMap
              storeLat={storeLat} storeLng={storeLng} zones={mapZones}
              selectedId={selectedId} onZoneClick={id => { const z = zones.find(x => x.id === id); if (z) startEdit(z); }}
              drawMode={drawMode} drawPoints={drawPoints} onDrawPoint={handleDrawPoint}
              previewPolygon={drawMode ? null : polygonDraft} previewColor={form.color}
            />
          </div>

          {/* ── Lista de zonas com edição inline de tarifas ── */}
          <div className="lg:col-span-2 space-y-2">
            {zones.length === 0 ? (
              <div className="text-center py-16 text-gray-500 bg-gray-900 rounded-2xl border border-gray-800">
                <Truck size={40} className="mx-auto mb-3 opacity-20" />
                <p className="font-semibold">Nenhuma zona configurada</p>
                <p className="text-sm mt-1">Busque uma cidade acima para importar</p>
              </div>
            ) : (
              zones.map(zone => (
                <div key={zone.id}
                  className={`rounded-2xl border transition-all duration-150 ${
                    selectedId === zone.id ? 'border-gray-600 bg-gray-800' : 'border-gray-800 bg-gray-900 hover:border-gray-700'
                  }`}
                >
                  {/* Linha superior: nome + status + ações */}
                  <div className="flex items-center gap-3 px-4 pt-3 pb-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: zone.color }} />
                    <p
                      className="font-bold text-white text-sm flex-1 truncate cursor-pointer"
                      onClick={() => setSelectedId(selectedId === zone.id ? null : zone.id)}
                    >
                      {zone.name}
                    </p>
                    <button
                      onClick={() => toggleActive(zone)}
                      className={`text-[10px] px-2 py-1 rounded-full font-black uppercase tracking-wide transition-colors ${
                        zone.active ? 'bg-green-500/15 text-green-400 hover:bg-green-500/25' : 'bg-gray-700/60 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {zone.active ? 'Ativa' : 'Inativa'}
                    </button>
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(zone)} title="Editar mapa"
                        className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg transition-all">
                        <Pencil size={12} />
                      </button>
                      <button onClick={() => setConfirmId(zone.id)} title="Excluir"
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Linha inferior: tarifas inline editáveis */}
                  <div className="flex gap-2 px-4 pb-3">
                    {/* Taxa de entrega */}
                    <div className="flex-1 bg-gray-800 rounded-xl px-3 py-2 flex items-center gap-2">
                      <DollarSign size={12} className="text-green-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-500 text-[9px] uppercase font-bold">Frete</p>
                        {inlineEdit?.zoneId === zone.id && inlineEdit.field === 'delivery_fee' ? (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-400 text-xs">R$</span>
                            <input
                              autoFocus
                              type="number" step="0.50" min="0"
                              value={inlineEdit.value}
                              onChange={e => setInlineEdit(prev => prev ? { ...prev, value: e.target.value } : null)}
                              onBlur={commitInline}
                              onKeyDown={e => { if (e.key === 'Enter') commitInline(); if (e.key === 'Escape') setInlineEdit(null); }}
                              className="w-full bg-transparent text-white font-black text-sm focus:outline-none"
                            />
                            {savingInline && <Loader2 size={10} className="animate-spin text-gray-400 flex-shrink-0" />}
                          </div>
                        ) : (
                          <button
                            onClick={() => startInline(zone.id, 'delivery_fee', zone.delivery_fee)}
                            className="text-white font-black text-sm hover:text-green-300 transition-colors w-full text-left group flex items-center gap-1"
                          >
                            {zone.delivery_fee === 0 ? 'Grátis' : formatCurrency(zone.delivery_fee)}
                            <Pencil size={9} className="opacity-0 group-hover:opacity-60 transition-opacity flex-shrink-0" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Tempo estimado */}
                    <div className="flex-1 bg-gray-800 rounded-xl px-3 py-2 flex items-center gap-2">
                      <Clock size={12} className="text-blue-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-500 text-[9px] uppercase font-bold">Tempo</p>
                        {inlineEdit?.zoneId === zone.id && inlineEdit.field === 'estimated_minutes' ? (
                          <div className="flex items-center gap-1">
                            <input
                              autoFocus
                              type="number" step="5" min="5"
                              value={inlineEdit.value}
                              onChange={e => setInlineEdit(prev => prev ? { ...prev, value: e.target.value } : null)}
                              onBlur={commitInline}
                              onKeyDown={e => { if (e.key === 'Enter') commitInline(); if (e.key === 'Escape') setInlineEdit(null); }}
                              className="w-full bg-transparent text-white font-black text-sm focus:outline-none"
                            />
                            <span className="text-gray-400 text-xs flex-shrink-0">min</span>
                            {savingInline && <Loader2 size={10} className="animate-spin text-gray-400 flex-shrink-0" />}
                          </div>
                        ) : (
                          <button
                            onClick={() => startInline(zone.id, 'estimated_minutes', zone.estimated_minutes)}
                            className="text-white font-black text-sm hover:text-blue-300 transition-colors w-full text-left group flex items-center gap-1"
                          >
                            {zone.estimated_minutes} min
                            <Pencil size={9} className="opacity-0 group-hover:opacity-60 transition-opacity flex-shrink-0" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
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
