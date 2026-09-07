import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const ramales = sqliteTable('ramales', {
  id: text('id').primaryKey(),
  nombre: text('nombre').notNull(),
  nombreKey: text('nombre_key').notNull(),
  subestacion: text('subestacion').notNull(),
  circuitos: text('circuitos').notNull(),
  cuadrillas: integer('cuadrillas'),
  cuadrillasDetalle: text('cuadrillas_detalle'),
  ubicacion: text('ubicacion'),
  latitud: real('latitud'),
  longitud: real('longitud'),
  createdAt: text('created_at').notNull(),
}, (t) => [uniqueIndex('idx_ramales_nombre_key').on(t.nombreKey)]);

export const levantamientos = sqliteTable('levantamientos', {
  id: text('id').primaryKey(),
  ramalId: text('ramal_id').notNull().references(() => ramales.id),
  circuito: text('circuito').notNull(),
  ubicacion: text('ubicacion').notNull(),
  latitud: real('latitud').notNull(),
  longitud: real('longitud').notNull(),
  podas: integer('podas').notNull(),
  cuadrillas: integer('cuadrillas').notNull(),
  cuadrillasDetalle: text('cuadrillas_detalle'),
  fecha: text('fecha').notNull(),
  createdAt: text('created_at').notNull(),
}, (t) => [index('idx_levantamientos_ramal_fecha').on(t.ramalId, t.fecha)]);

export const rutas = sqliteTable('rutas', {
  id: text('id').primaryKey(),
  ramalId: text('ramal_id').notNull().references(() => ramales.id, { onDelete: 'cascade' }),
  origenLatitud: real('origen_latitud').notNull(),
  origenLongitud: real('origen_longitud').notNull(),
  destinoLatitud: real('destino_latitud').notNull(),
  destinoLongitud: real('destino_longitud').notNull(),
  createdAt: text('created_at').notNull(),
}, (t) => [index('idx_rutas_ramal_created').on(t.ramalId, t.createdAt)]);
