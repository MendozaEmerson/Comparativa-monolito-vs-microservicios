# Feature Specification: Ticket Reservation System

**Feature Branch**: `001-ticket-reservation`

**Created**: 2026-11-06

**Status**: Clarified (Ready for Planning)

**Input**: User description: "Crea la especificación de software (feature specification) del sistema de reserva de tickets para la evaluación experimental. Módulos: Eventos (GET /api/events, GET /api/events/:id) y Reservas (POST /api/reservations, GET /api/reservations/:id). Reglas: Control de concurrencia contra overbooking y validación de stock. Escenarios: lectura masiva, transaccional concurrente y degradación controlada ante caídas."

---

## Clarifications

### Session 2026-11-06

- **Q1: Estrategia de paginación en `GET /api/events`?** → **A:** Paginación estándar por `limit` y `offset` (por defecto `limit=20`, `offset=0`, máximo `limit=100`). Proporciona consistencia y facilidad de consumo en k6.
- **Q2: Código HTTP de respuesta ante agotamiento de stock en `POST /api/reservations`?** → **A:** HTTP `409 Conflict`. Representa el estándar REST para colisiones de estado/concurrencia por inventario insuficiente.
- **Q3: Ciclo de vida y persistencia de la reserva?** → **A:** Confirmación inmediata con estado `CONFIRMED`. La transacción descuenta el stock y confirma en una sola operación atómica sin estados temporales (`PENDING`) ni timers/TTL.
- **Q4: Stack de ejecución y framework?** → **A:** Node.js 20+ con TypeScript estricto y **Fastify** para maximizar throughput y minimizar el consumo de memoria RAM.
- **Q5: Esquema de base de datos y control de concurrencia?** → **A:** Instancia única de PostgreSQL 16 con esquemas independientes (`events` y `reservations`), aplicando bloqueo pesimista mediante `SELECT ... FOR UPDATE` para garantizar cero overbooking.
- **Q6: Escenarios de carga k6 para evaluación?** → **A:** Calentamiento a 10 VUs, ramp-up progresivo de 50 a 200 VUs, y prueba de contención extrema con 150 VUs compitiendo por 20 tickets.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consulta y Exploración de Catálogo de Eventos (Priority: P1)

Como asistente o comprador de eventos, quiero consultar la lista de eventos activos y ver el detalle específico de un evento (incluyendo fecha, recinto, capacidad total y cupos disponibles en tiempo real), para decidir si puedo realizar una reserva.

**Why this priority**: Es la operación base de lectura y navegación del sistema. En el experimento representa el 70% del tráfico sintético y es el indicador principal de la latencia de lectura y throughput basal sin contención.

**Independent Test**: Puede ser probado de forma autónoma realizando solicitudes `GET /api/events` con parámetros de filtro/paginación y `GET /api/events/:id`, verificando que devuelva la estructura de datos correcta y el conteo de asientos disponibles.

**Acceptance Scenarios**:
1. **Given** existen eventos activos en la base de datos, **When** el cliente solicita `GET /api/events` con parámetros de paginación (`limit=20`, `offset=0`), **Then** el sistema responde HTTP 200 con la lista de eventos y los metadatos de paginación (`total`, `limit`, `offset`).
2. **Given** existe un evento con ID conocido, **When** el cliente consulta `GET /api/events/:id`, **Then** el sistema responde HTTP 200 con los detalles del evento y los tickets disponibles actuales.
3. **Given** un ID de evento inexistente, **When** el cliente consulta `GET /api/events/:id`, **Then** el sistema responde HTTP 404 Not Found con mensaje estructurado.

---

### User Story 2 - Creación de Reserva con Control Estricto de Concurrencia (Priority: P1)

Como comprador, quiero solicitar la reserva de uno o más tickets para un evento específico, de modo que si hay cupos suficientes la reserva quede confirmada y el inventario de cupos se descuente inmediatamente, impidiendo cualquier sobreventa (*overbooking*) ante compras simultáneas del último cupo.

**Why this priority**: Es la operación transaccional crítica del dominio y el núcleo de la evaluación experimental. En el Monolito Modular se resuelve en memoria y en Microservicios implica coordinación por red entre `reservations-service` y `events-service`.

**Independent Test**: Puede probarse enviando peticiones `POST /api/reservations` con un payload válido y verificando que el stock del evento disminuya en la cantidad exacta solicitada y se devuelva un código HTTP 201 Created. Además, bajo una prueba de estrés concurrente con 150 clientes compitiendo por 20 tickets, el sistema debe confirmar exactamente 20 tickets y rechazar los restantes con HTTP 409 Conflict.

