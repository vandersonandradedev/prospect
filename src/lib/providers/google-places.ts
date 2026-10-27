import { BusinessProvider, ProviderHealth, RawBusinessLead } from './types';

interface PlaceDetails {
  phone: string | null;
  website: string | null;
  rating: number | null;
  reviewsCount: number | null;
  businessStatus: string | null;
  googleMapsUrl: string | null;
  formattedAddress: string | null;
}

async function fetchPlaceDetails(placeId: string, apiKey: string): Promise<PlaceDetails | null> {
  try {
    const fields = 'name,formatted_phone_number,international_phone_number,website,rating,user_ratings_total,business_status,formatted_address,url';
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
      placeId
    )}&fields=${fields}&key=${apiKey}&language=pt-BR`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 'OK' || !data.result) return null;

    const r = data.result;
    return {
      phone: r.formatted_phone_number || r.international_phone_number || null,
      website: r.website || null,
      rating: r.rating ? parseFloat(r.rating) : null,
      reviewsCount: r.user_ratings_total ? parseInt(r.user_ratings_total, 10) : null,
      businessStatus: r.business_status || null,
      googleMapsUrl: r.url || null,
      formattedAddress: r.formatted_address || null,
    };
  } catch {
    return null;
  }
}

export class GooglePlacesProvider implements BusinessProvider {
  id = 'GOOGLE_PLACES_API' as const;
  name = 'Google Places API (Oficial)';
  description = 'API oficial do Google Cloud para pesquisa de estabelecimentos e detalhes cadastrais.';

  private getApiKey(): string | null {
    return process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || null;
  }

  async checkHealth(): Promise<ProviderHealth> {
    const key = this.getApiKey();
    if (!key) {
      return {
        available: false,
        message: 'Chave GOOGLE_PLACES_API_KEY não configurada no arquivo .env.',
      };
    }
    return {
      available: true,
      message: 'Chave de API configurada e pronta para consultas de produção.',
    };
  }

  async searchBusinesses(params: {
    category: string;
    city: string;
    state: string;
    maxResults: number;
  }): Promise<RawBusinessLead[]> {
    const key = this.getApiKey();
    if (!key) {
      throw new Error('Chave de API do Google Places não encontrada.');
    }

    const query = `${params.category} em ${params.city}, ${params.state}`;
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
      query
    )}&key=${key}&language=pt-BR`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Falha na Google Places API: HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Erro retornado pela Google Places API: ${data.status} - ${data.error_message || ''}`);
    }

    const results = data.results || [];
    const limit = Math.min(params.maxResults || 20, results.length);
    const placesToProcess = results.slice(0, limit);

    // Consulta detalhes completos em paralelo (telefone real, site oficial, status operacional)
    const detailsList = await Promise.all(
      placesToProcess.map((p: any) =>
        fetchPlaceDetails(p.place_id, key).catch(() => null)
      )
    );

    const leads: RawBusinessLead[] = [];

    for (let i = 0; i < placesToProcess.length; i++) {
      const p = placesToProcess[i];
      const details = detailsList[i];

      // Filtra estabelecimentos permanentemente fechados para garantir dados ativos e reais
      if (details?.businessStatus === 'CLOSED_PERMANENTLY') {
        continue;
      }

      leads.push({
        externalId: p.place_id,
        name: p.name,
        category: p.types?.[0] || params.category,
        address: details?.formattedAddress || p.formatted_address || null,
        city: params.city,
        state: params.state,
        phone: details?.phone || null,
        website: details?.website || null,
        email: null,
        latitude: p.geometry?.location?.lat || null,
        longitude: p.geometry?.location?.lng || null,
        rating: details?.rating ?? p.rating ?? null,
        reviewsCount: details?.reviewsCount ?? p.user_ratings_total ?? null,
        source: 'GOOGLE_PLACES_API',
        sourceUrl: details?.googleMapsUrl || `https://www.google.com/maps/place/?q=place_id:${p.place_id}`,
      });
    }

    return leads;
  }
}
