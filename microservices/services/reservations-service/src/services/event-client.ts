import { NotFoundError, InsufficientSeatsError, AppError } from '../../../../../shared/src/errors/app-error';

export class EventClient {
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.EVENTS_SERVICE_URL || 'http://localhost:3001';
  }

  async reserveTickets(eventId: string, tickets: number): Promise<void> {
    const url = `${this.baseUrl}/internal/events/${eventId}/reserve`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tickets }),
      });

      if (res.status === 200) {
        return;
      }

      const body = await res.json().catch(() => ({}));
      if (res.status === 404) {
        throw new NotFoundError(body.message || `Event with ID '${eventId}' was not found`);
      }
      if (res.status === 409) {
        throw new InsufficientSeatsError(body.message || 'No hay suficientes cupos disponibles');
      }

      throw new AppError(body.message || 'Failed to coordinate reservation with events service', res.status, body.error || 'DOWNSTREAM_ERROR');
    } catch (err: any) {
      if (err instanceof AppError) {
        throw err;
      }
      throw new AppError('Events service is unreachable', 503, 'SERVICE_UNAVAILABLE');
    }
  }
}

