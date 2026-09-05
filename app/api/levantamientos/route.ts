import { database } from '@/db/raw';
import { validateRecord, InputError } from '@/lib/records';
import { result, failure, body } from '@/lib/api-server';
export async function GET(request: Request) {
  try {
    const ramalId = new URL(request.url).searchParams.get('ramal');
    let q = database().prepare(`SELECT l.id, l.ramal_id AS ramalId, l.circuito, l.ubicacion, l.latitud, l.longitud, l.podas, l.cuadrillas, l.fecha, r.nombre AS ramal, r.subestacion FROM levantamientos l JOIN ramales r ON r.id = l.ramal_id ${ramalId ? 'WHERE l.ramal_id = ?' : ''} ORDER BY l.fecha DESC, l.created_at DESC`);
    if (ramalId) q = q.bind(ramalId);
    const { results } = await q.all();
    return result(results);
  } catch (e) { return failure(e); }
}
async function save(request: Request, edit: boolean) {
  try {
    const payload = await body(request);
    const r = validateRecord(payload);
    const db = database();
    const ramal = await db.prepare('SELECT nombre, subestacion, circuitos FROM ramales WHERE id = ?').bind(r.ramalId).first<{ nombre: string; subestacion: string; circuitos: string }>();
    if (!ramal) throw new InputError('Selecciona un ramal del catálogo.');
    if (!(JSON.parse(ramal.circuitos) as string[]).includes(r.circuito)) throw new InputError('El circuito no pertenece al ramal seleccionado.');
    const id = edit ? payload.id : crypto.randomUUID();
    if (typeof id !== 'string' || id.length !== 36) throw new InputError('El levantamiento no es válido.');
    const values = [r.ramalId, r.circuito, r.ubicacion, r.latitud, r.longitud, r.podas, r.cuadrillas, r.fecha];
    if (edit) {
      const response = await db.prepare('UPDATE levantamientos SET ramal_id = ?, circuito = ?, ubicacion = ?, latitud = ?, longitud = ?, podas = ?, cuadrillas = ?, fecha = ? WHERE id = ?').bind(...values, id).run();
      if (!response.meta.changes) return result({ error: 'El levantamiento ya no existe.' }, 404);
    } else {
      await db.prepare('INSERT INTO levantamientos (ramal_id, circuito, ubicacion, latitud, longitud, podas, cuadrillas, fecha, id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(...values, id, new Date().toISOString()).run();
    }
    return result({ id, ...r, ramal: ramal.nombre, subestacion: ramal.subestacion }, edit ? 200 : 201);
  } catch (e) { return failure(e); }
}
export async function POST(request: Request) { return save(request, false); }
export async function PUT(request: Request) { return save(request, true); }
