# Design

## Context

Ver `proposal.md` para la motivación. Estado actual: PWA (Progressive Web App) en React y TypeScript publicada en Firebase Hosting; `map-platform` encapsula MapLibre, OpenFreeMap y el almacenamiento sin conexión; `backend` encapsula Firebase (Authentication y Firestore) y expone `RiderAccountService`; cada Rider tiene perfil y una moto. Restricciones: proveedores sin costo, sin clave en lo posible y sin medio de pago; datos de OpenStreetMap; el dispositivo de verificación es un iPhone con la app instalada. El Roadmap es la única entidad del viaje: lo que este change guarda es lo que `roadmap-fuel-stops`, `roadmap-convening` y `roadmap-tracking` van a extender sobre el mismo documento, no copiar.

## Goals / Non-Goals

**Goals:**
- Un Roadmap que se arma en pocos toques desde el celular y queda guardado con su ruta y su superficie, de modo que se puede ver sin conexión y extender después con paradas, fechas y miembros.
- Motor de ruteo con perfil de motocicleta que respeta la política "asfalto siempre que exista; tierra solo para llegar", y superficie visible por tramo con una convención conocida.
- Tres formas de elegir un Point sin introducir ningún servicio con costo.
- Mantener a `map-platform` como único módulo que conoce proveedores: ruteo y búsqueda entran ahí.

**Non-Goals:**
- Navegación paso a paso (indicaciones de giro): el Roadmap es un trazado, no un navegador.
- Un modelo de Points compartido entre Riders: cada Roadmap guarda sus propios Points (ver D5).
- Point desde un enlace compartido de Google Maps: el enlace corto del celular solo revela la ubicación al seguir su redirección, y el navegador no puede hacerlo por la política de mismo origen (vale también para workers y service workers: la restricción es del navegador, no del hilo). Resolverlo requiere un componente fuera del celular que el proyecto hoy no tiene; se retoma cuando lo tenga.

## Decisions

### D1. Motor de ruteo: Valhalla en la instancia pública de FOSSGIS, perfil de motocicleta, política de superficie fija
Valhalla es uno de los tres motores que openstreetmap.org ofrece en su propio sitio, y es el único de los tres con un perfil de motocicleta. La política del producto ("asfalto siempre que exista; caminos sin pavimentar solo para llegar a un Point que no tiene otro acceso") es una opción nativa del motor: `exclude_unpaved` permite empezar y terminar un tramo por camino sin pavimentar pero no atravesarlo por uno; se combina con `use_trails` en cero para que tampoco prefiera huellas. No hay nada que el Rider configure. Un Roadmap se calcula en **una sola consulta** con todos sus Points como paradas intermedias, que devuelve los tramos por separado con distancia, tiempo y geometría. La superficie de cada parte del tramo se obtiene con una segunda consulta al servicio de atributos del mismo motor sobre la geometría devuelta, que informa por segmento una de ocho superficies derivadas de las etiquetas `surface` y `tracktype` de OpenStreetMap (desde pavimento liso hasta huella). La instancia de FOSSGIS no requiere registro, clave ni medio de pago; sus condiciones son una consulta por segundo, atribución y sin uso intensivo: dos consultas por recálculo de Roadmap las respeta, y el adaptador espacia sus consultas un segundo por construcción. La instancia limita además cada consulta a 1.500 km (error 154, verificado contra el servidor): si un Roadmap entero supera esa distancia, el adaptador pide los tramos de a uno; un tramo que la supere por sí solo no se puede calcular y se informa como límite. Se implementa como `RouteProvider` en `map-platform`, con servidor y perfil en configuración.
- *Alternativas:* OSRM en la misma instancia: solo perfil de auto, sin control de superficie. GraphHopper: plan gratuito con clave, 500 créditos por día y perfiles limitados; queda como proveedor alternativo detrás de la misma interfaz. Alojar Valhalla propio: sin límites, pero con servidor y costo mensual; documentado como salida si la instancia comunitaria no alcanzara.

