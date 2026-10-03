# Verificación en celulares reales

Registro de las pruebas de la sección 7 de `openspec/changes/map-platform-foundation/tasks.md`.
Se completa a mano, por dispositivo, sobre la app publicada en GitHub Pages. Cada resultado
lleva fecha, versión del sistema operativo y del navegador, y lo observado.

## Dispositivos

| Dispositivo | Sistema operativo | Navegador | Fecha |
| --- | --- | --- | --- |
| iPhone (modelo) | | Safari | |
| Android (modelo) | | Chrome | |

## 7.1 Instalación, pantalla completa y apertura sin red

| Verificación | iPhone | Android |
| --- | --- | --- |
| La app ofrece instalarse (Android) o muestra los pasos (iOS) | | |
| Queda en la pantalla de inicio con su ícono y su nombre | | |
| Abre a pantalla completa, sin barra de direcciones | | |
| Ya instalada, no vuelve a ofrecer la instalación | | |
| Abre completa en modo avión | | |

## 7.2 Zona descargada en modo avión

| Verificación | iPhone | Android |
| --- | --- | --- |
| Descarga de una zona: tamaño estimado, progreso y fin | | |
| Tamaño estimado frente a tamaño real | | |
| En modo avión, el mapa se ve completo dentro de la zona, con nombres y lugares | | |
| Fuera de la zona aparece el aviso de zona no disponible | | |

## 7.3 Persistencia después de cuatro días (iPhone)

| Verificación | Resultado |
| --- | --- |
| Fecha de la descarga | |
| Fecha de la reapertura (sin haber abierto la app en el medio) | |
| La zona sigue en la lista y el mapa se ve en modo avión | |

Si la zona se pierde, hay que revisar la decisión D4 de `design.md`.

## 7.4 Posición propia en movimiento

| Verificación | iPhone | Android |
| --- | --- | --- |
| La marca de posición se actualiza durante el trayecto | | |
| «Centrar en mi posición» lleva el mapa a la posición | | |
| Comportamiento del permiso de ubicación (¿lo vuelve a pedir? ¿cuándo?) | | |

## 7.5 Auditoría del navegador (Lighthouse)

| Verificación | Resultado |
| --- | --- |
| Dirección auditada | |
| La app es instalable | |
| Funciona sin conexión | |
| Observaciones | |

## Medición para fijar el límite de teselas por zona

`design.md` deja abierto el límite de teselas por zona (hoy 12000, provisorio). Para
fijarlo, anotar acá el tamaño real y el tiempo de descarga de zonas típicas (un tramo de
ruta de 300 km).

| Zona | Teselas | Tamaño real | Tiempo de descarga | Dispositivo |
| --- | --- | --- | --- | --- |
| | | | | |
