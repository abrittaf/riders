# Backend

Riders usa Firebase en plan Spark (sin costo y sin medio de pago): Authentication con Google, Cloud Firestore y Hosting. Las decisiones están en `openspec/changes/rider-onboarding/design.md` (D1 a D9). El único módulo de la app que conoce a Firebase es `src/backend/`.

## Proyecto actual

| Dato                | Valor                                        |
| ------------------- | -------------------------------------------- |
| Proyecto            | `riders-65821` (número 528755913716)         |
| Plan                | Spark                                        |
| App web             | `1:528755913716:web:e8d9300e4531a663cb3fa1`  |
| URL de la app       | https://riders-65821.web.app                 |
| Firestore           | base `(default)`, región `southamerica-east1` |
| Configuración local | `.firebaserc`, `firebase.json`, `firestore.rules` |
| Configuración de la app | `src/config/backend-config.ts`           |

La configuración de `src/config/backend-config.ts` (clave web, identificadores) es pública por diseño: identifica al proyecto, no lo protege. La seguridad la dan las reglas de Firestore. Ningún secreto va al repositorio.

## Cómo repetir la creación en un proyecto nuevo

Todo lo que tiene comando se hace con el CLI de Firebase (`firebase-tools`, instalado como dependencia de desarrollo: `npx firebase`) y con `gcloud`. Reemplazar `<proyecto>` por el identificador elegido; el identificador es global, no se puede cambiar después y define la URL `<proyecto>.web.app`.

### 1. Por línea de comandos

1. Iniciar sesión con la cuenta de Google dueña del proyecto:
   ```
   npx firebase login
   ```
2. Crear el proyecto (queda en plan Spark):
   ```
   npx firebase projects:create <proyecto> --display-name "Riders"
   ```
3. Registrar la app web y obtener su configuración pública:
   ```
   npx firebase apps:create WEB "Riders" --project <proyecto>
   npx firebase apps:sdkconfig WEB <id-de-la-app> --project <proyecto>
   ```
   Copiar `apiKey`, `projectId`, `appId`, `messagingSenderId` y `storageBucket` a `src/config/backend-config.ts`. En `authDomain` no va el valor que devuelve el comando (`<proyecto>.firebaseapp.com`) sino `<proyecto>.web.app`: el ingreso por redirección necesita que el intermediario de autenticación esté en el mismo dominio que la app (D2).
4. Habilitar las API de Firestore y de Authentication:
   ```
   gcloud services enable firestore.googleapis.com identitytoolkit.googleapis.com --project <proyecto>
   ```
   La habilitación tarda unos minutos en propagarse; si el paso siguiente responde 403, esperar y repetir.
5. Crear la base de datos de Firestore. La región no se puede cambiar después; `southamerica-east1` (San Pablo) es la más cercana a la Argentina:
   ```
   npx firebase firestore:databases:create "(default)" --location southamerica-east1 --project <proyecto>
   ```
6. Apuntar el repositorio al proyecto: poner el identificador en `.firebaserc`.
7. Publicar las reglas de Firestore y la app:
   ```
   npm run build
   npx firebase deploy --only firestore:rules,hosting
   ```

### 2. En la consola web (no tienen comando)

1. Habilitar el ingreso con Google. Consola de Firebase (https://console.firebase.google.com) → proyecto → menú lateral **Compilación → Authentication** → botón **Comenzar** → pestaña **Método de acceso** → **Google** → activar **Habilitar** → **Nombre público del proyecto**: `Riders` → **Correo electrónico de asistencia**: el de la cuenta dueña → **Guardar**.
2. Verificar los dominios autorizados. Misma pantalla → pestaña **Configuración** → **Dominios autorizados**: deben figurar `localhost` y `<proyecto>.web.app` (Firebase los agrega solos).
3. Autorizar la redirección al dominio de la app. Consola de Google Cloud (https://console.cloud.google.com) → elegir el proyecto → menú **API y servicios → Credenciales** → en **ID de clientes OAuth 2.0** abrir **Web client (auto created by Google Service)** → **URI de redireccionamiento autorizados** → **Agregar URI**: `https://<proyecto>.web.app/__/auth/handler` → **Guardar**. Sin este paso Google rechaza el ingreso con `redirect_uri_mismatch`.
4. Usuarios de prueba de la pantalla de consentimiento (D9). Consola de Google Cloud → menú **Google Auth Platform → Público**. Si el **Estado de publicación** es **Prueba**, en **Usuarios de prueba** → **Agregar usuarios** cargar el correo de cada Rider del grupo (hasta 100). Si es **En producción**, cualquier cuenta de Google puede ingresar y no hace falta cargar a nadie.

Este documento da la ruta de menú de cada paso en lugar de capturas de pantalla: la consola cambia de aspecto con frecuencia y la ruta envejece mejor.

## Emulador local

Las pruebas corren contra Firebase Emulator Suite (Authentication y Firestore), nunca contra el proyecto real. Los puertos están en `firebase.json` y en `src/backend/emulator-config.ts`; el proyecto emulado es `demo-riders`: el prefijo `demo-` garantiza que el emulador no consulte ningún proyecto de Google. La app construida con `VITE_BACKEND_EMULATOR=true` se conecta al emulador en lugar del proyecto real.

| Comando                 | Qué hace                                                                |
| ----------------------- | ----------------------------------------------------------------------- |
| `npm run emulators`     | Deja el emulador levantado (Authentication en 9099, Firestore en 8080)  |
| `npm run test:emulator` | Levanta el emulador, corre las pruebas `*.emulator.test.ts` y lo apaga  |
| `npm run test:e2e`      | Igual, con las pruebas de Playwright sobre la app construida            |

El emulador corre sobre Java 21 o superior (`brew install openjdk@21`).

## Reglas de seguridad

`firestore.rules` implementa D4: cada Rider escribe solo su documento `riders/{id}` (nombre visible de 2 a 24 caracteres, avatar con opciones del sistema de avatares, fechas de creación y actualización) y su subdocumento privado `riders/{id}/private/vehicle` (marca/modelo de 2 a 40, autonomía entera de 50 a 1000). Cualquier Rider identificado lee los perfiles; nadie sin sesión lee nada; el Vehicle lo lee solo su dueño. Las reglas se publican junto con la app en cada merge en `main` y se prueban en `src/backend/firebase/firestore-rules.emulator.test.ts`.

## Consumo

Consola de Firebase → proyecto → **Uso y facturación**. Los límites diarios del plan Spark que importan acá: 50.000 lecturas y 20.000 escrituras de Firestore, 360 MB de transferencia de Hosting.
