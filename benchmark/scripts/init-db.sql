-- Initialize isolated schemas
CREATE SCHEMA IF NOT EXISTS events;
CREATE SCHEMA IF NOT EXISTS reservations;

-- Schema: events
CREATE TABLE IF NOT EXISTS events.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    venue VARCHAR(200) NOT NULL,
    event_date TIMESTAMPTZ NOT NULL,
    total_capacity INTEGER NOT NULL CHECK (total_capacity > 0),
    available_tickets INTEGER NOT NULL CHECK (available_tickets >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_date ON events.events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_name ON events.events(name);

-- Schema: reservations
CREATE TABLE IF NOT EXISTS reservations.reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    tickets_count INTEGER NOT NULL CHECK (tickets_count >= 1),
    status VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reservations_event ON reservations.reservations(event_id);
CREATE INDEX IF NOT EXISTS idx_reservations_user ON reservations.reservations(user_id);

