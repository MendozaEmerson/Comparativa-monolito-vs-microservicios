import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom Metrics
const errorRate = new Rate('errors');
const readLatency = new Trend('read_latency', true);
const reservationLatency = new Trend('reservation_latency', true);

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Warm-up
    { duration: '60s', target: 50 },   // Moderate load
    { duration: '90s', target: 150 },  // High load
    { duration: '60s', target: 200 },  // Peak load
    { duration: '30s', target: 0 },    // Ramp-down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'], // 95% of requests should be below 500ms
    'errors': ['rate<0.05'],            // Error rate under 5%
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:3000';

export default function () {
  const isReadOperation = Math.random() < 0.70; // 70% reads, 30% reservations

  if (isReadOperation) {
    // 1. Read catalog
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/events?limit=10&offset=0`);
    readLatency.add(Date.now() - start);

    const success = check(res, {
      'status is 200': (r) => r.status === 200,
      'has items': (r) => r.json('items') && r.json('items').length > 0,
    });
    errorRate.add(!success);
  } else {
    // 2. Transact reservation
    const payload = JSON.stringify({
      eventId: '00000000-0000-0000-0000-000000000001',
      userId: `user-k6-${__VU}-${__ITER}`,
      tickets: 1,
    });

    const params = {
      headers: { 'Content-Type': 'application/json' },
    };

    const start = Date.now();
    const res = http.post(`${BASE_URL}/api/reservations`, payload, params);
    reservationLatency.add(Date.now() - start);

    // 201 Created or 409 Conflict (exhausted) are both valid business outcomes under load
    const validOutcome = check(res, {
      'status is 201 or 409': (r) => r.status === 201 || r.status === 409,
    });
    errorRate.add(!validOutcome);
  }

  sleep(0.1);
}

