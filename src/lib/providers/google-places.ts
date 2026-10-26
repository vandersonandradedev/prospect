import { BusinessProvider, ProviderHealth, RawBusinessLead } from './types';

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
    const leads: RawBusinessLead[] = [];

    for (let i = 0; i < limit; i++) {
      const p = results[i];

      leads.push({
        externalId: p.place_id,
        name: p.name,
        category: p.types?.[0] || params.category,
        address: p.formatted_address || null,
        city: params.city,
        state: params.state,
        phone: null, // No Text Search o telefone não vem, exigiria chamada a Place Details
        website: null,
        email: null,
        latitude: p.geometry?.location?.lat || null,
        longitude: p.geometry?.location?.lng || null,
        rating: p.rating || null,
        reviewsCount: p.user_ratings_total || null,
        source: 'GOOGLE_PLACES_API',
        sourceUrl: `https://www.google.com/maps/place/?q=place_id:${p.place_id}`,
      });
    }

    return leads;
  }
}
