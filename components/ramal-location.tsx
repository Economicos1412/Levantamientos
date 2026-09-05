'use client';
import { useEffect, useRef, useState } from 'react';
import { LocateFixed } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import FieldMap from './field-map';

export type RamalLocationDraft = { ubicacion: string; latitud: string; longitud: string };
export default function RamalLocation({ value, onChange, disabled }: { value: RamalLocationDraft; onChange: (patch: Partial<RamalLocationDraft>) => void; disabled: boolean }) {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const point: [number, number] | null = value.latitud.trim() && value.longitud.trim() ? [Number(value.latitud), Number(value.longitud)] : null;
  function locate() {
    setError('');
    if (!navigator.geolocation) { setError('Puedes escribir las coordenadas o marcar el mapa.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(p => { if (!active.current) return; setLocating(false); onChange({ latitud: p.coords.latitude.toFixed(6), longitud: p.coords.longitude.toFixed(6) }); }, () => { if (!active.current) return; setLocating(false); setError('No se pudo obtener la ubicación. Autoriza el acceso o marca el punto en el mapa.'); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  }
  return <>
    <div className="form-field"><Label htmlFor="ramal-location">Ubicación del ramal</Label><Input id="ramal-location" required maxLength={500} value={value.ubicacion} onChange={e => onChange({ ubicacion: e.target.value })} placeholder="Localidad, calle, tramo o referencia"/></div>
    <div className="geolocation-title"><h3 className="section-heading">Georreferencia del ramal</h3><Button type="button" variant="outline" disabled={disabled || locating} onClick={locate}><LocateFixed/>{locating ? 'Obteniendo…' : 'Usar mi ubicación'}</Button></div>
    <div className="form-columns"><div className="form-field"><Label htmlFor="ramal-latitude">Latitud</Label><Input id="ramal-latitude" required type="number" step="any" min={-90} max={90} inputMode="decimal" value={value.latitud} onChange={e => onChange({ latitud: e.target.value })}/></div><div className="form-field"><Label htmlFor="ramal-longitude">Longitud</Label><Input id="ramal-longitude" required type="number" step="any" min={-180} max={180} inputMode="decimal" value={value.longitud} onChange={e => onChange({ longitud: e.target.value })}/></div></div>
    <p className="field-help map-help">Escribe las coordenadas o marca la ubicación en el mapa.</p>
    <FieldMap compact point={point} onPick={p => { if (!disabled) onChange({ latitud: String(p[0]), longitud: String(p[1]) }); }}/>
    {error && <p className="error-box" role="status">{error}</p>}
  </>;
}
