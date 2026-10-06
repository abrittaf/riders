# Spec Delta

## Purpose

Define quién es un Rider dentro de la app: cómo ingresa con su cuenta de Google, qué perfil tiene (nombre visible y avatar), qué ven de él los demás Riders, y cómo cierra sesión o elimina su cuenta.

## ADDED Requirements

### Requirement: Ingreso con cuenta de Google
La aplicación SHALL permitir al Rider ingresar con su cuenta de Google y SHALL mantener la sesión iniciada entre aperturas hasta que el Rider cierre sesión.

#### Scenario: Primer ingreso
- **WHEN** el Rider elige "Ingresar con Google" y completa el ingreso en Google
- **THEN** vuelve a la aplicación ya identificado y se le pide completar su perfil

#### Scenario: Sesión conservada
- **GIVEN** el Rider ingresó en una apertura anterior y no cerró sesión
- **WHEN** abre la aplicación de nuevo, con o sin conectividad
- **THEN** sigue identificado sin volver a pasar por Google

#### Scenario: Ingreso cancelado
- **WHEN** el Rider cancela el ingreso en la pantalla de Google o este falla
- **THEN** vuelve a la aplicación sin sesión, con un aviso de que el ingreso no se completó, y puede volver a intentarlo

#### Scenario: Ingreso sin conectividad
- **WHEN** el Rider intenta ingresar sin conectividad
- **THEN** la acción está señalada como no disponible y la aplicación explica que ingresar requiere conexión

### Requirement: Uso sin cuenta
La aplicación SHALL permitir ver el mapa, la posición propia y las zonas descargadas sin haber ingresado, y SHALL señalar como "requiere cuenta" toda acción que involucre a otros Riders.

#### Scenario: Mapa sin cuenta
- **WHEN** un Rider que no ingresó usa la aplicación
- **THEN** el mapa, la posición propia y las zonas descargadas funcionan, y la acción de ingresar está visible

### Requirement: Perfil inicial obligatorio
Tras el primer ingreso, la aplicación SHALL pedir nombre visible, avatar y moto antes de dar por completo el perfil, y SHALL mantener al Rider en ese paso hasta completarlo o cerrar sesión.

#### Scenario: Perfil completado
- **WHEN** el Rider ingresa su nombre visible, arma su avatar y carga su moto
- **THEN** el perfil queda completo y la aplicación vuelve al mapa con el Rider identificado

#### Scenario: Perfil abandonado a medias
- **GIVEN** el Rider ingresó pero no completó el perfil
- **WHEN** vuelve a abrir la aplicación
- **THEN** se le vuelve a pedir completar el perfil, conservando lo que ya había cargado

### Requirement: Nombre visible
La aplicación SHALL pedir al Rider un nombre visible de entre 2 y 24 caracteres, propuesto a partir del nombre de la cuenta de Google pero editable, y SHALL usar ese nombre, y no el de Google, en todo lugar donde otros Riders lo vean.

#### Scenario: Apodo distinto del nombre de Google
- **WHEN** el Rider reemplaza el nombre propuesto por un apodo
- **THEN** el apodo es lo que se muestra en su perfil y lo que verán los demás Riders

#### Scenario: Nombre fuera de rango
- **WHEN** el Rider ingresa un nombre vacío, de un solo carácter o de más de 24
- **THEN** la aplicación lo indica junto al campo y no permite continuar hasta corregirlo

### Requirement: Avatar armado por el Rider
La aplicación SHALL permitir al Rider armar su avatar eligiendo tipo de casco (integral o rebatible), color de casco (blanco, negro o gris), accesorio de cuello (pañuelo, buff, cilindro o bandera a cuadros) con su color, gafas (sí o no) y barba (sí o no), mostrando el resultado mientras elige. El avatar es obligatorio.

#### Scenario: Armado con vista previa
- **WHEN** el Rider cambia cualquier opción del avatar
- **THEN** la vista previa se actualiza de inmediato con la combinación elegida

#### Scenario: Propuesta inicial
- **WHEN** el Rider llega por primera vez al armado del avatar
- **THEN** encuentra una combinación propuesta al azar que puede aceptar tal cual o modificar

#### Scenario: Bandera a cuadros
- **WHEN** el Rider elige el accesorio "bandera a cuadros"
- **THEN** el accesorio se muestra en negro y blanco y no se ofrece elegirle color

### Requirement: Edición del perfil
La aplicación SHALL permitir al Rider cambiar su nombre visible y su avatar en cualquier momento desde su perfil, y los cambios SHALL verse reflejados en todos sus dispositivos.

#### Scenario: Cambio de avatar
- **WHEN** el Rider modifica su avatar desde el perfil y confirma
- **THEN** el nuevo avatar se muestra en su perfil y, al abrir la aplicación en otro dispositivo con la misma cuenta, aparece el mismo avatar

### Requirement: Visibilidad del perfil ante otros Riders
La aplicación SHALL hacer visibles a cualquier Rider identificado únicamente el nombre visible y el avatar de otro Rider, y SHALL mantener privados el correo electrónico y la moto.

#### Scenario: Lo que ve otro Rider
- **WHEN** otro Rider identificado accede a la información de un Rider
- **THEN** obtiene su nombre visible y su avatar, y no obtiene su correo electrónico ni su moto

#### Scenario: Sin cuenta no se ve nada
- **WHEN** alguien sin sesión intenta acceder a la información de un Rider
- **THEN** no obtiene ningún dato

### Requirement: Cierre de sesión
La aplicación SHALL permitir al Rider cerrar sesión, tras lo cual SHALL dejar de mostrar su perfil en ese dispositivo y SHALL conservar sus datos en la cuenta.

#### Scenario: Cerrar y volver a ingresar
- **WHEN** el Rider cierra sesión y después vuelve a ingresar con la misma cuenta de Google
- **THEN** encuentra su perfil tal como lo había dejado, sin tener que completarlo de nuevo

### Requirement: Eliminación de la cuenta
La aplicación SHALL permitir al Rider eliminar su cuenta, previa confirmación explícita, borrando su perfil, su moto y su vínculo con la cuenta de Google.

#### Scenario: Eliminación confirmada
- **WHEN** el Rider elige eliminar su cuenta y confirma la acción
- **THEN** la aplicación borra su perfil y su moto, cierra la sesión, y un nuevo ingreso con la misma cuenta de Google se trata como un primer ingreso

#### Scenario: Confirmación reciente requerida
- **WHEN** el Rider intenta eliminar su cuenta mucho tiempo después de haber ingresado
- **THEN** la aplicación le pide volver a confirmar su identidad con Google antes de borrar

#### Scenario: Eliminación sin conectividad
- **WHEN** el Rider intenta eliminar su cuenta sin conectividad
- **THEN** la acción está señalada como no disponible y nada se borra

### Requirement: Perfil sin conexión
La aplicación SHALL mostrar el perfil del Rider sin conectividad y SHALL conservar los cambios que haga sin conexión para enviarlos cuando la recupere.

#### Scenario: Cambio hecho sin conexión
- **WHEN** el Rider cambia su nombre visible sin conectividad
- **THEN** el cambio se ve de inmediato en su dispositivo, se indica como pendiente de sincronizar, y se envía solo al recuperar la conectividad
