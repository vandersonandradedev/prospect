import { BusinessProvider } from './types';
import { OverpassOsmProvider } from './overpass';
import { GoogleMapsScraperProvider } from './gmaps-scraper';
import { GooglePlacesProvider } from './google-places';
import { LeadSource } from '@/types';

export const providers: Record<LeadSource, BusinessProvider | null> = {
  OPENSTREETMAP_OVERPASS: new OverpassOsmProvider(),
  GMAPS_SCRAPER_KIT: new GoogleMapsScraperProvider(),
  GOOGLE_PLACES_API: new GooglePlacesProvider(),
  BRASIL_API_CNPJ: null,
  MANUAL_ENTRY: null,
};

export function getProvider(source: LeadSource): BusinessProvider {
  const provider = providers[source];
  if (!provider) {
    throw new Error(`Provedor de coleta '${source}' não possui adaptador implementado.`);
  }
  return provider;
}

export async function getAllProvidersHealth() {
  const result: Array<{
    id: LeadSource;
    name: string;
    description: string;
    available: boolean;
    message: string;
  }> = [];

  for (const [key, p] of Object.entries(providers)) {
    if (p) {
      const health = await p.checkHealth();
      result.push({
        id: p.id,
        name: p.name,
        description: p.description,
        available: health.available,
        message: health.message,
      });
    }
  }

  return result;
}
