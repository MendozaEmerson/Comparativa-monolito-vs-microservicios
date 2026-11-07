# Data Model Specification: Ticket Reservation Benchmark

**Feature**: `001-ticket-reservation` | **Date**: 2026-11-06

---

## 1. Relational Schema Architecture (PostgreSQL 16)

The data model uses two isolated schemas within a single PostgreSQL database instance to maintain boundary parity between Monolith and Microservices.

```sql
CREATE SCHEMA IF NOT EXISTS events;
CREATE SCHEMA IF NOT EXISTS reservations;
```

---

## 2. Table Definitions

### Schema: `events`

#### Table: `events.events`
Stores master information for events and real-time inventory tracking.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique event identifier |
| `name` | `VARCHAR(150)` | `NOT NULL` | Name / title of the event |
| `description` | `TEXT` | `NULL` | Detailed description |
| `venue` | `VARCHAR(200)` | `NOT NULL` | Event location / venue name |
| `event_date` | `TIMESTAMPTZ` | `NOT NULL` | Scheduled date and time |
| `total_capacity` | `INTEGER` | `NOT NULL CHECK (total_capacity > 0)` | Maximum venue capacity |
| `available_tickets`| `INTEGER` | `NOT NULL CHECK (available_tickets >= 0)` | Remaining tickets (Protected) |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT CURRENT_TIMESTAMP` | Record creation timestamp |

**Indexes**:
```sql
CREATE INDEX idx_events_date ON events.events(event_date);
CREATE INDEX idx_events_name ON events.events(name);
```

---

### Schema: `reservations`

#### Table: `reservations.reservations`
Stores confirmed ticket reservation transactions.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique reservation identifier |
| `event_id` | `UUID` | `NOT NULL` | Reference to target event |
| `user_id` | `VARCHAR(100)` | `NOT NULL` | User identifier |
| `tickets_count` | `INTEGER` | `NOT NULL CHECK (tickets_count >= 1)` | Number of tickets reserved |
| `status` | `VARCHAR(20)` | `NOT NULL DEFAULT 'CONFIRMED'` | Booking status (`CONFIRMED`) |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT CURRENT_TIMESTAMP` | Transaction timestamp |

**Indexes**:
```sql
CREATE INDEX idx_reservations_event ON reservations.reservations(event_id);
CREATE INDEX idx_reservations_user ON reservations.reservations(user_id);
```

---

## 3. Transactional Invariants & Concurrency Logic

### Concurrency Invariant: Zero Overbooking
Under no circumstances may `available_tickets` fall below `0`. This is enforced at two levels:
1. **Application Level (Pessimistic Locking)**:
   ```sql
   BEGIN;
   SELECT available_tickets FROM events.events WHERE id = $1 FOR UPDATE;
   -- Check if available_tickets >= $tickets_requested
   -- If yes:
   UPDATE events.events SET available_tickets = available_tickets - $tickets_requested WHERE id = $1;
   INSERT INTO reservations.reservations (id, event_id, user_id, tickets_count, status) VALUES ($2, $1, $3, $4, 'CONFIRMED');
   COMMIT;
   ```
2. **Database Level (Check Constraint)**:
   The database constraint `CHECK (available_tickets >= 0)` will reject any operation that attempts to reduce stock below zero, raising an error if locking were ever bypassed.

---

## 4. Seeding Strategy for Benchmarks

The benchmark suite requires repeatable baseline datasets:
- **Baseline Seed**: 100 events with 500 tickets each for nominal load tests (`GET /api/events` throughput).
- **Contention Event**: 1 designated event with exactly `20` tickets available (`id: 00000000-0000-0000-0000-000000000001`), targeted by 150 concurrent VUs to test overbooking prevention and transactional latency.

