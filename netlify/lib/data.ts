import type { Levantamiento, Ramal, RutaGuardada } from '@/lib/records';

export type StoredRamal = Ramal & { createdAt: string };
export type StoredLevantamiento = Omit<Levantamiento, 'ramal' | 'subestacion'> & { createdAt: string };
export type StoredRuta = Omit<RutaGuardada, 'ramal' | 'subestacion' | 'ubicacion'>;

type RamalRow = {
  id: string; nombre: string; subestacion: string; circuitos: string[]; cuadrillas_seleccionadas: string[];
  ubicacion: string; latitud: number; longitud: number; created_at: string;
};
type LevantamientoRow = {
  id: string; ramal_id: string; circuito: string; ubicacion: string; latitud: number; longitud: number;
  podas: number; cuadrillas_seleccionadas: string[]; fecha: string; created_at: string;
};
type RutaRow = {
  id: string; ramal_id: string; origen_latitud: number; origen_longitud: number;
  destino_latitud: number; destino_longitud: number; created_at: string;
};

function connection() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase no está configurado. Agrega SUPABASE_URL y SUPABASE_SECRET_KEY en Netlify.');
  return { url, key };
}

async function query<T>(resource: string, init: RequestInit = {}): Promise<T> {
  const { url, key } = connection();
  const response = await fetch(`${url}/rest/v1/${resource}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...init.headers },
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error('Supabase request failed', response.status, detail);
    throw new Error('No se pudo acceder a la base de datos de Supabase.');
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function fromRamal(row: RamalRow): StoredRamal {
  return { id: row.id, nombre: row.nombre, subestacion: row.subestacion, circuitos: row.circuitos, cuadrillas: row.cuadrillas_seleccionadas.length, cuadrillasSeleccionadas: row.cuadrillas_seleccionadas, ubicacion: row.ubicacion, latitud: row.latitud, longitud: row.longitud, createdAt: row.created_at };
}
function fromLevantamiento(row: LevantamientoRow): StoredLevantamiento {
  return { id: row.id, ramalId: row.ramal_id, circuito: row.circuito, ubicacion: row.ubicacion, latitud: row.latitud, longitud: row.longitud, podas: row.podas, cuadrillas: row.cuadrillas_seleccionadas.length, cuadrillasSeleccionadas: row.cuadrillas_seleccionadas, fecha: row.fecha, createdAt: row.created_at };
}
const ramalColumns = 'id,nombre,subestacion,circuitos,cuadrillas_seleccionadas,ubicacion,latitud,longitud,created_at';
const levantamientoColumns = 'id,ramal_id,circuito,ubicacion,latitud,longitud,podas,cuadrillas_seleccionadas,fecha,created_at';
const rutaColumns = 'id,ramal_id,origen_latitud,origen_longitud,destino_latitud,destino_longitud,created_at';

export async function listRamales() {
  return (await query<RamalRow[]>(`ramales?select=${ramalColumns}&order=nombre.asc`)).map(fromRamal);
}
export async function getRamal(id: string) {
  const rows = await query<RamalRow[]>(`ramales?select=${ramalColumns}&id=eq.${encodeURIComponent(id)}&limit=1`);
  return rows[0] ? fromRamal(rows[0]) : null;
}
function toRamalRow(ramal: StoredRamal): RamalRow {
  return { id: ramal.id, nombre: ramal.nombre, subestacion: ramal.subestacion, circuitos: ramal.circuitos, cuadrillas_seleccionadas: ramal.cuadrillasSeleccionadas, ubicacion: ramal.ubicacion || '', latitud: ramal.latitud as number, longitud: ramal.longitud as number, created_at: ramal.createdAt };
}
export async function createRamal(ramal: StoredRamal) {
  const rows = await query<RamalRow[]>('ramales', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(toRamalRow(ramal)) });
  return fromRamal(rows[0]);
}
export async function updateRamal(ramal: StoredRamal) {
  const rows = await query<RamalRow[]>(`ramales?id=eq.${encodeURIComponent(ramal.id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(toRamalRow(ramal)) });
  return rows[0] ? fromRamal(rows[0]) : null;
}
export async function deleteRamal(id: string) {
  await query<void>(`ramales?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
}
export async function listLevantamientos(ramalId?: string | null) {
  const filter = ramalId ? `&ramal_id=eq.${encodeURIComponent(ramalId)}` : '';
  return (await query<LevantamientoRow[]>(`levantamientos?select=${levantamientoColumns}${filter}&order=fecha.desc,created_at.desc`)).map(fromLevantamiento);
}
export async function getLevantamiento(id: string) {
  const rows = await query<LevantamientoRow[]>(`levantamientos?select=${levantamientoColumns}&id=eq.${encodeURIComponent(id)}&limit=1`);
  return rows[0] ? fromLevantamiento(rows[0]) : null;
}
function toLevantamientoRow(record: StoredLevantamiento): LevantamientoRow {
  return { id: record.id, ramal_id: record.ramalId, circuito: record.circuito, ubicacion: record.ubicacion, latitud: record.latitud, longitud: record.longitud, podas: record.podas, cuadrillas_seleccionadas: record.cuadrillasSeleccionadas, fecha: record.fecha, created_at: record.createdAt };
}
export async function createLevantamiento(record: StoredLevantamiento) {
  const rows = await query<LevantamientoRow[]>('levantamientos', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(toLevantamientoRow(record)) });
  return fromLevantamiento(rows[0]);
}
export async function updateLevantamiento(record: StoredLevantamiento) {
  const rows = await query<LevantamientoRow[]>(`levantamientos?id=eq.${encodeURIComponent(record.id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(toLevantamientoRow(record)) });
  return rows[0] ? fromLevantamiento(rows[0]) : null;
}
export async function listRutas() {
  return (await query<RutaRow[]>(`rutas?select=${rutaColumns}&order=created_at.desc`)).map(row => ({ id: row.id, ramalId: row.ramal_id, origenLatitud: row.origen_latitud, origenLongitud: row.origen_longitud, destinoLatitud: row.destino_latitud, destinoLongitud: row.destino_longitud, createdAt: row.created_at }));
}
export async function createRuta(route: StoredRuta) {
  const rows = await query<RutaRow[]>('rutas', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ id: route.id, ramal_id: route.ramalId, origen_latitud: route.origenLatitud, origen_longitud: route.origenLongitud, destino_latitud: route.destinoLatitud, destino_longitud: route.destinoLongitud, created_at: route.createdAt }) });
  const row = rows[0];
  return { id: row.id, ramalId: row.ramal_id, origenLatitud: row.origen_latitud, origenLongitud: row.origen_longitud, destinoLatitud: row.destino_latitud, destinoLongitud: row.destino_longitud, createdAt: row.created_at };
}
