# Verificación en celulares reales

Registro de las pruebas en celulares de cada change (sección 7 de `openspec/changes/map-platform-foundation/tasks.md`
y las de `rider-onboarding`). Se completa a mano, por dispositivo, sobre la app publicada:
hasta el 2026-10-05 en GitHub Pages (`https://abrittaf.github.io/riders/`), desde entonces
en Firebase Hosting (`https://riders-65821.web.app`). Cada resultado
lleva fecha, versión del sistema operativo y del navegador, y lo observado.

## Dispositivos

| Dispositivo | Sistema operativo | Navegador | Fecha |
| --- | --- | --- | --- |
| iPhone 17 Pro Max | iOS 27.2 | Safari | 2026-10-03 |
| iPhone 11 Pro Max | iOS 27.0 | Safari | 2026-10-03 |

Los resultados de la columna «iPhone» valen para los dos modelos.

## Limitación: sin verificación en Android

No se dispone de un celular Android. La instalación, el mapa sin conexión y la posición
propia (7.1, 7.2 y 7.4) no están verificados en un Android real; mientras tanto, la
cobertura de Android es la de las pruebas de Playwright con emulación Chromium. La
verificación en un dispositivo queda como tarea 7.6, pendiente hasta contar con uno, y sus
resultados se anotan en la columna «Android» de cada tabla.

## 7.1 Instalación, apertura sin la interfaz del navegador y apertura sin red

| Verificación | iPhone | Android |
| --- | --- | --- |
| La app ofrece instalarse (Android) o muestra los pasos (iOS) | Ok | Pendiente (7.6) |
| Queda en la pantalla de inicio con su ícono y su nombre | Ok | Pendiente (7.6) |
| Abre sin la interfaz del navegador (barra de direcciones y controles) | Ok | Pendiente (7.6) |
| Ya instalada, no vuelve a ofrecer la instalación | Ok | Pendiente (7.6) |
| Abre completa en modo avión | Ok | Pendiente (7.6) |

## 7.2 Zona descargada en modo avión

| Verificación | iPhone | Android |
| --- | --- | --- |
| Descarga de una zona: tamaño estimado, progreso y fin | Ok | Pendiente (7.6) |
| Tamaño estimado frente a tamaño real | Ok | Pendiente (7.6) |
| En modo avión, el mapa se ve completo dentro de la zona, con nombres y lugares | Ok | Pendiente (7.6) |
| Fuera de la zona aparece el aviso de zona no disponible | Ok | Pendiente (7.6) |

## 7.3 Persistencia después de cuatro días (iPhone)

Pendiente: la reapertura corresponde el 2026-10-07 o después, sin abrir la app en el medio.

| Verificación | Resultado |
| --- | --- |
| Fecha de la descarga | 2026-10-03 |
| Fecha de la reapertura (sin haber abierto la app en el medio) | Prevista: 2026-10-07 o después |
| La zona sigue en la lista y el mapa se ve en modo avión | |

Si la zona se pierde, hay que revisar la decisión D4 de `design.md`.

## 7.4 Posición propia en movimiento

| Verificación | iPhone | Android |
| --- | --- | --- |
| La marca de posición se actualiza durante el trayecto | Ok, en un trayecto de 2 minutos | Pendiente (7.6) |
| «Centrar en mi posición» lleva el mapa a la posición | Ok | Pendiente (7.6) |
| Comportamiento del permiso de ubicación (¿lo vuelve a pedir? ¿cuándo?) | Al actualizarse la app | Pendiente (7.6) |

## 7.5 Instalabilidad, apertura sin red y Lighthouse

Verificado el 3 de octubre de 2026 sobre `https://abrittaf.github.io/riders/`, desde una
Mac, con herramientas automatizadas. No reemplaza la instalación real en los celulares
(7.1).

| Verificación | Resultado |
| --- | --- |
| Dirección verificada | `https://abrittaf.github.io/riders/` |
| El navegador considera la app instalable | Sí. Comprobación de instalabilidad de Chrome 154: manifiesto leído sin errores y service worker activo con alcance `/riders/`. El único error informado fue `in-incognito`, propio del perfil temporal de la prueba y no de la app |
| Abre sin red | Sí. Chromium en emulación de celular: tras una primera carga, con la red cortada la app vuelve a abrir con su interfaz y muestra el indicador «Sin conexión» |

Lighthouse 13.5.0, emulación de celular. Esta versión ya no incluye la auditoría de PWA;
sus puntajes se registran como dato adicional.

| Categoría | Puntaje |
| --- | --- |
| Rendimiento | 43 |
| Accesibilidad | 100 |
| Buenas prácticas | 100 |
| SEO | 90 |

| Métrica de la primera carga | Valor |
| --- | --- |
| Primer contenido visible | 3,1 s |
| Contenido principal visible (LCP) | 6,7 s |
| Tiempo de bloqueo total | 1.390 ms |
| Desplazamiento de layout | 0 |
| Peso total transferido | 944 KiB |

Hallazgos:

- El rendimiento bajo viene de la primera carga: un único archivo de JavaScript que incluye
  el renderizador de mapas (1,9 s de ejecución, unos 207 KiB sin usar al inicio). Las
  aperturas siguientes las sirve el service worker desde el celular. Separar el
  renderizador de la carga inicial queda como mejora para otro change.
- El botón de atribución muestra «© OpenStreetMap · …» pero su nombre accesible es
  «Fuentes del mapa»; Lighthouse marca que no coinciden.
- Falta la meta descripción de la página (de ahí el 90 de SEO).
- No se publican source maps del archivo de JavaScript.
- GitHub Pages sirve los archivos con vida de caché corta; no es configurable ahí y el
  service worker lo compensa.

## Ingreso con Google en la app instalada (rider-onboarding, tarea 1.4)

Verificado el 2026-10-05 sobre `https://riders-65821.web.app`, con la app instalada en la pantalla de inicio desde Safari y abierta desde su ícono.

| Verificación | iPhone | Android |
| --- | --- | --- |
| «Ingresar con Google» abre el ingreso de Google y, al completarlo, vuelve a la app instalada | Ok | Pendiente (7.6) |
| Al volver, la app muestra al Rider identificado («Ingresaste como …») | Ok | Pendiente (7.6) |
| Hizo falta la alternativa de D3 (`signInWithPopup`) | No | Pendiente (7.6) |

## Medición para fijar el límite de teselas por zona

`design.md` deja abierto el límite de teselas por zona (hoy 12000, provisorio). Para
fijarlo, anotar acá el tamaño real y el tiempo de descarga de zonas típicas (un tramo de
ruta de 300 km).

| Zona | Teselas | Tamaño real | Tiempo de descarga | Dispositivo |
| --- | --- | --- | --- | --- |
| | | | | |
