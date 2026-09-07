export const URBAN_CREWS = ['Q52', 'Q53', 'Q54', 'Q55', 'Q56', 'Q57', 'Q58'] as const;
export const RURAL_CREWS = ['Q62', 'Q63', 'Q64', 'Q65', 'Q66', 'Q67', 'Q68'] as const;
export const ALL_CREWS = [...URBAN_CREWS, ...RURAL_CREWS] as const;

export type Ramal = { id: string; nombre: string; subestacion: string; circuitos: string[]; cuadrillas: number | null; cuadrillasSeleccionadas: string[]; ubicacion: string | null; latitud: number | null; longitud: number | null };
export type Levantamiento = { id: string; ramalId: string; circuito: string; ubicacion: string; latitud: number; longitud: number; podas: number; cuadrillas: number; cuadrillasSeleccionadas: string[]; fecha: string; ramal: string; subestacion: string };
export type RutaGuardada = { id: string; ramalId: string; ramal: string; subestacion: string; ubicacion: string; origenLatitud: number; origenLongitud: number; destinoLatitud: number; destinoLongitud: number; createdAt: string };
export type RouteInput = Pick<RutaGuardada, 'ramalId' | 'origenLatitud' | 'origenLongitud'>;
export type RecordInput = Omit<Levantamiento, 'id' | 'ramal' | 'subestacion' | 'cuadrillas'>;
export type RamalInput = Omit<Ramal, 'id' | 'cuadrillas' | 'ubicacion' | 'latitud' | 'longitud'> & { ubicacion: string; latitud: number; longitud: number };
export class InputError extends Error {}
function obj(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new InputError('Los datos enviados no son válidos.');
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string, max = 120) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new InputError(`${label}: escribe entre 1 y ${max} caracteres.`);
  return value.trim();
}
export function validateCrewSelection(value: unknown): string[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > ALL_CREWS.length) throw new InputError('Selecciona al menos una cuadrilla.');
  const selected = value.map(item => text(item, 'Cuadrilla', 3).toUpperCase());
  if (new Set(selected).size !== selected.length) throw new InputError('Hay cuadrillas repetidas.');
  if (selected.some(item => !(ALL_CREWS as readonly string[]).includes(item))) throw new InputError('La selección contiene una cuadrilla no válida.');
  return ALL_CREWS.filter(crew => selected.includes(crew));
}
export function parseCrewSelection(value: unknown): string[] {
  if (typeof value !== 'string' || !value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    const valid = parsed.filter((item): item is string => typeof item === 'string' && (ALL_CREWS as readonly string[]).includes(item));
    return ALL_CREWS.filter(crew => valid.includes(crew));
  } catch { return []; }
}
export function crewLabel(selected: string[], legacyCount?: number | null) {
  if (selected.length) return selected.join(', ');
  if (legacyCount) return `${legacyCount} sin identificar`;
  return 'Sin registrar';
}
export function validateRamal(value: unknown): RamalInput {
  const v = obj(value);
  if (!Array.isArray(v.circuitos) || v.circuitos.length < 1 || v.circuitos.length > 100) throw new InputError('Agrega entre 1 y 100 circuitos.');
  const circuitos = v.circuitos.map(c => text(c, 'Circuito'));
  if (new Set(circuitos.map(c => c.toLocaleLowerCase('es'))).size !== circuitos.length) throw new InputError('Hay circuitos repetidos.');
  if (typeof v.latitud !== 'number' || !Number.isFinite(v.latitud) || Math.abs(v.latitud) > 90) throw new InputError('Latitud: ingresa un número entre -90 y 90.');
  if (typeof v.longitud !== 'number' || !Number.isFinite(v.longitud) || Math.abs(v.longitud) > 180) throw new InputError('Longitud: ingresa un número entre -180 y 180.');
  return { nombre: text(v.nombre, 'Ramal'), subestacion: text(v.subestacion, 'Subestación'), circuitos, cuadrillasSeleccionadas: validateCrewSelection(v.cuadrillasSeleccionadas), ubicacion: text(v.ubicacion, 'Ubicación', 500), latitud: v.latitud, longitud: v.longitud };
}
export function validateRecord(value: unknown): RecordInput {
  const v = obj(value);
  function number(key: string, min: number, max: number, whole = false) {
    const n = v[key];
    if (typeof n !== 'number' || !Number.isFinite(n) || n < min || n > max || (whole && !Number.isInteger(n))) throw new InputError(`${key}: ingresa ${whole ? 'un número entero' : 'un número'} entre ${min} y ${max}.`);
    return n;
  }
  const fecha = text(v.fecha, 'Fecha', 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !Number.isFinite(Date.parse(fecha)) || new Date(fecha).toISOString().slice(0, 10) !== fecha) throw new InputError('La fecha no es válida.');
  return { ramalId: text(v.ramalId, 'Ramal', 36), circuito: text(v.circuito, 'Circuito'), ubicacion: text(v.ubicacion, 'Ubicación', 500), latitud: number('latitud', -90, 90), longitud: number('longitud', -180, 180), podas: number('podas', 0, 1000000, true), cuadrillasSeleccionadas: validateCrewSelection(v.cuadrillasSeleccionadas), fecha };
}
export function validateRoute(value: unknown): RouteInput {
  const v = obj(value);
  const coordinate = (key: 'origenLatitud' | 'origenLongitud', max: number) => {
    const n = v[key];
    if (typeof n !== 'number' || !Number.isFinite(n) || Math.abs(n) > max) throw new InputError(`${key}: ingresa una coordenada válida.`);
    return n;
  };
  return { ramalId: text(v.ramalId, 'Ramal', 36), origenLatitud: coordinate('origenLatitud', 90), origenLongitud: coordinate('origenLongitud', 180) };
}
export function localDate() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
