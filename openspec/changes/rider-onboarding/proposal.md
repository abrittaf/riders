# Proposal

## Why

Hasta ahora Riders es una app sin personas: muestra un mapa y guarda zonas, pero no sabe quién la usa. Todo lo que viene después (armar un Roadmap, convocar un Trip, ver a los compañeros en el mapa) necesita que cada Rider exista con un nombre, un avatar que lo identifique sobre el mapa y una moto con su autonomía. Este change crea esa identidad y, con ella, el primer backend del proyecto.

## What Changes

- Un Rider ingresa a la app con su cuenta de Google. La cuenta es opcional para ver el mapa y descargar zonas; es necesaria para todo lo que involucre a otros Riders.
- Al ingresar por primera vez, el Rider completa su perfil antes de seguir: nombre visible (en general un apodo, distinto del nombre de la cuenta de Google), avatar y moto.
- El avatar se arma eligiendo opciones del sistema de avatares de Riders (tipo y color de casco, accesorio de cuello y su color, gafas, barba) y se guarda como esas opciones, no como imagen.
- Cada Rider tiene una moto (Vehicle) con marca/modelo y autonomía en kilómetros por tanque, editable desde su perfil.
- El Rider puede cerrar sesión y eliminar su cuenta con todos sus datos.
- El perfil se puede ver sin conexión y los cambios hechos sin conexión se envían al recuperarla.
- Se incorpora el backend del proyecto (autenticación y base de datos) detrás de una interfaz propia, con el mismo criterio que `map-platform`: ningún otro módulo conoce al proveedor.
- La app pasa a publicarse en el hosting del mismo proveedor del backend, porque el ingreso con Google en una web app instalada en iOS lo requiere (ver `design.md`).

Fuera de alcance de este change:
- Varias motos por Rider (una sola, por ahora).
- Roadmaps, Trips, invitaciones y posiciones de otros Riders.
- Otros métodos de ingreso (correo y contraseña, Apple).
- Validar la autonomía contra una ruta (eso es de `roadmap-planning`).

## Capabilities

### New Capabilities
- `rider-account`: identidad del Rider: ingreso con Google, perfil con nombre visible y avatar, cierre de sesión, eliminación de cuenta, comportamiento sin conexión.
- `rider-vehicles`: la moto del Rider con su marca/modelo y su autonomía en kilómetros.

### Modified Capabilities
Ninguna. `app-shell`, `map-view` y `offline-maps` no cambian sus requisitos; el ingreso se agrega como una acción más de la interfaz existente.

## Impact

- Código: módulos nuevos `rider-account`, `rider-vehicles` y `avatar` en la app; módulo `backend` que encapsula al proveedor de autenticación y base de datos; reglas de seguridad de la base de datos versionadas en el repositorio.
- Dependencias externas nuevas: SDK del proveedor de backend y su emulador local para pruebas. Se justifican en `design.md`.
- Servicios externos: proyecto en el proveedor de backend (plan sin costo y sin medio de pago) con autenticación con Google, base de datos y hosting. La publicación en GitHub Pages se retira.
- Datos: se guardan por primera vez datos de personas: nombre visible, avatar (como opciones), moto y autonomía, asociados a la cuenta de Google del Rider. El correo electrónico no se guarda en la base de datos de la app. El Rider puede eliminar todo.
- Specs: dos capabilities nuevas; ninguna existente se modifica.
