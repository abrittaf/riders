# Design

## Context

Proyecto nuevo, sin código. Ver `proposal.md` para la motivación. Restricciones que condicionan el enfoque: la app se distribuye como PWA (Progressive Web App), por lo tanto corre en el navegador del celular con las capacidades que iOS y Android le dan a una web app instalada; se priorizan proveedores sin costo y que no exijan registrar un medio de pago; el mapa debe funcionar sin conexión en las zonas descargadas; la app no desarrolla funcionalidad de mapas, la toma de proveedores existentes basados en OpenStreetMap; y los próximos changes (`roadmap-planning`, `trip-tracking`) van a dibujar sobre este mismo mapa.

## Goals / Non-Goals

**Goals:**
- Un único módulo, `map-platform`, que conoce a los proveedores de mapa; el resto de la app usa su interfaz y puede cambiar de proveedor sin tocar nada más.
- Una sola fuente de datos de mapa para uso con y sin conexión, para que el mapa se vea igual en ambos modos.
- Costo cero de operación con el volumen de uso previsto (un grupo de amigos), sin ningún servicio que exija registrar un medio de pago.
- Verificado en celulares reales, no solo en el navegador de escritorio: en iPhone dentro de este change; en Android queda pendiente hasta contar con un dispositivo (ver Risks).

**Non-Goals:**
- Elegir backend, base de datos o autenticación: este change no tiene servidor.
- Elegir el motor de ruteo ni el buscador de lugares: se deciden en `roadmap-planning`, cuando haya un requisito que los use.
- Alojar datos de mapa propios: en este change la app no opera ningún servicio ni archivo de mapa.

## Decisions

### D1. Interfaz de aplicación: React con TypeScript, construido con Vite
El renderizador de mapas es imperativo e independiente del framework, así que el framework no se elige por el mapa sino por todo lo demás: pantallas, formularios, estado, pruebas. React tiene el ecosistema más amplio, la mayor cantidad de ejemplos y la integración más probada con las herramientas de PWA y de internacionalización; eso pesa porque la implementación la hace un asistente de IA y el dueño del proyecto no viene del front-end: a mayor volumen de material de referencia, menos sorpresas. Vite sin meta-framework: la PWA es estática, no necesita renderizado en servidor.
- *Alternativas:* Svelte produce paquetes más chicos (decenas de KB menos), diferencia marginal frente a los MB de teselas que la app descarga; tiene menos ejemplos de PWA e internacionalización. Vue queda en un punto intermedio en ambos aspectos. TypeScript sin framework evita dependencias pero encarece cada pantalla nueva.

### D2. Renderizador de mapas: MapLibre GL JS
Código abierto, renderiza teselas vectoriales en el navegador (necesario para que el mapa sea legible en cualquier nivel de detalle con un volumen de descarga razonable), y lee archivos PMTiles mediante un protocolo registrable. Es el renderizador con el que trabajan OpenFreeMap y Protomaps. La atribución no se delega al renderizador: la app dibuja la suya, para que sea permanente, esté en el idioma de la interfaz y abra el detalle de las fuentes.
- *Alternativas:* Leaflet es más simple, pero trabaja con teselas de imagen, que ocupan mucho más para uso sin conexión y no permiten cambiar el estilo ni el idioma de las etiquetas. Google Maps JavaScript API queda descartada por costo más allá del cupo, por no permitir uso sin conexión y por sus condiciones de uso sobre guardar teselas.

