import { BusinessProvider, ProviderHealth, RawBusinessLead } from './types';

export class OverpassOsmProvider implements BusinessProvider {
  id = 'OPENSTREETMAP_OVERPASS' as const;
  name = 'OpenStreetMap (Overpass API)';
  description = 'Base territorial aberta com coordenadas reais, telefones comerciais e endereços físicos verificáveis.';

  async checkHealth(): Promise<ProviderHealth> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch('https://overpass-api.de/api/status', { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        return { available: true, message: 'Servidor Overpass operacional e respondendo.' };
      }
      return { available: false, message: `Status Overpass HTTP ${res.status}` };
    } catch {
      return { available: false, message: 'Serviço Overpass inacessível ou com lentidão na rede.' };
    }
  }

  async searchBusinesses(params: {
    category: string;
    city: string;
    state: string;
    maxResults: number;
  }): Promise<RawBusinessLead[]> {
    const { category, city, state, maxResults } = params;

    // 1. Obter coordenadas da cidade via Nominatim
    const geocodeUrl = `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(
      city
    )}&state=${encodeURIComponent(state)}&country=Brazil&format=json&limit=1`;

    let lat = -23.5505;
    let lon = -46.6333;

    try {
      const geoRes = await fetch(geocodeUrl, {
        headers: { 'User-Agent': 'VisionSolutions-B2BLeadHunter/2.0' },
      });
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData && geoData.length > 0) {
          lat = parseFloat(geoData[0].lat);
          lon = parseFloat(geoData[0].lon);
        }
      }
    } catch (e) {
      console.warn('Geocodificação de fallback utilizada para', city, e);
    }

    // 2. Mapeamento inteligente de tags OSM para categorias comerciais
    const catLower = category.toLowerCase();
    let amenityFilter = '["amenity"~"restaurant|fast_food|cafe|bar"]';

    if (catLower.includes('oficina') || catLower.includes('mecanic') || catLower.includes('auto') || catLower.includes('moto')) {
      amenityFilter = '["shop"~"car_repair|motorcycle_repair|tyres|car_parts"]';
    } else if (catLower.includes('pizzaria') || catLower.includes('pizza')) {
      amenityFilter = '["cuisine"~"pizza"]';
    } else if (catLower.includes('hamburg') || catLower.includes('burger')) {
      amenityFilter = '["cuisine"~"burger"]';
    } else if (catLower.includes('açaí') || catLower.includes('acai') || catLower.includes('sorvete')) {
      amenityFilter = '["amenity"~"ice_cream|cafe"]';
    } else if (catLower.includes('varejo') || catLower.includes('loja') || catLower.includes('comercio') || catLower.includes('fiscal')) {
      amenityFilter = '["shop"]';
    }

    // Raio de busca em torno do centro da cidade (15.000m)
    const radius = 15000;
    const limit = Math.min(maxResults || 20, 50);

    const overpassQuery = `
      [out:json][timeout:25];
      (
        node${amenityFilter}(around:${radius},${lat},${lon})["name"];
        way${amenityFilter}(around:${radius},${lat},${lon})["name"];
      );
      out center ${limit};
    `;

    const overpassUrl = 'https://overpass-api.de/api/interpreter';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(overpassUrl, {
      method: 'POST',
      body: overpassQuery,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'VisionSolutions-B2BLeadHunter/2.0',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Falha na consulta Overpass API: HTTP ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const elements = data.elements || [];

    const leads: RawBusinessLead[] = [];

    for (const el of elements) {
      const tags = el.tags || {};
      const name = tags.name;
      if (!name) continue;

      const elementLat = el.lat ?? el.center?.lat ?? lat;
      const elementLon = el.lon ?? el.center?.lon ?? lon;

      // Extrair telefone comercial publicado
      const rawPhone = tags['contact:phone'] || tags['contact:mobile'] || tags.phone || tags.mobile || null;
      
      // Extrair site ou rede comercial pública
      const rawWebsite = tags['contact:website'] || tags.website || tags['contact:facebook'] || tags['contact:instagram'] || null;

      // Montar endereço
      const street = tags['addr:street'] || '';
      const housenumber = tags['addr:housenumber'] || '';
      const suburb = tags['addr:suburb'] || '';
      const address = [street, housenumber, suburb].filter(Boolean).join(', ') || null;

      leads.push({
        externalId: `osm-${el.type}-${el.id}`,
        name: name.trim(),
        category: tags.cuisine || tags.amenity || tags.shop || category,
        address,
        city,
        state,
        phone: rawPhone,
        website: rawWebsite,
        email: tags['contact:email'] || tags.email || null,
        latitude: elementLat,
        longitude: elementLon,
        rating: null,
        reviewsCount: null,
        source: 'OPENSTREETMAP_OVERPASS',
        sourceUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
      });
    }

    return leads;
  }
}
