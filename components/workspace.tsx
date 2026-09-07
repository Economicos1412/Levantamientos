'use client';
import { useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Network, MapPin, Pencil, LocateFixed, Scissors, Users, X, Building2, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Empty, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import FieldMap from './field-map';
import RamalLocation from './ramal-location';
import CrewSelector from './crew-selector';
import { ALL_CREWS, crewLabel, localDate, validateRamal, validateRecord, type Levantamiento, type Ramal, type RecordInput, type RamalInput } from '@/lib/records';

async function request<T>(path: string, method = 'GET', data?: unknown): Promise<T> {
  const response = await fetch(path, { method, cache: 'no-store', headers: data ? { 'Content-Type': 'application/json' } : {}, body: data ? JSON.stringify(data) : undefined });
  const result = await response.json();
  if (!response.ok) throw new Error((result as { error?: string }).error || 'No se pudo completar la operación.');
  return result as T;
}
function Choice({ id, value, onChange, options, placeholder = 'Selecciona una opción', disabled = false }: { id: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string; disabled?: boolean }) {
  return <Select value={value || null} onValueChange={v => onChange(v || '')} items={options} disabled={disabled}>
    <SelectTrigger id={id}><SelectValue placeholder={placeholder}/></SelectTrigger>
    <SelectContent>{options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
  </Select>;
}
function ModalHeading({ title, description, close }: { title: string; description: string; close: () => void }) {
  return <DialogHeader className="pr-10"><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription><Button className="absolute right-4 top-4" variant="ghost" size="icon" aria-label="Cerrar" onClick={close}><X/></Button></DialogHeader>;
}
const emptyRamales: Ramal[] = [];
const emptyRecords: Levantamiento[] = [];
type Draft = { id?: string; ramalId: string; circuito: string; ubicacion: string; latitud: string; longitud: string; podas: string; cuadrillasSeleccionadas: string[]; legacyCuadrillas?: number; fecha: string };
type RamalDraft = { id: string; nombre: string; subestacion: string; circuitos: string; cuadrillasSeleccionadas: string[]; legacyCuadrillas?: number | null; ubicacion: string; latitud: string; longitud: string };
const newRamalDraft = (): RamalDraft => ({ id: '', nombre: '', subestacion: '', circuitos: '', cuadrillasSeleccionadas: [], ubicacion: '', latitud: '', longitud: '' });
type Context = { registerTool: (tool: { name: string; title: string; description: string; inputSchema: object; annotations: object; execute: (input: unknown) => unknown | Promise<unknown> }, options: { signal: AbortSignal }) => unknown };

export default function Workspace() {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 15000 } } }));
  return <QueryClientProvider client={client}><Registry/></QueryClientProvider>;
}

