<!--
Sync Impact Report
- Version change: Initial template -> 1.0.0
- List of modified principles:
  - [PRINCIPLE_1_NAME] -> I. Paridad Funcional Absoluta (Contratos REST Idénticos)
  - [PRINCIPLE_2_NAME] -> II. Alcance Acotado del Dominio (Eventos y Reservas)
  - [PRINCIPLE_3_NAME] -> III. Aislamiento Arquitectónico Estricto (Memoria vs. Red HTTP)
  - [PRINCIPLE_4_NAME] -> IV. Paridad de Persistencia y Control de Concurrencia (PostgreSQL)
  - [PRINCIPLE_5_NAME] -> V. Reproducibilidad y Aislamiento Experimental (Docker & k6)
  - (Added) -> VI. Calidad Estructural y Tipado Estricto (TypeScript & SonarQube)
- Added sections:
  - Restricciones Experimentales y Cuotas de Recursos
  - Flujo de Desarrollo y Criterios de Aceptación
- Removed sections: None
- Follow-up TODOs: None
-->

# Ticket Architecture Benchmark Constitution

## Core Principles

### I. Paridad Funcional Absoluta (Contratos REST Idénticos)
Ambas implementaciones bajo estudio —Monolito Modular (MM) y Microservicios (MS)— DEBEN exponer exactamente las mismas interfaces de programación externa (API REST). Esto incluye: rutas de endpoints idénticas, mismos parámetros de solicitud, estructuras de payload JSON indistinguibles, idénticos códigos de estado HTTP y respuestas de error equivalentes. Ninguna arquitectura puede implementar atajos o variaciones en los contratos públicos que alteren la experiencia del cliente o falseen la comparabilidad de las pruebas de carga.

### II. Alcance Acotado del Dominio (Eventos y Reservas)
El dominio del problema se restringe de manera estricta y exclusiva a dos módulos funcionales esenciales para la venta de tickets:
1. **Módulo de Eventos**: Administración del catálogo, consulta de eventos disponibles y verificación de cupos/asientos en tiempo real.
2. **Módulo de Reservas**: Procesamiento de reservas de tickets, validación atómica de inventario contra el módulo de eventos y confirmación transaccional.
Queda expresamente prohibido agregar módulos accesorios (pagos de terceros, notificaciones por email, autenticación externa compleja) que desvíen el foco del experimento o agreguen ruido no controlado a las métricas de rendimiento y latencia.

### III. Aislamiento Arquitectónico Estricto (Memoria vs. Red HTTP)
Las dos arquitecturas deben implementar límites de aislamiento claros y diferenciados de acuerdo con su naturaleza:
- **Monolito Modular**: Los módulos de Eventos y Reservas deben coexistir en un único proceso en memoria. La comunicación entre ellos DEBE realizarse a través de abstracciones de dominio (Domain Services / Interfaces) en memoria. Se prohíbe terminantemente realizar llamadas de red internas o sobre loopback (localhost) dentro del monolito.
- **Microservicios**: Los servicios de Eventos (`events-service`) y Reservas (`reservations-service`) deben ejecutarse como procesos independientes dentro de sus propios contenedores Docker, colaborando exclusivamente mediante peticiones HTTP/REST a través de un API Gateway liviano que centraliza el punto de entrada.

### IV. Paridad de Persistencia y Control de Concurrencia (PostgreSQL)
Ambos sistemas deben utilizar PostgreSQL 16 como motor de base de datos relacional con esquemas y tablas normalizadas idénticas.
- En el Monolito Modular se emplearán esquemas independientes (`events` y `reservations`).
- En Microservicios cada servicio gestionará su propio esquema y conexión aislada.
- Ambas implementaciones DEBEN garantizar estricta consistencia de datos y prevención de sobreventa (*zero overbooking*) mediante bloqueo pesimista (`SELECT ... FOR UPDATE`) o transacciones serializables en la confirmación de tickets.

### V. Reproducibilidad y Aislamiento Experimental (Docker & k6)
El repositorio debe proporcionar un arnés de benchmarking completamente reproducible:
- **Contenerización**: Archivos Docker Compose independientes (`docker-compose.monolith.yml` y `docker-compose.microservices.yml`) que definen cuotas fijas e idénticas de recursos para cada entorno (CPU y límite estricto de memoria RAM).
- **Pruebas de Carga**: Escenarios sintéticos automatizados y versionados en Grafana k6 que cubren calentamiento (*warm-up*), carga escalonada (*ramp-up* a 200 VUs) y alta contención transaccional.
- **Métricas**: Scripts automatizados de recolección de estadísticas de contenedor (`docker stats`) y latencias/throughput de k6 exportados a formatos estructurados (CSV/JSON).

### VI. Calidad Estructural y Tipado Estricto (TypeScript & SonarQube)
El código base de ambas arquitecturas se desarrollará en TypeScript con tipado estricto (`strict: true`), evitando el uso de tipos implícitos o `any`. El proyecto debe incluir la configuración de escaneo estático de código para SonarQube (`sonar-project.properties`), permitiendo evaluar cuantitativamente la deuda técnica, complejidad ciclomática, complejidad cognitiva y duplicación de código como parte de las variables dependientes del estudio.

## Restricciones Experimentales y Cuotas de Recursos

1. **Aislamiento de Cómputo**: Durante las pruebas de estrés, los contenedores bajo evaluación deben estar restringidos de manera equivalente (ej. 2 CPU cores y 2048 MB de memoria RAM total asignados).
2. **Población Inicial Idéntica**: Se debe disponer de scripts de inicialización de datos semilla (*seeders*) para que ambos entornos comiencen exactamente con el mismo número de eventos y tickets disponibles antes de cada ronda experimental.
3. **Generador de Carga Separado**: El motor de pruebas k6 debe ejecutarse de forma aislada para que su consumo de procesamiento no distorsione las métricas de los contenedores evaluados.

## Flujo de Desarrollo y Criterios de Aceptación

1. **Desarrollo Guiado por Especificaciones (SDD)**: Toda modificación o adición de código debe seguir el ciclo riguroso de Spec Kit: Constitución -> Especificación (`/speckit-specify`) -> Planificación (`/speckit-plan`) -> Tareas (`/speckit-tasks`) -> Implementación (`/speckit-implement`) -> Convergencia (`/speckit-converge`).
2. **Verificación de Equivalencia Funcional**: Antes de proceder con cualquier prueba de rendimiento con k6, ambas soluciones deben superar una suite de pruebas de integración cruzada que certifique que ante los mismos inputs se obtienen exactamente los mismos outputs y códigos HTTP.
3. **Justificación de Complejidad**: Cualquier patrón arquitectónico adicional (ej. caching, colas de mensajería asíncronas) queda descartado en la versión base para aislar el impacto directo de la red en la comunicación síncrona.

## Governance

Esta Constitución rige de manera obligatoria sobre todo el desarrollo del proyecto de investigación y tiene precedencia sobre cualquier otra directiva de codificación.
1. Cualquier propuesta de cambio en los contratos de API o en las reglas de negocio debe aplicarse simultáneamente en ambas arquitecturas para preservar la validez del experimento.
2. Las enmiendas a este documento deben incrementar el número de versión formalmente según SemVer (MAJOR para cambios incompatibles de alcance o arquitectura; MINOR para adición de principios o restricciones; PATCH para correcciones de redacción).
3. Todo commit o pull request debe validar su conformidad contra los 6 principios rectores aquí ratificados.

**Version**: 1.0.0 | **Ratified**: 2026-11-06 | **Last Amended**: 2026-11-06
