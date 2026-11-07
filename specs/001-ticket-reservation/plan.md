# Implementation Plan: Ticket Architecture Benchmark

**Branch**: `001-ticket-reservation` | **Date**: 2026-11-06 | **Spec**: [specs/001-ticket-reservation/spec.md](spec.md)

**Input**: Feature specification from `specs/001-ticket-reservation/spec.md`

---

## Summary

This project implements an experimental comparative benchmark evaluating performance (latency, throughput), resource consumption (CPU, RAM), structural maintainability (SonarQube), and failure tolerance between two distinct architectural paradigms:
1. **Modular Monolith**: In-memory domain boundary communication between Events and Reservations modules inside a single Fastify process.
2. **Microservices**: Process-isolated services (`events-service`, `reservations-service`) communicating via HTTP/REST across a Docker virtual network behind an API Gateway.

Both architectures share identical REST API contracts (`/api/events`, `/api/reservations`), data models, and business logic over PostgreSQL 16 with pessimistic row locking (`SELECT FOR UPDATE`) to guarantee zero overbooking.

---

## Technical Context

**Language/Version**: TypeScript 5.4+ (strict mode enabled) running on Node.js 20 LTS.

**Primary Dependencies**: Fastify v4+, `@fastify/postgres` or `pg`, TypeBox / JSON Schema for high-speed serialization.

**Storage**: PostgreSQL 16 (single container with isolated schemas: `events` and `reservations`).

**Testing & Benchmarking**:
- Unit & Contract tests: Vitest / Node test runner.
- Load testing: Grafana k6 (load test 10-200 VUs, stress test 150 VUs).
- Container metrics: `docker stats` sampling via PowerShell/Node exporter.
- Static analysis: SonarQube Community Edition.

**Target Platform**: Docker Engine / Docker Compose on Windows / Linux (x86_64).

**Project Type**: Monorepo encompassing two backend application treatments and benchmarking harness.

**Performance Goals**:
- Nominal load (10 VUs): p95 latency < 50ms for `GET /api/events`.
- Heavy load (200 VUs): Zero crash/unhandled rejection; measure comparative throughput and latency divergence.
- Stress contention (150 VUs on 20 tickets): 100% data consistency, exactly 20 confirmed tickets, 0 overbooking.

**Constraints**:
- Hardware budget: Strict limit of 2.0 CPUs and 2048 MB RAM total per architectural treatment in Docker Compose.
- Zero network hops inside the Modular Monolith.
- Identical seed data and random seed across benchmark runs.

---

## Constitution Check

*GATE EVALUATION: Must pass before Phase 0 research. Re-evaluated post-design.*

| Principle | Requirement | Plan Conformance | Status |
| :--- | :--- | :--- | :--- |
| **I. Paridad Funcional Absoluta** | Identical API contracts, routes, and JSON responses. | Canonical OpenAPI spec defined in `contracts/openapi.yaml`; both implementations conform to it. | **PASS** |
| **II. Alcance Acotado** | Only Events and Reservations modules. | No extraneous modules or complex third-party dependencies added. | **PASS** |
| **III. Aislamiento Arquitectónico** | Monolith in-memory calls; Microservices HTTP via Gateway. | Modular Monolith uses direct TypeScript domain interfaces; Microservices use HTTP clients over Docker network. | **PASS** |
| **IV. Paridad de Persistencia** | PostgreSQL 16 with zero overbooking protection. | Single PostgreSQL instance with `events` and `reservations` schemas; `SELECT FOR UPDATE` locking. | **PASS** |
| **V. Reproducibilidad Experimental** | Fixed Docker quotas and k6 automation. | `docker-compose.monolith.yml` and `docker-compose.microservices.yml` enforce identical resource caps. | **PASS** |
| **VI. Calidad y Tipado Estricto** | Strict TypeScript and SonarQube analysis. | `tsconfig.json` with strict mode; `sonar-project.properties` targeting both architectures. | **PASS** |

