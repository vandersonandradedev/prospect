import { BusinessProvider, ProviderHealth, RawBusinessLead } from './types';

export class GoogleMapsScraperProvider implements BusinessProvider {
  id = 'GMAPS_SCRAPER_KIT' as const;
  name = 'Google Maps Scraper Kit (Docker Local)';
  description = 'Coletor local conteinerizado para Google Maps com extração de contatos comerciais.';

  private getBaseUrl(): string {
    return process.env.GMAPS_SCRAPER_API_URL || 'http://localhost:8080';
  }

  async checkHealth(): Promise<ProviderHealth> {
    const url = `${this.getBaseUrl()}/api/v1/jobs`;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        return {
          available: true,
          message: 'Contêiner Docker local ativo e respondendo na porta 8080.',
          isLocalService: true,
        };
      }
      return {
        available: false,
        message: `Serviço retornou HTTP ${res.status}.`,
        isLocalService: true,
      };
    } catch {
      return {
        available: false,
        message: 'Serviço local offline. Inicie o contêiner com: docker compose up -d',
        isLocalService: true,
      };
    }
  }

  async searchBusinesses(params: {
    category: string;
    city: string;
    state: string;
    maxResults: number;
  }): Promise<RawBusinessLead[]> {
    const baseUrl = this.getBaseUrl();
    const query = `${params.category} em ${params.city}, ${params.state}`;

    // 1. Criar Job de Scraping
    const createRes = await fetch(`${baseUrl}/api/v1/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        city: `${params.city}, ${params.state}`,
        depth: Math.min(Math.ceil(params.maxResults / 10), 5),
        extract_emails: true,
      }),
    });

    if (!createRes.ok) {
      throw new Error(
        `Falha ao iniciar trabalho no Google Maps Scraper Kit: HTTP ${createRes.status}. Verifique se o Docker está ativo.`
      );
    }

    const jobData = await createRes.json();
    const jobId = jobData.id || jobData.job_id;

    if (!jobId) {
      throw new Error('Serviço local de scraping não retornou identificador de trabalho (job_id).');
    }

    // 2. Polling com timeout
    const startTime = Date.now();
    const maxPollTime = 60000; // 60 segundos
    let completed = false;

    while (Date.now() - startTime < maxPollTime) {
      await new Promise((r) => setTimeout(r, 3000));
      const statusRes = await fetch(`${baseUrl}/api/v1/jobs/${jobId}`);
      if (!statusRes.ok) continue;

      const statusData = await statusRes.json();
      if (statusData.status === 'completed' || statusData.status === 'done') {
        completed = true;
        break;
      }
      if (statusData.status === 'failed') {
        throw new Error(`O trabalho de coleta falhou no contêiner: ${statusData.error || 'Erro desconhecido'}`);
      }
    }

    if (!completed) {
      throw new Error('Tempo limite excedido aguardando resposta do coletor local (timeout 60s).');
    }

    // 3. Obter Resultados
    const resultsRes = await fetch(`${baseUrl}/api/v1/jobs/${jobId}/results`);
    if (!resultsRes.ok) {
      throw new Error(`Falha ao obter resultados do trabalho: HTTP ${resultsRes.status}`);
    }

    const results = await resultsRes.json();
    const items = Array.isArray(results) ? results : results.items || [];

    return items.map((item: any, idx: number) => ({
      externalId: item.place_id || `gmaps-${jobId}-${idx}`,
      name: item.name || item.title || 'Empresa sem nome',
      category: item.category || params.category,
      address: item.address || null,
      city: params.city,
      state: params.state,
      phone: item.phone || null,
      website: item.website || item.url || null,
      email: item.email || null,
      latitude: item.latitude ? parseFloat(item.latitude) : null,
      longitude: item.longitude ? parseFloat(item.longitude) : null,
      rating: item.rating ? parseFloat(item.rating) : null,
      reviewsCount: item.reviews_count ? parseInt(item.reviews_count, 10) : null,
      source: 'GMAPS_SCRAPER_KIT',
      sourceUrl: item.google_maps_url || null,
    }));
  }
}
