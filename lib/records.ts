export type Ramal = { id: string; nombre: string; subestacion: string; circuitos: string[] };
export type Levantamiento = { id: string; ramalId: string; circuito: string; ubicacion: string; latitud: number; longitud: number; podas: number; cuadrillas: number; fecha: string; ramal: string; subestacion: string };
export type RecordInput = Omit<Levantamiento, 'id' | 'ramal' | 'subestacion'>;
export type RamalInput = Omit<Ramal, 'id'>;
export class InputError extends Error {}
function obj(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new InputError('Los datos enviados no son válidos.');
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string, max = 120) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new InputError(`${label}: escribe entre 1 y ${max} caracteres.`);
  return value.trim();
}
export function validateRamal(value: unknown): RamalInput {
  const v = obj(value);
  if (!Array.isArray(v.circuitos) || v.circuitos.length < 1 || v.circuitos.length > 100) throw new InputError('Agrega entre 1 y 100 circuitos.');
  const circuitos = v.circuitos.map(c => text(c, 'Circuito'));
  if (new Set(circuitos.map(c => c.toLocaleLowerCase('es'))).size !== circuitos.length) throw new InputError('Hay circuitos repetidos.');
  return { nombre: text(v.nombre, 'Ramal'), subestacion: text(v.subestacion, 'Subestación'), circuitos };
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
  return { ramalId: text(v.ramalId, 'Ramal', 36), circuito: text(v.circuito, 'Circuito'), ubicacion: text(v.ubicacion, 'Ubicación', 500), latitud: number('latitud', -90, 90), longitud: number('longitud', -180, 180), podas: number('podas', 0, 1000000, true), cuadrillas: number('cuadrillas', 0, 10000, true), fecha };
}
export function localDate() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
