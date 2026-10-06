# Proposal

## Why

Un viaje en moto empieza mucho antes de arrancar: alguien dice "quiero ir a Córdoba y hacer noche en La Boulaye". Hoy Riders tiene mapa, zonas sin conexión y Riders con cuenta y moto, pero ningún lugar donde dejar escrito un viaje. Este change crea el Roadmap en su estado de planificación: una secuencia de Points con el camino calculado entre ellos, la distancia, el tiempo y la superficie de cada tramo, y los kilómetros aproximados del viaje. Sobre esto se apoyan las paradas de carga (`roadmap-fuel-stops`), la convocatoria (`roadmap-convening`) y el seguimiento en vivo (`roadmap-tracking`).

## What Changes

- El Rider identificado crea Roadmaps: nombre, descripción y una secuencia ordenada de dos o más Points, cada uno con una fecha asociada opcional (por ejemplo, la noche en La Boulaye).
- Los Points se eligen de tres formas: buscando un lugar por nombre, eligiendo un lugar por tipo entre los visibles en el mapa (estación de servicio, alojamiento, restaurante, punto de interés), o tocando cualquier posición del mapa. Los nombres de lugares se muestran en español cuando el dato existe y en su idioma de origen si no.
- La ruta entre Points consecutivos se calcula con conectividad, con un motor de ruteo basado en OpenStreetMap y perfil de motocicleta, y se guarda con el Roadmap: geometría, distancia, tiempo estimado y superficie por tramo, y totales. Política de superficie fija, sin opciones: asfalto siempre que exista; caminos sin pavimentar únicamente para llegar a un Point que no tiene otro acceso.
- Cada tramo se dibuja sobre el mapa según su superficie, con la convención del mapa oficial de OpenStreetMap: continua para pavimento, discontinua para consolidado (ripio, grava compactada), punteada para suelto (tierra, arena, huella), punto y raya cuando no hay dato. La lista de tramos informa los kilómetros sin pavimentar.
- Reordenar, insertar o quitar Points recalcula la ruta.
- El Rider ve sus Roadmaps en una lista, los abre sobre el mapa, los edita, los borra y los duplica como base de un Roadmap nuevo. Sin conexión puede verlos (con la ruta dibujada sobre las zonas descargadas) pero no crearlos ni editarlos.
- En planificación, un Roadmap lo ve solo su autor; la visibilidad para los miembros llega con `roadmap-convening`.
- El módulo `map-platform` incorpora dos proveedores nuevos detrás de su interfaz: cálculo de rutas y búsqueda de lugares.

Fuera de alcance de este change:
- Paradas de carga de combustible por autonomía: `roadmap-fuel-stops`, el change inmediato siguiente.
- Fechas y horarios del viaje, invitaciones y miembros: `roadmap-convening`. Las fechas de este change son las asociadas a Points individuales.
- Point a partir de un enlace compartido desde Google Maps: el enlace corto que comparte el celular no trae la ubicación hasta seguir su redirección, y eso no es posible desde el navegador; se retoma cuando el proyecto tenga dónde resolverlo fuera del celular.
- Compartir un Roadmap con otro Rider que no sea miembro.
- Recálculo de ruta sin conexión.

## Capabilities

### New Capabilities
- `point-lookup`: cómo un Rider encuentra y elige un Point: búsqueda por nombre, lugares por tipo en la vista del mapa, posición tocada en el mapa; nombres en español o en idioma de origen; datos de un Point.
- `roadmap-planning`: creación, cálculo de ruta con superficie, listado, edición, borrado, duplicación y visualización sin conexión de Roadmaps en planificación.

### Modified Capabilities
Ninguna. El mapa (`map-view`) no cambia sus requisitos: la ruta se dibuja como una capa más sobre él, y la posición tocada se obtiene con un gesto que `map-view` no reservaba.

## Impact

- Código: módulos nuevos `point-lookup` y `roadmap-planning`; en `map-platform`, las interfaces `RouteProvider` y `PlaceSearch` con sus proveedores, más la capacidad de `MapView` de dibujar capas (ruta por segmentos de superficie y marcadores numerados) y de informar lugares visibles por tipo y posiciones tocadas.
- Dependencias externas nuevas: un decodificador de geometrías codificadas (polilíneas). Se justifica en `design.md`.
- Servicios externos nuevos: el motor de ruteo (dos consultas por recálculo: ruta y superficie) y el buscador de lugares, ambos sin costo, sin clave y sin medio de pago, con sus condiciones de uso registradas en `docs/`.
- Datos: colección `roadmaps` en Firestore, legible y escribible solo por su autor en este change; las reglas se extienden en `roadmap-convening`.
- Glosario y mapa de capabilities: Roadmap pasa a ser la única entidad del viaje (Trip desaparece) y Point admite una fecha asociada. `openspec/config.yaml` y `docs/mapa-de-capabilities.md` se entregan actualizados junto con este change.
