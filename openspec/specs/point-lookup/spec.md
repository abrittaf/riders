# point-lookup Specification

## Purpose

Define cómo un Rider encuentra y elige un Point, el lugar del mapa que después forma parte de un Roadmap: buscándolo por nombre, eligiéndolo por tipo entre lo visible o tocando el mapa.

## Requirements

### Requirement: Búsqueda de lugares por nombre
La aplicación SHALL permitir buscar lugares por nombre y SHALL mostrar las coincidencias con su nombre, su tipo cuando se conoce, la localidad y la distancia a la posición actual del Rider, ordenadas por cercanía.

#### Scenario: Coincidencias encontradas
- **WHEN** el Rider escribe "Cachi" con conectividad
- **THEN** ve una lista de lugares cuyo nombre coincide, con tipo, localidad y distancia, y puede elegir uno como Point

#### Scenario: Sin coincidencias
- **WHEN** la búsqueda no encuentra ningún lugar
- **THEN** la aplicación lo indica y sugiere tocar el mapa para elegir la posición a mano

#### Scenario: Búsqueda sin conectividad
- **WHEN** el Rider intenta buscar por nombre sin conectividad
- **THEN** la búsqueda está señalada como no disponible y las otras formas de elegir un Point siguen ofrecidas

### Requirement: Lugares por tipo en la vista del mapa
La aplicación SHALL listar los lugares de un tipo elegido (estación de servicio, alojamiento, restaurante o punto de interés) que estén dentro de la zona visible del mapa, con y sin conectividad cuando la zona está descargada.

#### Scenario: Estaciones de servicio visibles
- **WHEN** el Rider elige el tipo "estación de servicio" con el mapa sobre una zona
- **THEN** ve la lista de las estaciones visibles, con nombre y distancia, resaltadas sobre el mapa, y puede elegir una como Point

#### Scenario: Ninguno en la vista
- **WHEN** no hay lugares del tipo elegido en la zona visible
- **THEN** la aplicación lo indica y sugiere alejar el mapa o desplazarlo

#### Scenario: Zona descargada sin conectividad
- **WHEN** el Rider elige un tipo sin conectividad dentro de una zona descargada
- **THEN** ve los lugares de ese tipo igual que con conexión

### Requirement: Posición elegida en el mapa
La aplicación SHALL permitir elegir cualquier posición del mapa como Point de dos maneras: llevando la mira del mapa hasta la posición y confirmándola, o con un toque sostenido sobre la posición cuando el celular lo admite; y SHALL proponer un nombre a partir de la dirección o del lugar más cercano cuando puede obtenerlo, o las coordenadas en su defecto; el nombre SHALL ser editable.

#### Scenario: Posición con la mira del mapa
- **WHEN** el Rider desplaza el mapa hasta dejar la posición bajo la mira y confirma
- **THEN** aparece un Point en esa posición con un nombre propuesto, que puede cambiar antes de confirmar

#### Scenario: Posición con nombre propuesto
- **WHEN** el Rider elige una posición del mapa con conectividad
- **THEN** el nombre propuesto es el del lugar o la dirección más cercana, y puede cambiarlo antes de confirmar

#### Scenario: Posición sin conectividad
- **WHEN** el Rider elige una posición del mapa sin conectividad
- **THEN** el nombre propuesto son las coordenadas de la posición, editables

#### Scenario: Toque sostenido
- **WHEN** el Rider mantiene el toque sobre una posición del mapa en un celular que entrega ese gesto a la aplicación
- **THEN** la posición queda elegida igual que con la mira, sin menú contextual ni selección de texto

### Requirement: Nombres de lugares en español o en su idioma de origen
La aplicación SHALL mostrar el nombre de cada lugar en español cuando el proveedor de mapas lo tiene, y en su idioma de origen en caso contrario.

#### Scenario: Lugar con nombre en español disponible
- **WHEN** un lugar del mapa tiene nombre en español además del original
- **THEN** la aplicación muestra el nombre en español

#### Scenario: Lugar solo con nombre de origen
- **WHEN** un lugar tiene nombre únicamente en su idioma de origen
- **THEN** la aplicación muestra ese nombre tal cual

### Requirement: Datos de un Point
Todo Point SHALL tener nombre, posición y origen (lugar conocido o posición elegida), SHALL conservar el tipo de lugar cuando proviene de un lugar conocido, y MAY tener una fecha asociada que el Rider puede poner, cambiar o quitar.

#### Scenario: Point desde una estación de servicio
- **WHEN** el Rider elige una estación de servicio por tipo
- **THEN** el Point resultante conserva el nombre de la estación y el tipo "estación de servicio"

#### Scenario: Fecha asociada a un Point
- **WHEN** el Rider asocia una fecha a un Point
- **THEN** el Point muestra esa fecha junto a su nombre y el Rider puede cambiarla o quitarla
