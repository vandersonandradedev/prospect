import { BusinessProvider, ProviderHealth, RawBusinessLead } from './types';

export class GoogleMapsScraperProvider implements BusinessProvider {
  id = 'GMAPS_SCRAPER_KIT' as const;
  name = 'Google Maps Scraper Kit (Docker Local via Túnel)';
  description = 'Coletor conteinerizado com túnel para acesso seguro pelo Render/Vercel.';

  private getBaseUrl(): string {
    let rawUrl = (
      process.env.GMAPS_SCRAPER_API_URL ||
      process.env.NEXT_PUBLIC_GMAPS_SCRAPER_URL ||
      ''
    ).trim();

    const isCloudEnv = Boolean(
      process.env.RENDER ||
      process.env.VERCEL ||
      process.env.NODE_ENV === 'production'
    );

    if (!rawUrl || (isCloudEnv && (rawUrl.includes('localhost') || rawUrl.includes('.loca.lt')))) {
      rawUrl = 'https://vision-gmaps-scraper.onrender.com';
    }

    let url = rawUrl.replace(/\/$/, '');
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `http://${url}`;
    }

    // No Render Free Tier, comunicação ocorre pela URL pública HTTPS:
    if (url.includes('vision-gmaps-scraper') && !url.includes('.onrender.com')) {
      url = 'https://vision-gmaps-scraper.onrender.com';
    }

    return url;
  }

  private getHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
    return {
      'Bypass-Tunnel-Reminder': 'true',
      'bypass-tunnel-reminder': '1',
      'User-Agent': 'VisionSolutions-B2B/1.0',
      ...extraHeaders,
    };
  }

  async checkHealth(): Promise<ProviderHealth> {
    const baseUrl = this.getBaseUrl();
    const url = `${baseUrl}/api/v1/jobs`;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6500);
      const res = await fetch(url, {
        headers: this.getHeaders(),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        return {
          available: true,
          message: `Coletor Docker ativo via ${baseUrl}.`,
          isLocalService: true,
        };
      }
      return {
        available: false,
        message: `Serviço retornou HTTP ${res.status} em ${baseUrl}.`,
        isLocalService: true,
      };
    } catch {
      return {
        available: false,
        message: `Coletor offline em ${baseUrl}. Verifique se o Docker e o túnel localtunnel estão ativos.`,
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
    const createController = new AbortController();
    const createTimeout = setTimeout(() => createController.abort(), 12000);
    let createRes: Response;
    try {
      createRes = await fetch(`${baseUrl}/api/v1/jobs`, {
        method: 'POST',
        headers: this.getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          name: `scrape-${params.category.substring(0, 20)}-${Date.now()}`,
          keywords: [query],
          lang: 'pt',
          zoom: 15,
          depth: 1,
          email: true,
          max_time: 30,
        }),
        signal: createController.signal,
      });
    } catch (err: any) {
      throw new Error(`Tempo limite ou falha ao conectar no coletor em ${baseUrl}: ${err.message}`);
    } finally {
      clearTimeout(createTimeout);
    }

    if (!createRes.ok) {
      throw new Error(
        `Falha ao iniciar trabalho no Google Maps Scraper Kit em ${baseUrl}: HTTP ${createRes.status}. Verifique se o túnel local está ativo.`
      );
    }

    const jobData = await createRes.json();
    const jobId = jobData.id || jobData.ID || jobData.job_id;

    if (!jobId) {
      throw new Error('Serviço local de scraping não retornou identificador de trabalho (job_id).');
    }

    // 2. Polling com timeout (30s)
    const startTime = Date.now();
    const maxPollTime = 30000;
    let completed = false;

    while (Date.now() - startTime < maxPollTime) {
      await new Promise((r) => setTimeout(r, 2500));
      const statusRes = await fetch(`${baseUrl}/api/v1/jobs/${jobId}`, {
        headers: this.getHeaders(),
      });
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
    const downloadRes = await fetch(`${baseUrl}/api/v1/jobs/${jobId}/download`, {
      headers: this.getHeaders(),
    });
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
