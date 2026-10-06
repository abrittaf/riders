# Spec Delta

## Purpose

Define la moto de cada Rider: su marca/modelo y su autonomía en kilómetros por tanque, que es el dato con el que la planificación de un Roadmap decide dónde hay que cargar combustible.

## ADDED Requirements

### Requirement: Una moto por Rider
Cada Rider SHALL tener exactamente un Vehicle, cargado al completar el perfil, con marca/modelo (texto libre de 2 a 40 caracteres) y autonomía.

#### Scenario: Carga inicial
- **WHEN** el Rider completa su perfil ingresando marca/modelo y autonomía
- **THEN** su Vehicle queda guardado y se muestra en su perfil

#### Scenario: Marca/modelo fuera de rango
- **WHEN** el Rider deja vacío el campo marca/modelo o supera los 40 caracteres
- **THEN** la aplicación lo indica junto al campo y no permite continuar hasta corregirlo

### Requirement: Autonomía en kilómetros
La autonomía SHALL ser un número entero de kilómetros por tanque, entre 50 y 1000, y SHALL mostrarse siempre con su unidad.

#### Scenario: Autonomía válida
- **WHEN** el Rider ingresa 200 como autonomía
- **THEN** el perfil muestra "200 km"

#### Scenario: Autonomía inválida
- **WHEN** el Rider ingresa un valor con decimales, menor a 50, mayor a 1000 o no numérico
- **THEN** la aplicación lo indica junto al campo y no permite continuar hasta corregirlo

### Requirement: Edición del Vehicle
La aplicación SHALL permitir al Rider cambiar la marca/modelo y la autonomía de su Vehicle en cualquier momento desde su perfil, con las mismas validaciones que en la carga inicial.

#### Scenario: Cambio de autonomía
- **WHEN** el Rider cambia la autonomía de 200 a 300 y confirma
- **THEN** el perfil muestra "300 km" y el cambio se conserva en las próximas aperturas

#### Scenario: Cambio sin conexión
- **WHEN** el Rider edita su Vehicle sin conectividad
- **THEN** el cambio se ve de inmediato, se indica como pendiente de sincronizar y se envía al recuperar la conectividad
