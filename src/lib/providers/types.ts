import { LeadSource } from '@/types';

export interface RawBusinessLead {
  externalId: string;
  name: string;
  category: string;
  address?: string | null;
  city: string;
  state: string;
  phone?: string | null;
  website?: string | null;
  email?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  rating?: number | null;
  reviewsCount?: number | null;
  source: LeadSource;
  sourceUrl?: string | null;
}

export interface ProviderHealth {
  available: boolean;
  message: string;
  isLocalService?: boolean;
}

export interface BusinessProvider {
  id: LeadSource;
  name: string;
  description: string;
  checkHealth(): Promise<ProviderHealth>;
  searchBusinesses(params: {
    category: string;
    city: string;
    state: string;
    maxResults: number;
  }): Promise<RawBusinessLead[]>;
}
