import type { Config } from '@netlify/functions';
import { body, failure, result } from '@/lib/api-server';
import { InputError, validateRecord } from '@/lib/records';
import { readState, writeState, type StoredLevantamiento } from '../lib/data';

export default async function handler(request: Request) {
  try {
    const state = await readState();
    if (request.method === 'GET') {
      const ramalId = new URL(request.url).searchParams.get('ramal');
      const records = state.levantamientos
        .filter(item => !ramalId || item.ramalId === ramalId)
        .map(item => {
          const ramal = state.ramales.find(candidate => candidate.id === item.ramalId);
          return { ...item, ramal: ramal?.nombre || 'Ramal no disponible', subestacion: ramal?.subestacion || 'Sin subestación' };
        })
        .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.createdAt.localeCompare(a.createdAt));
      return result(records);
    }
    if (request.method === 'POST' || request.method === 'PUT') {
      const payload = await body(request);
      const record = validateRecord(payload);
      const ramal = state.ramales.find(item => item.id === record.ramalId);
      if (!ramal) throw new InputError('Selecciona un ramal del catálogo.');
      if (!ramal.circuitos.includes(record.circuito)) throw new InputError('El circuito no pertenece al ramal seleccionado.');
      if (!ramal.cuadrillasSeleccionadas.length) throw new InputError('Primero edita el ramal y asígnale sus cuadrillas.');
      if (record.cuadrillasSeleccionadas.some(crew => !ramal.cuadrillasSeleccionadas.includes(crew))) throw new InputError('Selecciona únicamente cuadrillas asignadas a este ramal.');
      const editing = request.method === 'PUT';
      const id = editing ? payload.id : crypto.randomUUID();
      if (typeof id !== 'string' || id.length !== 36) throw new InputError('El levantamiento no es válido.');
      const index = state.levantamientos.findIndex(item => item.id === id);
      if (editing && index < 0) return result({ error: 'El levantamiento ya no existe.' }, 404);
      const stored: StoredLevantamiento = {
        id,
        ...record,
        cuadrillas: record.cuadrillasSeleccionadas.length,
        createdAt: editing ? state.levantamientos[index].createdAt : new Date().toISOString(),
      };
      if (editing) state.levantamientos[index] = stored;
      else state.levantamientos.push(stored);
      await writeState(state);
      return result({ ...stored, ramal: ramal.nombre, subestacion: ramal.subestacion }, editing ? 200 : 201);
    }
    return result({ error: 'Método no permitido.' }, 405);
  } catch (error) {
    return failure(error);
  }
}

export const config: Config = { path: '/api/levantamientos' };
