'use client';

import { MapContainer, TileLayer, Circle, Marker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default icons in Next.js
const iconDefault = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
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
}

interface ZoneMapProps {
  storeLat: number | null;
  storeLng: number | null;
  zones: ZoneMapZone[];
  selectedId: string | null;
  onZoneClick: (id: string) => void;
}

const DEFAULT_CENTER: [number, number] = [-23.5505, -46.6333];

export default function ZoneMap({ storeLat, storeLng, zones, selectedId, onZoneClick }: ZoneMapProps) {
  const center: [number, number] = storeLat && storeLng ? [storeLat, storeLng] : DEFAULT_CENTER;
  const sorted = [...zones].sort((a, b) => b.radius_meters - a.radius_meters);

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

      {storeLat && storeLng && (
        <Marker position={[storeLat, storeLng]} icon={iconDefault}>
          <Tooltip permanent direction="top" offset={[0, -42]}>
            <span style={{ fontWeight: 'bold', fontSize: '11px' }}>📍 Sua Loja</span>
          </Tooltip>
        </Marker>
      )}

      {sorted.map(zone => (
        <Circle
          key={zone.id}
          center={center}
          radius={zone.radius_meters}
          pathOptions={{
            color: zone.color,
            fillColor: zone.color,
            fillOpacity: selectedId === zone.id ? 0.28 : 0.1,
            weight: selectedId === zone.id ? 3 : 1.5,
            opacity: zone.active ? 1 : 0.35,
            dashArray: zone.active ? undefined : '8 5',
          }}
          eventHandlers={{ click: () => onZoneClick(zone.id) }}
        >
          <Tooltip>
            <div style={{ minWidth: 140 }}>
              <strong>{zone.name}</strong>
              <br />
              🚚 {zone.delivery_fee === 0 ? 'Grátis' : `R$ ${zone.delivery_fee.toFixed(2)}`}
              &nbsp;·&nbsp; ⏱ {zone.estimated_minutes} min
              <br />
              📏 {(zone.radius_meters / 1000).toFixed(1)} km de raio
            </div>
          </Tooltip>
        </Circle>
      ))}
    </MapContainer>
  );
}