**Acceptance Scenarios**:
1. **Given** un evento con 10 cupos disponibles, **When** un cliente envía `POST /api/reservations` solicitando 2 tickets, **Then** el sistema responde HTTP 201 Created con el ID de la reserva confirmada en estado `CONFIRMED` y los cupos disponibles bajan a 8.
2. **Given** un evento con solo 1 cupo disponible, **When** 50 clientes envían peticiones simultáneas solicitando 1 ticket, **Then** exactamente 1 petición recibe HTTP 201 Created y las 49 restantes reciben HTTP 409 Conflict por agotamiento de cupos.
3. **Given** un evento con 3 cupos disponibles, **When** un cliente solicita 4 tickets, **Then** el sistema responde HTTP 409 Conflict indicando cupos insuficientes y el inventario no se modifica.
4. **Given** una solicitud con cuerpo mal formado o cantidad de tickets menor o igual a cero, **When** se envía a `POST /api/reservations`, **Then** el sistema responde HTTP 400 Bad Request.

---

### User Story 3 - Consulta y Verificación de Estado de Reserva (Priority: P2)

Como comprador o auditor del sistema, quiero consultar el estado y el detalle de una reserva previa utilizando su identificador único, para confirmar los datos de la compra realizada.

**Why this priority**: Permite verificar la trazabilidad y persistencia de las reservas generadas durante las pruebas de carga.

**Independent Test**: Emitir una reserva exitosa, capturar el `reservationId` y consultar `GET /api/reservations/:id` verificando coincidencia exacta de datos.

**Acceptance Scenarios**:
1. **Given** una reserva confirmada con ID válido, **When** se consulta `GET /api/reservations/:id`, **Then** el sistema responde HTTP 200 con el detalle de la reserva (ID, evento, cantidad de tickets, fecha de creación y estado `CONFIRMED`).
2. **Given** un ID de reserva inexistente, **When** se consulta `GET /api/reservations/:id`, **Then** el sistema responde HTTP 404 Not Found.

---

### User Story 4 - Resiliencia y Continuidad Operativa ante Degradación (Priority: P2)

Como operador del sistema, requiero que ante una falla o interrupción controlada del módulo/servicio de reservas, la consulta y navegación del catálogo de eventos permanezca disponible y funcional (disponibilidad degradada), aislando el impacto del fallo.

**Why this priority**: Responde a la variable experimental de Tolerancia a Fallos y Aislamiento de Procesos planteada en el Hito 2.

**Independent Test**: Interrumpir intencionalmente el servicio o proceso de reservas y verificar que las llamadas a `GET /api/events` sigan respondiendo HTTP 200 exitosamente mientras que `POST /api/reservations` devuelve 503 Service Unavailable o falla de conexión.

**Acceptance Scenarios**:
1. **Given** el servicio/módulo de reservas está fuera de línea o detenido, **When** un usuario consulta `GET /api/events`, **Then** el catálogo sigue respondiendo HTTP 200 con la información disponible.
2. **Given** el servicio de reservas detenido, **When** se intenta crear una reserva `POST /api/reservations`, **Then** el API Gateway o punto de entrada responde HTTP 503 Service Unavailable de forma ordenada.

---

### Edge Cases

- **Contención Extrema (Race Conditions)**: Ante 200 peticiones concurrentes intentando reservar los últimos tickets en el mismo instante, el sistema aplica bloqueo pesimista a nivel de fila (`SELECT ... FOR UPDATE`) en PostgreSQL, asegurando que el inventario disponible jamás sea negativo (cero overbooking).
- **Cancelaciones y Reintentos**: Si una petición falla a nivel de red tras confirmar en base de datos, el cliente puede verificar el estado consultando `GET /api/reservations/:id`.
- **Lectura no Bloqueante**: Las consultas masivas de lectura en `GET /api/events` no se bloquean por transacciones activas de reserva gracias al nivel de aislamiento `READ COMMITTED` en PostgreSQL.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE exponer el endpoint `GET /api/events` para listar eventos activos con soporte de filtros opcionales (`name`, `date`) y paginación estructurada.
- **FR-002**: El sistema DEBE aplicar paginación por defecto en `GET /api/events` mediante parámetros `limit` y `offset` (valores por defecto: `limit=20`, `offset=0`; valor máximo: `limit=100`), retornando metadatos `{ "items": [...], "total": number, "limit": number, "offset": number }`.
- **FR-003**: El sistema DEBE exponer el endpoint `GET /api/events/:id` retornando la información completa del evento, capacidad total, cupos disponibles y fecha de realización.
- **FR-004**: El sistema DEBE exponer el endpoint `POST /api/reservations` aceptando un payload JSON con `eventId` (UUID o string), `userId` (string) y `tickets` (entero positivo >= 1).
- **FR-005**: El sistema DEBE validar de forma atómica la existencia del evento y que la cantidad de tickets solicitada sea menor o igual al inventario disponible.
- **FR-006**: El sistema DEBE ejecutar el descuento de cupos y la creación del registro de reserva dentro de una transacción atómica protegida mediante bloqueo pesimista (`SELECT FOR UPDATE`).
- **FR-007**: El sistema DEBE responder con código HTTP 409 Conflict con cuerpo JSON `{"error": "INSUFFICIENT_SEATS", "message": "No hay suficientes cupos disponibles"}` cuando la cantidad solicitada exceda el stock actual.
- **FR-008**: El sistema DEBE registrar la reserva directamente con estado 'CONFIRMED' descontando de forma inmediata y definitiva los tickets del inventario.
- **FR-009**: El sistema DEBE exponer el endpoint `GET /api/reservations/:id` retornando el detalle de la reserva y su estado actual.
- **FR-010**: Ambos prototipos (Monolito Modular y Microservicios) DEBEN retornar exactamente los mismos esquemas de respuesta JSON y cabeceras `Content-Type: application/json`.
- **FR-011**: En caso de error de validación de parámetros, el sistema DEBE retornar HTTP 400 Bad Request con un objeto JSON descriptivo `{"error": "BAD_REQUEST", "details": string[]}`.
- **FR-012**: En caso de recurso no encontrado, el sistema DEBE retornar HTTP 404 Not Found con cuerpo JSON `{"error": "NOT_FOUND", "message": string}`.

