# Levantamientos

Aplicación en español para registrar trabajo de campo y consultarlo por ramal. Está disponible para uso local y en el sitio público https://levantamient.netlify.app/. Abrir localmente con `Abrir Levantamientos.cmd`; consultar `LEEME.txt`.

- Catálogo editable de ramales, subestaciones y circuitos, con selección de cuadrillas, ubicación y coordenadas por ramal.
- Captura y edición de ubicación, fecha, coordenadas, podas y cuadrillas participantes.
- Filtro por ramal que actualiza los registros y el mapa.
- Geolocalización mediante permiso del dispositivo, coordenadas manuales o selección de un punto en el mapa.
- Seguimiento en vivo de la ubicación del usuario en el mapa principal mientras la página permanece abierta.
- Persistencia en SQLite mediante D1 local, en `.wrangler/state`. El servidor escucha únicamente en `127.0.0.1` y se abre en `http://localhost:4178/`.

## Desarrollo

Instalar con `npm ci` y ejecutar `npm run dev`. La base local usa la vinculación D1 `DB` configurada en `vite.config.ts`. Generar cambios de esquema con `npm run db:generate`; aplicar las migraciones a la base local antes de usar los registros. Sites aplica las migraciones guardadas al publicar.

Compilar con `npm run build`. Validar tipos con `npx tsc --noEmit`.

La salida para Netlify se compila con `npm run build:netlify`. Usa Netlify Functions para las rutas `/api/ramales` y `/api/levantamientos`, y Supabase PostgreSQL para conservar los registros entre publicaciones. Ejecuta `supabase/schema.sql` una vez en el SQL Editor de Supabase y configura `SUPABASE_URL` y `SUPABASE_SECRET_KEY` como variables protegidas de Netlify.

## Datos y mapa

No se incluyen registros de ejemplo. Cada ramal tiene una subestación y uno o varios circuitos; cada levantamiento pertenece a un circuito de ese ramal. No se puede retirar del catálogo un circuito que todavía tenga levantamientos asociados.

Las cuadrillas se identifican por clave: Q52 a Q58 pertenecen al área urbana y Q62 a Q68 al área rural. Cada ramal define sus cuadrillas asignadas y cada levantamiento permite elegir entre ellas. El mapa muestra puntos de levantamiento, no el trazado de las líneas eléctricas. Usa Leaflet y las teselas estándar de OpenStreetMap con atribución visible. Requiere conexión para cargar las teselas; no descarga mapas para uso fuera de línea. La geolocalización requiere HTTPS y autorización del navegador, y siempre admite captura manual.

Los datos locales y los datos de Supabase son independientes. La publicación en línea comienza vacía para no transferir registros locales sin una migración solicitada.

## Validación

Se comprobaron mediante HTTP local la creación y lectura de ramales y levantamientos con cuadrillas identificadas, el cálculo de su cantidad y el rechazo de una cuadrilla no asignada al ramal. Los registros de prueba se retiraron de la base local. El filtro usa el índice compuesto por ramal y fecha.

Se revisó visualmente en el navegador local el selector agrupado por área. No se autorizó el permiso GPS durante la prueba. La integración WebMCP expone las mismas claves válidas y reutiliza las validaciones y persistencia de la interfaz.
