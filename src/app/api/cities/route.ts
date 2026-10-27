import { NextRequest, NextResponse } from 'next/server';
import { getStateByUf } from '@/lib/constants/states';

export const dynamic = 'force-dynamic';

interface CacheEntry {
  cities: string[];
  timestamp: number;
}

// Cache em memória para evitar chamadas redundantes ao IBGE (TTL 24 horas)
const citiesCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ufParam = searchParams.get('uf');

    if (!ufParam) {
      return NextResponse.json(
        { error: 'Parâmetro obrigatório "uf" ausente. Exemplo: /api/cities?uf=SP' },
        { status: 400 }
      );
    }

    const stateObj = getStateByUf(ufParam);
    if (!stateObj) {
      return NextResponse.json(
        { error: `UF inválida: "${ufParam}". Utilize uma das 27 siglas dos estados brasileiros.` },
        { status: 400 }
      );
    }

    const uf = stateObj.uf;

    // Verificar cache em memória
    const cached = citiesCache.get(uf);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS && cached.cities.length > 0) {
      return NextResponse.json({
        uf,
        stateName: stateObj.name,
        capital: stateObj.capital,
        count: cached.cities.length,
        cities: cached.cities,
        source: 'CACHE_IBGE',
      });
    }

    // Consulta oficial ao Instituto Brasileiro de Geografia e Estatística (IBGE)
    const ibgeUrl = `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(ibgeUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'VisionSolutions-B2BLeadHunter/2.0 (contato@visionsolutions.com.br)',
        },
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const cities: string[] = data
            .map((item: any) => item?.nome)
            .filter((name: any): name is string => typeof name === 'string' && name.trim().length > 0);

          if (cities.length > 0) {
            citiesCache.set(uf, { cities, timestamp: Date.now() });

            return NextResponse.json({
              uf,
              stateName: stateObj.name,
              capital: stateObj.capital,
              count: cities.length,
              cities,
              source: 'IBGE_OFICIAL',
            });
          }
        }
      }
    } catch (fetchErr) {
      console.warn(`IBGE API timeout/instabilidade para UF ${uf}:`, fetchErr);
    }

    // Fallback seguro caso a API pública do IBGE esteja momentaneamente fora
    const fallbackCities = [stateObj.capital];
    return NextResponse.json({
      uf,
      stateName: stateObj.name,
      capital: stateObj.capital,
      count: fallbackCities.length,
      cities: fallbackCities,
      source: 'CAPITAL_FALLBACK',
    });
  } catch (error: any) {
    console.error('Erro na rota de cidades:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao carregar cidades brasileiras.' },
      { status: 500 }
    );
  }
}
