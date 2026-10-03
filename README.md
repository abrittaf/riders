# Riders

Riders (nombre provisorio) es una aplicación para el celular que ayuda a grupos de
viajeros en moto a planificar y realizar viajes. Se distribuye como PWA (Progressive Web
App). Este repositorio contiene la base de la app: la PWA instalable, el mapa con la
posición del Rider y la descarga de zonas del mapa para usarlas sin conexión.

La especificación vive en `openspec/` (ver `docs/mapa-de-capabilities.md`). El proveedor
del mapa y cómo reemplazarlo están documentados en `docs/proveedor-de-mapa.md`.

## Requisitos

Node.js 24 o superior, con npm. En Mac:

```sh
brew install node
```

## Instalar

```sh
npm install
```

Las pruebas de flujo completo usan un navegador que Playwright descarga aparte, una sola
vez:

```sh
npx playwright install chromium
```

## Correr

```sh
npm run dev
```

Abre la app en `http://localhost:5173`, con recarga automática al editar. El service
worker (arranque sin conexión) no participa en este modo; para probarlo hay que construir
la app y servir el resultado:

```sh
npm run build
npm run preview
```

`npm run preview` sirve la app construida en `http://localhost:4173`.

Para correr la app con el proveedor de mapa de ejemplo (archivo PMTiles local, zona de
Cachi, Salta) en lugar de OpenFreeMap:

```sh
VITE_TILE_PROVIDER=pmtiles-sample npm run dev
```

## Probar

```sh
npm test
```

Corre las pruebas unitarias y de componentes (Vitest con React Testing Library).

```sh
npm run test:e2e
```

Corre las pruebas de flujo completo (Playwright, Chromium emulando un celular). Construye
la app, la sirve y la recorre como un Rider: idioma, arranque sin conexión, mapa, gestos
táctiles y descarga de zonas. Necesita conexión a internet, porque usa las teselas reales
de OpenFreeMap.

```sh
npm run lint
```

Corre el linter (oxlint) y verifica el formato (Prettier). El linter incluye la regla que
impide importar el renderizador de mapas o los proveedores fuera de `src/map-platform/`.
Para aplicar el formato:

```sh
npm run format
```

## Publicar

La app se publica en GitHub Pages con la acción `.github/workflows/publicar-en-pages.yml`,
que corre en cada cambio en la rama `main`: verifica formato y linter, corre todas las
pruebas, construye la app y la publica. No hay un comando local de publicación: publicar
es integrar el cambio en `main`.

Preparación, una sola vez: en GitHub, en Settings → Pages del repositorio, elegir
«GitHub Actions» como origen (Source). La dirección publicada queda en
`https://<usuario>.github.io/<repositorio>/`.

Para volver a una versión anterior se vuelve a publicar su commit: en la pestaña Actions,
abrir la corrida de ese commit y elegir «Re-run all jobs».

## Estructura

- `src/app-shell/`: instalación, opciones e idioma.
- `src/connectivity/`: estado de conectividad y acciones que la requieren.
- `src/i18n/`: textos por idioma (`locales/es-AR.json`, `locales/en.json`). Ningún
  componente lleva texto visible fijo; una prueba lo verifica.
- `src/map-platform/`: único módulo que conoce al renderizador (MapLibre) y a los
  proveedores de mapa. Expone `TileSource`, `OfflineRegionStore`, `MapView` y
  `Geolocation`.
- `src/map-view/`: pantalla del mapa, posición del Rider y atribución.
- `src/offline-maps/`: pantalla de zonas descargadas y aviso de almacenamiento.
- `src/config/map-config.ts`: proveedor de teselas, servidor, estilo y límites.
- `e2e/`: pruebas de flujo completo.
