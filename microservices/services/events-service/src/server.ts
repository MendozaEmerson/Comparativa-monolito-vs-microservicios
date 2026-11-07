import fastify from 'fastify';
import { registerEventsController } from './controllers/events.controller';
import { AppError } from '../../../../shared/src/errors/app-error';

const server = fastify({
  logger: process.env.NODE_ENV === 'production' ? { level: 'error' } : false,
});

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
    message: 'An unexpected error occurred in events-service',
  });
});

server.get('/health', async () => {
  return { status: 'ok', service: 'events-service', timestamp: new Date().toISOString() };
});

registerEventsController(server);

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

export async function start() {
  try {
    await server.listen({ port: PORT, host: HOST });
    console.log(`[Events Service] Listening on http://${HOST}:${PORT}`);
  } catch (err) {
    console.error('[Events Service] Error starting:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

export { server };

