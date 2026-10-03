# Proposal

## Why

Todo lo que Riders hace ocurre sobre un mapa: armar un Roadmap, convocar un Trip, ver dónde están los compañeros. Antes de construir cualquiera de esas funciones, la app necesita existir como PWA (Progressive Web App) instalable en el celular y mostrar un mapa que funcione con y sin conexión, con los proveedores de mapa aislados detrás de una interfaz propia para que el resto de la aplicación nunca dependa de un proveedor concreto. Este change es la base sobre la que se apoyan todos los demás.

## What Changes

- Se crea la aplicación como PWA instalable desde el navegador, con su interfaz disponible sin conexión una vez instalada y con soporte multilenguaje desde el primer día (español de Argentina como idioma inicial).
- Se incorpora un mapa base con datos de OpenStreetMap que muestra la posición actual del Rider.
- Se incorpora la descarga de zonas del mapa al celular para verlas sin conexión, con gestión de lo descargado (ver, borrar, saber cuánto ocupa).
- Se define la interfaz interna que encapsula a los proveedores de mapa (teselas con conexión y archivo para uso sin conexión), de modo que los próximos changes la usen sin conocer qué proveedor hay detrás.

Fuera de alcance de este change:
- Cuentas de Rider, Vehicles, Roadmaps y Trips.
- Cálculo de rutas y búsqueda de Points por nombre o tipo (entran con `roadmap-planning`).
- Posición de otros Riders, indicador de antigüedad del dato y pantalla siempre encendida (entran con `trip-tracking`).
- Información del clima.
- Cualquier componente de backend: este change es solo la app en el celular y archivos estáticos.

## Capabilities

### New Capabilities
- `app-shell`: la aplicación como PWA: instalación en la pantalla de inicio, arranque sin conexión, indicación del estado de conectividad e idioma de la interfaz.
- `map-view`: mapa base navegable con la posición actual del Rider y la atribución de las fuentes de datos.
- `offline-maps`: descarga de zonas del mapa al celular, visualización sin conexión y gestión de las zonas descargadas.

### Modified Capabilities
Ninguna: el proyecto no tiene specs vigentes todavía.

## Impact

- Código: repositorio nuevo de la app. Se crea el módulo `map-platform`, único lugar que conoce a los proveedores de mapa; el resto de la app consume su interfaz.
- Dependencias externas nuevas: framework de interfaz, renderizador de mapas vectoriales, lector del formato de archivo de teselas, herramienta de construcción de la PWA, biblioteca de internacionalización. Cada una se justifica en `design.md`.
- Servicios externos: un proveedor de teselas sin costo y un archivo regional de teselas alojado en almacenamiento estático sin costo; hosting estático para la PWA.
- Datos: no hay datos de usuarios en este change. Lo único que se guarda en el celular son las zonas de mapa descargadas y la preferencia de idioma.
- Specs: se crean las tres capabilities nuevas; ninguna existente se modifica.
