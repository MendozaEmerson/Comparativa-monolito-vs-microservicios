import { PoolClient } from 'pg';
import { pool } from '../../database/db';
import { IEvent } from '../../../../shared/src/models/event.model';

export class EventsRepository {
  async findAll(limit: number, offset: number, nameFilter?: string): Promise<{ items: IEvent[]; total: number }> {
    let whereClause = '';
    const params: (string | number)[] = [];

    if (nameFilter) {
      params.push(`%${nameFilter}%`);
      whereClause = `WHERE name ILIKE $${params.length}`;
    }

    const countQuery = `SELECT COUNT(*) as count FROM events.events ${whereClause};`;
    const countRes = await pool.query(countQuery, params);
    const total = parseInt(countRes.rows[0].count, 10);

    params.push(limit);
    const limitIndex = params.length;
    params.push(offset);
    const offsetIndex = params.length;

    const dataQuery = `
      SELECT id, name, description, venue, event_date, total_capacity, available_tickets, created_at
      FROM events.events
      ${whereClause}
      ORDER BY event_date ASC
      LIMIT $${limitIndex} OFFSET $${offsetIndex};
    `;

    const dataRes = await pool.query(dataQuery, params);
    const items: IEvent[] = dataRes.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      venue: row.venue,
      eventDate: new Date(row.event_date).toISOString(),
      totalCapacity: row.total_capacity,
      availableTickets: row.available_tickets,
      createdAt: new Date(row.created_at).toISOString(),
    }));

    return { items, total };
  }

  async findById(id: string, client?: PoolClient): Promise<IEvent | null> {
    const runner = client || pool;
    const query = `
      SELECT id, name, description, venue, event_date, total_capacity, available_tickets, created_at
      FROM events.events
      WHERE id = $1;
    `;
    const res = await runner.query(query, [id]);
    if (res.rows.length === 0) return null;

    const row = res.rows[0];
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      venue: row.venue,
      eventDate: new Date(row.event_date).toISOString(),
      totalCapacity: row.total_capacity,
      availableTickets: row.available_tickets,
      createdAt: new Date(row.created_at).toISOString(),
    };
  }

  async findByIdWithLock(id: string, client: PoolClient): Promise<IEvent | null> {
    const query = `
      SELECT id, name, description, venue, event_date, total_capacity, available_tickets, created_at
      FROM events.events
      WHERE id = $1
      FOR UPDATE;
    `;
    const res = await client.query(query, [id]);
    if (res.rows.length === 0) return null;

    const row = res.rows[0];
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      venue: row.venue,
      eventDate: new Date(row.event_date).toISOString(),
      totalCapacity: row.total_capacity,
      availableTickets: row.available_tickets,
      createdAt: new Date(row.created_at).toISOString(),
    };
  }

  async decrementStock(id: string, count: number, client: PoolClient): Promise<void> {
    const query = `
      UPDATE events.events
      SET available_tickets = available_tickets - $2
      WHERE id = $1;
    `;
    await client.query(query, [id, count]);
  }
}

