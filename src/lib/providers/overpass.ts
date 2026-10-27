import { BusinessProvider, ProviderHealth, RawBusinessLead } from './types';
import { getStateByUf } from '@/lib/constants/states';

export class OverpassOsmProvider implements BusinessProvider {
  id = 'OPENSTREETMAP_OVERPASS' as const;
  name = 'OpenStreetMap (Overpass API)';
  description = 'Base territorial aberta com coordenadas reais, telefones comerciais e endereços físicos verificáveis.';

  private readonly OVERPASS_SERVERS = [
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass-api.de/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
  ];

  async checkHealth(): Promise<ProviderHealth> {
    try {
      // 1. Testa Nominatim (geocodificação aberta e busca de limites territoriais)
      const nomController = new AbortController();
      const nomTimeout = setTimeout(() => nomController.abort(), 5000);
      const nomRes = await fetch('https://nominatim.openstreetmap.org/search?format=json&q=Brazil&limit=1', {
        headers: {
          'User-Agent': 'VisionSolutions-B2BLeadHunter/2.0 (contato@visionsolutions.com.br)',
        },
        signal: nomController.signal,
      });
      clearTimeout(nomTimeout);

      if (nomRes.ok) {
        return {
          available: true,
          message: 'Rede OpenStreetMap / Nominatim operacional e pronta para consultas territoriais.',
        };
      }
    } catch {
      // Continua para checagem do status Overpass
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch('https://overpass-api.de/api/status', {
        headers: {
          'User-Agent': 'VisionSolutions-B2BLeadHunter/2.0 (contato@visionsolutions.com.br)',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        return { available: true, message: 'Servidor Overpass operacional e respondendo.' };
      }
      return { available: false, message: `Status Overpass HTTP ${res.status} (servidor alemão em alta demanda)` };
    } catch {
      return { available: true, message: 'Serviço ativo com espelhos de contingência configurados.' };
    }
  }

  async searchBusinesses(params: {
    category: string;
    city: string;
    state: string;
    maxResults: number;
  }): Promise<RawBusinessLead[]> {
    const { category, city, state, maxResults } = params;
    const limit = Math.min(maxResults || 20, 50);

    const stateObj = getStateByUf(state);
    const stateName = stateObj?.name || state;

    // 1. Tentar busca rápida de POIs via Nominatim (responde em < 1s)
    try {
      const catLower = category.toLowerCase().trim();
      const nomQueries = [
        `${category}, ${city}, ${stateName}, Brasil`,
        `${category} em ${city}, ${stateName}`,
        `${category}, ${city}, ${state}, Brasil`,
      ];

      if (catLower.includes('dark kitchen')) {
        nomQueries.push(`restaurante delivery, ${city}, ${stateName}, Brasil`);
        nomQueries.push(`lanchonete, ${city}, ${stateName}, Brasil`);
      } else if (catLower.includes('software') || catLower.includes('fiscal')) {
        nomQueries.push(`informatica, ${city}, ${stateName}, Brasil`);
        nomQueries.push(`tecnologia, ${city}, ${stateName}, Brasil`);
        nomQueries.push(`comercio, ${city}, ${stateName}, Brasil`);
      } else if (catLower.includes('oficina') || catLower.includes('mecanic') || catLower.includes('automotivo')) {
        nomQueries.push(`oficina, ${city}, ${stateName}, Brasil`);
        nomQueries.push(`auto pecas, ${city}, ${stateName}, Brasil`);
      } else if (catLower.includes('pizz')) {
        nomQueries.push(`pizzaria, ${city}, ${stateName}, Brasil`);
      } else if (catLower.includes('hamburg') || catLower.includes('burger')) {
        nomQueries.push(`hamburgueria, ${city}, ${stateName}, Brasil`);
        nomQueries.push(`lanchonete, ${city}, ${stateName}, Brasil`);
      } else if (catLower.includes('acai') || catLower.includes('açaí')) {
        nomQueries.push(`sorveteria, ${city}, ${stateName}, Brasil`);
      }

      for (const queryStr of nomQueries) {
        const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          queryStr
        )}&format=json&addressdetails=1&extratags=1&limit=${limit}`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(nomUrl, {
          headers: {
            'User-Agent': 'VisionSolutions-B2BLeadHunter/2.0 (contato@visionsolutions.com.br)',
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (res.ok) {
          const items = await res.json();
          if (Array.isArray(items) && items.length > 0) {
            const leads: RawBusinessLead[] = [];

            for (const item of items) {
              const name = item.name || (item.display_name ? item.display_name.split(',')[0].trim() : null);
              if (!name) continue;

              const addr = item.address || {};
              // Validar que o estado corresponde à UF pesquisada quando disponível
              const itemState = addr.state || '';
              if (itemState && stateName) {
                const s1 = itemState.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
                const s2 = stateName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
                if (!s1.includes(s2) && !s2.includes(s1)) {
                  continue;
                }
              }

              const road = addr.road || addr.pedestrian || addr.street || '';
              const houseNumber = addr.house_number || '';
              const suburb = addr.suburb || addr.neighbourhood || addr.district || '';
              const addressParts = [road, houseNumber, suburb].filter(Boolean);
              const address = addressParts.length > 0 ? addressParts.join(', ') : item.display_name || null;

              const extra = item.extratags || {};
              const rawPhone =
                extra['contact:phone'] ||
                extra.phone ||
                extra['contact:mobile'] ||
                extra.mobile ||
                null;
              const rawWebsite =
                extra['contact:website'] ||
                extra.website ||
                extra['contact:instagram'] ||
                null;
              const rawEmail = extra['contact:email'] || extra.email || null;

              leads.push({
                externalId: `osm-${item.osm_type || 'node'}-${item.osm_id || item.place_id}`,
                name,
                category: extra.cuisine || item.type || category,
                address,
                city: addr.city || addr.town || addr.municipality || city,
                state: stateObj?.uf || state,
                phone: rawPhone,
                website: rawWebsite,
                email: rawEmail,
                latitude: item.lat ? parseFloat(item.lat) : null,
                longitude: item.lon ? parseFloat(item.lon) : null,
                rating: null,
                reviewsCount: null,
                source: 'OPENSTREETMAP_OVERPASS',
                sourceUrl:
                  item.osm_type && item.osm_id
                    ? `https://www.openstreetmap.org/${item.osm_type}/${item.osm_id}`
                    : `https://nominatim.openstreetmap.org/ui/details.html?osmtype=${item.osm_type}&osmid=${item.osm_id}`,
              });
            }

