# Mapa de capabilities — Riders (nombre provisorio)

Este documento define los dominios funcionales de la app y sus límites. No contiene
requisitos: esos entran como deltas `ADDED` en los changes de `openspec/changes/` y,
al archivarlos, pasan a `openspec/specs/<capability>/spec.md`. El contexto general
(glosario, plataforma, principios) vive en `openspec/config.yaml`.

Las entidades del dominio son Rider, Vehicle, Point, Roadmap y Trip; `admin` es un rol
dentro de un Trip. No existe una entidad "grupo".

## Capabilities

### `app-shell`
La aplicación como PWA en el celular.
- **Cubre:** instalación en la pantalla de inicio (iOS y Android), arranque sin conexión, indicador de conectividad y de acciones no disponibles, idioma de la interfaz (español de Argentina inicial, cambio de idioma).
- **No cubre:** nada relativo al mapa ni al dominio.
- **Depende de:** nada.

### `map-view`
El mapa base sobre el que se construye todo lo demás.
- **Cubre:** mapa navegable con datos de OpenStreetMap, posición actual del Rider con sus estados de permiso, acción de centrar, atribución de fuentes.
- **No cubre:** descarga de zonas (ver `offline-maps`), rutas, posiciones de otros Riders.
- **Depende de:** `app-shell`.

### `rider-account`
Cuenta e identidad del Rider.
- **Cubre:** registro e inicio de sesión, perfil, avatar, idioma preferido.
- **No cubre:** vehículos (ver `rider-vehicles`), nada relativo a Trips.
- **Depende de:** nada.

### `rider-vehicles`
Las motos de un Rider y su autonomía.
- **Cubre:** alta y edición de Vehicles; autonomía en km; qué Vehicle usa el Rider en un Trip.
- **No cubre:** la validación de autonomía sobre una ruta (ver `roadmap-planning`).
- **Depende de:** `rider-account`.

### `roadmap-planning`
Armado de Roadmaps como plantillas de ruta.
- **Cubre:** elegir Points sobre el mapa (buscar por nombre o por tipo: estación de servicio, alojamiento, restaurante, punto de interés); ordenarlos; calcular la ruta entre Points consecutivos con conectividad y guardarla con el Roadmap; distancia por tramo; aviso cuando un tramo supera la autonomía de algún Vehicle de referencia; visibilidad del Roadmap (autor y miembros de los Trips que lo usan).
- **No cubre:** fechas, participantes, posiciones; el dibujo del mapa en sí (lo provee el proveedor de mapas).
- **Depende de:** `rider-account`; usa `rider-vehicles` para la validación de autonomía.

### `trip-management`
Convocatoria y administración de un Trip.
- **Cubre:** crear un Trip a partir de un Roadmap (copia que desde entonces puede divergir); fecha, hora de salida y hora de llegada; rol admin (el creador lo es; puede nombrar otros admins); invitar Riders; aceptar o rechazar invitaciones; abandonar un Trip; privacidad: solo los miembros acceden a la información del Trip.
- **No cubre:** posiciones en vivo (ver `trip-tracking`), clima (ver `trip-weather`).
- **Depende de:** `rider-account`, `roadmap-planning`.

### `trip-tracking`
Posición de los miembros durante el Trip.
- **Cubre:** envío de la propia posición mientras la app está en primer plano; avatar de cada miembro sobre el mapa; indicador de antigüedad del dato en cada avatar, con y sin conectividad; sin conectividad, última posición conocida de cada compañero y la propia posición por GPS sobre la ruta planificada; mantener la pantalla encendida durante el Trip.
- **No cubre:** recálculo de ruta ante un desvío; descarga del mapa (ver `offline-maps`).
- **Depende de:** `trip-management`, `offline-maps`.

### `trip-weather`
Clima sobre la ruta del Trip.
- **Cubre:** viento y lluvia previstos a lo largo de la ruta para la fecha y hora del Trip; actualización durante el Trip con conectividad; indicación de la antigüedad del pronóstico cuando no hay conectividad.
- **No cubre:** alertas meteorológicas oficiales, decisiones automáticas sobre la ruta.
- **Depende de:** `trip-management`.

### `offline-maps`
Mapa disponible sin conexión.
- **Cubre:** descargar al celular una zona del mapa (con sus Points) con tamaño estimado y progreso; verla sin conexión con el mismo detalle; listar, borrar y conocer el espacio ocupado; conservar las descargas en el tiempo. `trip-management` lo extiende después con "descargar la zona del Trip".
- **No cubre:** rutas ni posiciones (son datos de la app, no del mapa).
- **Depende de:** `map-view`.

## Restricciones transversales (no son capabilities)

Se cumplen en todos los specs; están en `openspec/config.yaml`:
- Multilenguaje: ningún texto visible al usuario fijo en el código; español (Argentina) como idioma inicial.
- Degradación controlada sin conectividad: cada capability que depende de red describe su comportamiento offline.
- Consumo de batería y de datos móviles como restricción de diseño de primer orden.
- No reimplementar lo que los proveedores de mapas ya ofrecen; priorizar proveedores sin costo.

## Orden propuesto de changes

1. `map-platform-foundation`: crea la PWA y encapsula los proveedores de mapa detrás de una interfaz propia. Introduce `app-shell`, `map-view` y `offline-maps`. Es el change del que dependen todos los demás. El ruteo y la búsqueda de Points se deciden en `roadmap-planning`, cuando hay un requisito que los usa.
2. `rider-onboarding`: `rider-account` y `rider-vehicles`.
3. `roadmap-planning`: la capability homónima.
4. `trip-convening`: `trip-management`.
5. `trip-live-tracking`: `trip-tracking`.
6. `trip-weather-forecast`: `trip-weather`.
