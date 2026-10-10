# Design

## Context

Ver `proposal.md` para la motivación. Estado actual: PWA (Progressive Web App) en React con TypeScript, publicada en GitHub Pages, sin backend; `map-platform` es el único módulo que conoce a proveedores externos y ese criterio se repite acá. Restricciones que condicionan el enfoque: proveedores sin costo y sin medio de pago registrado; la app se usa a los saltos (semanas sin uso entre viaje y viaje); el dispositivo principal de verificación es un iPhone con la app instalada en la pantalla de inicio, que es el entorno más exigente para un ingreso con Google; y los próximos changes necesitan del mismo backend una base de datos con sincronización en tiempo real (`trip-tracking`).

## Goals / Non-Goals

**Goals:**
- Un Rider identificado con Google, con perfil (nombre visible, avatar, moto) sincronizado entre sus dispositivos.
- Backend sin costo, sin medio de pago, que no se apague por inactividad y que sirva también para los changes siguientes.
- Ingreso con Google verificado en un iPhone con la app instalada antes de construir el resto.
- Datos de personas con el mínimo necesario, visibilidad acotada por reglas versionadas y eliminación completa a pedido del Rider.

**Non-Goals:**
- Diseñar el modelo de datos de Roadmaps y Trips: solo se deja el documento del Rider con los campos que este change necesita.
- Dibujar un avatar fotorrealista: el sistema de avatares es el de la imagen de referencia, simple y legible sobre el mapa.

## Decisions

### D1. Backend: Firebase en plan Spark (Authentication con Google, Cloud Firestore)
El plan Spark no exige medio de pago y cubre con holgura el uso previsto: autenticación con Google sin costo, Firestore con 1 GiB, 50.000 lecturas y 20.000 escrituras por día; incluye además Realtime Database, pensada para posiciones en vivo, que `trip-tracking` va a usar. El proyecto no se pausa por inactividad. El SDK web funciona sin servidor propio: la app habla directamente con Firebase y las reglas de seguridad (versionadas en el repositorio) deciden quién lee y escribe qué.
- *Alternativas:* Supabase ofrece Postgres, autenticación con Google y tiempo real, pero su plan gratuito pausa el proyecto tras una semana sin uso, incompatible con una app que se usa a los saltos. Un backend propio (Node, PocketBase) requiere un servidor con costo mensual. Guardar todo en el celular sin backend no permite que otros Riders existan.

### D2. Hosting: la PWA pasa a Firebase Hosting; GitHub Pages se retira
El ingreso con Google en una web app instalada en iOS necesita el flujo por redirección (el flujo por ventana emergente no vuelve de forma confiable a una app instalada) y, en Safari, ese flujo solo funciona bien cuando el intermediario de autenticación de Firebase corre en el mismo dominio que la app. En Firebase Hosting eso es automático (`authDomain` igual al dominio de la app); en GitHub Pages no hay forma de lograrlo. Firebase Hosting no tiene costo (10 GB, 360 MB por día de transferencia) ni medio de pago. La publicación sigue saliendo de GitHub Actions al integrar en `main`, con la credencial de despliegue guardada como secreto del repositorio en GitHub, nunca en el código. El workflow de GitHub Pages se elimina y Pages se desactiva en la configuración del repositorio.
- *Alternativas:* mantener GitHub Pages y usar el botón de Google Identity Services, que entrega un token sin pasar por el intermediario de Firebase; en una app instalada en iOS abre una ventana emergente, con el mismo problema de retorno. Mantener GitHub Pages con un dominio propio apuntando al intermediario: requiere comprar un dominio.

### D3. Flujo de ingreso: redirección, sesión persistente, verificación temprana en iPhone
Se usa `signInWithRedirect` con persistencia local de la sesión. La primera tarea del change después de crear el proyecto es verificar en el iPhone, con la app instalada, que el ingreso vuelve a la app identificado; si no lo hiciera, la alternativa documentada es `signInWithPopup`, que en iOS 16.4 o posterior abre un navegador integrado dentro de la app instalada. Esa verificación se hace antes de construir perfil y avatar, para no construir sobre un ingreso que no funciona.

### D4. Modelo de datos: un documento por Rider, con reglas de visibilidad
Colección `riders`, documento con id igual al identificador de usuario de Firebase: `displayName`, `avatar` (opciones: `helmetType`, `helmetColor`, `neckwear`, `neckwearColor`, `glasses`, `beard`), `vehicle` (`model`, `rangeKm`), `createdAt`, `updatedAt`. El correo electrónico queda solo en Authentication, nunca en Firestore. Reglas: escribir solo el propio documento, con validación de tipos y rangos (nombre 2 a 24, modelo 2 a 40, autonomía entero 50 a 1000); leer `displayName` y `avatar` de cualquier Rider si se está identificado; `vehicle` solo el propio. Firestore no permite ocultar campos de un documento en la lectura, así que `vehicle` vive en un subdocumento `riders/{id}/private/vehicle` con regla de lectura solo para el dueño.
- *Alternativas:* una colección `vehicles` separada: más natural si hubiera varias motos por Rider; con una sola, el subdocumento privado es más simple y deja el camino abierto.

