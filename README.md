# Riders

Riders (nombre provisorio) es una aplicación para el celular que ayuda a grupos de
viajeros en moto a planificar y realizar viajes. Se distribuye como PWA (Progressive Web
App). Este repositorio contiene la base de la app: la PWA instalable, el mapa con la
posición del Rider y la descarga de zonas del mapa para usarlas sin conexión.

La especificación vive en `openspec/` (ver `docs/mapa-de-capabilities.md`). El proveedor
del mapa y cómo reemplazarlo están documentados en `docs/proveedor-de-mapa.md`.

## Requisitos

Node.js 24 o superior, con npm, y Java 21 o superior para el emulador de Firebase que usan
las pruebas. En Mac:

```sh
brew install node openjdk@21
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

Corre las pruebas unitarias y de componentes (Vitest con React Testing Library). No
necesitan red ni emulador.

```sh
npm run test:emulator
```

Corre las pruebas que necesitan el backend: levanta Firebase Emulator Suite
(Authentication y Firestore), corre las pruebas `*.emulator.test.ts` (el servicio de
cuenta y las reglas de seguridad de `firestore.rules`) y lo apaga. Nunca toca el proyecto
real.

```sh
npm run test:e2e
```

Corre las pruebas de flujo completo (Playwright, Chromium emulando un celular). Levanta el
emulador, construye la app apuntando a él, la sirve y la recorre como un Rider: idioma,
arranque sin conexión, mapa, gestos táctiles y descarga de zonas. Necesita conexión a
internet, porque usa las teselas reales de OpenFreeMap.

Para correr una sola prueba de Playwright o la app contra el emulador, `npm run emulators`
lo deja levantado en una terminal; `npx playwright test <archivo>` y
`VITE_BACKEND_EMULATOR=true npm run dev` lo encuentran ahí.

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

La app se publica en Firebase Hosting con la acción `.github/workflows/publicar-en-firebase.yml`,
que corre en cada cambio en la rama `main`: verifica formato y linter, corre todas las
pruebas, construye la app y la publica junto con las reglas de Firestore. Publicar es
integrar el cambio en `main`.

La app publicada está en https://riders-65821.web.app.

Preparación, ya hecha para este repositorio y necesaria una sola vez en uno nuevo: crear
el proyecto de Firebase como indica `docs/backend.md`, crear una cuenta de servicio de
despliegue y guardar su clave como secreto del repositorio:

```sh
gcloud iam service-accounts create github-deploy --project <proyecto>
for rol in roles/firebasehosting.admin roles/firebaserules.admin roles/firebaseauth.admin \
  roles/serviceusage.apiKeysViewer roles/run.viewer roles/serviceusage.serviceUsageConsumer; do
  gcloud projects add-iam-policy-binding <proyecto> \
    --member serviceAccount:github-deploy@<proyecto>.iam.gserviceaccount.com --role $rol
done
gcloud iam service-accounts keys create clave.json \
  --iam-account github-deploy@<proyecto>.iam.gserviceaccount.com
gh secret set FIREBASE_SERVICE_ACCOUNT_RIDERS < clave.json && rm clave.json
```

La clave no entra nunca al repositorio. Publicar a mano desde la Mac, con la sesión del
CLI de Firebase, sigue siendo posible: `npm run build && npx firebase deploy`.

Para volver a una versión anterior se vuelve a publicar su commit: en la pestaña Actions,
abrir la corrida de ese commit y elegir «Re-run all jobs». Firebase Hosting también guarda
cada versión publicada: en la consola, Hosting → historial de versiones → «Revertir».

## Estructura

- `src/app-shell/`: instalación, opciones e idioma.
- `src/avatar/`: sistema de avatares de los Riders, dibujado en SVG a partir de opciones
  (`docs/rider-avatars-no-background.png` es la referencia). Las capturas de referencia de
  Playwright están en `e2e/capturas/`; se regeneran con
  `npx playwright test e2e/avatares.spec.ts --update-snapshots`.
- `src/backend/`: único módulo que conoce al proveedor de autenticación y de base de datos
  (Firebase). Expone `RiderAccountService`. Ver `docs/backend.md`.
- `src/rider-account/`: ingreso, sesión, perfil inicial y edición del perfil del Rider.
- `src/rider-vehicles/`: la moto del Rider (marca/modelo y autonomía) y sus validaciones.
- `src/connectivity/`: estado de conectividad y acciones que la requieren.
- `src/i18n/`: textos por idioma (`locales/es-AR.json`, `locales/en.json`). Ningún
  componente lleva texto visible fijo; una prueba lo verifica.
- `src/map-platform/`: único módulo que conoce al renderizador (MapLibre) y a los
  proveedores de mapa. Expone `TileSource`, `OfflineRegionStore`, `MapView` y
  `Geolocation`.
- `src/map-view/`: pantalla del mapa, posición del Rider y atribución.
- `src/offline-maps/`: pantalla de zonas descargadas y aviso de almacenamiento.
- `src/config/map-config.ts`: proveedor de teselas, servidor, estilo y límites.
- `src/config/backend-config.ts`: configuración pública del proyecto de Firebase.
- `firestore.rules`: reglas de acceso a la base de datos, publicadas con la app.
- `e2e/`: pruebas de flujo completo.
