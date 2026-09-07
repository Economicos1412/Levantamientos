import { database } from '@/db/raw';
import { body, failure, result } from '@/lib/api-server';
import { InputError, validateRoute, type RutaGuardada } from '@/lib/records';

type RouteRow = Omit<RutaGuardada, 'ramalId' | 'origenLatitud' | 'origenLongitud' | 'destinoLatitud' | 'destinoLongitud' | 'createdAt'> & {
  ramalId: string; origenLatitud: number; origenLongitud: number; destinoLatitud: number; destinoLongitud: number; createdAt: string;
};

export async function GET() {
  try {
    const { results } = await database().prepare(`SELECT u.id, u.ramal_id AS ramalId, r.nombre AS ramal, r.subestacion, r.ubicacion,
      u.origen_latitud AS origenLatitud, u.origen_longitud AS origenLongitud,
      u.destino_latitud AS destinoLatitud, u.destino_longitud AS destinoLongitud, u.created_at AS createdAt
      FROM rutas u JOIN ramales r ON r.id = u.ramal_id ORDER BY u.created_at DESC`).all<RouteRow>();
    return result(results);
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    const route = validateRoute(await body(request));
    const ramal = await database().prepare('SELECT nombre, subestacion, ubicacion, latitud, longitud FROM ramales WHERE id = ?').bind(route.ramalId).first<{ nombre: string; subestacion: string; ubicacion: string | null; latitud: number | null; longitud: number | null }>();
    if (!ramal) throw new InputError('Selecciona un ramal del catálogo.');
    if (ramal.latitud === null || ramal.longitud === null) throw new InputError('El ramal no tiene una georreferencia válida.');
    const saved: RutaGuardada = { id: crypto.randomUUID(), ...route, ramal: ramal.nombre, subestacion: ramal.subestacion, ubicacion: ramal.ubicacion || 'Sin referencia', destinoLatitud: ramal.latitud, destinoLongitud: ramal.longitud, createdAt: new Date().toISOString() };
    await database().prepare('INSERT INTO rutas (id, ramal_id, origen_latitud, origen_longitud, destino_latitud, destino_longitud, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(saved.id, saved.ramalId, saved.origenLatitud, saved.origenLongitud, saved.destinoLatitud, saved.destinoLongitud, saved.createdAt).run();
    return result(saved, 201);
  } catch (error) { return failure(error); }
}
