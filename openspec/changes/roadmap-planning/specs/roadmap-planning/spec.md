# Spec Delta

## Purpose

Define el Roadmap en su estado de planificación: cómo un Rider lo arma a partir de Points, cómo se calcula y se guarda el camino entre ellos con su superficie, y cómo lo ve, edita, borra y duplica, con y sin conexión.

## ADDED Requirements

### Requirement: Creación de un Roadmap
La aplicación SHALL permitir al Rider identificado crear un Roadmap con nombre (2 a 60 caracteres), descripción opcional y una secuencia ordenada de al menos dos Points, cada uno con fecha asociada opcional, y SHALL informar los kilómetros aproximados del viaje.

#### Scenario: Roadmap mínimo
- **WHEN** el Rider ingresa un nombre, elige un Point de salida y uno de llegada, y guarda
- **THEN** el Roadmap queda creado con la ruta calculada entre ambos, sus kilómetros aproximados, y aparece en su lista

#### Scenario: Menos de dos Points
- **WHEN** el Rider intenta guardar con un solo Point
- **THEN** la aplicación lo indica y no guarda hasta que haya al menos dos

#### Scenario: Nombre fuera de rango
- **WHEN** el Rider deja el nombre vacío o supera los 60 caracteres
- **THEN** la aplicación lo indica junto al campo y no permite guardar

### Requirement: Cálculo de la ruta
La aplicación SHALL calcular, con conectividad, el camino entre cada par de Points consecutivos, SHALL mostrarlo sobre el mapa, y SHALL informar distancia y tiempo estimado de cada tramo y del total.

#### Scenario: Ruta calculada
- **WHEN** el Rider tiene al menos dos Points con conectividad
- **THEN** el camino se dibuja sobre el mapa y cada tramo muestra su distancia en km y su tiempo estimado, con los totales del Roadmap

#### Scenario: Tramo sin camino posible
- **WHEN** el motor de ruteo no encuentra camino entre dos Points consecutivos
- **THEN** la aplicación señala ese tramo, mantiene los demás, y permite mover o quitar uno de los dos Points

#### Scenario: Cálculo sin conectividad
- **WHEN** el Rider agrega o mueve un Point sin conectividad
- **THEN** la aplicación explica que el cálculo de la ruta requiere conexión y no guarda el cambio

### Requirement: Superficie de los tramos
La ruta SHALL ir por caminos pavimentados siempre que exista uno, y SHALL usar caminos sin pavimentar únicamente al inicio o al final de un tramo, para llegar a un Point que no tiene acceso pavimentado. Cada tramo SHALL dibujarse según su superficie (continua: pavimento; discontinua: consolidado; punteada: suelto) e informar sus kilómetros sin pavimentar.

#### Scenario: Todo pavimentado
- **WHEN** entre dos Points existe un camino pavimentado
- **THEN** el tramo se calcula por pavimento aunque un camino sin pavimentar sea más corto, se dibuja con línea continua y su lista informa 0 km sin pavimentar

#### Scenario: Point con acceso solo sin pavimentar
- **WHEN** un Point solo se alcanza por un camino sin pavimentar
- **THEN** el tramo llega igual, la parte sin pavimentar se dibuja discontinua o punteada según su superficie, y la lista informa cuántos km de ese tramo son sin pavimentar

#### Scenario: Superficie sin dato
- **WHEN** el proveedor no informa la superficie de una parte del tramo
- **THEN** esa parte se dibuja con el estilo "sin dato" (punto y raya) y la lista lo indica, sin contarla como pavimentada ni como sin pavimentar

#### Scenario: Referencia de estilos
- **WHEN** el Rider consulta la referencia del mapa en la pantalla del Roadmap
- **THEN** ve la correspondencia entre cada estilo de línea y su superficie

### Requirement: Edición de la secuencia de Points
La aplicación SHALL permitir insertar un Point en cualquier posición de la secuencia, reordenar y quitar Points, y SHALL recalcular solo los tramos afectados.

#### Scenario: Inserción intermedia
- **WHEN** el Rider inserta un Point entre la salida y la llegada
- **THEN** la secuencia pasa a tener tres Points y se calculan los dos tramos nuevos, reemplazando al anterior

#### Scenario: Reordenamiento
- **WHEN** el Rider mueve un Point a otra posición de la secuencia
- **THEN** la ruta se recalcula en el nuevo orden y los totales se actualizan

### Requirement: Lista y detalle de Roadmaps
La aplicación SHALL listar los Roadmaps del Rider con nombre, distancia total, tiempo estimado y cantidad de Points, y SHALL mostrar el elegido sobre el mapa con sus Points numerados y su ruta.

#### Scenario: Apertura de un Roadmap
- **WHEN** el Rider elige un Roadmap de la lista
- **THEN** el mapa se encuadra sobre la ruta completa, con los Points numerados en orden y la descripción visible

#### Scenario: Sin Roadmaps
- **WHEN** el Rider abre la lista sin haber creado ninguno
- **THEN** ve una explicación de qué es un Roadmap y la acción para crear el primero

### Requirement: Edición y borrado
La aplicación SHALL permitir al autor editar nombre, descripción y Points de un Roadmap, y borrarlo previa confirmación.

#### Scenario: Borrado confirmado
- **WHEN** el autor borra un Roadmap y confirma
- **THEN** desaparece de su lista y no vuelve a aparecer en otros dispositivos con la misma cuenta

### Requirement: Duplicación de un Roadmap
La aplicación SHALL permitir duplicar un Roadmap como base de uno nuevo, copiando nombre (con un sufijo que lo distinga), descripción, Points y ruta, sin las fechas asociadas a los Points.

#### Scenario: Repetir un viaje
- **WHEN** el autor duplica un Roadmap
- **THEN** aparece un Roadmap nuevo, independiente del original, con los mismos Points y ruta, sin fechas, listo para editar

### Requirement: Visibilidad del Roadmap
Un Roadmap en planificación SHALL ser visible únicamente para su autor.

#### Scenario: Otro Rider
- **WHEN** otro Rider identificado intenta acceder a un Roadmap que no es suyo
- **THEN** no obtiene ningún dato

### Requirement: Roadmaps sin conexión
La aplicación SHALL mostrar sin conectividad los Roadmaps ya guardados, con su ruta dibujada sobre las zonas descargadas, y SHALL señalar como no disponibles las acciones que requieren calcular ruta o buscar lugares.

#### Scenario: Consulta sin conexión
- **GIVEN** el Rider abrió un Roadmap con conectividad en alguna ocasión
- **WHEN** lo abre sin conectividad dentro de una zona descargada
- **THEN** ve la ruta, los Points y los totales, y las acciones de agregar o mover Points están señaladas como no disponibles

### Requirement: Atribución del motor de ruteo
La aplicación SHALL mostrar en la pantalla del Roadmap la atribución al motor de ruteo y a la fuente de datos que exijan ser mencionados.

#### Scenario: Atribución visible
- **WHEN** un Roadmap con ruta calculada está en pantalla
- **THEN** la atribución es visible y permite abrir el detalle de las fuentes
