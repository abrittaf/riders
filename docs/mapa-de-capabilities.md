# Mapa de capabilities — Riders (nombre provisorio)

Este documento define los dominios funcionales de la app y sus límites. No contiene
requisitos: esos entran como deltas `ADDED` en los changes de `openspec/changes/` y,
al archivarlos, pasan a `openspec/specs/<capability>/spec.md`. El contexto general
(glosario, plataforma, principios) vive en `openspec/config.yaml`.

Las entidades del dominio son Rider, Vehicle, Point y Roadmap; `admin` es un rol
dentro de un Roadmap. No existe una entidad "grupo" ni una plantilla separada del
viaje: el Roadmap es el viaje, desde que se planifica hasta que se realiza, y un
Roadmap pasado se duplica para repetirlo.

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
- **Cubre:** ingreso con cuenta de Google, perfil con nombre visible (apodo) y avatar armado por el Rider a partir del sistema de avatares de Riders, visibilidad del perfil ante otros Riders, cierre de sesión, eliminación de cuenta, perfil sin conexión.
- **No cubre:** la moto (ver `rider-vehicles`), el idioma de la interfaz (lo cubre `app-shell`), nada relativo a Roadmaps.
- **Depende de:** nada.

### `rider-vehicles`
La moto del Rider y su autonomía.
- **Cubre:** la única moto del Rider: marca/modelo y autonomía como entero de km por tanque; carga al completar el perfil y edición posterior.
- **No cubre:** las paradas de carga sobre una ruta (ver `roadmap-fuel-stops`).
- **Depende de:** `rider-account`.

### `point-lookup`
Cómo un Rider encuentra y elige un Point.
- **Cubre:** búsqueda de lugares por nombre; lugares por tipo dentro de la vista del mapa (también sin conexión en zonas descargadas); posición elegida con toque sostenido, con nombre propuesto; nombres en español o en idioma de origen; datos de un Point (nombre, posición, origen, tipo, fecha asociada opcional).
- **No cubre:** qué se hace con el Point una vez elegido (ver `roadmap-planning`); Point desde un enlace compartido de Google Maps (fuera de alcance mientras no haya dónde resolver la redirección fuera del navegador).
- **Depende de:** `map-view`.

### `roadmap-planning`
Armado del Roadmap en su estado de planificación.
- **Cubre:** crear un Roadmap con nombre, descripción y una secuencia ordenada de Points, cada uno con fecha asociada opcional; calcular la ruta entre Points consecutivos con conectividad (asfalto siempre que exista; sin pavimentar solo para llegar a un Point sin otro acceso) y guardarla con distancia, tiempo y superficie por tramo, dibujada con la convención de OpenStreetMap (continua, discontinua, punteada, punto y raya para sin dato); kilómetros aproximados; insertar, reordenar y quitar Points; lista, detalle sobre el mapa, edición y borrado; duplicar un Roadmap como base de otro; consulta sin conexión; atribución del motor de ruteo. En este estado lo ve solo su autor.
- **No cubre:** paradas de carga (ver `roadmap-fuel-stops`); fechas y horarios del viaje, invitaciones y miembros (ver `roadmap-convening`); recálculo sin conexión.
- **Depende de:** `rider-account`, `point-lookup`, `map-view`.

### `roadmap-fuel-stops`
Paradas de carga de combustible de un Roadmap.
- **Cubre:** calcular, a partir de la menor autonomía entre las motos de los miembros (la del autor mientras no haya otros), dónde hace falta cargar antes de agotarla, con un margen de seguridad; proponer la estación de servicio más cercana a la ruta en cada caso e insertarla como Point editable; avisar cuando no hay estación dentro de la autonomía; recalcular cuando cambian los Points o la menor autonomía.
- **No cubre:** la ruta en sí (ver `roadmap-planning`); quiénes son los miembros (ver `roadmap-convening`).
- **Depende de:** `roadmap-planning`, `rider-vehicles`.

