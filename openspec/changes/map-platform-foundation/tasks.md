# Tasks

## 1. Base del proyecto

- [x] 1.1 Crear el proyecto con Vite, React y TypeScript en modo estricto, con linter y formateador configurados, y verificar que `npm run build` y `npm run lint` terminan sin errores
- [x] 1.2 Configurar Vitest con React Testing Library y verificar que una prueba de ejemplo corre con `npm test`
- [x] 1.3 Configurar Playwright con emulación de celular (Chromium) para pruebas de flujo completo y verificar que una prueba abre la app y encuentra el título
- [ ] 1.4 Crear la acción de GitHub que publica la rama principal en GitHub Pages y verificar que la app queda accesible por HTTPS en la URL de Pages
- [ ] 1.5 Documentar en `README.md` cómo instalar, correr, probar y publicar, y verificar que los comandos documentados funcionan tal como están escritos

## 2. Internacionalización (`app-shell`)

- [x] 2.1 Integrar i18next con React, con archivos `es-AR.json` y `en.json`, detección del idioma del celular y español (Argentina) como idioma por defecto, y verificar con pruebas unitarias los tres casos: idioma soportado, no soportado y elección guardada
- [x] 2.2 Agregar el selector de idioma en las opciones de la app y verificar con una prueba de Playwright que al cambiarlo todos los textos visibles cambian sin recargar y la elección persiste al reabrir
- [x] 2.3 Escribir la prueba que recorre los componentes y falla ante texto visible fuera del mecanismo de traducción, y verificar que detecta un literal introducido a propósito

## 3. PWA instalable y arranque sin conexión (`app-shell`)

- [x] 3.1 Configurar el plugin de PWA de Vite con manifiesto (nombre, íconos, modo pantalla completa, color de tema) y service worker que precachea la interfaz, y verificar con Playwright que la app, ya cargada una vez, abre completa sin red
- [x] 3.2 Implementar la propuesta de instalación en Android y las instrucciones paso a paso en iOS, ocultas cuando la app ya corre instalada, y verificar con pruebas unitarias los tres casos del spec
- [x] 3.3 Implementar la pantalla de primera apertura sin conexión y verificar con Playwright que aparece el mensaje del spec cuando no hay red ni caché
- [x] 3.4 Implementar el indicador de conectividad y la señalización de acciones no disponibles sin conexión, y verificar con Playwright que aparece al cortar la red y desaparece al restaurarla sin recargar

## 4. Proveedor de mapa: OpenFreeMap

- [ ] 4.1 Verificar desde la URL de GitHub Pages que las teselas de OpenFreeMap se obtienen desde el navegador (CORS y HTTPS) y registrar en `docs/proveedor-de-mapa.md` la dirección del servidor, el esquema de datos, el zoom máximo, la atribución exigida, la frecuencia de actualización y cómo autoalojar la instancia si hiciera falta; verificar que el documento describe lo mismo que la configuración de la app
- [x] 4.2 Definir el estilo del mapa a partir de uno de los estilos publicados por OpenFreeMap, con etiquetas en el idioma de la interfaz cuando el dato exista, y verificar con una prueba que el estilo referencia solo capas presentes en el esquema OpenMapTiles

## 5. Módulo `map-platform` y mapa base (`map-view`)

- [x] 5.1 Crear `src/map-platform/` con las interfaces `TileSource`, `OfflineRegionStore`, `MapView` y `Geolocation` descritas en D9 y verificar con una regla del linter que ningún módulo fuera de `map-platform` importa MapLibre, pmtiles ni proveedores
- [x] 5.2 Implementar el proveedor OpenFreeMap como `TileSource` (servidor y estilo tomados de configuración), y verificar con Playwright que el mapa se dibuja con calles, rutas y nombres sobre Argentina
- [x] 5.3 Dejar preparado un segundo `TileSource` de ejemplo (archivo PMTiles local de prueba) detrás de la misma interfaz, seleccionable por configuración, y verificar con una prueba que el mapa se dibuja con ese proveedor sin cambios fuera de `map-platform`
- [x] 5.4 Implementar el componente `MapView` con gestos táctiles y atribución permanente con enlace al detalle de fuentes, y verificar con Playwright en emulación de celular que desplazar, acercar y abrir la atribución funcionan
- [x] 5.5 Implementar `Geolocation` con los tres estados del permiso, la marca de posición propia, la acción de centrar y el estado "buscando señal" con última posición conocida, y verificar con pruebas unitarias (geolocalización simulada) los cuatro escenarios del spec

## 6. Mapas sin conexión (`offline-maps`)

- [x] 6.1 Implementar la enumeración de teselas de un rectángulo en los niveles de detalle 0 a 14 y la estimación de tamaño por promedio calibrado, y verificar con pruebas unitarias la cantidad de teselas para rectángulos conocidos y el ajuste de la estimación a medida que llegan teselas reales
- [x] 6.2 Implementar `OfflineRegionStore` sobre IndexedDB: descarga tesela por tesela con paralelismo acotado, progreso, pausa ante pérdida de red, reanudación, límite de teselas por zona, fecha de versión por tesela y chequeo de espacio disponible, y verificar con pruebas unitarias los escenarios de descarga completa, zona demasiado grande, espacio insuficiente y pérdida de conectividad
- [x] 6.3 Hacer que el `TileSource` consulte IndexedDB antes que la red y verificar con Playwright que, tras descargar una zona y cortar la red, el mapa se dibuja completo dentro de ella y vacío con aviso fuera de ella
- [x] 6.4 Pedir almacenamiento persistente al iniciar y exponer el espacio ocupado y disponible, y verificar con una prueba unitaria que la petición se hace una sola vez y que los valores se muestran en la interfaz
- [x] 6.5 Implementar la pantalla de zonas descargadas: elegir la zona visible, nombrarla, confirmar con tamaño estimado, ver progreso, listar con nombre, tamaño real y fecha, actualizar zona, borrar, y estado vacío con explicación; verificar con Playwright los escenarios de borrado y de lista vacía
- [x] 6.6 Implementar el aviso de almacenamiento por agotarse con la oferta de borrar zonas sin borrar nada automáticamente, y verificar con una prueba unitaria que ante la señal del navegador se muestra el aviso y no se elimina ninguna zona

## 7. Verificación en celulares reales

- [ ] 7.1 Instalar la app desde GitHub Pages en un iPhone y en un celular Android, y verificar la instalación, la apertura a pantalla completa y la apertura sin red, registrando el resultado por dispositivo en `docs/verificacion-dispositivos.md`
- [ ] 7.2 Descargar una zona en ambos celulares, activar el modo avión y verificar que el mapa se dibuja completo dentro de la zona con sus lugares, y vacío con aviso fuera de ella
- [ ] 7.3 Dejar el iPhone cuatro días sin abrir la app y verificar que la zona descargada sigue disponible sin red; registrar el resultado y, si falla, abrir la revisión de D4
- [ ] 7.4 Recorrer un trayecto corto con la app abierta en ambos celulares y verificar que la posición propia se actualiza y que la acción de centrar funciona; registrar el comportamiento del permiso de ubicación en iOS
- [ ] 7.5 Correr la auditoría de PWA del navegador (Lighthouse) sobre la URL publicada y verificar que la app es instalable y funciona sin conexión según la auditoría
