import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ReservationsService } from './reservations.service';
import { CreateReservationRequestDTO } from '../../../../shared/src/dtos/reservation.dto';

export function registerReservationsRoutes(fastify: FastifyInstance, service: ReservationsService) {
  fastify.post('/api/reservations', async (request: FastifyRequest<{ Body: CreateReservationRequestDTO }>, reply: FastifyReply) => {
    const reservation = await service.createReservation(request.body);
    return reply.status(201).send(reservation);
  });

  fastify.get('/api/reservations/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const reservation = await service.getReservationById(id);
    return reply.status(200).send(reservation);
  });
}

