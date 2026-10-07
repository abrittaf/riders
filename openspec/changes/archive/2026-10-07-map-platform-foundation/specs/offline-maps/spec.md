# Spec Delta

## Purpose

Permite al Rider llevar en el celular el mapa de las zonas que va a recorrer, para verlo sin conectividad y administrar lo que descargó.

## ADDED Requirements

### Requirement: Descarga de una zona del mapa
La aplicación SHALL permitir al Rider elegir una zona del mapa y descargarla al celular para su uso sin conexión, informando el tamaño estimado antes de confirmar y el progreso durante la descarga.

#### Scenario: Descarga completa
- **WHEN** el Rider elige la zona visible en pantalla, le asigna un nombre y confirma la descarga con conectividad
- **THEN** ve el tamaño estimado antes de confirmar, el progreso mientras descarga, y al terminar la zona figura como disponible sin conexión

#### Scenario: Zona demasiado grande
- **WHEN** la zona elegida supera el tamaño máximo permitido para una descarga
- **THEN** la aplicación lo informa antes de empezar e indica cuánto acercar el mapa para que la zona entre en el límite

#### Scenario: Espacio insuficiente en el celular
- **WHEN** el tamaño estimado supera el espacio disponible
- **THEN** la aplicación lo informa antes de empezar y no inicia la descarga

#### Scenario: Pérdida de conectividad durante la descarga
- **WHEN** se pierde la conectividad a mitad de una descarga
- **THEN** la descarga queda en pausa conservando lo ya descargado, el Rider ve ese estado, y la descarga se retoma desde donde quedó cuando vuelve la conectividad

### Requirement: Mapa de las zonas descargadas sin conexión
La aplicación SHALL mostrar sin conectividad el mapa de las zonas descargadas con el mismo nivel de detalle que con conexión, incluidos los lugares (estaciones de servicio, alojamientos, restaurantes, puntos de interés) que el mapa contiene.

#### Scenario: Dentro de una zona descargada
- **WHEN** el Rider navega el mapa sin conectividad dentro de una zona descargada
- **THEN** el mapa se muestra completo, con sus calles, rutas y lugares, igual que con conexión

#### Scenario: Zona descargada parcialmente
- **WHEN** el Rider navega sin conectividad por una zona cuya descarga quedó en pausa
- **THEN** se muestra lo que alcanzó a descargarse y la aplicación indica que la zona está incompleta

### Requirement: Gestión de las zonas descargadas
La aplicación SHALL listar las zonas descargadas con su nombre, tamaño ocupado y fecha de descarga, SHALL permitir borrarlas y SHALL informar el espacio total que ocupan.

#### Scenario: Borrado de una zona
- **WHEN** el Rider borra una zona de la lista
- **THEN** la zona desaparece de la lista, el espacio que ocupaba queda liberado y el mapa de esa zona deja de estar disponible sin conexión

#### Scenario: Sin zonas descargadas
- **WHEN** el Rider abre la lista sin haber descargado ninguna zona
- **THEN** ve una explicación de para qué sirve descargar zonas y cómo hacerlo

### Requirement: Persistencia de las descargas
La aplicación SHALL conservar las zonas descargadas entre aperturas, incluso después de varios días sin usarla, hasta que el Rider las borre.

#### Scenario: Reapertura después de días
- **GIVEN** el Rider descargó una zona
- **WHEN** abre la aplicación días después, sin conectividad
- **THEN** la zona sigue disponible y el mapa se muestra dentro de ella

#### Scenario: El celular necesita liberar espacio
- **WHEN** el espacio disponible para la aplicación en el celular está por agotarse
- **THEN** la aplicación muestra al Rider cuánto ocupan sus zonas y le ofrece borrar las que elija, sin borrar nada por su cuenta
