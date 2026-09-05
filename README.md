# Levantamientos

Aplicación en español para registrar trabajo de campo y consultarlo por ramal.

- Catálogo editable de ramales, subestaciones y circuitos.
- Captura y edición de ubicación, fecha, coordenadas, podas y número de cuadrillas.
- Filtro por ramal que actualiza los registros y el mapa.
- Geolocalización mediante permiso del dispositivo, coordenadas manuales o selección de un punto en el mapa.
- Persistencia en D1. El acceso inicial de Sites es privado para su propietario.

## Desarrollo

Instalar con `npm ci` y ejecutar `npm run dev`. La base local usa la vinculación D1 `DB` configurada en `vite.config.ts`. Generar cambios de esquema con `npm run db:generate`; aplicar las migraciones a la base local antes de usar los registros. Sites aplica las migraciones guardadas al publicar.

Compilar con `npm run build`. Validar tipos con `npx tsc --noEmit`.

## Datos y mapa

No se incluyen registros de ejemplo. Cada ramal tiene una subestación y uno o varios circuitos; cada levantamiento pertenece a un circuito de ese ramal. No se puede retirar del catálogo un circuito que todavía tenga levantamientos asociados.

Las cuadrillas representan cantidades por levantamiento. Su suma no identifica cuadrillas únicas. El mapa muestra puntos de levantamiento, no el trazado de las líneas eléctricas. Usa Leaflet y las teselas estándar de OpenStreetMap con atribución visible. Requiere conexión para cargar las teselas; no descarga mapas para uso fuera de línea. La geolocalización requiere HTTPS y autorización del navegador, y siempre admite captura manual.

## Validación

Se comprobaron mediante HTTP local la creación, lectura, edición, filtrado entre dos ramales, persistencia por lectura posterior, cero como coordenada/cantidad válida, nombre duplicado, circuitos duplicados, asociación de circuito, protección de circuitos usados, coordenadas fuera de rango, fecha imposible, cantidades negativas o fraccionarias y registro inexistente. Los registros de prueba se retiraron de la base local. El filtro usa el índice compuesto por ramal y fecha.

No se realizaron pruebas visuales ni de permisos GPS en un navegador. La integración WebMCP es opcional y no pudo validarse en un contexto compatible; no afecta al uso manual de la aplicación. Los controles expuestos reutilizan las mismas validaciones y persistencia que la interfaz.
