import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { EventsService } from './events.service';
import { GetEventsQueryDTO } from '../../../../shared/src/dtos/event.dto';

export function registerEventsRoutes(fastify: FastifyInstance, service: EventsService) {
  fastify.get('/api/events', async (request: FastifyRequest<{ Querystring: GetEventsQueryDTO }>, reply: FastifyReply) => {
    const result = await service.getEvents(request.query);
    return reply.status(200).send(result);
  });

  fastify.get('/api/events/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const event = await service.getEventById(id);
    return reply.status(200).send(event);
  });
}

