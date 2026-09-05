import { database } from '@/db/raw';
import { validateRecord, InputError, parseCrewSelection } from '@/lib/records';
import { result, failure, body } from '@/lib/api-server';
export async function GET(request: Request) {
  try {
    const ramalId = new URL(request.url).searchParams.get('ramal');
    let q = database().prepare(`SELECT l.id, l.ramal_id AS ramalId, l.circuito, l.ubicacion, l.latitud, l.longitud, l.podas, l.cuadrillas, l.cuadrillas_detalle AS cuadrillasDetalle, l.fecha, r.nombre AS ramal, r.subestacion FROM levantamientos l JOIN ramales r ON r.id = l.ramal_id ${ramalId ? 'WHERE l.ramal_id = ?' : ''} ORDER BY l.fecha DESC, l.created_at DESC`);
    if (ramalId) q = q.bind(ramalId);
    const { results } = await q.all();
    return result(results.map(({ cuadrillasDetalle, ...record }) => ({ ...record, cuadrillasSeleccionadas: parseCrewSelection(cuadrillasDetalle) })));
  } catch (e) { return failure(e); }
}
async function save(request: Request, edit: boolean) {
  try {
    const payload = await body(request);
    const r = validateRecord(payload);
    const db = database();
    const ramal = await db.prepare('SELECT nombre, subestacion, circuitos, cuadrillas_detalle AS cuadrillasDetalle FROM ramales WHERE id = ?').bind(r.ramalId).first<{ nombre: string; subestacion: string; circuitos: string; cuadrillasDetalle: string | null }>();
    if (!ramal) throw new InputError('Selecciona un ramal del catálogo.');
    if (!(JSON.parse(ramal.circuitos) as string[]).includes(r.circuito)) throw new InputError('El circuito no pertenece al ramal seleccionado.');
    const assignedCrews = parseCrewSelection(ramal.cuadrillasDetalle);
    if (!assignedCrews.length) throw new InputError('Primero edita el ramal y asígnale sus cuadrillas.');
    if (r.cuadrillasSeleccionadas.some(crew => !assignedCrews.includes(crew))) throw new InputError('Selecciona únicamente cuadrillas asignadas a este ramal.');
    const id = edit ? payload.id : crypto.randomUUID();
    if (typeof id !== 'string' || id.length !== 36) throw new InputError('El levantamiento no es válido.');
    const values = [r.ramalId, r.circuito, r.ubicacion, r.latitud, r.longitud, r.podas, r.cuadrillasSeleccionadas.length, JSON.stringify(r.cuadrillasSeleccionadas), r.fecha];
    if (edit) {
      const response = await db.prepare('UPDATE levantamientos SET ramal_id = ?, circuito = ?, ubicacion = ?, latitud = ?, longitud = ?, podas = ?, cuadrillas = ?, cuadrillas_detalle = ?, fecha = ? WHERE id = ?').bind(...values, id).run();
      if (!response.meta.changes) return result({ error: 'El levantamiento ya no existe.' }, 404);
    } else {
      await db.prepare('INSERT INTO levantamientos (ramal_id, circuito, ubicacion, latitud, longitud, podas, cuadrillas, cuadrillas_detalle, fecha, id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(...values, id, new Date().toISOString()).run();
    }
    return result({ id, ...r, cuadrillas: r.cuadrillasSeleccionadas.length, ramal: ramal.nombre, subestacion: ramal.subestacion }, edit ? 200 : 201);
  } catch (e) { return failure(e); }
}
export async function POST(request: Request) { return save(request, false); }
export async function PUT(request: Request) { return save(request, true); }
