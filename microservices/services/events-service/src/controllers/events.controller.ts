import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { pool, withTransaction } from '../database/db';
import { IEvent } from '../../../../../shared/src/models/event.model';
import { GetEventsQueryDTO } from '../../../../../shared/src/dtos/event.dto';
import { NotFoundError, InsufficientSeatsError, BadRequestError } from '../../../../../shared/src/errors/app-error';

export function registerEventsController(fastify: FastifyInstance) {
  // Public: GET /api/events
  fastify.get('/api/events', async (req: FastifyRequest<{ Querystring: GetEventsQueryDTO }>, reply: FastifyReply) => {
    const limit = Math.min(Math.max(req.query.limit ?? 20, 1), 100);
    const offset = Math.max(req.query.offset ?? 0, 0);

    let whereClause = '';
    const params: (string | number)[] = [];
    if (req.query.name) {
      params.push(`%${req.query.name}%`);
      whereClause = `WHERE name ILIKE $${params.length}`;
    }

    const countRes = await pool.query(`SELECT COUNT(*) as count FROM events.events ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    params.push(limit);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const dataRes = await pool.query(
      `SELECT id, name, description, venue, event_date, total_capacity, available_tickets, created_at
       FROM events.events ${whereClause}
       ORDER BY event_date ASC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params
    );

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

    return reply.status(200).send({ items, total, limit, offset });
  });

  // Public: GET /api/events/:id
  fastify.get('/api/events/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    const res = await pool.query(
      `SELECT id, name, description, venue, event_date, total_capacity, available_tickets, created_at
       FROM events.events WHERE id = $1`,
      [id]
    );

    if (res.rows.length === 0) {
      throw new NotFoundError(`Event with ID '${id}' was not found`);
    }

    const row = res.rows[0];
    const event: IEvent = {
      id: row.id,
      name: row.name,
      description: row.description,
      venue: row.venue,
      eventDate: new Date(row.event_date).toISOString(),
      totalCapacity: row.total_capacity,
      availableTickets: row.available_tickets,
      createdAt: new Date(row.created_at).toISOString(),
    };

    return reply.status(200).send(event);
  });

  // Internal HTTP inter-service: POST /internal/events/:id/reserve
  fastify.post('/internal/events/:id/reserve', async (req: FastifyRequest<{ Params: { id: string }; Body: { tickets: number } }>, reply: FastifyReply) => {
    const { id } = req.params;
    const { tickets } = req.body || {};

    if (!tickets || typeof tickets !== 'number' || tickets < 1) {
      throw new BadRequestError('Invalid tickets count');
    }

    const event = await withTransaction(async (client) => {
      // Row lock with SELECT FOR UPDATE
      const sel = await client.query(
        `SELECT id, name, description, venue, event_date, total_capacity, available_tickets, created_at
         FROM events.events WHERE id = $1 FOR UPDATE`,
        [id]
      );

      if (sel.rows.length === 0) {
        throw new NotFoundError(`Event with ID '${id}' was not found`);
      }

      const currentAvailable = sel.rows[0].available_tickets;
      if (currentAvailable < tickets) {
        throw new InsufficientSeatsError(`No hay suficientes cupos disponibles`);
      }

      await client.query(
        `UPDATE events.events SET available_tickets = available_tickets - $2 WHERE id = $1`,
        [id, tickets]
      );

      return {
        id: sel.rows[0].id,
        availableTickets: currentAvailable - tickets,
      };
    });

    return reply.status(200).send(event);
  });
}

