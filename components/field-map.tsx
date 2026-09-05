'use client';
import { useEffect, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';
import { crewLabel, type Levantamiento, type Ramal } from '@/lib/records';
import { Skeleton } from '@/components/ui/skeleton';

type Props = { records?: Levantamiento[]; ramales?: Ramal[]; selected?: string | null; onSelect?: (id: string) => void; point?: [number, number] | null; onPick?: (point: [number, number]) => void; compact?: boolean };
const EMPTY: Levantamiento[] = [];
const NO_RAMALES: Ramal[] = [];
export default function FieldMap({ records = EMPTY, ramales = NO_RAMALES, selected, onSelect, point, onPick, compact }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const lib = useRef<typeof Leaflet | null>(null);
  const layers = useRef<Leaflet.LayerGroup | null>(null);
  const pickLayer = useRef<Leaflet.CircleMarker | null>(null);
  const callbacks = useRef({ onSelect, onPick });
  callbacks.current = { onSelect, onPick };
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let disposed = false;
    let observer: ResizeObserver | undefined;
    import('leaflet').then(L => {
      if (disposed || !container.current) return;
      lib.current = L;
      const m = L.map(container.current, { scrollWheelZoom: false }).setView([23.5, -102], 5);
      map.current = m;
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>' }).on('tileerror', () => setError('No se pudo cargar parte del mapa. Revisa tu conexión.')).on('tileload', () => setError('')).addTo(m);
      layers.current = L.layerGroup().addTo(m);
      m.on('click', e => callbacks.current.onPick?.([Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6))]));
      observer = new ResizeObserver(() => m.invalidateSize());
      observer.observe(container.current);
      setReady(true);
    }).catch(() => setError('No se pudo abrir el mapa. Puedes registrar las coordenadas manualmente.'));
    return () => { disposed = true; observer?.disconnect(); map.current?.remove(); map.current = null; };
  }, []);
  useEffect(() => {
    const L = lib.current, m = map.current, group = layers.current;
    if (!ready || !L || !m || !group) return;
    group.clearLayers();
    const bounds: [number, number][] = [];
    for (const r of ramales) {
      if (r.latitud === null || r.longitud === null || !Number.isFinite(r.latitud) || !Number.isFinite(r.longitud)) continue;
      const position: [number, number] = [r.latitud, r.longitud];
      bounds.push(position);
      const popup = document.createElement('div');
      const title = document.createElement('strong'); title.textContent = `Ramal: ${r.nombre}`; popup.appendChild(title);
      for (const line of [r.ubicacion || 'Sin ubicación registrada', `Subestación: ${r.subestacion}`, `Circuitos: ${r.circuitos.join(', ')}`, `Cuadrillas del ramal: ${crewLabel(r.cuadrillasSeleccionadas, r.cuadrillas)}`, `${r.latitud.toFixed(6)}, ${r.longitud.toFixed(6)}`]) { const p = document.createElement('p'); p.textContent = line; popup.appendChild(p); }
      L.marker(position, { title: `Ramal: ${r.nombre}`, alt: `Ramal ${r.nombre}: ${r.ubicacion || ''}`, icon: L.divIcon({ className: 'survey-marker ramal-marker', html: '<span>R</span>', iconSize: [34,34], iconAnchor: [17,17] }) }).bindPopup(popup).addTo(group);
    }
    for (const [i, r] of records.entries()) {
      const popup = document.createElement('div');
      const title = document.createElement('strong'); title.textContent = r.ubicacion; popup.appendChild(title);
      for (const line of [`Ramal: ${r.ramal}`, `Circuito: ${r.circuito}`, `Subestación: ${r.subestacion}`, `${r.podas} podas · Cuadrillas: ${crewLabel(r.cuadrillasSeleccionadas, r.cuadrillas)}`, `${r.latitud.toFixed(6)}, ${r.longitud.toFixed(6)}`]) { const p = document.createElement('p'); p.textContent = line; popup.appendChild(p); }
      const marker = L.marker([r.latitud, r.longitud], { title: r.ubicacion, alt: `Levantamiento ${i + 1}: ${r.ubicacion}`, icon: L.divIcon({ className: 'survey-marker', html: `<span>${i + 1}</span>`, iconSize: [32,32], iconAnchor: [16,16] }) });
      marker.bindPopup(popup).on('click', () => callbacks.current.onSelect?.(r.id)).addTo(group);
      bounds.push([r.latitud, r.longitud]);
    }
    if (bounds.length) m.fitBounds(L.latLngBounds(bounds), { padding: [42,42], maxZoom: 16 });
  }, [records, ramales, ready]);
  useEffect(() => {
    if (!ready || !map.current || !selected) return;
    const r = records.find(x => x.id === selected);
    if (r) map.current.setView([r.latitud, r.longitud], Math.max(map.current.getZoom(), 16));
  }, [selected, records, ready]);
  useEffect(() => {
    const L = lib.current, m = map.current;
    if (!ready || !L || !m) return;
    pickLayer.current?.remove(); pickLayer.current = null;
    if (point && Number.isFinite(point[0]) && Number.isFinite(point[1]) && Math.abs(point[0]) <= 90 && Math.abs(point[1]) <= 180) {
      pickLayer.current = L.circleMarker(point, { radius: 10, color: '#ffffff', weight: 3, fillColor: '#d4870c', fillOpacity: 1 }).addTo(m);
      m.setView(point, Math.max(m.getZoom(), 16));
    }
  }, [point?.[0], point?.[1], ready]);
  return <div className={`field-map ${compact ? 'compact-map' : ''}`}>
    <div ref={container} className="map-canvas" aria-label={onPick ? 'Mapa: pulsa para seleccionar las coordenadas' : 'Mapa de ubicaciones de los levantamientos'}/>
    {!ready && !error && <Skeleton className="map-loading"/>}
    {error && <p className="map-warning" role="status">{error}</p>}
  </div>;
}

