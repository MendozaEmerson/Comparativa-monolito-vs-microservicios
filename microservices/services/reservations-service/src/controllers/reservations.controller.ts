import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { pool } from '../database/db';
import { EventClient } from '../services/event-client';
import { IReservation } from '../../../../../shared/src/models/reservation.model';
import { CreateReservationRequestDTO } from '../../../../../shared/src/dtos/reservation.dto';
import { NotFoundError, BadRequestError } from '../../../../../shared/src/errors/app-error';

export function registerReservationsController(fastify: FastifyInstance, eventClient: EventClient) {
  fastify.post('/api/reservations', async (req: FastifyRequest<{ Body: CreateReservationRequestDTO }>, reply: FastifyReply) => {
    const { eventId, userId, tickets } = req.body || {};

    if (!eventId || typeof eventId !== 'string') {
      throw new BadRequestError('Field "eventId" must be a valid string');
    }
    if (!userId || typeof userId !== 'string') {
      throw new BadRequestError('Field "userId" must be a valid string');
    }
    if (!tickets || typeof tickets !== 'number' || tickets < 1) {
      throw new BadRequestError('Field "tickets" must be an integer greater than or equal to 1');
    }

    // 1. Inter-service HTTP call to events-service (network hop)
    await eventClient.reserveTickets(eventId, tickets);

    // 2. Persist confirmed reservation in reservations schema
    const query = `
      INSERT INTO reservations.reservations (event_id, user_id, tickets_count, status)
      VALUES ($1, $2, $3, 'CONFIRMED')
      RETURNING id, event_id, user_id, tickets_count, status, created_at;
    `;
    const res = await pool.query(query, [eventId, userId, tickets]);
    const row = res.rows[0];

    const reservation: IReservation = {
      id: row.id,
      eventId: row.event_id,
      userId: row.user_id,
      ticketsCount: row.tickets_count,
      status: row.status,
      createdAt: new Date(row.created_at).toISOString(),
    };

    return reply.status(201).send(reservation);
  });

  fastify.get('/api/reservations/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    const res = await pool.query(
      `SELECT id, event_id, user_id, tickets_count, status, created_at
       FROM reservations.reservations WHERE id = $1`,
      [id]
    );

    if (res.rows.length === 0) {
      throw new NotFoundError(`Reservation with ID '${id}' was not found`);
    }

    const row = res.rows[0];
    const reservation: IReservation = {
      id: row.id,
      eventId: row.event_id,
      userId: row.user_id,
      ticketsCount: row.tickets_count,
      status: row.status,
      createdAt: new Date(row.created_at).toISOString(),
    };

    return reply.status(200).send(reservation);
  });
}