### D1b. Nomenclatura de superficies: la de OpenStreetMap y su mapa oficial
No existe una convención universal de cartografía vial para superficie, pero sí una de facto en el ecosistema que usa la app: OpenStreetMap clasifica la superficie con la etiqueta `surface` (pavimentada: asfalto, hormigón, adoquín; sin pavimentar: consolidada, grava, tierra, arena, pasto) y la firmeza de las huellas con `tracktype` (grado 1 sólido a grado 5 suelto), y su mapa oficial dibuja esos grados con línea continua, rayas largas, rayas, rayas cortas y puntos. La app adopta una versión reducida y legible en un celular, con tres clases más "sin dato":
- **Pavimento** (línea continua): `paved_smooth`, `paved`, `paved_rough`.
- **Consolidado** (línea discontinua): `compacted`, `gravel`.
- **Suelto** (línea punteada): `dirt`, `path`.
- **Sin dato** (punto y raya): sin información de superficie; no se cuenta en ninguna de las anteriores. `impassable` no debería aparecer con el perfil elegido; si aparece, se trata como suelto y se señala.
La correspondencia queda en un solo archivo de configuración con su referencia visible en la pantalla del Roadmap, y la lista de tramos informa los kilómetros sin pavimentar (consolidado más suelto).

### D2. Búsqueda de lugares: Photon para nombres y dirección inversa; teselas para lugares por tipo
Photon es un geocodificador de código abierto sobre datos de OpenStreetMap, con instancia pública de uso justo, sin clave; busca por nombre y dirección con tolerancia a errores de tipeo, prioriza por cercanía a una posición y resuelve la dirección más cercana a una coordenada (para proponer el nombre de una posición tocada). Se implementa como `PlaceSearch` en `map-platform`. Los lugares por tipo no consultan ningún servicio: se leen de las teselas ya cargadas en el mapa (capa `poi` del esquema OpenMapTiles, clases `fuel`, `lodging`, `restaurant` y las de puntos de interés), lo que funciona también sin conexión en zonas descargadas y no suma peticiones. `MapView` expone `placesInView(types)` para eso. Idioma de los nombres: OpenStreetMap guarda el nombre original de cada lugar y, cuando alguien lo cargó, su traducción (`name:es`). Las teselas traen ambos, y la app muestra el español si existe y el original si no. La instancia pública de Photon no indexa el español (solo el nombre original más inglés, alemán y francés; rechaza `lang=es`), así que la búsqueda por nombre y la dirección inversa entregan el nombre original, que para la Argentina ya es español; la regla importa en países vecinos y ahí vale para lo que sale de las teselas. Photon también devuelve lugares sin nombre (una calle con número); en ese caso la app arma el nombre con la dirección.
- *Alternativas:* Nominatim, el geocodificador oficial de OpenStreetMap: su política pública es más restrictiva (una consulta por segundo, prohíbe autocompletar) y Photon está pensado justamente para ese uso. Consultar lugares por tipo a un servicio (Overpass): innecesario teniendo los datos en las teselas.

### D4. Modelo de datos: colección `roadmaps`, un documento por Roadmap
Documento con `ownerId`, `name`, `description`, `status` (`planning` en este change; `roadmap-convening` agrega los siguientes estados), `points` (lista ordenada; cada Point con `date` opcional), `legs` (lista con `distanceM`, `durationS`, `unpavedM`, `geometry` como polilínea codificada y `surfaces`: lista de segmentos `{fromIndex, toIndex, surface}` sobre esa geometría, con `surface` en las cuatro clases de D1b), `totalDistanceM`, `totalDurationS`, `createdAt`, `updatedAt`. La geometría codificada de un tramo pesa decenas de bytes por kilómetro, así que un Roadmap de 2.000 km queda muy por debajo del límite de 1 MiB por documento; igual se simplifica la geometría si un documento superara 500 KiB. Reglas: leer y escribir solo el dueño, con validación de rangos y de que `points` tenga al menos dos elementos; `roadmap-convening` agrega miembros y su lectura. Duplicar un Roadmap es crear un documento nuevo con copia de `points` y `legs`, sin fechas y con `status: planning`.
- *Alternativas:* subcolección de tramos: más documentos y lecturas para dibujar un Roadmap; no aporta nada con el tamaño actual.

### D5. Cada Roadmap guarda sus propios Points; no hay una tabla de Points compartida
Cuando el Rider elige un lugar (una estación de servicio del mapa, un resultado de búsqueda, una posición tocada), el Roadmap guarda una **copia** de lo que importa de ese lugar: nombre, coordenadas, tipo si lo tiene, y de dónde salió. No se crea un registro "Point" aparte que varios Roadmaps compartan. Tres razones: los datos del lugar son del proveedor y cambian con el tiempo (nombres, cierres), y una copia deja al Roadmap tal como el Rider lo armó; el Roadmap resulta autosuficiente, se lee sin conexión y no depende de otra consulta; y al duplicar un Roadmap los Points viajan con él sin depender de nada externo. Si dos Roadmaps pasan por la misma estación, cada uno tiene su copia; es intencional.

