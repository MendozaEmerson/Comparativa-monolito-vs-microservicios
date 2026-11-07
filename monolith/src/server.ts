import fastify from 'fastify';
import { EventsRepository } from './modules/events/events.repository';
import { EventsService } from './modules/events/events.service';
import { registerEventsRoutes } from './modules/events/events.controller';
import { ReservationsRepository } from './modules/reservations/reservations.repository';
import { ReservationsService } from './modules/reservations/reservations.service';
import { registerReservationsRoutes } from './modules/reservations/reservations.controller';
import { AppError } from '../../../shared/src/errors/app-error';

const server = fastify({
  logger: process.env.NODE_ENV === 'production' ? { level: 'error' } : false,
});

// Global Error Handler
server.setErrorHandler((error, _request, reply) => {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: error.errorCode,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    });
  }

  server.log.error(error);
  return reply.status(500).send({
    error: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected internal server error occurred',
  });
});

// Health check endpoint
server.get('/health', async () => {
  return { status: 'ok', architecture: 'modular-monolith', timestamp: new Date().toISOString() };
});

// Initialize Repositories and In-Memory Services
const eventsRepo = new EventsRepository();
const eventsService = new EventsService(eventsRepo);

const reservationsRepo = new ReservationsRepository();
const reservationsService = new ReservationsService(reservationsRepo, eventsService);

// Register Module Routes
registerEventsRoutes(server, eventsService);
registerReservationsRoutes(server, reservationsService);

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

export async function start() {
  try {
    await server.listen({ port: PORT, host: HOST });
    console.log(`[Modular Monolith] Server listening on http://${HOST}:${PORT}`);
  } catch (err) {
    console.error('[Modular Monolith] Failed to start server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

export { server };

