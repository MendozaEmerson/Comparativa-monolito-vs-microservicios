# Quickstart Guide: Ticket Architecture Benchmark

**Feature**: `001-ticket-reservation` | **Date**: 2026-11-06

---

## Prerequisites

- **Docker Desktop** (or Docker Engine v24+) with Docker Compose v2 enabled.
- **Node.js 20 LTS** and **npm** or **pnpm**.
- **Grafana k6** installed locally or run via the official k6 Docker container.
- (Optional) **SonarQube Community** instance for static code quality scanning.

---

## 1. Running the Modular Monolith (Treatment A)

1. Start the Modular Monolith environment (Server + PostgreSQL):
   ```bash
   docker compose -f docker-compose.monolith.yml up --build -d
   ```
2. Check service status:
   ```bash
   docker compose -f docker-compose.monolith.yml ps
   ```
3. Test connectivity:
   ```bash
   curl http://localhost:3000/api/events
   ```
4. Stop and clean data:
   ```bash
   docker compose -f docker-compose.monolith.yml down -v
   ```

---

## 2. Running the Microservices Architecture (Treatment B)

1. Start the Microservices environment (API Gateway, Events Service, Reservations Service, PostgreSQL):
   ```bash
   docker compose -f docker-compose.microservices.yml up --build -d
   ```
2. Verify all containers are healthy:
   ```bash
   docker compose -f docker-compose.microservices.yml ps
   ```
3. Test connectivity via API Gateway:
   ```bash
   curl http://localhost:3000/api/events
   ```
4. Stop and clean data:
   ```bash
   docker compose -f docker-compose.microservices.yml down -v
   ```

---

## 3. Running Benchmarks & Capturing Metrics

### Step 1: Start Metrics Collection
In a separate terminal, launch the metrics collection daemon:
```powershell
powershell -ExecutionPolicy Bypass -File benchmark/scripts/collect-metrics.ps1 -Environment "monolith" -DurationSeconds 180
```

### Step 2: Run k6 Load Test
In your test terminal, execute the k6 load test:
```bash
k6 run benchmark/k6/load-test.js
```

### Step 3: Run High-Contention Stress Test (Overbooking Verification)
```bash
k6 run benchmark/k6/stress-test.js
```

---

## 4. Running Static Code Quality Analysis (SonarQube)

Run the Sonar scanner against the repository:
```bash
sonar-scanner -Dsonar.projectKey=ticket-architecture-benchmark
```

