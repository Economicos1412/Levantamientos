create extension if not exists pgcrypto;

create table if not exists public.ramales (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  subestacion text not null,
  circuitos text[] not null check (cardinality(circuitos) > 0),
  cuadrillas_seleccionadas text[] not null check (cardinality(cuadrillas_seleccionadas) > 0),
  ubicacion text not null,
  latitud double precision not null check (latitud between -90 and 90),
  longitud double precision not null check (longitud between -180 and 180),
  created_at timestamptz not null default now()
);

create unique index if not exists ramales_nombre_unico on public.ramales (lower(btrim(nombre)));

create table if not exists public.levantamientos (
  id uuid primary key default gen_random_uuid(),
  ramal_id uuid not null references public.ramales(id) on delete restrict,
  circuito text not null,
  ubicacion text not null,
  latitud double precision not null check (latitud between -90 and 90),
  longitud double precision not null check (longitud between -180 and 180),
  podas integer not null check (podas between 0 and 1000000),
  cuadrillas_seleccionadas text[] not null check (cardinality(cuadrillas_seleccionadas) > 0),
  fecha date not null,
  created_at timestamptz not null default now()
);

create index if not exists levantamientos_ramal_fecha on public.levantamientos (ramal_id, fecha desc, created_at desc);

create table if not exists public.rutas (
  id uuid primary key default gen_random_uuid(),
  ramal_id uuid not null references public.ramales(id) on delete cascade,
  origen_latitud double precision not null check (origen_latitud between -90 and 90),
  origen_longitud double precision not null check (origen_longitud between -180 and 180),
  destino_latitud double precision not null check (destino_latitud between -90 and 90),
  destino_longitud double precision not null check (destino_longitud between -180 and 180),
  created_at timestamptz not null default now()
);

create index if not exists rutas_ramal_created on public.rutas (ramal_id, created_at desc);

alter table public.ramales enable row level security;
alter table public.levantamientos enable row level security;
alter table public.rutas enable row level security;
revoke all on public.ramales from anon, authenticated;
revoke all on public.levantamientos from anon, authenticated;
revoke all on public.rutas from anon, authenticated;
grant select, insert, update, delete on public.ramales to service_role;
grant select, insert, update, delete on public.levantamientos to service_role;
grant select, insert, update, delete on public.rutas to service_role;
