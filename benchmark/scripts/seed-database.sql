-- Clean tables for repeatable tests
TRUNCATE TABLE reservations.reservations CASCADE;
DELETE FROM events.events;

-- 1. High-Contention Event for Stress & Overbooking Verification
-- 150 concurrent VUs will compete for these exact 20 tickets
INSERT INTO events.events (id, name, description, venue, event_date, total_capacity, available_tickets, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Concierto VIP de Alta Demanda (Estrés k6)',
    'Evento diseñado para pruebas de concurrencia y prevención estricta de overbooking',
    'Estadio Monumental UNSA',
    NOW() + INTERVAL '30 days',
    20,
    20,
    NOW()
);

-- 2. Baseline Events for Throughput & Read Performance (100 Events)
INSERT INTO events.events (name, description, venue, event_date, total_capacity, available_tickets, created_at)
SELECT
    'Evento Tecnológico #' || i,
    'Conferencia magistral sobre Arquitectura de Software y Sistemas Distribuidos #' || i,
    'Auditorio EPIS - Pabellón ' || (i % 5 + 1),
    NOW() + (i || ' days')::INTERVAL,
    500,
    500,
    NOW()
FROM generate_series(2, 101) AS i;