function Registry() {
  const client = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [ramalDraft, setRamalDraft] = useState<RamalDraft>(newRamalDraft);
  const [saveError, setSaveError] = useState('');
  const [catalogEpoch, setCatalogEpoch] = useState(0);
  const [catalogError, setCatalogError] = useState('');
  const [saved, setSaved] = useState('');
  const [saving, setSaving] = useState(false);
  const [catalogSaving, setCatalogSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Ramal | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [locating, setLocating] = useState(false);
  const ramalQuery = useQuery({ queryKey: ['ramales'], queryFn: () => request<Ramal[]>('/api/ramales') });
  const recordsQuery = useQuery({ queryKey: ['levantamientos', filter], queryFn: () => request<Levantamiento[]>('/api/levantamientos' + (filter === 'all' ? '' : '?ramal=' + encodeURIComponent(filter))) });
  const ramales = ramalQuery.data || emptyRamales;
  const records = recordsQuery.data || emptyRecords;
  const activeRamal = ramales.find(r => r.id === filter);
  const visibleRamales = useMemo(() => filter === 'all' ? ramales : ramales.filter(r => r.id === filter), [ramales, filter]);
  const formRamal = ramales.find(r => r.id === draft?.ramalId);
  const totals = useMemo(() => ({ podas: records.reduce((sum, r) => sum + r.podas, 0), cuadrillas: new Set(records.flatMap(r => r.cuadrillasSeleccionadas)).size }), [records]);
  const loading = ramalQuery.isPending || recordsQuery.isPending;
  const loadError = ramalQuery.error || recordsQuery.error;
  const ramalOptions = ramales.map(r => ({ value: r.id, label: r.nombre }));
  const point: [number,number] | null = draft && draft.latitud.trim() && draft.longitud.trim() ? [Number(draft.latitud), Number(draft.longitud)] : null;
  const closeDraft = () => { if (!saving) { setDraft(null); setSaveError(''); } };
  const changeFilter = (id: string) => { setFilter(id); setSelected(null); };
  function newRecord() {
    setSaveError(''); setSaved('');
    const r = activeRamal || ramales[0];
    if (!r) { setCatalogOpen(true); return; }
    if (!r.cuadrillasSeleccionadas.length) {
      setRamalDraft({ id: r.id, nombre: r.nombre, subestacion: r.subestacion, circuitos: r.circuitos.join('\n'), cuadrillasSeleccionadas: [], legacyCuadrillas: r.cuadrillas, ubicacion: r.ubicacion || '', latitud: r.latitud === null ? '' : String(r.latitud), longitud: r.longitud === null ? '' : String(r.longitud) });
      setCatalogError('Asigna las claves de las cuadrillas a este ramal antes de registrar el levantamiento.');
      setCatalogOpen(true);
      return;
    }
    setDraft({ ramalId: r.id, circuito: r.circuitos.length === 1 ? r.circuitos[0] : '', ubicacion: '', latitud: '', longitud: '', podas: '0', cuadrillasSeleccionadas: [], fecha: localDate() });
  }
  function editRecord(r: Levantamiento) { setSaveError(''); setSaved(''); setDraft({ id: r.id, ramalId: r.ramalId, circuito: r.circuito, ubicacion: r.ubicacion, latitud: String(r.latitud), longitud: String(r.longitud), podas: String(r.podas), cuadrillasSeleccionadas: r.cuadrillasSeleccionadas, legacyCuadrillas: r.cuadrillas, fecha: r.fecha }); }
  function field(key: keyof Draft, value: string) { setDraft(d => d ? { ...d, [key]: value } : d); }
  async function refresh() { await client.invalidateQueries({ queryKey: ['levantamientos'] }); await client.invalidateQueries({ queryKey: ['ramales'] }); }
  async function storeRecord(data: RecordInput, id?: string) {
    const record = await request<Levantamiento>('/api/levantamientos', id ? 'PUT' : 'POST', { ...validateRecord(data), ...(id ? { id } : {}) });
    await client.invalidateQueries({ queryKey: ['levantamientos'] });
    return record;
  }
  async function submitRecord(e: React.FormEvent) {
    e.preventDefault(); if (!draft || saving) return;
    setSaving(true); setSaveError('');
    try {
      if (!draft.latitud.trim() || !draft.longitud.trim() || !draft.podas.trim()) throw new Error('Completa las coordenadas y el número de podas.');
      const record = await storeRecord({ ramalId: draft.ramalId, circuito: draft.circuito, ubicacion: draft.ubicacion, latitud: Number(draft.latitud), longitud: Number(draft.longitud), podas: Number(draft.podas), cuadrillasSeleccionadas: draft.cuadrillasSeleccionadas, fecha: draft.fecha }, draft.id);
      setFilter(record.ramalId); setSelected(record.id); setDraft(null); setSaved('Levantamiento guardado.');
    } catch (e) { setSaveError(e instanceof Error ? e.message : 'No se pudo guardar el levantamiento.'); }
    finally { setSaving(false); }
  }
  async function storeRamal(data: RamalInput, id?: string) {
    const r = await request<Ramal>('/api/ramales', id ? 'PUT' : 'POST', { ...validateRamal(data), ...(id ? { id } : {}) });
    await refresh();
    return r;
  }
  async function submitRamal(e: React.FormEvent) {
    e.preventDefault(); if (catalogSaving) return;
    setCatalogSaving(true); setCatalogError('');
    try {
      if (![ramalDraft.latitud, ramalDraft.longitud].every(v => v.trim())) throw new Error('Completa las coordenadas del ramal.');
      const r = await storeRamal({ nombre: ramalDraft.nombre, subestacion: ramalDraft.subestacion, cuadrillasSeleccionadas: ramalDraft.cuadrillasSeleccionadas, ubicacion: ramalDraft.ubicacion, latitud: Number(ramalDraft.latitud), longitud: Number(ramalDraft.longitud), circuitos: ramalDraft.circuitos.split(/\n|,/).map(c => c.trim()).filter(Boolean) }, ramalDraft.id || undefined);
      changeFilter(r.id); setRamalDraft(newRamalDraft()); setCatalogEpoch(v => v + 1); setSaved('Ramal guardado con ubicación y cuadrillas identificadas.');
    } catch (e) { setCatalogError(e instanceof Error ? e.message : 'No se pudo guardar el ramal.'); }
    finally { setCatalogSaving(false); }
  }
  async function deleteRamal() {
    if (!deleteTarget || deleting) return;
    setDeleting(true); setCatalogError('');
    try {
      const removed = await request<{ id: string; nombre: string }>('/api/ramales?id=' + encodeURIComponent(deleteTarget.id), 'DELETE');
      if (filter === removed.id) changeFilter('all');
      if (ramalDraft.id === removed.id) setRamalDraft(newRamalDraft());
      setDeleteTarget(null);
      await refresh();
      setSaved(`Ramal ${removed.nombre} eliminado.`);
    } catch (e) {
      setCatalogError(e instanceof Error ? e.message : 'No se pudo quitar el ramal.');
      setDeleteTarget(null);
    } finally { setDeleting(false); }
  }
  function locate() {
    if (!navigator.geolocation) { setSaveError('Este dispositivo no ofrece geolocalización. Escribe las coordenadas o marca el mapa.'); return; }
    setLocating(true); setSaveError('');
    navigator.geolocation.getCurrentPosition(p => {
      setDraft(d => d ? { ...d, latitud: p.coords.latitude.toFixed(6), longitud: p.coords.longitude.toFixed(6) } : d);
      setLocating(false);
    }, e => { setLocating(false); setSaveError(e.code === 1 ? 'No se autorizó la ubicación. Puedes escribir las coordenadas o marcar el mapa.' : 'No se pudo obtener tu ubicación. Intenta de nuevo o marca el mapa.'); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  }

  useEffect(() => {
    const context = (document as Document & { modelContext?: Context }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool: Parameters<Context['registerTool']>[0]) => { try { Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch {} };
    register({ name: 'consultar_ramales', title: 'Consultar ramales', description: 'Consulta el catálogo guardado de ramales, circuitos y subestaciones.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: () => request<Ramal[]>('/api/ramales') });
    register({ name: 'registrar_levantamiento', title: 'Registrar levantamiento', description: 'Guarda un levantamiento real y actualiza la lista y el mapa. Usa un ramal y circuito existentes.', inputSchema: { type: 'object', properties: { ramalId: { type: 'string' }, circuito: { type: 'string' }, ubicacion: { type: 'string' }, latitud: { type: 'number', minimum: -90, maximum: 90 }, longitud: { type: 'number', minimum: -180, maximum: 180 }, podas: { type: 'integer', minimum: 0, maximum: 1000000 }, cuadrillasSeleccionadas: { type: 'array', items: { type: 'string', enum: [...ALL_CREWS] }, minItems: 1, uniqueItems: true }, fecha: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' } }, required: ['ramalId','circuito','ubicacion','latitud','longitud','podas','cuadrillasSeleccionadas','fecha'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true }, execute: async input => { const r = await storeRecord(validateRecord(input)); setFilter(r.ramalId); setSelected(r.id); setSaved('Levantamiento guardado.'); return { id: r.id, ramal: r.ramal, ubicacion: r.ubicacion }; } });
    return () => lifecycle.abort();
  }, [client]);

  return <main className="workspace">
    <div className="page-heading"><div><p className="eyebrow">OPERACIÓN EN CAMPO</p><h2>Registro de levantamientos</h2></div><div className="heading-actions"><Button variant="outline" onClick={() => { setCatalogError(''); setCatalogOpen(true); }}><Network/> Catálogo de ramales</Button><Button onClick={newRecord} disabled={loading || !!loadError}><Plus/> Nuevo levantamiento</Button></div></div>
    {saved && <p role="status" className="success-note">{saved}</p>}
    {loadError && <div role="alert" className="error-box">No se pudieron cargar los registros. <Button variant="outline" onClick={() => void refresh()}><RefreshCw/> Reintentar</Button></div>}
    <section className="filter-bar" aria-label="Filtro por ramal"><div className="filter-select"><Label htmlFor="filter-ramal">Ramal</Label><Choice id="filter-ramal" value={filter} onChange={changeFilter} options={[{ value: 'all', label: 'Todos los ramales' }, ...ramalOptions]}/></div><div className="ramal-context"><div><span className="context-label"><Building2 size={15}/> Subestación</span><strong>{activeRamal?.subestacion || (filter === 'all' ? 'Todas las subestaciones' : '—')}</strong></div><div><span className="context-label"><Network size={15}/> Circuitos</span><div className="circuit-tags">{activeRamal ? activeRamal.circuitos.map(c => <span key={c} className="circuit-tag">{c}</span>) : <span className="muted">Selecciona un ramal para ver sus circuitos</span>}</div></div></div></section>
    {activeRamal && <section className="ramal-details" aria-label="Ubicación y cuadrillas del ramal"><div><span className="context-label"><MapPin size={15}/> Ubicación del ramal</span><strong>{activeRamal.ubicacion || 'Sin ubicación registrada'}</strong>{activeRamal.latitud !== null && activeRamal.longitud !== null && <p className="coordinates">{activeRamal.latitud.toFixed(6)}, {activeRamal.longitud.toFixed(6)}</p>}</div><div><span className="context-label"><Users size={15}/> Cuadrillas del ramal</span><strong>{crewLabel(activeRamal.cuadrillasSeleccionadas, activeRamal.cuadrillas)}</strong></div></section>}
    <div className="work-grid">
      <section className="records-panel" aria-label="Levantamientos registrados">
        <div className="panel-title"><h3>Levantamientos</h3><span className="count-pill">{loading || loadError ? '—' : records.length}</span></div>
        {loading ? <div className="loading-list" aria-label="Cargando registros"><Skeleton className="h-24"/><Skeleton className="h-24"/></div> : loadError ? <Empty className="empty-content"><EmptyTitle>No hay conexión con los registros</EmptyTitle><EmptyDescription>Usa Reintentar para volver a consultarlos.</EmptyDescription></Empty> : !ramales.length ? <Empty className="empty-content"><Network size={38}/><EmptyTitle>Empieza con un ramal</EmptyTitle><EmptyDescription>Agrega su nombre, subestación y circuitos. Después podrás registrar el primer levantamiento.</EmptyDescription><Button variant="outline" onClick={() => setCatalogOpen(true)}><Plus/> Agregar ramal</Button></Empty> : !records.length ? <Empty className="empty-content"><MapPin size={38}/><EmptyTitle>Aún no hay levantamientos</EmptyTitle><EmptyDescription>{activeRamal ? 'Registra la primera ubicación de este ramal.' : 'Los levantamientos guardados aparecerán aquí y en el mapa.'}</EmptyDescription><Button variant="outline" onClick={newRecord}><Plus/> Registrar levantamiento</Button></Empty> : <div className="record-list">{records.map((r,i) => <article className={'record-card ' + (selected === r.id ? 'selected-record' : '')} key={r.id}>
          <button className="record-main" onClick={() => setSelected(r.id)} aria-label={'Ver en mapa: ' + r.ubicacion} aria-pressed={selected === r.id}><div className="record-top"><span className="record-number">{i+1}</span><span className="record-ramal">{r.ramal}</span><time dateTime={r.fecha}>{r.fecha.split('-').reverse().join('/')}</time></div><h4>{r.ubicacion}</h4><p>{r.circuito} · {r.subestacion}</p><span className="coordinates">{r.latitud.toFixed(6)}, {r.longitud.toFixed(6)}</span></button>
          <div className="record-bottom"><span><Scissors size={15}/>{r.podas} podas</span><span><Users size={15}/>{crewLabel(r.cuadrillasSeleccionadas, r.cuadrillas)}</span><Button size="icon" variant="ghost" aria-label={'Editar ' + r.ubicacion} onClick={() => editRecord(r)}><Pencil size={15}/></Button></div>
        </article>)}</div>}
      </section>
      <section className="map-panel"><div className="panel-title"><MapPin size={19}/><h3>Mapa de ramales y levantamientos</h3><span className="map-scope">{activeRamal?.nombre || 'Todos los ramales'}</span></div><div className="map-area"><FieldMap records={records} ramales={visibleRamales} selected={selected} onSelect={setSelected} trackUser/>{!loading && !loadError && !records.length && !visibleRamales.some(r => r.latitud !== null && r.longitud !== null) && <div className="map-empty-note"><span className="legend-dot"/>Agrega la ubicación de un ramal o un levantamiento.</div>}</div><div className="map-legend"><span><i className="ramal-dot"/> Ramales</span><span><i className="legend-dot"/> Levantamientos</span><span><i className="user-location-dot"/> Mi ubicación (en vivo)</span></div><div className="map-summary"><span><MapPin size={18}/><strong>{loading || loadError ? '—' : records.length}</strong> levantamientos</span><span><Scissors size={18}/><strong>{loading || loadError ? '—' : totals.podas}</strong> podas</span><span><Users size={18}/><strong>{loading || loadError ? '—' : totals.cuadrillas}</strong> cuadrillas identificadas</span></div></section>
    </div>
    <p className="workspace-footnote">Las podas y cuadrillas identificadas corresponden a los levantamientos del filtro seleccionado.</p>

    <Dialog open={catalogOpen} onOpenChange={v => { if (!catalogSaving) setCatalogOpen(v); }}>
      <DialogContent className="catalog-dialog" showCloseButton={false}><ModalHeading title="Catálogo de ramales" description="Registra subestación, circuitos, cuadrillas y ubicación del ramal." close={() => { if (!catalogSaving) setCatalogOpen(false); }}/>
        <div className="catalog-grid"><section><h3 className="section-heading">Ramales registrados <span className="count-pill">{ramales.length}</span></h3>{ramalQuery.error ? <p role="alert" className="error-box">No se pudo cargar el catálogo.</p> : ramales.length ? <Table><TableHeader><TableRow><TableHead>Ramal / subestación</TableHead><TableHead>Circuitos</TableHead><TableHead><span className="sr-only">Acciones</span></TableHead></TableRow></TableHeader><TableBody>{ramales.map(r => <TableRow key={r.id}><TableCell><strong>{r.nombre}</strong><p className="muted">{r.subestacion}</p><p className="catalog-location"><MapPin size={14}/>{r.ubicacion || 'Sin ubicación registrada'}</p><p className="muted">Cuadrillas: {crewLabel(r.cuadrillasSeleccionadas, r.cuadrillas)}</p>{r.latitud !== null && r.longitud !== null && <p className="coordinates">{r.latitud.toFixed(6)}, {r.longitud.toFixed(6)}</p>}</TableCell><TableCell className="catalog-circuits">{r.circuitos.join(', ')}</TableCell><TableCell><div className="catalog-actions"><Button disabled={catalogSaving || deleting} size="icon" variant="ghost" aria-label={'Editar ramal ' + r.nombre} onClick={() => { setRamalDraft({ id: r.id, nombre: r.nombre, subestacion: r.subestacion, circuitos: r.circuitos.join('\n'), cuadrillasSeleccionadas: r.cuadrillasSeleccionadas, legacyCuadrillas: r.cuadrillas, ubicacion: r.ubicacion || '', latitud: r.latitud === null ? '' : String(r.latitud), longitud: r.longitud === null ? '' : String(r.longitud) }); setCatalogError(''); }}><Pencil size={16}/></Button><Button disabled={catalogSaving || deleting} size="icon" variant="ghost" className="delete-button" aria-label={'Quitar ramal ' + r.nombre} onClick={() => { setCatalogError(''); setDeleteTarget(r); }}><Trash2 size={16}/></Button></div></TableCell></TableRow>)}</TableBody></Table> : <Empty className="catalog-empty"><Network size={32}/><EmptyTitle>Sin ramales registrados</EmptyTitle><EmptyDescription>Captura el primero en el formulario.</EmptyDescription></Empty>}</section>
        <form onSubmit={submitRamal} className="ramal-form"><h3 className="section-heading">{ramalDraft.id ? 'Editar ramal' : 'Agregar ramal'}</h3><fieldset disabled={catalogSaving}><div className="form-field"><Label htmlFor="ramal-name">Nombre o clave del ramal</Label><Input id="ramal-name" required maxLength={120} value={ramalDraft.nombre} onChange={e => setRamalDraft(d => ({ ...d, nombre: e.target.value }))} placeholder="Nombre del ramal"/></div><div className="form-field"><Label htmlFor="substation">Subestación</Label><Input id="substation" required maxLength={120} value={ramalDraft.subestacion} onChange={e => setRamalDraft(d => ({ ...d, subestacion: e.target.value }))} placeholder="Nombre de la subestación"/></div><div className="form-field"><Label htmlFor="circuits">Circuitos</Label><Textarea id="circuits" required rows={4} maxLength={12100} value={ramalDraft.circuitos} onChange={e => setRamalDraft(d => ({ ...d, circuitos: e.target.value }))} placeholder="Un circuito por línea"/><p className="field-help">Escribe un circuito por línea o sepáralos con comas.</p></div><CrewSelector idPrefix="ramal-crew" value={ramalDraft.cuadrillasSeleccionadas} legacyCount={ramalDraft.legacyCuadrillas} disabled={catalogSaving} onChange={cuadrillasSeleccionadas => setRamalDraft(d => ({ ...d, cuadrillasSeleccionadas }))}/><RamalLocation key={ramalDraft.id + ':' + catalogEpoch} value={ramalDraft} disabled={catalogSaving} onChange={patch => setRamalDraft(d => ({ ...d, ...patch }))}/></fieldset>{catalogError && <p role="alert" className="error-box">{catalogError}</p>}<div className="form-actions">{ramalDraft.id && <Button type="button" disabled={catalogSaving} variant="outline" onClick={() => { setRamalDraft(newRamalDraft()); setCatalogError(''); }}>Cancelar edición</Button>}<Button type="submit" disabled={catalogSaving}>{catalogSaving ? 'Guardando…' : 'Guardar ramal'}</Button></div></form></div>
      </DialogContent>
    </Dialog>

    <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open && !deleting) setDeleteTarget(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogMedia className="delete-media"><Trash2/></AlertDialogMedia><AlertDialogTitle>¿Quitar el ramal {deleteTarget?.nombre}?</AlertDialogTitle><AlertDialogDescription>Se eliminarán sus datos de catálogo, ubicación y georreferencia. Esta acción no se puede deshacer. Si tiene levantamientos asociados, el programa no permitirá eliminarlo.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={deleting} onClick={() => void deleteRamal()}>{deleting ? 'Eliminando…' : 'Sí, quitar ramal'}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <Dialog open={!!draft} onOpenChange={v => { if (!v) closeDraft(); }}>
      <DialogContent className="record-dialog" showCloseButton={false}><ModalHeading title={draft?.id ? 'Editar levantamiento' : 'Nuevo levantamiento'} description="Registra el trabajo y su ubicación en el ramal." close={closeDraft}/>
      {draft && <form onSubmit={submitRecord}><fieldset disabled={saving}><div className="form-columns"><div className="form-field"><Label htmlFor="record-ramal">Ramal</Label><Choice id="record-ramal" value={draft.ramalId} onChange={id => { const r = ramales.find(x => x.id === id); setDraft(d => d ? { ...d, ramalId: id, circuito: r?.circuitos.length === 1 ? r.circuitos[0] : '', cuadrillasSeleccionadas: [], legacyCuadrillas: undefined } : d); }} options={ramalOptions}/></div><div className="form-field"><Label htmlFor="record-circuit">Circuito</Label><Choice id="record-circuit" value={draft.circuito} onChange={v => field('circuito', v)} options={(formRamal?.circuitos || []).map(c => ({ value: c, label: c }))}/></div></div>
      <p className="substation-readout"><Building2 size={16}/> Subestación: <strong>{formRamal?.subestacion || 'Selecciona un ramal'}</strong></p>
      <div className="form-columns"><div className="form-field location-name"><Label htmlFor="location">Ubicación o referencia</Label><Input id="location" required maxLength={500} value={draft.ubicacion} onChange={e => field('ubicacion', e.target.value)} placeholder="Calle, tramo, poste o referencia"/></div><div className="form-field"><Label htmlFor="date">Fecha</Label><Input id="date" type="date" required value={draft.fecha} onChange={e => field('fecha', e.target.value)}/></div></div>
      <div className="form-field"><Label htmlFor="pruning">Número de podas</Label><Input id="pruning" type="number" inputMode="numeric" required min={0} max={1000000} step={1} value={draft.podas} onChange={e => field('podas', e.target.value)}/></div>
      <CrewSelector idPrefix="record-crew" value={draft.cuadrillasSeleccionadas} available={formRamal?.cuadrillasSeleccionadas || []} legacyCount={draft.legacyCuadrillas} disabled={saving} onChange={cuadrillasSeleccionadas => setDraft(d => d ? { ...d, cuadrillasSeleccionadas } : d)}/>
      <div className="geolocation-title"><h3 className="section-heading">Geolocalización</h3><Button type="button" variant="outline" disabled={locating || saving} onClick={locate}><LocateFixed/>{locating ? 'Obteniendo ubicación…' : 'Usar mi ubicación'}</Button></div>
      <div className="form-columns"><div className="form-field"><Label htmlFor="latitude">Latitud</Label><Input id="latitude" type="number" inputMode="decimal" required min={-90} max={90} step="any" value={draft.latitud} onChange={e => field('latitud', e.target.value)} placeholder="Ej. 19.432600"/></div><div className="form-field"><Label htmlFor="longitude">Longitud</Label><Input id="longitude" type="number" inputMode="decimal" required min={-180} max={180} step="any" value={draft.longitud} onChange={e => field('longitud', e.target.value)} placeholder="Ej. -99.133200"/></div></div>
      <p className="field-help map-help">Escribe las coordenadas o pulsa en el mapa para marcar el punto.</p><FieldMap compact point={point} onPick={p => { if (!saving) setDraft(d => d ? { ...d, latitud: String(p[0]), longitud: String(p[1]) } : d); }}/></fieldset>
      {saveError && <p role="alert" className="error-box">{saveError}</p>}<div className="form-actions"><Button type="button" variant="outline" disabled={saving} onClick={closeDraft}>Cancelar</Button><Button type="submit" disabled={saving || locating}>{saving ? 'Guardando…' : 'Guardar levantamiento'}</Button></div></form>}
      </DialogContent>
    </Dialog>
  </main>;
}





