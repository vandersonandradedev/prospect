import { describe, it, expect } from 'vitest';
import { GET } from '@/app/api/cities/route';
import { NextRequest } from 'next/server';
import { BRAZILIAN_STATES, getStateByUf } from '@/lib/constants/states';

describe('Cities API and Brazilian States', () => {
  it('should have all 27 Brazilian Federative Units defined with capital and coordinates', () => {
    expect(BRAZILIAN_STATES.length).toBe(27);
    const sp = getStateByUf('SP');
    expect(sp).toBeDefined();
    expect(sp?.capital).toBe('São Paulo');
    expect(sp?.capitalLat).toBeCloseTo(-23.55, 1);

    const pr = getStateByUf('PR');
    expect(pr).toBeDefined();
    expect(pr?.capital).toBe('Curitiba');
    expect(pr?.capitalLat).toBeCloseTo(-25.42, 1);
  });

  it('should return real municipalities from IBGE for a valid UF', async () => {
    const req = new NextRequest('http://localhost:3000/api/cities?uf=RJ');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.uf).toBe('RJ');
    expect(data.stateName).toBe('Rio de Janeiro');
    expect(Array.isArray(data.cities)).toBe(true);
    expect(data.cities.length).toBeGreaterThan(50);
    expect(data.cities).toContain('Rio de Janeiro');
    expect(data.cities).toContain('Niterói');
  }, 10000);

  it('should return 400 for missing or invalid UF', async () => {
    const req1 = new NextRequest('http://localhost:3000/api/cities');
    const res1 = await GET(req1);
    expect(res1.status).toBe(400);

    const req2 = new NextRequest('http://localhost:3000/api/cities?uf=ZZ');
    const res2 = await GET(req2);
    expect(res2.status).toBe(400);
  });
});
