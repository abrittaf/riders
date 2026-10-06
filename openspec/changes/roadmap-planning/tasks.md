# Tasks

## 1. Proveedores de ruteo y búsqueda en `map-platform`

- [x] 1.1 Definir las interfaces `RouteProvider` (ruta entre una lista ordenada de posiciones con preferencia de camino; tramos con distancia, tiempo y geometría; errores tipados: sin camino, no disponible, límite) y `PlaceSearch` (buscar por nombre cerca de una posición; dirección más cercana a una posición) en `src/map-platform/`, y verificar con la regla del linter que siguen siendo el único lugar que importa proveedores
- [x] 1.2 Implementar `RouteProvider` para Valhalla (instancia de FOSSGIS, perfil de motocicleta con `exclude_unpaved` y `use_trails` en cero, una consulta por Roadmap con paradas intermedias, segunda consulta de atributos para la superficie por segmento, correspondencia de D1b en un archivo de configuración) con decodificación de polilíneas, y verificar con pruebas unitarias contra fixtures grabadas los casos: ruta de dos y de cuatro Points, tramo sin camino, Point alcanzable solo por camino sin pavimentar, segmento sin dato de superficie, consulta de superficie fallida con ruta válida, servicio no disponible, límite de consultas
- [x] 1.3 Implementar `PlaceSearch` para Photon (búsqueda por nombre y dirección priorizada por cercanía; dirección inversa; nombre original del lugar, porque la instancia pública no indexa el español) y verificar con pruebas unitarias contra fixtures: coincidencias, sin coincidencias, dirección inversa, lugar con y sin nombre, servicio no disponible
- [x] 1.4 Agregar a `MapView` la consulta `placesInView(types)` sobre la capa `poi` de las teselas y el evento de toque sostenido con la posición, desactivando el menú contextual y la selección de texto sobre el mapa; verificar con Playwright en emulación de celular que el toque sostenido entrega una posición y que `placesInView` devuelve las estaciones de servicio de una zona de prueba
- [x] 1.5 Documentar en `docs/proveedor-de-ruteo.md` y `docs/proveedor-de-busqueda.md` las condiciones de uso, la atribución exigida, los límites y la prueba manual contra la instancia real, y verificar que la atribución documentada es la que muestra la app

## 2. Elegir Points (`point-lookup`)

- [x] 2.1 Implementar la búsqueda por nombre con lista de coincidencias (nombre, tipo, localidad, distancia), estado sin coincidencias y no disponible sin conexión, y verificar con Playwright contra el proveedor simulado los tres escenarios del spec
- [x] 2.2 Implementar la elección por tipo (estación de servicio, alojamiento, restaurante, punto de interés) con lista y resaltado sobre el mapa, y verificar con Playwright que funciona con red y sin red dentro de una zona descargada, y que sin lugares en la vista sugiere alejar el mapa
- [x] 2.3 Implementar la posición elegida con toque sostenido, con nombre propuesto por dirección inversa o coordenadas sin conexión, editable; verificar con Playwright los dos escenarios
- [x] 2.4 Mostrar los nombres de lugares en español cuando existe y en idioma de origen si no, en lugares por tipo y Points elegidos desde las teselas (la búsqueda por nombre trae solo el original, ver D2); verificar con una prueba unitaria los dos escenarios del spec

## 3. Modelo y reglas del Roadmap (`roadmap-planning`)

- [x] 3.1 Definir el modelo del Roadmap según D4 y D5 y el servicio `RoadmapService` en `backend` (crear, listar propios, leer, actualizar, borrar, suscripción), y verificar con pruebas unitarias las validaciones de nombre y cantidad mínima de Points, y el cálculo de kilómetros sin pavimentar por tramo a partir de los segmentos de superficie
- [x] 3.2 Implementar `RoadmapService` sobre Firestore con persistencia local, incluida la duplicación (copia de Points y ruta, sin fechas, estado en planificación), y escribir las reglas de la colección `roadmaps` (solo el dueño lee y escribe; validación de campos y de al menos dos Points); verificar con `@firebase/rules-unit-testing` que otro Rider no lee ni escribe y que un documento con un solo Point es rechazado, y con una prueba unitaria que el duplicado es independiente del original
- [x] 3.3 Implementar la simplificación de geometría por encima de 500 KiB y verificar con una prueba unitaria sobre un Roadmap sintético de 3.000 km que el documento resultante queda por debajo del umbral

## 4. Editor de Roadmap (`roadmap-planning`)

- [ ] 4.1 Verificar en el iPhone instalado, con una pantalla mínima, que el toque sostenido sobre el mapa no dispara el menú contextual ni la selección de texto, y registrar el resultado en `docs/verificacion-dispositivos.md`; si falla, ajustar D6 antes de seguir
- [ ] 4.2 Implementar la pantalla de edición: nombre, descripción, secuencia de Points con insertar, subir, bajar y quitar, fecha asociada opcional por Point, kilómetros aproximados, y las validaciones junto a cada campo; verificar con pruebas unitarias las validaciones, la lógica de secuencia y poner, cambiar y quitar la fecha de un Point
- [ ] 4.3 Integrar el cálculo de ruta: recalcular solo los tramos afectados, mostrar distancia, tiempo y kilómetros sin pavimentar por tramo y totales, señalar el tramo sin camino, y bloquear cambios que requieren ruteo sin conexión; verificar con Playwright contra el proveedor simulado los escenarios de "Cálculo de la ruta" y los tres primeros de "Superficie de los tramos"
- [ ] 4.4 Dibujar la ruta por segmentos con el estilo de línea de su superficie (continua, discontinua, punteada, punto y raya), los Points numerados y la referencia de estilos accesible desde la pantalla del Roadmap, con encuadre sobre la ruta completa; verificar visualmente con Playwright mediante capturas de referencia de un Roadmap con las cuatro clases de superficie

## 5. Lista, detalle, borrado y sin conexión (`roadmap-planning`)

- [ ] 5.1 Implementar la lista de Roadmaps con nombre, distancia, tiempo y cantidad de Points, el estado vacío explicativo y la apertura sobre el mapa; verificar con Playwright los dos escenarios del spec
- [ ] 5.2 Implementar edición, borrado con confirmación y duplicación, y verificar con Playwright contra el emulador que un Roadmap borrado desaparece en una segunda sesión con la misma cuenta y que el duplicado aparece sin fechas y editable
- [ ] 5.3 Verificar con Playwright que un Roadmap abierto antes se muestra sin red dentro de una zona descargada, con ruta y totales, y con las acciones de ruteo y búsqueda señaladas como no disponibles
- [ ] 5.4 Mostrar la atribución del motor de ruteo y del buscador en la pantalla del Roadmap, enlazada al detalle de fuentes, y verificar con una prueba que coincide con lo documentado en 1.5

## 6. Verificación en iPhone sobre la URL publicada

- [ ] 6.1 Armar un Roadmap real de al menos cuatro Points usando las tres formas de elegir Points (nombre, tipo, toque sostenido), con una fecha asociada a uno de ellos y un Point que solo tenga acceso por ripio, y registrar en `docs/verificacion-dispositivos.md` el resultado de cada forma, si la ruta es razonable y si el tramo de ripio aparece con su estilo y sus kilómetros
- [ ] 6.2 Descargar la zona del Roadmap, activar el modo avión y verificar que el Roadmap se ve con su ruta y que las acciones no disponibles están señaladas; registrar el resultado
