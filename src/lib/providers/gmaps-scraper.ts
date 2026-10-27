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
        message: 'Coletor local Docker opcional (offline). Não necessário para uso na nuvem.',
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

    // 1. Criar Job de Scraping com o payload estritamente compatível com o coletor
    const createRes = await fetch(`${baseUrl}/api/v1/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `scrape-${params.category.substring(0, 20)}-${Date.now()}`,
        keywords: [query],
        lang: 'pt',
        zoom: 15,
        depth: 1,
        email: true,
        max_time: 45,
      }),
    });

    if (!createRes.ok) {
      throw new Error(
        `Falha ao iniciar trabalho no Google Maps Scraper Kit: HTTP ${createRes.status}. Verifique se o Docker está ativo.`
      );
    }

    const jobData = await createRes.json();
    const jobId = jobData.id || jobData.ID || jobData.job_id;

    if (!jobId) {
      throw new Error('Serviço local de scraping não retornou identificador de trabalho (job_id).');
    }

    // 2. Polling com timeout (45s)
    const startTime = Date.now();
    const maxPollTime = 45000;
    let completed = false;

    while (Date.now() - startTime < maxPollTime) {
      await new Promise((r) => setTimeout(r, 2500));
      const statusRes = await fetch(`${baseUrl}/api/v1/jobs/${jobId}`);
      if (!statusRes.ok) continue;

      const statusData = await statusRes.json();
      const st = (statusData.Status || statusData.status || '').toLowerCase();
      if (st === 'ok' || st === 'completed' || st === 'done') {
        completed = true;
        break;
      }
      if (st === 'failed' || st === 'error') {
        throw new Error(`O trabalho de coleta falhou no contêiner: ${statusData.error || 'Erro interno'}`);
      }
    }

    if (!completed) {
      throw new Error('Tempo limite excedido aguardando resposta do coletor local (timeout 45s).');
    }

    // 3. Obter Resultados (Download CSV)
    const downloadRes = await fetch(`${baseUrl}/api/v1/jobs/${jobId}/download`);
    if (!downloadRes.ok) {
      throw new Error(`Falha ao obter download do trabalho: HTTP ${downloadRes.status}`);
    }

    const csvText = await downloadRes.text();
    return this.parseScraperCsv(csvText, params, jobId);
  }

  private parseScraperCsv(
    csv: string,
    params: { category: string; city: string; state: string; maxResults: number },
    jobId: string
  ): RawBusinessLead[] {
    const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          inQuotes = !inQuotes;
        } else if (c === ',' && !inQuotes) {
          result.push(cur.trim());
          cur = '';
        } else {
          cur += c;
        }
      }
      result.push(cur.trim());
      return result;
    };

    const headers = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9_]/g, ''));
    const leads: RawBusinessLead[] = [];
    const limit = Math.min(params.maxResults || 20, lines.length - 1);

    for (let i = 1; i <= limit; i++) {
      const values = parseLine(lines[i]);
      if (values.length < 2) continue;

      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });

      const name = row['title'] || row['name'] || 'Empresa sem nome';
      if (!name || name === 'Empresa sem nome') continue;

      leads.push({
        externalId: row['place_id'] || row['cid'] || `gmaps-${jobId}-${i}`,
        name,
        category: row['category'] || params.category,
        address: row['address'] || null,
        city: params.city,
        state: params.state,
        phone: row['phone'] || null,
        website: row['website'] || row['url'] || null,
        email: row['emails'] || row['email'] || null,
        latitude: row['latitude'] ? parseFloat(row['latitude']) : null,
        longitude: row['longitude'] ? parseFloat(row['longitude']) : null,
        rating: row['review_rating'] || row['rating'] ? parseFloat(row['review_rating'] || row['rating']) : null,
        reviewsCount:
          row['review_count'] || row['reviews_count'] ? parseInt(row['review_count'] || row['reviews_count'], 10) : null,
        source: 'GMAPS_SCRAPER_KIT',
        sourceUrl: row['link'] || row['google_maps_url'] || null,
      });
    }

    return leads;
  }
}