### D6. Capas y gestos en `MapView`
`MapView` incorpora capas declarativas: la línea de ruta dibujada por segmentos con el estilo de su superficie (D1b), marcadores numerados por Point, y el resaltado de lugares por tipo. Se usa el toque sostenido para elegir una posición, porque el toque simple ya lo usa el mapa para sus propios elementos y el arrastre para desplazarse. Nada de esto modifica los requisitos de `map-view`; son capacidades nuevas del componente.
- *Dependencias nuevas:* ninguna para las polilíneas codificadas: el paquete candidato (`@mapbox/polyline`) arrastra una biblioteca de línea de comandos, y el algoritmo son treinta líneas, así que `map-platform` lo implementa (codificación y decodificación, con prueba contra el ejemplo de la especificación). Para reordenar Points con el dedo, se evalúa primero una lista con botones "subir/bajar" antes de sumar una biblioteca de arrastre, que en celular suele pelearse con el desplazamiento.

### D7. Sin conexión
Los Roadmaps viajan por la persistencia local de Firestore (ya habilitada en `rider-onboarding`) y traen su geometría, así que se dibujan sin conexión sobre las zonas descargadas. Las acciones que requieren ruteo o búsqueda se señalan como no disponibles con el mismo mecanismo que ya usa la app.

### D8. Lo que este change deja preparado para los siguientes
El Roadmap guarda la secuencia de Points, la geometría y la distancia de cada tramo y su superficie. `roadmap-fuel-stops` recorre esa geometría para insertar Points de carga como cualquier otro Point (editables, con `source` propio); `roadmap-convening` agrega al mismo documento fechas, horarios, admin y miembros; `roadmap-tracking` dibuja la misma ruta bajo los avatares. Nada se copia entre entidades porque hay una sola.

### D9. Pruebas sin red
Los adaptadores de Valhalla y Photon se prueban contra respuestas grabadas (fixtures) y contra sus casos de error (sin camino, servicio no disponible, límite de consultas). Playwright usa un proveedor simulado con las mismas fixtures. Una prueba manual documentada verifica la instancia real una vez por change, no en cada corrida, para respetar la condición de uso no intensivo.

## Risks / Trade-offs

- [La instancia comunitaria de FOSSGIS no está disponible o cambia su política] → `RouteProvider` admite otro proveedor; GraphHopper documentado como alternativa; los Roadmaps ya calculados siguen funcionando porque guardan su ruta.
- [Photon devuelve resultados pobres en localidades chicas de Argentina] → la búsqueda prioriza por cercanía y el Rider siempre puede tocar el mapa; se mide con un conjunto de lugares de prueba de la región.
- [El toque sostenido en iOS dispara el menú contextual del navegador o la selección de texto] → se desactivan sobre el mapa y se verifica en el iPhone instalado antes de construir el resto del editor (tarea temprana).
- [Un Roadmap largo hace lento el dibujo o pesa demasiado] → simplificación de geometría por encima de 500 KiB y dibujo de la ruta como una sola capa.
- [Caminos mal etiquetados en OpenStreetMap: un ripio marcado como pavimento, o sin dato de superficie] → la superficie se muestra tal como la informa el motor, con la clase "sin dato" explícita, para que el Rider lo vea antes de salir; los errores de datos se corrigen en OpenStreetMap, que es el camino previsto por la comunidad.
- [La segunda consulta (atributos de superficie) falla aunque la ruta se haya calculado] → el Roadmap se guarda con la ruta y superficie "sin dato" en todos los tramos, y se reintenta la consulta de superficie al abrirlo con conexión.

## Migration Plan

No hay datos previos. Las reglas de Firestore se amplían con la colección `roadmaps`; se despliegan con el mismo flujo que las existentes. Vuelta atrás: retirar la colección de las reglas y la pantalla; los documentos creados quedan sin efecto.

## Open Questions

- Si tres clases de superficie alcanzan o conviene distinguir ripio de grava suelta: se decide viendo Roadmaps reales; afecta el archivo de correspondencia de D1b, no los specs.
