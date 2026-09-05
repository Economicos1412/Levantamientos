import { database } from '@/db/raw';
import { validateRamal, InputError, type Ramal } from '@/lib/records';
import { result, failure, body } from '@/lib/api-server';

export async function GET() {
  try {
    const { results } = await database().prepare('SELECT id, nombre, subestacion, circuitos, cuadrillas, ubicacion, latitud, longitud FROM ramales ORDER BY nombre COLLATE NOCASE').all<Omit<Ramal, 'circuitos'> & { circuitos: string }>();
    return result(results.map(r => ({ ...r, circuitos: JSON.parse(r.circuitos) })));
  } catch (e) { return failure(e); }
}
async function save(request: Request, edit: boolean) {
  try {
    const payload = await body(request);
    const r = validateRamal(payload);
    const db = database();
    const id = edit ? payload.id : crypto.randomUUID();
    if (typeof id !== 'string' || id.length !== 36) throw new InputError('El ramal no es válido.');
    if (edit) {
      const existing = await db.prepare('SELECT id FROM ramales WHERE id = ?').bind(id).first();
      if (!existing) return result({ error: 'El ramal ya no existe.' }, 404);
      const used = await db.prepare('SELECT DISTINCT circuito FROM levantamientos WHERE ramal_id = ?').bind(id).all<{ circuito: string }>();
      if (used.results.some(c => !r.circuitos.includes(c.circuito))) throw new InputError('No puedes retirar un circuito con levantamientos. Primero cambia el circuito de esos registros.');
      await db.prepare('UPDATE ramales SET nombre = ?, nombre_key = ?, subestacion = ?, circuitos = ?, cuadrillas = ?, ubicacion = ?, latitud = ?, longitud = ? WHERE id = ?').bind(r.nombre, r.nombre.toLocaleLowerCase('es'), r.subestacion, JSON.stringify(r.circuitos), r.cuadrillas, r.ubicacion, r.latitud, r.longitud, id).run();
    } else {
      await db.prepare('INSERT INTO ramales (id, nombre, nombre_key, subestacion, circuitos, cuadrillas, ubicacion, latitud, longitud, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(id, r.nombre, r.nombre.toLocaleLowerCase('es'), r.subestacion, JSON.stringify(r.circuitos), r.cuadrillas, r.ubicacion, r.latitud, r.longitud, new Date().toISOString()).run();
    }
    return result({ id, ...r }, edit ? 200 : 201);
  } catch (e) { return failure(e); }
}
export async function POST(request: Request) { return save(request, false); }
export async function PUT(request: Request) { return save(request, true); }
