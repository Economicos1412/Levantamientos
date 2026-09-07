import type { Config } from '@netlify/functions';
import { body, failure, result } from '@/lib/api-server';
import { InputError, validateRamal } from '@/lib/records';
import { createRamal, deleteRamal, getRamal, listLevantamientos, listRamales, updateRamal, type StoredRamal } from '../lib/data';

export default async function handler(request: Request) {
  try {
    if (request.method === 'GET') return result(await listRamales());
    if (request.method === 'POST' || request.method === 'PUT') {
      const payload = await body(request);
      const ramal = validateRamal(payload);
      const editing = request.method === 'PUT';
      const id = editing ? payload.id : crypto.randomUUID();
      if (typeof id !== 'string' || id.length !== 36) throw new InputError('El ramal no es válido.');
      const current = editing ? await getRamal(id) : null;
      if (editing && !current) return result({ error: 'El ramal ya no existe.' }, 404);
      const duplicate = (await listRamales()).find(item => item.id !== id && item.nombre.localeCompare(ramal.nombre, 'es', { sensitivity: 'base' }) === 0);
      if (duplicate) return result({ error: 'Ya existe un ramal con ese nombre.' }, 409);
      if (editing) {
        const usedCircuits = new Set((await listLevantamientos(id)).map(item => item.circuito));
        if ([...usedCircuits].some(circuit => !ramal.circuitos.includes(circuit))) throw new InputError('No puedes retirar un circuito con levantamientos. Primero cambia el circuito de esos registros.');
      }
      const stored: StoredRamal = { id, ...ramal, cuadrillas: ramal.cuadrillasSeleccionadas.length, createdAt: current?.createdAt || new Date().toISOString() };
      const saved = editing ? await updateRamal(stored) : await createRamal(stored);
      if (!saved) return result({ error: 'El ramal ya no existe.' }, 404);
      return result(saved, editing ? 200 : 201);
    }
    if (request.method === 'DELETE') {
      const id = new URL(request.url).searchParams.get('id');
      if (!id || !/^[0-9a-f-]{36}$/i.test(id)) throw new InputError('El ramal no es válido.');
      const current = await getRamal(id);
      if (!current) return result({ error: 'El ramal ya no existe.' }, 404);
      const linked = (await listLevantamientos(id)).length;
      if (linked) return result({ error: `No se puede quitar ${current.nombre} porque tiene ${linked} levantamiento${linked === 1 ? '' : 's'} asociado${linked === 1 ? '' : 's'}.` }, 409);
      await deleteRamal(id);
      return result({ id: current.id, nombre: current.nombre });
    }
    return result({ error: 'Método no permitido.' }, 405);
  } catch (error) { return failure(error); }
}
export const config: Config = { path: '/api/ramales' };
