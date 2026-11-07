# Research & Architectural Decisions: Ticket Reservation Benchmark

**Feature**: `001-ticket-reservation` | **Date**: 2026-11-06

---

## 1. Runtime and Web Framework Selection

### Context & Problem
We need to compare architectural overhead (networking, process isolation, serialization) between a Modular Monolith and Microservices. The runtime and framework must be identical and have minimal intrinsic overhead so that architectural differences are measurable.

### Alternatives Evaluated
- **Express.js**: Widely used, mature, but higher routing latency and lower throughput under heavy concurrency (>100 VUs).
- **Fastify (Node.js 20 LTS + TypeScript)**: High-performance, schema-based JSON serialization (via `fast-json-stringify`), low memory baseline (~35-45 MB per process), native TypeScript support, and built-in plugin architecture.
- **Go / Gin**: Extremely fast, but TypeScript provides a higher level of direct parity with SonarQube quality gates and simpler monorepo sharing for DTOs.

### Decision
**Adopt Node.js 20+ with TypeScript (strict mode) and Fastify.**
- Low baseline memory consumption makes the memory multiplier of multiple containers immediately evident.
- Shared DTOs and validation schemas (via JSON Schema / TypeBox) are shared across `/shared` without code duplication.

---

## 2. Concurrency & Overbooking Prevention Strategy

### Context & Problem
Under high concurrency (e.g., 150 virtual users competing simultaneously for the last 20 tickets of an event), the system must guarantee zero overbooking (no inventory drops below 0).

### Alternatives Evaluated
- **Optimistic Locking (`version` column)**: High retry rate under extreme contention; retries cause network storms in microservices and spike latency.
- **Pessimistic Locking (`SELECT ... FOR UPDATE`)**: Locks the specific event row during ticket reservation transaction. Directly serializes decrement operations on the row, failing fast when `available_tickets < requested_tickets`.
- **In-Memory Redis Token Bucket**: Adds external infrastructure and caching complexity, violating the principle of isolating core architectural differences.

### Decision
**Adopt PostgreSQL row-level pessimistic locking (`SELECT available_tickets FROM events.events WHERE id = $1 FOR UPDATE`).**
- In the Monolito Modular: The transaction begins in the reservation module, acquires the event lock, verifies stock, decrements stock, creates the reservation record, and commits.
- In Microservices: The `reservations-service` coordinates the purchase by calling `events-service` via an atomic internal endpoint (`POST /internal/events/:id/reserve`) that executes the locked decrement. If successful, `reservations-service` records the confirmed booking. If stock is insufficient, it responds with HTTP 409 Conflict.

---

## 3. Database Topology & Memory Isolation

### Context & Problem
Running multiple database server processes (e.g., one PostgreSQL container per microservice) would double or triple base RAM consumption, attributing database daemon footprint to the microservices architecture rather than the application architecture itself.

### Decision
**Single PostgreSQL 16 container with isolated database schemas:**
- `events` schema: `events.events` table.
- `reservations` schema: `reservations.reservations` table.
- In the **Modular Monolith**: One database connection pool connects to PostgreSQL; modules access their respective tables through dedicated repository abstractions.
- In **Microservices**: `events-service` connects exclusively to `events` schema; `reservations-service` connects exclusively to `reservations` schema. Neither service has cross-schema table access.

---

## 4. Communication Topologies

### Monolito Modular (Treatment A)
```text
Client (k6) ---> HTTP:3000 ---> Monolith Fastify Server
                                 ├── Events Module (in-memory)
                                 │       ↓
                                 │   Domain Interface (In-Memory Function Call)
                                 │       ↑
                                 └── Reservations Module (in-memory)
                                         ↓
                                     PostgreSQL (Schemas: events, reservations)
```
- Port: `3000`
- Zero internal network hops; method calls execute directly on the V8 call stack.

### Microservicios (Treatment B)
```text
Client (k6) ---> HTTP:3000 ---> API Gateway (Fastify Proxy)
                                    ├── HTTP /api/events ---> Events Service (Port 3001)
                                    └── HTTP /api/reservations ---> Reservations Service (Port 3002)
                                                                           │
                                                            Internal HTTP  │
                                                                           ↓
                                                                  Events Service (Port 3001)
                                                                           ↓
                                                                  PostgreSQL 16
```
- External entry point: Port `3000` (API Gateway routes to services).
- Internal network: Docker bridge network `microservices-net`.
- Network hops per reservation: Client → Gateway (1) → Reservations Service (2) → Events Service (3) → Response (4 hops).

---

## 5. Docker Resource Quotas & Isolation

Both environments will be bounded using Docker Compose v2 deploy resource limits:
```yaml
# Total budget per environment: 2.0 CPUs, 2048 MB RAM
# Monolith Treatment:
monolith:
  deploy:
    resources:
      limits:
        cpus: '2.0'
        memory: 2048M

# Microservices Treatment (Budget partitioned across containers):
api-gateway:
  deploy:
    resources:
      limits:
        cpus: '0.5'
        memory: 384M
events-service:
  deploy:
    resources:
      limits:
        cpus: '0.75'
        memory: 512M
reservations-service:
  deploy:
    resources:
      limits:
        cpus: '0.75'
        memory: 512M
```
PostgreSQL runs in an independent container with identical memory limits (512 MB) in both treatments to maintain baseline parity.

---

## 6. Benchmarking & Quality Tooling

- **k6 Load Generator**: JavaScript test suite executing `load-test.js` (nominal load up to 200 VUs) and `stress-test.js` (overbooking contention).
- **Docker Stats Collector**: PowerShell/Node script `collect-metrics.ps1` querying `docker stats --no-stream --format json` every 1 second during test windows, saving to CSV/JSON.
- **SonarQube**: Standard `sonar-project.properties` targeting `/monolith` and `/microservices` to evaluate cognitive complexity, maintainability rating, code duplication, and technical debt.

