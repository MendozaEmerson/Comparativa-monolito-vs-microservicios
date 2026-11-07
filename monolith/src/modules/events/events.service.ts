import { PoolClient } from 'pg';
import { EventsRepository } from './events.repository';
import { IEvent } from '../../../../shared/src/models/event.model';
import { GetEventsQueryDTO, PaginatedEventsResponseDTO } from '../../../../shared/src/dtos/event.dto';
import { NotFoundError, InsufficientSeatsError } from '../../../../shared/src/errors/app-error';

export class EventsService {
  constructor(private readonly repo: EventsRepository) {}

  async getEvents(query: GetEventsQueryDTO): Promise<PaginatedEventsResponseDTO> {
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
    const offset = Math.max(query.offset ?? 0, 0);

    const { items, total } = await this.repo.findAll(limit, offset, query.name);
    return { items, total, limit, offset };
  }

  async getEventById(id: string): Promise<IEvent> {
    const event = await this.repo.findById(id);
    if (!event) {
      throw new NotFoundError(`Event with ID '${id}' was not found`);
    }
    return event;
  }

  /**
   * Domain interface executed within a transaction for in-memory reservation coordination.
   * Acquires row lock (SELECT FOR UPDATE) and decrements inventory if sufficient.
   */
  async reserveTicketsInTransaction(eventId: string, count: number, client: PoolClient): Promise<IEvent> {
    const event = await this.repo.findByIdWithLock(eventId, client);
    if (!event) {
      throw new NotFoundError(`Event with ID '${eventId}' was not found`);
    }

    if (event.availableTickets < count) {
      throw new InsufficientSeatsError(
        `No hay suficientes cupos disponibles. Solicitados: ${count}, disponibles: ${event.availableTickets}`
      );
    }

    await this.repo.decrementStock(eventId, count, client);
    event.availableTickets -= count;
    return event;
  }
}

