import type { Config } from '@netlify/functions';
import { body, failure, result } from '@/lib/api-server';
import { InputError, validateRecord } from '@/lib/records';
import { createLevantamiento, getLevantamiento, getRamal, listLevantamientos, updateLevantamiento, type StoredLevantamiento } from '../lib/data';

export default async function handler(request: Request) {
  try {
    if (request.method === 'GET') {
      const ramalId = new URL(request.url).searchParams.get('ramal');
      const records = await listLevantamientos(ramalId);
      const ramales = new Map<string, Awaited<ReturnType<typeof getRamal>>>();
      for (const record of records) if (!ramales.has(record.ramalId)) ramales.set(record.ramalId, await getRamal(record.ramalId));
      return result(records.map(record => {
        const ramal = ramales.get(record.ramalId);
        return { ...record, ramal: ramal?.nombre || 'Ramal no disponible', subestacion: ramal?.subestacion || 'Sin subestación' };
      }));
    }
    if (request.method === 'POST' || request.method === 'PUT') {
      const payload = await body(request);
      const record = validateRecord(payload);
      const ramal = await getRamal(record.ramalId);
      if (!ramal) throw new InputError('Selecciona un ramal del catálogo.');
      if (!ramal.circuitos.includes(record.circuito)) throw new InputError('El circuito no pertenece al ramal seleccionado.');
      if (!ramal.cuadrillasSeleccionadas.length) throw new InputError('Primero edita el ramal y asígnale sus cuadrillas.');
      if (record.cuadrillasSeleccionadas.some(crew => !ramal.cuadrillasSeleccionadas.includes(crew))) throw new InputError('Selecciona únicamente cuadrillas asignadas a este ramal.');
      const editing = request.method === 'PUT';
      const id = editing ? payload.id : crypto.randomUUID();
      if (typeof id !== 'string' || id.length !== 36) throw new InputError('El levantamiento no es válido.');
      const current = editing ? await getLevantamiento(id) : null;
      if (editing && !current) return result({ error: 'El levantamiento ya no existe.' }, 404);
      const stored: StoredLevantamiento = { id, ...record, cuadrillas: record.cuadrillasSeleccionadas.length, createdAt: current?.createdAt || new Date().toISOString() };
      const saved = editing ? await updateLevantamiento(stored) : await createLevantamiento(stored);
      if (!saved) return result({ error: 'El levantamiento ya no existe.' }, 404);
      return result({ ...saved, ramal: ramal.nombre, subestacion: ramal.subestacion }, editing ? 200 : 201);
    }
    return result({ error: 'Método no permitido.' }, 405);
  } catch (error) { return failure(error); }
}
export const config: Config = { path: '/api/levantamientos' };
