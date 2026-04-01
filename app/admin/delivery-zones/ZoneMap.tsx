'use client';

import { useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Polygon,
  Circle,
  Marker,
  Polyline,
  CircleMarker,
  Tooltip,
  useMapEvents,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const iconDefault = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});

export interface ZoneMapZone {
  id: string;
  name: string;
  radius_meters: number;
  delivery_fee: number;
  estimated_minutes: number;
  color: string;
  active: boolean;
  polygon: [number, number][] | null;
}

interface ZoneMapProps {
  storeLat: number | null;
  storeLng: number | null;
  zones: ZoneMapZone[];
  selectedId: string | null;
  onZoneClick: (id: string) => void;
  // Polygon drawing
  drawMode: boolean;
  drawPoints: [number, number][];
  onDrawPoint: (point: [number, number]) => void;
  previewPolygon: [number, number][] | null;
  previewColor: string;
}

const DEFAULT_CENTER: [number, number] = [-23.5505, -46.6333];

/** Captura cliques no mapa quando no modo de desenho */
function DrawHandler({
  drawMode,
  onDrawPoint,
}: {
  drawMode: boolean;
  onDrawPoint: (p: [number, number]) => void;
}) {
  useMapEvents({
    click(e) {
      if (drawMode) onDrawPoint([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

/** Ajusta o cursor do mapa conforme o modo de desenho */
function CursorController({ drawMode }: { drawMode: boolean }) {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    container.style.cursor = drawMode ? 'crosshair' : '';
  }, [drawMode, map]);
  return null;
}

/** Centraliza/zoom no polígono de preview quando ele muda */
function FitPreview({ polygon }: { polygon: [number, number][] | null }) {
  const map = useMap();
  const prev = useRef<[number, number][] | null>(null);
  useEffect(() => {
    if (polygon && polygon !== prev.current && polygon.length >= 3) {
      const bounds = L.latLngBounds(polygon.map(([lat, lng]) => [lat, lng] as L.LatLngTuple));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
    prev.current = polygon;
  }, [polygon, map]);
  return null;
}

export default function ZoneMap({
  storeLat,
  storeLng,
  zones,
  selectedId,
  onZoneClick,
  drawMode,
  drawPoints,
  onDrawPoint,
  previewPolygon,
  previewColor,
}: ZoneMapProps) {
  const center: [number, number] =
    storeLat && storeLng ? [storeLat, storeLng] : DEFAULT_CENTER;

  return (
    <MapContainer
      center={center}
      zoom={storeLat ? 13 : 5}
      style={{ height: '100%', width: '100%' }}
      key={`${storeLat}-${storeLng}`}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <DrawHandler drawMode={drawMode} onDrawPoint={onDrawPoint} />
      <CursorController drawMode={drawMode} />
      <FitPreview polygon={previewPolygon} />

      {/* Marcador da loja */}
      {storeLat && storeLng && (
        <Marker position={[storeLat, storeLng]} icon={iconDefault}>
          <Tooltip permanent direction="top" offset={[0, -42]}>
            <span style={{ fontWeight: 'bold', fontSize: '11px' }}>📍 Sua Loja</span>
          </Tooltip>
        </Marker>
      )}

      {/* Zonas salvas */}
      {zones.map((zone) => {
        const isSelected = selectedId === zone.id;
        const opts = {
          color: zone.color,
          fillColor: zone.color,
          fillOpacity: isSelected ? 0.28 : 0.1,
          weight: isSelected ? 3 : 1.5,
          opacity: zone.active ? 1 : 0.35,
          dashArray: zone.active ? undefined : '8 5',
        };
        const tooltip = (
          <Tooltip>
            <div style={{ minWidth: 140 }}>
              <strong>{zone.name}</strong>
              <br />
              🚚 {zone.delivery_fee === 0 ? 'Grátis' : `R$ ${zone.delivery_fee.toFixed(2)}`}
              &nbsp;·&nbsp;⏱ {zone.estimated_minutes} min
            </div>
          </Tooltip>
        );

        if (zone.polygon && zone.polygon.length >= 3) {
          return (
            <Polygon
              key={zone.id}
              positions={zone.polygon}
              pathOptions={opts}
              eventHandlers={{ click: () => onZoneClick(zone.id) }}
            >
              {tooltip}
            </Polygon>
          );
        }

        // Fallback para zona circular (legado)
        if (storeLat && storeLng) {
          return (
            <Circle
              key={zone.id}
              center={center}
              radius={zone.radius_meters}
              pathOptions={opts}
              eventHandlers={{ click: () => onZoneClick(zone.id) }}
            >
              {tooltip}
            </Circle>
          );
        }
        return null;
      })}

      {/* Preview do polígono (busca ou rascunho concluído) */}
      {previewPolygon && previewPolygon.length >= 3 && (
        <Polygon
          positions={previewPolygon}
          pathOptions={{
            color: previewColor,
            fillColor: previewColor,
            fillOpacity: 0.22,
            weight: 2.5,
            dashArray: '6 4',
          }}
        />
      )}

      {/* Pontos sendo desenhados manualmente */}
      {drawMode && drawPoints.length > 0 && (
        <>
          {/* Linha conectando os pontos */}
          {drawPoints.length >= 2 && (
            <Polyline
              positions={drawPoints}
              pathOptions={{ color: previewColor, weight: 2, dashArray: '5 4' }}
            />
          )}
          {/* Linha de fechamento (último → primeiro) */}
          {drawPoints.length >= 3 && (
            <Polyline
              positions={[drawPoints[drawPoints.length - 1], drawPoints[0]]}
              pathOptions={{ color: previewColor, weight: 1.5, dashArray: '3 5', opacity: 0.5 }}
            />
          )}
          {/* Marcadores de cada ponto */}
          {drawPoints.map((pt, i) => (
            <CircleMarker
              key={i}
              center={pt}
              radius={i === 0 ? 7 : 5}
              pathOptions={{
                color: '#fff',
                fillColor: previewColor,
                fillOpacity: 1,
                weight: 2,
              }}
            >
              {i === 0 && <Tooltip permanent>início</Tooltip>}
            </CircleMarker>
          ))}
        </>
      )}
    </MapContainer>
  );
}
