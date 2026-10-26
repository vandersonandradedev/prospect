import { describe, it, expect } from 'vitest';
import { POST } from '@/app/api/search/route';
import { NextRequest } from 'next/server';

describe('Search API Route', () => {
  it('should test search POST', async () => {
    const req = new NextRequest('http://localhost:3000/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: 'prod-mesago',
        category: 'Hamburgueria',
        city: 'São Paulo',
        state: 'SP',
        maxResults: 5,
        provider: 'OPENSTREETMAP_OVERPASS',
      }),
    });

    const res = await POST(req);
    const data = await res.json();
    console.log('SEARCH RESPONSE STATUS:', res.status, data);
    expect(res.status).toBe(200);
  }, 60000);
});