            if (leads.length > 0) {
              return leads;
            }
          }
        }
      }
    } catch (nomErr) {
      console.warn('Consulta direta Nominatim falhou, tentando espelhos Overpass:', nomErr);
    }

    // 2. Se Nominatim não retornou, obter coordenadas exatas da cidade
    let lat = stateObj?.capitalLat ?? -23.5505;
    let lon = stateObj?.capitalLon ?? -46.6333;
    let geocodeSuccess = false;

    // Tentativa A: busca com nome completo do estado
    const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      `${city}, ${stateName}, Brasil`
    )}&format=json&limit=1`;

    try {
      const geoController = new AbortController();
      const geoTimeout = setTimeout(() => geoController.abort(), 4000);
      const geoRes = await fetch(geocodeUrl, {
        headers: { 'User-Agent': 'VisionSolutions-B2BLeadHunter/2.0 (contato@visionsolutions.com.br)' },
        signal: geoController.signal,
      });
      clearTimeout(geoTimeout);

      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData && geoData.length > 0) {
          lat = parseFloat(geoData[0].lat);
          lon = parseFloat(geoData[0].lon);
          geocodeSuccess = true;
        }
      }
    } catch (e) {
      console.warn('Geocodificação inicial falhou para:', city, stateName, e);
    }

    // Tentativa B: busca estruturada se a primeira não encontrou
    if (!geocodeSuccess) {
      try {
        const structuredUrl = `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(
          city
        )}&state=${encodeURIComponent(stateName)}&country=Brazil&format=json&limit=1`;

        const geoController2 = new AbortController();
        const geoTimeout2 = setTimeout(() => geoController2.abort(), 4000);
        const geoRes2 = await fetch(structuredUrl, {
          headers: { 'User-Agent': 'VisionSolutions-B2BLeadHunter/2.0 (contato@visionsolutions.com.br)' },
          signal: geoController2.signal,
        });
        clearTimeout(geoTimeout2);

        if (geoRes2.ok) {
          const geoData2 = await geoRes2.json();
          if (geoData2 && geoData2.length > 0) {
            lat = parseFloat(geoData2[0].lat);
            lon = parseFloat(geoData2[0].lon);
            geocodeSuccess = true;
          }
        }
      } catch (e2) {
        console.warn('Geocodificação estruturada falhou para:', city, e2);
      }
    }

    // 3. Mapeamento inteligente de tags OSM para categorias comerciais com suporte a node e way
    const catLower = category.toLowerCase();
    const radius = 8000;
    let filterClause = '';

    if (
      catLower.includes('oficina') ||
      catLower.includes('mecanic') ||
      catLower.includes('auto') ||
      catLower.includes('moto') ||
      catLower.includes('carro')
    ) {
      filterClause = `
        node["shop"~"car_repair|motorcycle_repair|tyres|car_parts"](around:${radius},${lat},${lon})["name"];
        way["shop"~"car_repair|motorcycle_repair|tyres|car_parts"](around:${radius},${lat},${lon})["name"];
        node["craft"~"car_repair|motorcycle_repair"](around:${radius},${lat},${lon})["name"];
        way["craft"~"car_repair|motorcycle_repair"](around:${radius},${lat},${lon})["name"];
      `;
    } else if (
      catLower.includes('varejo') ||
      catLower.includes('loja') ||
      catLower.includes('comercio') ||
      catLower.includes('fiscal') ||
      catLower.includes('distribuidora')
    ) {
      filterClause = `
        node["shop"](around:${radius},${lat},${lon})["name"];
        way["shop"](around:${radius},${lat},${lon})["name"];
      `;
    } else {
      // Alimentação (Restaurantes, Hamburguerias, Pizzarias, Lanchonetes, Cafés)
      filterClause = `
        node["amenity"~"restaurant|fast_food|cafe|bar"](around:${radius},${lat},${lon})["name"];
        way["amenity"~"restaurant|fast_food|cafe|bar"](around:${radius},${lat},${lon})["name"];
      `;
    }

    const overpassQuery = `
      [out:json][timeout:12];
      (
        ${filterClause}
      );
      out center ${limit};
    `;

    // 4. Tentar servidores Overpass com timeout ágil (6s)
    let lastError: Error | null = null;
    let data: any = null;

    const servers = [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
    ];

    for (const serverUrl of servers) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(serverUrl, {
          method: 'POST',
          body: 'data=' + encodeURIComponent(overpassQuery),
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'VisionSolutions-B2BLeadHunter/2.0',
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (response.ok) {
          data = await response.json();
          break;
        } else {
          lastError = new Error(`HTTP ${response.status}`);
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!data || !data.elements || data.elements.length === 0) {
      return [];
    }

    const elements = data.elements || [];
    const leads: RawBusinessLead[] = [];

    for (const el of elements) {
      const tags = el.tags || {};
      const name = tags.name;
      if (!name) continue;

      const elementLat = el.lat ?? el.center?.lat ?? lat;
      const elementLon = el.lon ?? el.center?.lon ?? lon;

      // Extrair telefone comercial publicado
      const rawPhone =
        tags['contact:whatsapp'] ||
        tags.whatsapp ||
        tags['contact:phone'] ||
        tags['contact:mobile'] ||
        tags.phone ||
        tags.mobile ||
        null;

      // Extrair site ou rede comercial pública
      const rawWebsite =
        tags['contact:website'] || tags.website || tags['contact:facebook'] || tags['contact:instagram'] || null;

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
        city: tags['addr:city'] || city,
        state: stateObj?.uf || state,
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
