import fastify, { FastifyRequest, FastifyReply } from 'fastify';

const server = fastify({
  logger: process.env.NODE_ENV === 'production' ? { level: 'error' } : false,
});

const EVENTS_SERVICE_URL = process.env.EVENTS_SERVICE_URL || 'http://localhost:3001';
const RESERVATIONS_SERVICE_URL = process.env.RESERVATIONS_SERVICE_URL || 'http://localhost:3002';

server.get('/health', async () => {
  return { status: 'ok', architecture: 'microservices-gateway', timestamp: new Date().toISOString() };
});

// Proxy helper
async function proxyRequest(targetUrl: string, request: FastifyRequest, reply: FastifyReply) {
  try {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };

    const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: hasBody ? JSON.stringify(request.body) : undefined,
    });

    const data = await response.text();
    reply.status(response.status);
    reply.header('content-type', 'application/json');
    return reply.send(data);
  } catch (err) {
    server.log.error(err);
    return reply.status(503).send({
      error: 'SERVICE_UNAVAILABLE',
      message: 'Downstream microservice is unreachable',
    });
  }
}

// Route: /api/events and /api/events/*
server.all('/api/events', async (req, reply) => {
  const query = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
  return proxyRequest(`${EVENTS_SERVICE_URL}/api/events${query}`, req, reply);
});

server.all('/api/events/*', async (req, reply) => {
  const subPath = (req.params as { '*': string })['*'];
  const query = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
  return proxyRequest(`${EVENTS_SERVICE_URL}/api/events/${subPath}${query}`, req, reply);
});

// Route: /api/reservations and /api/reservations/*
server.all('/api/reservations', async (req, reply) => {
  const query = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
  return proxyRequest(`${RESERVATIONS_SERVICE_URL}/api/reservations${query}`, req, reply);
});

server.all('/api/reservations/*', async (req, reply) => {
  const subPath = (req.params as { '*': string })['*'];
  const query = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
  return proxyRequest(`${RESERVATIONS_SERVICE_URL}/api/reservations/${subPath}${query}`, req, reply);
});

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

export async function start() {
  try {
    await server.listen({ port: PORT, host: HOST });
    console.log(`[API Gateway] Listening on http://${HOST}:${PORT}`);
  } catch (err) {
    console.error('[API Gateway] Start error:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

export { server };

