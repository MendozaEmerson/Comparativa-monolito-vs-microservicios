import { PoolClient } from 'pg';
import { pool } from '../../database/db';
import { IReservation } from '../../../../shared/src/models/reservation.model';

export class ReservationsRepository {
  async create(
    reservation: { id?: string; eventId: string; userId: string; ticketsCount: number },
    client: PoolClient
  ): Promise<IReservation> {
    const query = `
      INSERT INTO reservations.reservations (event_id, user_id, tickets_count, status)
      VALUES ($1, $2, $3, 'CONFIRMED')
      RETURNING id, event_id, user_id, tickets_count, status, created_at;
    `;
    const res = await client.query(query, [
      reservation.eventId,
      reservation.userId,
      reservation.ticketsCount,
    ]);

    const row = res.rows[0];
    return {
      id: row.id,
      eventId: row.event_id,
      userId: row.user_id,
      ticketsCount: row.tickets_count,
      status: row.status,
      createdAt: new Date(row.created_at).toISOString(),
    };
  }

  async findById(id: string): Promise<IReservation | null> {
    const query = `
      SELECT id, event_id, user_id, tickets_count, status, created_at
      FROM reservations.reservations
      WHERE id = $1;
    `;
    const res = await pool.query(query, [id]);
    if (res.rows.length === 0) return null;

    const row = res.rows[0];
    return {
      id: row.id,
      eventId: row.event_id,
      userId: row.user_id,
      ticketsCount: row.tickets_count,
      status: row.status,
      createdAt: new Date(row.created_at).toISOString(),
    };
  }
}

