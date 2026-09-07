import type { Config } from '@netlify/functions';
import { body, failure, result } from '@/lib/api-server';
import { InputError, validateRoute } from '@/lib/records';
import { createRuta, getRamal, listRutas, type StoredRuta } from '../lib/data';

export default async function handler(request: Request) {
  try {
    if (request.method === 'GET') {
      const routes = await listRutas();
      const ramales = new Map<string, Awaited<ReturnType<typeof getRamal>>>();
      for (const route of routes) if (!ramales.has(route.ramalId)) ramales.set(route.ramalId, await getRamal(route.ramalId));
      return result(routes.flatMap(route => {
        const ramal = ramales.get(route.ramalId);
        return ramal ? [{ ...route, ramal: ramal.nombre, subestacion: ramal.subestacion, ubicacion: ramal.ubicacion || 'Sin referencia' }] : [];
      }));
    }
    if (request.method === 'POST') {
      const route = validateRoute(await body(request));
      const ramal = await getRamal(route.ramalId);
      if (!ramal) throw new InputError('Selecciona un ramal del catálogo.');
      if (ramal.latitud === null || ramal.longitud === null) throw new InputError('El ramal no tiene una georreferencia válida.');
      const stored: StoredRuta = { id: crypto.randomUUID(), ...route, destinoLatitud: ramal.latitud, destinoLongitud: ramal.longitud, createdAt: new Date().toISOString() };
      const saved = await createRuta(stored);
      return result({ ...saved, ramal: ramal.nombre, subestacion: ramal.subestacion, ubicacion: ramal.ubicacion || 'Sin referencia' }, 201);
    }
    return result({ error: 'Método no permitido.' }, 405);
  } catch (error) { return failure(error); }
}

export const config: Config = { path: '/api/rutas' };
