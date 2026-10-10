# map-view Specification

## Purpose

Define el mapa base de Riders: el mapa que el Rider ve y recorre, su propia posición sobre él y la atribución de las fuentes de datos. Todas las demás funciones de mapa se construyen sobre esta.

## Requirements

### Requirement: Mapa navegable
La aplicación SHALL mostrar un mapa con datos de OpenStreetMap que el Rider puede desplazar y acercar o alejar con gestos táctiles, con un nivel de detalle que llega a nombres de calles y rutas.

#### Scenario: Navegación con conectividad
- **WHEN** el Rider desplaza o acerca el mapa con conectividad
- **THEN** el mapa se completa con fluidez en la nueva zona y nivel de detalle

#### Scenario: Zona sin datos disponibles sin conexión
- **WHEN** el Rider desplaza el mapa sin conectividad hacia una zona que no fue descargada
- **THEN** la zona se muestra vacía con un aviso de que no está disponible sin conexión, y el resto del mapa sigue respondiendo a los gestos

### Requirement: Posición actual del Rider
La aplicación SHALL mostrar la posición actual del Rider sobre el mapa, actualizada mientras se mueve, y SHALL ofrecer centrar el mapa en esa posición.

#### Scenario: Permiso de ubicación concedido
- **WHEN** el Rider concede el permiso de ubicación
- **THEN** su posición aparece sobre el mapa con una marca distinguible de cualquier otra y se actualiza mientras se mueve

#### Scenario: Centrar en mi posición
- **WHEN** el Rider toca la acción de centrar
- **THEN** el mapa se desplaza hasta dejar su posición en el centro, manteniendo el nivel de detalle actual

#### Scenario: Permiso de ubicación denegado
- **WHEN** el Rider deniega el permiso de ubicación
- **THEN** el mapa sigue siendo usable, la marca de posición no se muestra y la aplicación explica cómo habilitar el permiso desde la configuración del celular

#### Scenario: Sin señal de GPS
- **WHEN** el celular no logra determinar la posición
- **THEN** la aplicación muestra la última posición conocida, si la hay, e indica que está buscando señal

### Requirement: Atribución de las fuentes de datos
La aplicación SHALL mostrar sobre el mapa, de forma permanente y legible, la atribución a OpenStreetMap y a los proveedores de teselas que exijan ser mencionados.

#### Scenario: Atribución visible
- **WHEN** el mapa está en pantalla, con o sin conexión
- **THEN** la atribución es visible y permite abrir el detalle de las fuentes