### D3. Una sola fuente de teselas para ambos modos: la instancia pública de OpenFreeMap
OpenFreeMap sirve teselas vectoriales con datos de OpenStreetMap (esquema OpenMapTiles, zoom máximo 14) por HTTPS, sin registro, sin clave y sin límites declarados de peticiones; solo exige atribución, que MapLibre agrega sola. Con conexión, MapLibre pide cada tesela directamente al servidor. Sin conexión, la app lee las mismas teselas desde el almacenamiento del celular, guardadas antes por la descarga de una zona (D4). Una sola fuente garantiza que el mapa se vea idéntico en ambos modos y que "descargar una zona" sea guardar exactamente lo que ya se estaba viendo. No hay nada propio que alojar ni ninguna cuenta que crear. Los nombres de los estilos y la dirección del servidor quedan en configuración, no en código. OpenFreeMap se sostiene con donaciones; el proyecto registra en `docs/` esa dependencia y la posibilidad de autoalojar la instancia, que es código abierto.
- *Alternativas:* un archivo PMTiles regional extraído de las compilaciones de Protomaps y alojado en almacenamiento estático: el mapa sería igual de bueno y el tamaño de cada descarga sería exacto, pero los servicios de almacenamiento sin costo que admiten archivos de ese tamaño (Cloudflare R2, Backblaze B2) exigen registrar un medio de pago, y GitHub Pages limita cada archivo a 100 MB, insuficiente para una región a zoom 14. Queda documentada como la ruta de salida si OpenFreeMap dejara de estar disponible: el módulo `map-platform` admite un segundo proveedor detrás de la misma interfaz. Google Maps JavaScript API queda descartada por costo más allá del cupo, por exigir medio de pago y por no permitir uso sin conexión.

### D4. Almacenamiento sin conexión: teselas en IndexedDB, con la app como intermediaria
Descargar una zona consiste en enumerar las teselas que cubren su rectángulo en todos los niveles de detalle (0 a 14), pedirlas una por una al servidor de OpenFreeMap y guardarlas en IndexedDB con su clave (z, x, y). El tamaño que se muestra antes de confirmar es una estimación: cantidad de teselas por un tamaño promedio por nivel de detalle, calibrado con las teselas ya descargadas; el tamaño real se informa al terminar y en la lista de zonas. El límite de una zona se expresa en cantidad de teselas. La fuente de teselas del módulo `map-platform` consulta primero IndexedDB y después la red, de modo que sin conexión el mapa se arma con lo guardado. Al iniciar, la app pide almacenamiento persistente al navegador para reducir el riesgo de que el sistema lo libere; la descarga se registra tesela por tesela, lo que permite pausar y retomar. Las peticiones se hacen con un paralelismo acotado para no cargar al servidor comunitario más que un uso normal del mapa.

*Ajustes surgidos en la implementación:* además de las teselas se guardan las tipografías (glifos) y los íconos del estilo, sin los cuales el mapa descargado no mostraría nombres; las teselas de una zona se piden sin pasar por la caché HTTP del navegador para no ocupar espacio dos veces; el mapa reintenta cada pocos segundos las teselas que fallaron mientras quede zona sin dibujar; el estilo no incluye relieve sombreado porque implicaría una segunda fuente de teselas (D3). El límite provisorio es de 12.000 teselas por zona, a confirmar con las mediciones de la sección 7 de tareas. Las teselas se guardan por zona (zona, z, x, y) y no solo por (z, x, y): así el borrado de una zona y su tamaño son exactos, a costa de duplicar las teselas que comparten dos zonas superpuestas.
- *Alternativas:* delegar las teselas al service worker (caché HTTP): el control del progreso, la pausa y la gestión de zonas quedarían fuera de la app. Un archivo PMTiles por zona: requeriría un servicio que recorte archivos a demanda, es decir un backend.

### D5. Service worker solo para la interfaz
El service worker precachea la aplicación (HTML, scripts, estilos, íconos, textos de los idiomas) para que arranque sin conexión. No interviene en las teselas (ver D4). Se genera con la herramienta de PWA de Vite, que también produce el manifiesto de instalación.

### D6. Posición del Rider: API de geolocalización del navegador en primer plano
Se usa el seguimiento continuo de posición del navegador mientras la app está visible. En iOS, una web app instalada no recibe posiciones en segundo plano; este change solo muestra la propia posición, y la pantalla siempre encendida llega con `trip-tracking`. Los tres estados del permiso (no pedido, concedido, denegado) se modelan explícitamente porque cada uno tiene un comportamiento distinto en el spec.

### D7. Internacionalización: textos en archivos por idioma, cargados con i18next
Un archivo JSON por idioma (`es-AR` inicial, `en` como segundo idioma que prueba el mecanismo). Ningún componente contiene texto literal visible; una prueba automatizada recorre los componentes y falla si encuentra texto fuera del mecanismo de traducción. Se parte del idioma del celular y se guarda la elección del Rider en el almacenamiento local.
- *Alternativas:* react-intl ofrece lo mismo con una API más orientada a formatos; i18next tiene más ejemplos con React y Vite.

