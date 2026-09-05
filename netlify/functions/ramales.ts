import type { Config } from '@netlify/functions';
import { body, failure, result } from '@/lib/api-server';
import { InputError, validateRamal } from '@/lib/records';
import { readState, writeState, type StoredRamal } from '../lib/data';

export default async function handler(request: Request) {
  try {
    const state = await readState();
    if (request.method === 'GET') {
      return result([...state.ramales].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
    }
    if (request.method === 'POST' || request.method === 'PUT') {
      const payload = await body(request);
      const ramal = validateRamal(payload);
      const editing = request.method === 'PUT';
      const id = editing ? payload.id : crypto.randomUUID();
      if (typeof id !== 'string' || id.length !== 36) throw new InputError('El ramal no es válido.');
      const duplicate = state.ramales.find(item => item.id !== id && item.nombre.localeCompare(ramal.nombre, 'es', { sensitivity: 'base' }) === 0);
      if (duplicate) return result({ error: 'Ya existe un ramal con ese nombre.' }, 409);
      const index = state.ramales.findIndex(item => item.id === id);
      if (editing && index < 0) return result({ error: 'El ramal ya no existe.' }, 404);
      if (editing) {
        const usedCircuits = new Set(state.levantamientos.filter(item => item.ramalId === id).map(item => item.circuito));
        if ([...usedCircuits].some(circuit => !ramal.circuitos.includes(circuit))) throw new InputError('No puedes retirar un circuito con levantamientos. Primero cambia el circuito de esos registros.');
      }
      const stored: StoredRamal = {
        id,
        ...ramal,
        cuadrillas: ramal.cuadrillasSeleccionadas.length,
        createdAt: editing ? state.ramales[index].createdAt : new Date().toISOString(),
      };
      if (editing) state.ramales[index] = stored;
      else state.ramales.push(stored);
      await writeState(state);
      return result(stored, editing ? 200 : 201);
    }
    if (request.method === 'DELETE') {
      const id = new URL(request.url).searchParams.get('id');
      if (!id || !/^[0-9a-f-]{36}$/i.test(id)) throw new InputError('El ramal no es válido.');
      const index = state.ramales.findIndex(item => item.id === id);
      if (index < 0) return result({ error: 'El ramal ya no existe.' }, 404);
      const linked = state.levantamientos.filter(item => item.ramalId === id).length;
      if (linked) return result({ error: `No se puede quitar ${state.ramales[index].nombre} porque tiene ${linked} levantamiento${linked === 1 ? '' : 's'} asociado${linked === 1 ? '' : 's'}.` }, 409);
      const [removed] = state.ramales.splice(index, 1);
      await writeState(state);
      return result({ id: removed.id, nombre: removed.nombre });
    }
    return result({ error: 'Método no permitido.' }, 405);
  } catch (error) {
    return failure(error);
  }
}

export const config: Config = { path: '/api/ramales' };
