# Proveedor de búsqueda de lugares — Photon en la instancia de komoot

Este documento registra con qué se buscan lugares por nombre y se resuelve la dirección de
una posición tocada, qué exige el proveedor y cómo reemplazarlo. Lo que acá se afirma
sobre la app coincide con `src/config/map-config.ts` y con la atribución que muestra
`PhotonPlaceSearch`; una prueba automatizada (`src/map-platform/providers/provider-docs.test.ts`) falla
si dejan de coincidir.

El único módulo que conoce al proveedor es `src/map-platform/`, detrás de la interfaz
`PlaceSearch`. Los lugares por tipo (estaciones de servicio, alojamientos, restaurantes,
puntos de interés) no usan este proveedor: se leen de la capa `poi` de las teselas ya
cargadas en el mapa, con y sin conexión. La decisión está en D2 de
`openspec/changes/roadmap-planning/design.md`.

## Configuración vigente

| Dato | Valor |
| --- | --- |
| Buscador | Photon |
| Dirección del servidor (`serverUrl`) | `https://photon.komoot.io` |
| Resultados por búsqueda (`maxResults`) | 10 |
| Intervalo mínimo entre consultas (`minIntervalBetweenRequestsInMs`) | 1000 ms |
| Idioma pedido | Ninguno: la instancia devuelve el nombre original del lugar |

## Cómo se consulta

- Búsqueda por nombre: `GET /api?q=<texto>&lat=<lat>&lon=<lon>&limit=10`. `lat` y `lon`
  son la posición del Rider (o el centro del mapa) y priorizan los resultados cercanos.
- Dirección más cercana a una posición: `GET /reverse?lat=<lat>&lon=<lon>&limit=1`.

Las respuestas son GeoJSON. De cada resultado la app toma `name` (o, si no tiene nombre
propio, calle y número), la posición, el tipo de lugar según `osm_key`/`osm_value`
(correspondencia en `src/map-platform/providers/photon/photon-place-types.ts`) y la
localidad (`city`, `locality`, `county` o `state`; para una localidad en sí, su
provincia).

La instancia pública no indexa el español: `lang=es` responde 400 con «Language is not
supported. Supported are: default, de, en, fr». Por eso la búsqueda devuelve el nombre
original de cada lugar, que en la Argentina ya es español. La regla «español si existe,
idioma de origen si no» se aplica a lo que sale de las teselas, que sí traen `name:es`.

Cualquier error del servidor o falta de respuesta (sin conectividad, 4xx, 5xx, 429) se
informa como «buscador no disponible».

## Condiciones de uso

Fuente: [README de Photon](https://github.com/komoot/photon#readme), sección sobre la
instancia pública, leída el 6 de octubre de 2026: «You are welcome to use the API for your
project as long as the number of requests stay in a reasonable limit. Extensive usage
will be throttled or completely banned. We do not give guarantees for availability and
reserve the right to implement changes without notice.»

| Condición | Cómo la cumple la app |
| --- | --- |
| Cantidad razonable de consultas; el uso extensivo se limita o bloquea | Una búsqueda por envío del formulario (no por tecla), espaciadas 1000 ms por construcción |
| Sin garantía de disponibilidad | La búsqueda se señala como no disponible y las otras formas de elegir un Point siguen ofrecidas |
| Datos de OpenStreetMap bajo ODbL | Atribución a OpenStreetMap ya presente en las fuentes del mapa; Photon se atribuye entre las fuentes del ruteo y la búsqueda |

No hay registro, clave ni medio de pago.

## Atribución que muestra la app

| Fuente | Enlace | Descripción |
| --- | --- | --- |
| Photon | https://photon.komoot.io/ | Búsqueda de lugares con Photon, geocodificador de código abierto sobre datos de OpenStreetMap, en la instancia pública de komoot. |

## Verificación manual contra la instancia real

Las pruebas automatizadas corren contra respuestas grabadas
(`src/map-platform/providers/photon/fixtures/`). La instancia real se consultó a mano el
6 de octubre de 2026, con `curl` y más de un segundo entre consultas:

| Consulta | Resultado | Fixture |
| --- | --- | --- |
| `/api?q=Cachi&lat=-25.1&lon=-66.2&lang=es` | 400, idioma no soportado (default, de, en, fr) | — |
| `/api?q=Cachi&lat=-24.7859&lon=-65.4117&limit=5` | 200; el pueblo de Cachi primero, luego el departamento, dos calles «Cachi» y «Cachi Adentro» | `search-cachi.json` |
| `/reverse?lat=-25.1197&lon=-66.1656&limit=1` | 200; calle Sarmiento, Cachi | `reverse-cachi.json` |
| `/api?q=Caseros 1500 Salta&...&limit=3` | 200; una casa sin nombre con `street` y `housenumber` | `search-address.json` |
| `/api?q=xqzvwyjk&...` | 200, sin resultados | `search-no-match.json` |
| `/api?q=YPF&lat=-25.1197&lon=-66.1656&limit=3` | 200; tres estaciones `amenity=fuel` en el valle de Lerma | `search-fuel.json` |

Repetir esta verificación solo cuando cambie el adaptador, el servidor o sus condiciones.

## Cómo cambiar de proveedor

Nominatim (el geocodificador oficial de OpenStreetMap) acepta `accept-language=es` y
devolvería nombres en español, pero su política pública prohíbe autocompletar y limita a
una consulta por segundo, y no tolera errores de tipeo. Queda como alternativa detrás de
la misma interfaz si Photon dejara de servir.
