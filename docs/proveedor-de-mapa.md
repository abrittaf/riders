# Proveedor de mapa — OpenFreeMap

Este documento registra de dónde sale el mapa de Riders, qué exige el proveedor y cómo
reemplazarlo. Lo que acá se afirma sobre la app coincide con `src/config/map-config.ts`;
una prueba automatizada (`src/config/map-config.test.ts`) falla si dejan de coincidir.

El único módulo que conoce al proveedor es `src/map-platform/`. El resto de la app usa su
interfaz y no se entera de un cambio de proveedor.

## Configuración vigente

| Dato | Valor |
| --- | --- |
| Proveedor de teselas (`tileProvider`) | `openfreemap` |
| Dirección del servidor (`serverUrl`) | `https://tiles.openfreemap.org` |
| Conjunto de teselas (`tileSetName`) | `planet` |
| Estilo (`styleName`) | `liberty` |
| Esquema de datos | OpenMapTiles (teselas vectoriales MVT) |
| Zoom mínimo y máximo de las teselas | 0 a 14 |
| Límite de teselas por zona descargada (`maxTilesPerRegion`) | 12000 (provisorio) |
| Descargas simultáneas al bajar una zona (`downloadConcurrency`) | 4 |

## Cómo se obtienen las teselas

El servidor publica en `https://tiles.openfreemap.org/planet` un documento TileJSON que
informa la dirección de la compilación vigente, por ejemplo
`https://tiles.openfreemap.org/planet/20260927_080001_pt/{z}/{x}/{y}.pbf`. La app lee ese
documento, pide cada tesela a esa dirección y toma el nombre de la compilación
(`20260927_080001_pt`) como versión de la tesela; esa versión se guarda con cada tesela
de una zona descargada.

Las teselas se sirven por HTTPS, comprimidas con gzip y con la cabecera
`access-control-allow-origin: *`, de modo que el navegador puede pedirlas desde cualquier
origen. No hay registro, clave ni límite declarado de peticiones. Una tesela sin datos
(mar abierto) responde 200 con un cuerpo mínimo; no hay que tratar el 404 como caso
normal.

Verificación de CORS y HTTPS: comprobado el 3 de octubre de 2026 desde la línea de
comandos (con cabecera `Origin`) y desde el navegador en las pruebas de flujo completo,
que corren contra el servidor real. Falta repetir la comprobación desde la dirección
publicada en GitHub Pages (tarea 4.1), que queda pendiente hasta que la app esté
publicada.

## Esquema de datos

Las teselas siguen el esquema OpenMapTiles sin modificaciones. Sus capas son
`aerodrome_label`, `aeroway`, `boundary`, `building`, `housenumber`, `landcover`,
`landuse`, `mountain_peak`, `park`, `place`, `poi`, `transportation`,
`transportation_name`, `water`, `water_name` y `waterway`. Los nombres vienen en el
idioma local (`name`) y, cuando OpenStreetMap los tiene, en otros idiomas (`name:es`,
`name:en`, etc.). El estilo de la app muestra el nombre en el idioma de la interfaz si
existe y, si no, el nombre local.

## Estilo

La app guarda una copia del estilo `liberty` publicado por OpenFreeMap
(`src/map-platform/providers/openfreemap/styles/liberty.json`) y lo adapta al armarlo:
deja una sola fuente de teselas (se quita el relieve sombreado `ne2_shaded`, que es una
segunda fuente de imágenes y no estaría disponible sin conexión), cambia los nombres al
idioma de la interfaz y hace que teselas, tipografías (glifos) e íconos (sprites) se pidan
a través de la app. Los glifos y los íconos siguen saliendo del servidor de OpenFreeMap
(`/fonts/` y `/sprites/`); la app los guarda en el celular la primera vez que los usa y al
descargar una zona, para poder dibujar nombres y lugares sin conexión.

## Atribución exigida

OpenFreeMap exige atribución. El texto que pide es
«OpenFreeMap © OpenMapTiles Data from OpenStreetMap»; la mención a OpenFreeMap es
opcional, las de OpenMapTiles y OpenStreetMap no. La app muestra de forma permanente
sobre el mapa «© OpenStreetMap · OpenMapTiles · OpenFreeMap» y, al tocarla, abre el
detalle de cada fuente con su enlace. Los datos de OpenStreetMap se distribuyen bajo la
licencia ODbL.

## Frecuencia de actualización

OpenFreeMap publica una compilación nueva del planeta cada semana. La app consulta la
compilación vigente al arrancar y la vuelve a consultar cada seis horas. Una zona
descargada conserva la versión con la que se bajó; «Actualizar» en la lista de zonas la
vuelve a descargar completa con la versión vigente.

## Condiciones de uso y riesgo conocido

El servicio se ofrece «tal cual», sin garantía de disponibilidad, y se sostiene con
donaciones. Sus términos de servicio (versión del 9 de septiembre de 2026) piden no
«recolectar datos del servicio de forma automatizada sin permiso». La descarga de zonas
de Riders baja las teselas de una en una, con un máximo de 4 peticiones simultáneas y un
tope de teselas por zona, que es una carga comparable a la de alguien que recorre el mapa
a mano; aun así, es una descarga automatizada. Antes de usar la descarga de zonas más
allá de las pruebas conviene escribirle al responsable del servicio
(info@openfreemap.org), contarle el uso previsto y pedir su conformidad. Si la respuesta
fuera negativa, las alternativas son autoalojar la instancia o pasar al proveedor PMTiles,
descritas abajo. Esta decisión está pendiente y corresponde al dueño del proyecto.

## Cómo autoalojar la instancia

OpenFreeMap es código abierto completo, incluida la puesta en producción
(https://github.com/hyperknot/openfreemap). Para tener una instancia propia hace falta un
servidor Linux con disco suficiente para la imagen del planeta. Los pasos que indica el
proyecto son: copiar `config/linux_host/config.sample.jsonc` a una configuración con
nombre propio (por ejemplo `config/linux_host/self-hosted.jsonc`), completar el dominio,
los certificados, las áreas (primero `["monaco"]` para probar, después
`["planet", "monaco"]`) y la actualización automática, y ejecutar
`./linux_host/deploy_linux_host.py --config self-hosted`. El servidor resultante sirve las
mismas direcciones que la instancia pública (teselas, estilos, glifos e íconos).

Para que Riders use esa instancia alcanza con cambiar `serverUrl` en
`src/config/map-config.ts`. No hay que tocar nada más.

## Ruta de salida: archivo PMTiles

Si OpenFreeMap dejara de estar disponible y no se quisiera operar un servidor, la
alternativa es un archivo PMTiles alojado en almacenamiento estático (ver `design.md`,
D3). El módulo `map-platform` ya tiene un segundo proveedor de ejemplo detrás de la misma
interfaz: `pmtiles-sample`, que lee las teselas de `public/sample-tiles/cachi.pmtiles`
(una zona chica alrededor de Cachi, Salta, generada con
`node scripts/build-sample-pmtiles.mjs`). Se elige por configuración, sin cambios fuera
de `map-platform`:

```sh
VITE_TILE_PROVIDER=pmtiles-sample npm run dev
```

El proveedor de ejemplo usa el mismo esquema OpenMapTiles y por eso el mismo estilo; los
glifos y los íconos siguen saliendo del servidor configurado en `serverUrl`.
