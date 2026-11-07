import { ReservationsRepository } from './reservations.repository';
import { EventsService } from '../events/events.service';
import { withTransaction } from '../../database/db';
import { IReservation } from '../../../../shared/src/models/reservation.model';
import { CreateReservationRequestDTO } from '../../../../shared/src/dtos/reservation.dto';
import { NotFoundError, BadRequestError } from '../../../../shared/src/errors/app-error';

export class ReservationsService {
  constructor(
    private readonly repo: ReservationsRepository,
    private readonly eventsService: EventsService
  ) {}

  async createReservation(dto: CreateReservationRequestDTO): Promise<IReservation> {
    if (!dto.eventId || typeof dto.eventId !== 'string') {
      throw new BadRequestError('Field "eventId" must be a valid string');
    }
    if (!dto.userId || typeof dto.userId !== 'string') {
      throw new BadRequestError('Field "userId" must be a valid string');
    }
    if (!dto.tickets || typeof dto.tickets !== 'number' || dto.tickets < 1) {
      throw new BadRequestError('Field "tickets" must be an integer greater than or equal to 1');
    }

    // In-memory atomic coordination across modules inside a single PostgreSQL transaction
    return await withTransaction(async (client) => {
      // 1. Decrement tickets with row lock (SELECT ... FOR UPDATE) in events module
      await this.eventsService.reserveTicketsInTransaction(dto.eventId, dto.tickets, client);

      // 2. Create confirmed reservation in reservations module
      const reservation = await this.repo.create(
        {
          eventId: dto.eventId,
          userId: dto.userId,
          ticketsCount: dto.tickets,
        },
        client
      );

      return reservation;
    });
  }

  async getReservationById(id: string): Promise<IReservation> {
    const reservation = await this.repo.findById(id);
    if (!reservation) {
      throw new NotFoundError(`Reservation with ID '${id}' was not found`);
    }
    return reservation;
  }
}