### `roadmap-convening`
Convocatoria y administración de un Roadmap.
- **Cubre:** fechas, hora de salida y hora de llegada; rol admin (el autor lo es; puede nombrar otros admins); invitar Riders; aceptar o rechazar invitaciones; abandonar un Roadmap; privacidad: solo los miembros acceden a la información del Roadmap; descarga de la zona del Roadmap para uso sin conexión.
- **No cubre:** posiciones en vivo (ver `roadmap-tracking`), clima (ver `roadmap-weather`).
- **Depende de:** `rider-account`, `roadmap-planning`, `offline-maps`.

### `roadmap-tracking`
Posición de los miembros durante el Roadmap en curso.
- **Cubre:** envío de la propia posición mientras la app está en primer plano; avatar de cada miembro sobre el mapa; indicador de antigüedad del dato en cada avatar, con y sin conectividad; sin conectividad, última posición conocida de cada compañero y la propia posición por GPS sobre la ruta planificada; mantener la pantalla encendida durante el viaje.
- **No cubre:** recálculo de ruta ante un desvío; descarga del mapa (ver `offline-maps`).
- **Depende de:** `roadmap-convening`, `offline-maps`.

### `roadmap-weather`
Clima sobre la ruta del Roadmap.
- **Cubre:** viento y lluvia previstos a lo largo de la ruta para las fechas y horas del Roadmap; actualización durante el viaje con conectividad; indicación de la antigüedad del pronóstico cuando no hay conectividad.
- **No cubre:** alertas meteorológicas oficiales, decisiones automáticas sobre la ruta.
- **Depende de:** `roadmap-convening`.

### `offline-maps`
Mapa disponible sin conexión.
- **Cubre:** descargar al celular una zona del mapa (con sus lugares) con tamaño estimado y progreso; verla sin conexión con el mismo detalle; listar, borrar y conocer el espacio ocupado; conservar las descargas en el tiempo. `roadmap-convening` lo extiende después con "descargar la zona del Roadmap".
- **No cubre:** rutas ni posiciones (son datos de la app, no del mapa).
- **Depende de:** `map-view`.

## Restricciones transversales (no son capabilities)

Se cumplen en todos los specs; están en `openspec/config.yaml`:
- Multilenguaje: ningún texto visible al usuario fijo en el código; español (Argentina) como idioma inicial; nombres de lugares en español o en idioma de origen.
- Degradación controlada sin conectividad: cada capability que depende de red describe su comportamiento offline.
- Consumo de batería y de datos móviles como restricción de diseño de primer orden.
- No reimplementar lo que los proveedores de mapas ya ofrecen; priorizar proveedores sin costo y sin medio de pago.

## Orden propuesto de changes

1. `map-platform-foundation`: crea la PWA y encapsula los proveedores de mapa detrás de una interfaz propia. Introduce `app-shell`, `map-view` y `offline-maps`. Integrado; archive pendiente de la verificación de persistencia en iPhone.
2. `rider-onboarding`: `rider-account` y `rider-vehicles`. Introduce el backend del proyecto (Firebase, plan sin costo) y mueve el hosting a Firebase Hosting. Integrado; archive pendiente de las verificaciones en iPhone.
3. `roadmap-planning`: `point-lookup` y `roadmap-planning`. Fija el motor de ruteo (Valhalla, perfil de motocicleta) y el buscador de lugares (Photon).
4. `roadmap-fuel-stops`: la capability homónima.
5. `roadmap-convening`: la capability homónima.
6. `roadmap-live-tracking`: `roadmap-tracking`.
7. `roadmap-weather-forecast`: `roadmap-weather`.

Change chico, independiente del orden: `map-attribution-collapse`, que modifica `map-view` para que la atribución se pliegue detrás de un botón "(i)" tras unos segundos, como admiten las guías de la OpenStreetMap Foundation. Requiere que `map-platform-foundation` esté archivado.