---

## Project Structure

### Documentation (this feature)

```text
specs/001-ticket-reservation/
├── spec.md                  # Feature specification with accepted clarifications
├── plan.md                  # This implementation plan
├── research.md              # Phase 0: Architectural research & decisions
├── data-model.md            # Phase 1: Relational schemas & concurrency design
├── quickstart.md            # Phase 1: Setup and execution instructions
├── contracts/
│   └── openapi.yaml         # Phase 1: Canonical OpenAPI 3.0 specification
├── checklists/
│   └── requirements.md      # Spec quality validation checklist
└── tasks.md                 # Phase 2: Actionable tasks (created via /speckit-tasks)
```

### Source Code (repository layout)

```text
ticket-architecture-benchmark/
├── shared/                                 # Shared TypeScript types and DTOs
│   ├── src/
│   │   ├── dtos/                           # Request/Response data transfer objects
│   │   │   ├── event.dto.ts
│   │   │   └── reservation.dto.ts
│   │   ├── models/                         # Domain entity interfaces
│   │   └── errors/                         # Standardized domain error classes
│   ├── package.json
│   └── tsconfig.json
│
├── monolith/                               # Treatment A: Modular Monolith
│   ├── src/
│   │   ├── modules/
│   │   │   ├── events/                     # Events Module (catalog, inventory)
│   │   │   │   ├── events.controller.ts
│   │   │   │   ├── events.service.ts
│   │   │   │   └── events.repository.ts
│   │   │   └── reservations/               # Reservations Module (booking, locking)
│   │   │       ├── reservations.controller.ts
│   │   │       ├── reservations.service.ts
│   │   │       └── reservations.repository.ts
│   │   ├── database/                       # PostgreSQL connection pool & migrations
│   │   └── server.ts                       # Fastify application entry point
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── microservices/                          # Treatment B: Microservices Architecture
│   ├── services/
│   │   ├── api-gateway/                    # Reverse proxy & routing (Port 3000)
│   │   │   ├── src/
│   │   │   │   └── gateway.ts
│   │   │   └── Dockerfile
│   │   ├── events-service/                 # Events Microservice (Port 3001)
│   │   │   ├── src/
│   │   │   │   ├── controllers/
│   │   │   │   ├── services/
│   │   │   │   └── server.ts
│   │   │   └── Dockerfile
│   │   └── reservations-service/           # Reservations Microservice (Port 3002)
│   │       ├── src/
│   │       │   ├── controllers/
│   │       │   ├── services/
│   │       │   │   └── event-client.ts     # HTTP client calling events-service
│   │       │   └── server.ts
│   │       └── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── benchmark/                              # Experimental Harness & Tooling
│   ├── k6/
│   │   ├── load-test.js                    # Nominal & progressive load (10 to 200 VUs)
│   │   └── stress-test.js                  # Overbooking contention (150 VUs on 20 seats)
│   ├── scripts/
│   │   ├── collect-metrics.ps1             # Docker stats polling script (CSV exporter)
│   │   └── seed-database.sql               # Seed data for repeatable test runs
│   └── sonar-project.properties            # SonarQube static code quality configuration
│
├── docker-compose.monolith.yml              # Monolith + PostgreSQL (2.0 CPU, 2048M RAM limit)
├── docker-compose.microservices.yml         # Gateway + 2 Services + PostgreSQL (Partitioned limits)
└── package.json                            # Root workspace configuration
```

**Structure Decision**: Monorepo with a `/shared` package consumed by both `/monolith` and `/microservices`. This architecture enforces zero drift in DTOs and API contracts, ensuring that code quality and operational differences derive exclusively from the architecture itself.

---

## Complexity Tracking

*No constitutional violations identified. The design strictly implements the 6 principles established in the constitution.*

| Violation | Why Needed | Simpler Alternative Rejected Because |
| :--- | :--- | :--- |
| *None* | N/A | N/A |
