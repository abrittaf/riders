# Spec Delta

## Purpose

Define cómo Riders existe en el celular como aplicación instalable: cómo se instala, cómo arranca sin conexión, cómo informa el estado de conectividad y en qué idioma habla con el Rider.

## ADDED Requirements

### Requirement: Instalación en la pantalla de inicio
La aplicación SHALL poder instalarse en la pantalla de inicio del celular desde el navegador, tanto en iOS como en Android, y una vez instalada SHALL abrirse sin la interfaz del navegador (barra de direcciones y controles de navegación).

#### Scenario: Instalación en Android
- **WHEN** el Rider abre la aplicación en el navegador de un celular Android y acepta la propuesta de instalación
- **THEN** la aplicación queda en la pantalla de inicio con su ícono y su nombre, y al abrirla desde ahí se muestra sin la interfaz del navegador

#### Scenario: Instalación en iOS
- **WHEN** el Rider abre la aplicación en Safari en un iPhone
- **THEN** la aplicación muestra instrucciones paso a paso para agregarla a la pantalla de inicio, porque en iOS el navegador no ofrece una propuesta de instalación propia

#### Scenario: Ya instalada
- **WHEN** el Rider abre la aplicación desde la pantalla de inicio
- **THEN** no se le vuelve a ofrecer la instalación

### Requirement: Arranque sin conexión
Una vez instalada, la aplicación SHALL abrirse y mostrar su interfaz completa sin conectividad.

#### Scenario: Apertura sin conexión
- **GIVEN** la aplicación fue instalada y abierta al menos una vez con conectividad
- **WHEN** el Rider la abre sin conectividad
- **THEN** la interfaz se muestra completa y utilizable, sin pantallas en blanco ni mensajes de error de carga

#### Scenario: Primera carga interrumpida
- **WHEN** la primera apertura de la aplicación pierde la conectividad antes de completarse
- **THEN** la aplicación muestra un mensaje que explica que necesita conexión para terminar de cargarse por primera vez, en lugar de una pantalla en blanco o un error del navegador

### Requirement: Indicación del estado de conectividad
La aplicación SHALL indicar de forma visible cuando no hay conectividad y qué funciones no están disponibles en ese estado, sin bloquear el uso del resto.

#### Scenario: Pérdida de conectividad durante el uso
- **WHEN** la aplicación pierde conectividad mientras el Rider la usa
- **THEN** aparece un indicador discreto de "sin conexión" y las acciones que requieren conectividad quedan señaladas como no disponibles, sin interrumpir lo que el Rider estaba haciendo

#### Scenario: Recuperación de la conectividad
- **WHEN** la aplicación recupera conectividad
- **THEN** el indicador desaparece y las acciones señaladas vuelven a estar disponibles sin que el Rider tenga que reiniciar la aplicación

### Requirement: Idioma de la interfaz
La aplicación SHALL mostrar todos sus textos en el idioma elegido por el Rider, SHALL ofrecer al menos español (Argentina) e inglés, y SHALL usar español (Argentina) cuando el idioma del celular no esté entre los soportados.

#### Scenario: Idioma del celular soportado
- **WHEN** el Rider abre la aplicación por primera vez en un celular configurado en un idioma soportado
- **THEN** toda la interfaz aparece en ese idioma

#### Scenario: Idioma del celular no soportado
- **WHEN** el Rider abre la aplicación por primera vez en un celular configurado en un idioma no soportado
- **THEN** toda la interfaz aparece en español (Argentina)

#### Scenario: Cambio de idioma
- **WHEN** el Rider elige otro idioma en las opciones de la aplicación
- **THEN** todos los textos de la interfaz cambian a ese idioma sin reiniciar la aplicación y la elección se conserva en las próximas aperturas
