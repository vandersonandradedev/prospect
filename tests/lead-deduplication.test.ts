import { describe, it, expect } from 'vitest';

export interface Lead {
  id: string;
  name: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviewsCount?: number;
}

export function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }
  return digits;
}

export function deduplicateLeads(leads: Lead[]): Lead[] {
  const seenPhones = new Set<string>();
  const seenWebsites = new Set<string>();
  const uniqueLeads: Lead[] = [];

  for (const lead of leads) {
    const cleanPhone = lead.phone ? normalizePhone(lead.phone) : null;
    const cleanWebsite = lead.website
      ? lead.website.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '')
      : null;

    if (cleanPhone && seenPhones.has(cleanPhone)) {
      continue;
    }
    if (cleanWebsite && seenWebsites.has(cleanWebsite)) {
      continue;
    }

    if (cleanPhone) seenPhones.add(cleanPhone);
    if (cleanWebsite) seenWebsites.add(cleanWebsite);
    uniqueLeads.push(lead);
  }

  return uniqueLeads;
}

export function calculateLeadScore(lead: Lead): number {
  let score = 0;
  if (lead.phone) score += 40;
  if (lead.website) score += 20;
  if (lead.rating && lead.rating >= 4.0) score += 20;
  if (lead.reviewsCount && lead.reviewsCount >= 10) score += 20;
  return score;
}

describe('Lead Deduplication & Scoring Rules', () => {
  it('should remove duplicate leads by identical phone number', () => {
    const rawLeads: Lead[] = [
      { id: '1', name: 'Barbearia Silva', phone: '+55 11 98888-7777' },
      { id: '2', name: 'Silva Barbearia Matriz', phone: '(11) 98888-7777' },
      { id: '3', name: 'Barbearia Santos', phone: '11999998888' },
    ];

    const deduplicated = deduplicateLeads(rawLeads);
    expect(deduplicated).toHaveLength(2);
    expect(deduplicated[0].id).toBe('1');
    expect(deduplicated[1].id).toBe('3');
  });

  it('should remove duplicate leads by normalized website domain', () => {
    const rawLeads: Lead[] = [
      { id: '1', name: 'Clínica Sorriso', website: 'https://www.sorriso.com.br/' },
      { id: '2', name: 'Sorriso Odontologia', website: 'http://sorriso.com.br' },
    ];

    const deduplicated = deduplicateLeads(rawLeads);
    expect(deduplicated).toHaveLength(1);
    expect(deduplicated[0].id).toBe('1');
  });

  it('should score complete leads with phone, website, and good ratings higher', () => {
    const richLead: Lead = {
      id: '1',
      name: 'Oficina Central',
      phone: '11988887777',
      website: 'https://oficinacentral.com.br',
      rating: 4.8,
      reviewsCount: 45,
    };

    const sparseLead: Lead = {
      id: '2',
      name: 'Oficina Sem Contato',
    };

    expect(calculateLeadScore(richLead)).toBe(100);
    expect(calculateLeadScore(sparseLead)).toBe(0);
  });
});
