import http from 'k6/http';
import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const successfulBookings = new Counter('successful_bookings');
const conflictBookings = new Counter('conflict_bookings');
const contentionDuration = new Trend('contention_duration', true);

export const options = {
  scenarios: {
    contention_burst: {
      executor: 'shared-iterations',
      vus: 150,
      iterations: 150,
      maxDuration: '30s',
    },
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:3000';
const TARGET_EVENT_ID = '00000000-0000-0000-0000-000000000001'; // 20 tickets initially

export default function () {
  const payload = JSON.stringify({
    eventId: TARGET_EVENT_ID,
    userId: `stress-user-${__VU}`,
    tickets: 1,
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const start = Date.now();
  const res = http.post(`${BASE_URL}/api/reservations`, payload, params);
  contentionDuration.add(Date.now() - start);

  if (res.status === 201) {
    successfulBookings.add(1);
  } else if (res.status === 409) {
    conflictBookings.add(1);
  }

  check(res, {
    'valid business response (201 or 409)': (r) => r.status === 201 || r.status === 409,
    'no server crash (not 500)': (r) => r.status !== 500,
  });
}

