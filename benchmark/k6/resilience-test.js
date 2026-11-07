import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const catalogAvailability = new Rate('catalog_availability');
const bookingAvailability = new Rate('booking_availability');

export const options = {
  stages: [
    { duration: '30s', target: 30 }, // Baseline traffic
    { duration: '30s', target: 30 }, // During failure injection
    { duration: '30s', target: 30 }, // Post recovery
  ],
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:3000';

export default function () {
  // 1. Read catalog availability
  const resCatalog = http.get(`${BASE_URL}/api/events?limit=5`);
  catalogAvailability.add(resCatalog.status === 200);

  // 2. Reservation availability
  const payload = JSON.stringify({
    eventId: '00000000-0000-0000-0000-000000000001',
    userId: `resilience-user-${__VU}`,
    tickets: 1,
  });

  const resBooking = http.post(`${BASE_URL}/api/reservations`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  bookingAvailability.add(resBooking.status === 201 || resBooking.status === 409);

  check(resCatalog, {
    'catalog responds 200': (r) => r.status === 200,
  });

  sleep(0.5);
}

