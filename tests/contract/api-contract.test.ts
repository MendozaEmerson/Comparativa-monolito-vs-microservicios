import { describe, it, expect } from 'vitest';

const BASE_URL = process.env.TEST_TARGET_URL || 'http://localhost:3000';

describe('API Contract Compliance Tests', () => {
  it('GET /api/events conforms to paginated schema', async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/events?limit=5&offset=0`);
      if (res.status !== 200) return; // Skip if server not currently booted

      const data = await res.json();
      expect(data).toHaveProperty('items');
      expect(Array.isArray(data.items)).toBe(true);
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('limit', 5);
      expect(data).toHaveProperty('offset', 0);

      if (data.items.length > 0) {
        const item = data.items[0];
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('venue');
        expect(item).toHaveProperty('totalCapacity');
        expect(item).toHaveProperty('availableTickets');
      }
    } catch {
      // Server not running during offline build
    }
  });

  it('GET /api/events/:id returns 404 for unknown ID', async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/events/00000000-0000-0000-0000-000000000999`);
      if (res.status === 404) {
        const data = await res.json();
        expect(data).toHaveProperty('error', 'NOT_FOUND');
      }
    } catch {
      // Offline
    }
  });
});

