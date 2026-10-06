# Tasks

## 1. Proyecto Firebase, ingreso verificado y hosting

- [x] 1.1 Crear el proyecto de Firebase en plan Spark, habilitar Authentication con Google y Cloud Firestore (modo producción, reglas que niegan todo), y documentar en `docs/backend.md` cada paso de consola con su captura de dónde está; verificar que el documento permite repetir la creación en un proyecto nuevo
- [x] 1.2 Agregar el SDK de Firebase y crear `src/backend/` con la inicialización y una interfaz mínima `RiderAccountService` (ingresar, cerrar sesión, Rider actual); verificar con la regla del linter que ningún módulo fuera de `src/backend/` importa Firebase
- [x] 1.3 Configurar Firebase Hosting con el sitio del proyecto, publicar manualmente una vez con la app actual, y verificar desde la Mac que la URL `*.web.app` carga el mapa y la app es instalable
- [x] 1.4 Implementar el ingreso con Google por redirección con persistencia local y un botón provisorio, e instalar la app en el iPhone desde la URL nueva; verificar que el ingreso vuelve a la app instalada identificado y registrar el resultado en `docs/verificacion-dispositivos.md`; si falla, aplicar la alternativa de D3 y repetir
- [x] 1.5 Crear la acción de GitHub que publica `main` en Firebase Hosting con la credencial guardada como secreto del repositorio, eliminar el workflow de GitHub Pages, desactivar Pages y actualizar `README.md`; verificar que un merge en `main` publica y que la URL vieja ya no sirve la app

## 2. Emulador y pruebas de base

- [ ] 2.1 Configurar Firebase Emulator Suite (Authentication y Firestore) con un script `npm run emulators`, y hacer que Vitest y Playwright apunten al emulador; verificar que una prueba crea un usuario en el emulador y lo lee
- [ ] 2.2 Escribir las reglas de seguridad de Firestore según D4 y sus pruebas con `@firebase/rules-unit-testing`; verificar que fallan las escrituras ajenas, las lecturas sin sesión y la lectura de `vehicle` por otro Rider, y que pasan las permitidas

## 3. Ingreso, sesión y uso sin cuenta (`rider-account`)

- [ ] 3.1 Implementar el estado de sesión en la app (sin cuenta, identificado con perfil incompleto, identificado con perfil completo) y el acceso a ingresar desde la barra de la app; verificar con pruebas unitarias las transiciones entre los tres estados
- [ ] 3.2 Implementar ingreso cancelado o fallido con su aviso, e ingreso señalado como no disponible sin conectividad; verificar con Playwright contra el emulador los dos escenarios
- [ ] 3.3 Implementar cierre de sesión y verificar con Playwright que tras cerrar sesión la app vuelve al estado sin cuenta y que al reingresar el perfil está intacto
- [ ] 3.4 Verificar con Playwright que sin cuenta el mapa, la posición propia y las zonas descargadas siguen funcionando y que la acción de ingresar está visible

## 4. Avatar (`rider-account`)

- [ ] 4.1 Dibujar las capas SVG del sistema de avatares siguiendo `docs/rider-avatars-no-background.png` (cascos integral y rebatible en tres colores, visor con ojos, gafas, barba, cuatro accesorios de cuello) en `src/avatar/`; verificar con una prueba que toda combinación válida de opciones renderiza sin error y que la bandera a cuadros ignora el color
- [ ] 4.2 Implementar el componente de armado del avatar con vista previa inmediata y propuesta inicial al azar; verificar con pruebas unitarias que cambiar una opción actualiza la vista previa y que la propuesta inicial es una combinación válida
- [ ] 4.3 Implementar el componente de avatar en tamaño de perfil y en tamaño de marcador (el que usará el mapa); verificar visualmente en Playwright con capturas de referencia por combinación representativa

## 5. Perfil y moto (`rider-account`, `rider-vehicles`)

- [ ] 5.1 Implementar la pantalla de perfil inicial obligatorio: nombre visible propuesto desde Google y editable, armado del avatar, marca/modelo y autonomía, con las validaciones del spec junto a cada campo; verificar con pruebas unitarias cada validación (nombre 2 a 24, modelo 2 a 40, autonomía entero 50 a 1000)
- [ ] 5.2 Guardar el perfil según D4 (documento del Rider y subdocumento privado del Vehicle) y conservar lo cargado si el Rider abandona a medias; verificar con Playwright contra el emulador que al reabrir se retoma el perfil incompleto y que al completarlo se vuelve al mapa
- [ ] 5.3 Implementar la pantalla de perfil con edición de nombre, avatar, marca/modelo y autonomía, mostrando la autonomía con su unidad; verificar con Playwright que un cambio se refleja en una segunda sesión con la misma cuenta
- [ ] 5.4 Implementar la lectura del perfil público de otro Rider (nombre y avatar) en `RiderAccountService` para los próximos changes; verificar con pruebas contra el emulador que no expone correo ni Vehicle

## 6. Sin conexión y eliminación de cuenta (`rider-account`)

- [ ] 6.1 Habilitar la persistencia local de Firestore y el indicador "pendiente de sincronizar"; verificar con Playwright que un cambio de nombre hecho sin red se ve de inmediato, queda marcado como pendiente y se envía al restaurar la red
- [ ] 6.2 Implementar la eliminación de cuenta con confirmación explícita, reconfirmación de identidad cuando el ingreso no es reciente, y señalada como no disponible sin conectividad; verificar con Playwright contra el emulador que tras eliminar, un nuevo ingreso se trata como primer ingreso

## 7. Verificación en iPhone sobre la URL publicada

- [ ] 7.1 Repetir la instalación y la descarga de una zona (7.1 y 7.2 del change anterior) sobre la URL de Firebase Hosting y registrarlas en `docs/verificacion-dispositivos.md`
- [ ] 7.2 Completar el flujo entero en el iPhone instalado: ingresar, completar perfil con avatar y moto, cerrar sesión, reingresar, editar el perfil sin red y ver que sincroniza al volver la red; registrar cada paso en `docs/verificacion-dispositivos.md`
- [ ] 7.3 Ingresar con una segunda cuenta de Google (registrada como usuario de prueba) y verificar que ve el nombre y el avatar del primer Rider y no su moto; registrar el resultado