### D8. Hosting de la PWA: GitHub Pages desde el mismo repositorio
Sin costo, con HTTPS (requisito del service worker y de la geolocalización), publicado por una acción de GitHub en cada cambio en la rama principal. Volver a una versión anterior es volver a publicar el commit anterior.
- *Alternativas:* Cloudflare Pages ofrece lo mismo con dominios propios más simples; se puede migrar sin tocar la app.

### D9. Límites del módulo `map-platform`
`src/map-platform/` expone: `TileSource` (obtener una tesela por z, x, y, con o sin conexión), `OfflineRegionStore` (descargar, pausar, retomar, listar, borrar zonas; espacio ocupado y disponible), `MapView` (el componente de mapa, con capas y marcadores que los próximos changes agregan) y `Geolocation` (posición actual y estado del permiso). Los proveedores concretos viven en `src/map-platform/providers/` y ningún otro módulo los importa. Esta es la decisión que, al archivar el change, se promueve al `context` de `openspec/config.yaml`.

## Risks / Trade-offs

- [El sistema operativo libera el almacenamiento de la web app] → pedir almacenamiento persistente al iniciar; mostrar siempre cuánto ocupan las zonas; verificar en un iPhone real que una zona sobrevive varios días sin abrir la app.
- [OpenFreeMap publica una versión nueva de las teselas cada semana; una zona descargada en dos momentos distintos mezcla versiones] → se guarda la fecha de versión con cada tesela y se ofrece "actualizar zona" como re-descarga completa; las diferencias entre versiones semanales son menores para el uso de la app.
- [Los términos de uso de OpenFreeMap piden no recolectar datos del servicio de forma automatizada sin permiso, y la descarga de zonas (D4) es una recolección automatizada, aunque la inicie el Rider y esté acotada] → pedir permiso explícito por correo describiendo el uso (personal, no comercial, acotado en paralelismo y en teselas por zona, con atribución); hasta tener respuesta la descarga de zonas se considera en evaluación; si la respuesta es negativa, la alternativa PMTiles de D3 reemplaza la fuente del modo sin conexión.
- [OpenFreeMap es un servicio comunitario sostenido con donaciones, sin compromiso de disponibilidad] → el módulo `map-platform` admite otro proveedor detrás de la misma interfaz; la alternativa PMTiles de D3 queda documentada; las zonas ya descargadas siguen funcionando sin conexión aunque el servicio no esté disponible.
- [La estimación de tamaño previa a la descarga se aleja del tamaño real] → calibrar el promedio por nivel de detalle con las teselas ya descargadas y mostrar siempre el tamaño real al terminar; medir con zonas típicas (un tramo de 300 km de ruta) antes de fijar el límite de teselas por zona.
- [iOS vuelve a pedir el permiso de ubicación con frecuencia en web apps instaladas] → explicar al Rider por qué se pide y verificar el comportamiento real en el iPhone en las pruebas de integración.
- [No se dispone de un celular Android: la instalación, el mapa sin conexión y la posición propia no están verificados en un Android real] → mientras tanto la cobertura de Android es la de Playwright con emulación Chromium; la verificación en un dispositivo queda como tarea 7.6, pendiente; la propuesta de instalación de Android es lo que menos cubren las pruebas automatizadas.
- [Pérdida de conectividad a mitad de una descarga] → registro tesela por tesela con pausa y reanudación (D4); escenario cubierto en el spec.
- [Dependencia de la continuidad de los servicios gratuitos] → la interfaz de `map-platform` aísla el cambio de proveedor; se documenta cómo autoalojar OpenFreeMap y la alternativa PMTiles.

## Migration Plan

No aplica: proyecto nuevo, sin datos ni usuarios previos. Publicación: la acción de GitHub publica cada commit de la rama principal en GitHub Pages; para volver atrás se vuelve a publicar el commit anterior.

## Open Questions

- Límite de teselas por zona descargable: se fija midiendo zonas típicas (un tramo de ruta de 300 km) en celulares reales; afecta un valor de configuración, no los specs ni las tareas.
- Nombre definitivo de la aplicación: afecta solo el nombre e ícono en el manifiesto de instalación; mientras tanto se usa "Riders".
