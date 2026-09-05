import { InputError } from './records';
export function result(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
}
export async function body(request: Request) {
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) throw new InputError('La solicitud no pertenece a esta aplicación.');
  const value = await request.text();
  if (value.length > 32000) throw new InputError('El registro es demasiado grande.');
  try { return JSON.parse(value); } catch { throw new InputError('Los datos enviados no son válidos.'); }
}
export function failure(error: unknown) {
  if (error instanceof InputError) return result({ error: error.message }, 400);
  if (error instanceof Error && error.message.includes('UNIQUE constraint')) return result({ error: 'Ya existe un ramal con ese nombre.' }, 409);
  console.error('Error al guardar o consultar registros:', error);
  return result({ error: 'No se pudo completar la operación. Intenta de nuevo.' }, 500);
}