---

### Key Entities *(include if feature involves data)*

- **Event (Evento)**:
  - `id`: Identificador único (UUID).
  - `name`: Nombre descriptivo del evento (string, máx 150 caracteres).
  - `description`: Descripción del evento (texto).
  - `venue`: Recinto o lugar (string).
  - `eventDate`: Fecha y hora del evento (ISO 8601 Timestamp).
  - `totalCapacity`: Capacidad máxima de asientos/tickets (entero > 0).
  - `availableTickets`: Cupos disponibles actuales para reserva (entero >= 0, siempre <= totalCapacity).
  - `createdAt`: Timestamp de creación.

- **Reservation (Reserva)**:
  - `id`: Identificador único de la reserva (UUID).
  - `eventId`: Referencia foránea al evento reservado.
  - `userId`: Identificador del usuario que realiza la reserva.
  - `ticketsCount`: Cantidad de tickets reservados en la transacción (entero >= 1).
  - `status`: Estado de la reserva (`CONFIRMED`).
  - `createdAt`: Timestamp de emisión de la reserva.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001 (Paridad Funcional)**: El 100% de los casos de prueba de aceptación de la API REST (rutas, esquemas JSON y códigos HTTP) deben arrojar resultados idénticos en el Monolito Modular y en los Microservicios.
- **SC-002 (Cero Overbooking en Concurrencia)**: Ante una prueba de estrés con 150 usuarios virtuales compitiendo por los últimos 20 asientos disponibles, la suma de tickets reservados debe ser exactamente 20 y el inventario restante del evento debe ser exactamente 0 (0% de sobreventa tolerada).
- **SC-003 (Latencia de Lectura Basal)**: En condiciones de carga nominal (10 VUs sostenidos), el percentil 95 (p95) de la latencia en `GET /api/events` debe mantenerse por debajo de 50 ms en ambas arquitecturas.
- **SC-004 (Rendimiento Bajo Carga)**: El arnés de prueba k6 debe soportar hasta 200 usuarios virtuales concurrentes registrando métricas de Throughput (RPS) y tasa de errores sin caídas no recuperables.
- **SC-005 (Aislamiento de Fallos)**: Durante la desconexión intencionada del servicio de reservas, el endpoint `GET /api/events` debe mantener una tasa de disponibilidad mayor o igual al 99.5% de éxito HTTP 200.
- **SC-006 (Consistencia de Auditoría SonarQube)**: El código de ambas soluciones debe ser analizado sin errores bloqueantes en SonarQube, alcanzando un Maintainability Rating de 'A' en su línea base.

---

## Assumptions

- **Persistencia Aislada en Instancia Compartida**: Para no distorsionar el consumo de RAM con dos servidores de base de datos separados, se utiliza una sola instancia de PostgreSQL 16 con esquemas aislados (`events` y `reservations`).
- **Runtime y Framework**: Node.js 20+ con Fastify y TypeScript estricto para maximizar el throughput y mantener bajo el uso de recursos.
- **Ausencia de Autenticación Pesada**: Para no distorsionar las mediciones de latencia con hashing de contraseñas (bcrypt), el `userId` se recibe en el payload como un identificador simple de cliente.
- **Protocolo de Comunicación Interno**: En la arquitectura de microservicios, la comunicación inter-servicio entre `reservations-service` y `events-service` se realiza mediante peticiones síncronas HTTP/REST (JSON sobre TCP).
- **Topología de Despliegue**: No se aplican mecanismos de balanceo de carga con múltiples réplicas en la versión base para medir el costo neto de una instancia monolítica frente a una instancia de cada microservicio bajo cuotas fijas de contenedor (2 CPU, 2GB RAM).
