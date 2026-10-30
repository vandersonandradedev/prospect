import { describe, it, expect } from 'vitest';
import { POST } from '@/app/api/search/route';
import { NextRequest } from 'next/server';

describe('Search API Route', () => {
  it('should test search POST with valid category', async () => {
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
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  }, 60000);

  it('should gracefully fallback when local scraper is offline without 502 error', async () => {
    const req = new NextRequest('http://localhost:3000/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: 'prod-torqueos',
        category: 'Oficina Mecânica',
        city: 'Campinas',
        state: 'SP',
        maxResults: 5,
        provider: 'GMAPS_SCRAPER_KIT',
      }),
    });

    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  }, 90000);
});