### D5. Avatar paramétrico, dibujado en la app
El avatar es un conjunto de opciones (D4) y se dibuja como capas SVG en un módulo `avatar` propio: casco (integral o rebatible, en blanco, negro o gris), visor transparente con ojos, gafas y barba opcionales, y accesorio de cuello (pañuelo, buff, cilindro, o bandera a cuadros en negro y blanco) con su color. La fuente de diseño es `docs/rider-avatars-no-background.png`; las capas SVG se dibujan a mano en el repositorio siguiendo esa referencia. Ventajas: no se suben ni almacenan imágenes, el avatar pesa unos bytes, se renderiza nítido a cualquier tamaño (perfil y marcador sobre el mapa) y funciona sin conexión.
- *Alternativas:* foto de perfil subida por el Rider: requiere almacenamiento de archivos, moderación y recorte, y sobre el mapa se lee peor. Usar la foto de Google: expone un dato de la cuenta y no identifica a un motociclista con casco.

### D6. Sin conexión: persistencia local de Firestore
Se habilita la caché local de Firestore: el perfil se lee sin conexión y las escrituras hechas sin conexión quedan en cola y se envían al recuperarla. La app muestra el estado "pendiente de sincronizar" a partir de los metadatos de escritura pendiente. Ingresar y eliminar la cuenta requieren conexión y se señalan como no disponibles sin ella.

### D7. Límites de módulos
`src/backend/` encapsula al SDK de Firebase (inicialización, autenticación, Firestore, emuladores) y expone la interfaz `RiderAccountService` (ingresar, cerrar sesión, Rider actual, guardar perfil, guardar Vehicle, eliminar cuenta, suscripción a cambios). `src/rider-account/`, `src/rider-vehicles/` y `src/avatar/` consumen esa interfaz. Ningún módulo fuera de `src/backend/` importa Firebase; la regla del linter que ya protege a `map-platform` se extiende a `backend`. La configuración pública de Firebase (identificadores del proyecto y clave web) va en el código: no es un secreto, la seguridad la dan las reglas.

### D8. Pruebas con el emulador local de Firebase
Las pruebas unitarias y de Playwright corren contra Firebase Emulator Suite (Authentication y Firestore), sin tocar el proyecto real ni la red. Las reglas de seguridad se prueban con `@firebase/rules-unit-testing`, un caso por regla (dueño escribe, otro no; identificado lee nombre y avatar, no identificado no; `vehicle` solo el dueño).

### D9. Pantalla de consentimiento de Google
El proyecto de Google Cloud que respalda al ingreso con Google queda con pantalla de consentimiento en modo "externo"; mientras esté en estado de prueba, solo las cuentas registradas como usuarios de prueba (hasta 100) pueden ingresar, suficiente para el grupo. Publicarla para cualquier cuenta de Google no tiene costo, pero muestra una advertencia de "app no verificada" hasta pasar la verificación de Google; se decide cuando haga falta.

## Risks / Trade-offs

- [El ingreso por redirección no vuelve a la app instalada en iOS] → verificación temprana en iPhone (D3) antes de construir el resto; alternativa `signInWithPopup` documentada; si ninguna funciona, el ingreso se hace desde Safari y la sesión persiste en la app instalada, lo que se registra como limitación.
- [Cambiar de hosting rompe lo ya verificado (instalación, service worker, zonas descargadas)] → la URL cambia una sola vez; se repiten 7.1 y 7.2 del change anterior sobre la URL nueva y se registran en `docs/verificacion-dispositivos.md`; las zonas descargadas en la URL vieja no se migran (la app es nueva en el celular).
- [La cuota diaria de Firestore se agota] → con el uso previsto (decenas de Riders, lecturas de perfil) se usa una fracción mínima; se documenta cómo ver el consumo en la consola de Firebase.
- [La clave web de Firebase está en el repositorio público] → es pública por diseño; la seguridad depende de las reglas (D4, D8) y de restringir la clave a los dominios de la app en la consola de Google Cloud.
- [Un Rider con perfil incompleto queda en un estado intermedio] → el estado "perfil incompleto" se modela explícitamente y el spec lo cubre; el documento del Rider se crea recién al completar el perfil.
- [Eliminar la cuenta falla a mitad (perfil borrado, cuenta de Google todavía vinculada)] → se borra primero Firestore y después Authentication; si el segundo paso falla, un nuevo ingreso encuentra perfil vacío y se trata como primer ingreso, que es el resultado esperado.

## Migration Plan

- Hosting: crear el sitio en Firebase Hosting, publicar, verificar en iPhone, y recién entonces eliminar el workflow de GitHub Pages y desactivar Pages. Durante unos días pueden convivir las dos URL; la vieja muestra un aviso con la nueva.
- Datos: no hay datos previos que migrar.
- Vuelta atrás: el workflow de Pages queda en el historial de git; restaurarlo es un commit.

## Open Questions

- Si la pantalla de consentimiento de Google se publica para cualquier cuenta o se mantiene con usuarios de prueba: afecta solo la configuración en la consola, no los specs ni las tareas.
- Nombre definitivo de la aplicación: afecta el nombre del proyecto de Firebase y el dominio `*.web.app` que se obtiene; mientras tanto "riders".
