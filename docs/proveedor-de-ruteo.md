# Proveedor de ruteo — Valhalla en la instancia de FOSSGIS

Este documento registra con qué se calculan las rutas de los Roadmaps, qué exige el
proveedor y cómo reemplazarlo. Lo que acá se afirma sobre la app coincide con
`src/config/map-config.ts` y con la atribución que muestra `ValhallaRouteProvider`; una
prueba automatizada (`src/map-platform/providers/provider-docs.test.ts`) falla si dejan de coincidir.

El único módulo que conoce al proveedor es `src/map-platform/`, detrás de la interfaz
`RouteProvider`. Las decisiones están en D1 y D1b de
`openspec/changes/roadmap-planning/design.md`.

## Configuración vigente

| Dato | Valor |
| --- | --- |
| Motor de ruteo | Valhalla |
| Dirección del servidor (`serverUrl`) | `https://valhalla1.openstreetmap.de` |
| Perfil (`costing`) | `motorcycle` |
| Intervalo mínimo entre consultas (`minIntervalBetweenRequestsInMs`) | 1000 ms |
| Política de superficie | `exclude_unpaved: true`, `use_trails: 0`, fijas |
| Consultas por cálculo de ruta | Dos: `/route` y `/trace_attributes` |
| Límite de distancia por consulta del servidor | 1.500 km (error 154) |

## Cómo se calcula una ruta

1. `POST /route` con todas las posiciones del Roadmap como paradas (`type: break`),
   `costing: motorcycle`, la política de superficie en `costing_options`, `units:
   kilometers` y `directions_type: none` (la app no necesita indicaciones de giro). La
   respuesta trae un tramo por par de paradas consecutivas, con distancia en km, tiempo en
   segundos y la geometría como polilínea codificada con seis decimales.
2. `POST /trace_attributes` con las geometrías de todos los tramos encadenadas
   (`shape_match: walk_or_snap`) pidiendo solo `edge.surface`, `edge.begin_shape_index` y
   `edge.end_shape_index`. La respuesta informa la superficie de cada arista sobre los
   índices de la geometría; la app la convierte a sus cuatro clases (pavimento,
   consolidado, suelto, sin dato) con la correspondencia de
   `src/map-platform/providers/valhalla/valhalla-surfaces.ts`. Si esta consulta falla, la
   ruta vale igual con toda la superficie "sin dato".

Si la consulta única supera los 1.500 km que acepta el servidor, la app pide los tramos
de a uno. Un tramo que por sí solo supere el límite no se puede calcular.

Errores del servidor y cómo los interpreta la app: `442` (sin camino), `170` y `171`
(posición sin caminos cerca) son "sin camino"; `154` es "límite de distancia"; HTTP 429 es
"límite de consultas"; cualquier otro error o falta de respuesta es "servicio no
disponible".

## Condiciones de uso

Fuente: [Nutzungsbedingungen OSM-Server des FOSSGIS e.V.](https://www.fossgis.de/arbeitsgruppen/osm-server/nutzungsbedingungen/)
(con versión en inglés), leídas el 6 de octubre de 2026. Los servidores los operan
voluntarios con donaciones; no hay garantía de disponibilidad y el permiso de uso puede
revocarse sin aviso.

| Condición | Cómo la cumple la app |
| --- | --- |
| Atribución clara a OpenStreetMap, como exige la licencia ODbL, con enlace a `https://www.openstreetmap.org/fixthemap` para reportar errores | Entre las fuentes del ruteo figura «OpenStreetMap», enlazada a *fix the map*, con el texto de licencia |
| Máximo una consulta por segundo a los servidores de ruteo | El adaptador espacia sus consultas 1000 ms por construcción, también cuando varias partes de la app piden a la vez |
| User-Agent válido que identifique a la aplicación (el de un navegador sin modificar es aceptable) y Referer cuando sea posible | La app corre en el navegador: van el User-Agent y el Origin del navegador |
| Máximo dos conexiones de descarga; scripts, una | Las consultas van en serie |
| Sin uso comercial sustancial, sin sitios de alto tráfico, sin descarga masiva | Un grupo de viajeros, dos consultas por cálculo de ruta |
| Un correo electrónico del operador fácil de identificar en el sitio de la app (o en su ficha de tienda) | El panel «Fuentes del mapa» muestra «Contacto del operador de la app: `pattern-realism.72@icloud.com`» (`src/config/contact-config.ts`) |
| Recomendado: no fijar las direcciones de los servicios en la app | Están en `src/config/map-config.ts`, el único lugar que las conoce |

No hay registro, clave ni medio de pago.

## Atribución que muestra la app

La pantalla del Roadmap muestra las fuentes del ruteo (tarea 5.4), con estos nombres y
descripciones (textos de `src/i18n/locales/es-AR.json`, claves `map.sources.*`):

| Fuente | Enlace | Descripción |
| --- | --- | --- |
| Valhalla | https://github.com/valhalla/valhalla | Cálculo de rutas con el motor de código abierto Valhalla, sobre datos de OpenStreetMap. |
| FOSSGIS e.V. | https://www.fossgis.de/ | Servicio de ruteo provisto por FOSSGIS e.V. en su instancia comunitaria. |
| OpenStreetMap | https://www.openstreetmap.org/fixthemap | Datos de las rutas © colaboradores de OpenStreetMap (ODbL). Un camino mal cargado se corrige en openstreetmap.org/fixthemap. |

## Verificación manual contra la instancia real

Las pruebas automatizadas corren contra respuestas grabadas
(`src/map-platform/providers/valhalla/fixtures/`), nunca contra el servidor. La instancia
real se consulta a mano una sola vez por change, para grabar esas respuestas y confirmar
el contrato. Hecho el 6 de octubre de 2026 desde una Mac, con `curl`, con más de un
segundo entre consultas:

| Consulta | Resultado | Fixture |
| --- | --- | --- |
| `/route` Salta (-24.7859, -65.4117) → Cachi (-25.1197, -66.1656), perfil `motorcycle`, política fija | 200; un tramo de 167,273 km y 18.547 s; 3.076 posiciones | `route-salta-cachi.json` |
| `/trace_attributes` sobre esa geometría | 200; 357 aristas, todas con superficie, contiguas sobre los 3.076 índices: 151,6 km `paved_smooth` y 15,7 km `compacted` (la Cuesta del Obispo) | `trace-salta-cachi.json` |
| `/route` Salta → (-40, -50), en el Atlántico | 400, `error_code 154`: límite de 1.500 km por consulta | (no se guarda; se usa su formato) |
| `/route` Buenos Aires → (-38.2, -56.5), en el mar | 400, `error_code 171`, «No suitable edges near location» | `route-no-edges-near-location.json` |
| `/route` Buenos Aires → isla Martín García; Bariloche → isla Victoria | 200: OpenStreetMap tiene ferris a las dos islas, así que no sirvieron como caso sin camino | — |

El caso «sin camino» (`error_code 442`) no se obtuvo del servidor: `route-no-path.json`
está armado con el formato de error observado en 154 y 171 y el mensaje documentado por
Valhalla («No path could be found for input»).

Repetir esta verificación solo cuando cambie el adaptador, el servidor o sus condiciones.

## Cómo cambiar de proveedor

`RouteProvider` admite otro motor detrás de la misma interfaz. GraphHopper (plan gratuito
con clave y 500 créditos diarios) queda documentado como alternativa en D1 del design;
alojar un Valhalla propio no tiene límites pero cuesta un servidor. Los Roadmaps ya
calculados no dependen del proveedor: guardan su ruta.
