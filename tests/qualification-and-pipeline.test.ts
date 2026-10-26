import { describe, it, expect } from 'vitest';
import { calculateLeadScore } from '../src/lib/qualification';
import { normalizePhone, normalizeDomain, deduplicateAndMerge } from '../src/lib/deduplication';
import { BusinessLead, RawBusinessLead } from '../src/types';
import { isSuppressed, addSuppressionEntry } from '../src/lib/db';

describe('1. Phone & Domain Normalization', () => {
  it('should normalize Brazilian phones with or without +55 to standard (DDD) format', () => {
    expect(normalizePhone('+5511987654321')).toBe('(11) 98765-4321');
    expect(normalizePhone('11987654321')).toBe('(11) 98765-4321');
    expect(normalizePhone('(11) 98765-4321')).toBe('(11) 98765-4321');
    expect(normalizePhone('2133445566')).toBe('(21) 3344-5566');
    expect(normalizePhone(null)).toBeNull();
  });

  it('should normalize web domains by stripping protocol, www, and query params', () => {
    expect(normalizeDomain('https://www.restauranteexemplo.com.br/cardapio')).toBe('restauranteexemplo.com.br');
    expect(normalizeDomain('http://oficina.com.br/')).toBe('oficina.com.br');
    expect(normalizeDomain('www.oficina.com.br')).toBe('oficina.com.br');
    expect(normalizeDomain(null)).toBeNull();
  });
});

describe('2. Deduplication & Commercial History Preservation', () => {
  it('should not duplicate leads that have identical normalized phone numbers', () => {
    const existing: BusinessLead[] = [
      {
        id: 'lead-1',
        name: 'Hamburgueria do Bairro',
        category: 'Hamburgueria',
        productId: 'prod-mesago',
        productName: 'MesaGo',
        city: 'São Paulo',
        state: 'SP',
        phone: '(11) 98888-7777',
        website: 'https://hamburgueria.com.br',
        source: 'OPENSTREETMAP_OVERPASS',
        dataConfidence: 'HIGH',
        verificationStatus: 'WEBSITE_VERIFIED',
        pipelineStage: 'QUALIFIED',
        priority: 'HIGH',
        score: 80,
        scoreFactors: [],
        firstCollectedAt: '2026-10-01T10:00:00Z',
        lastVerifiedAt: '2026-10-01T10:00:00Z',
        evidences: [],
        activities: [
          {
            id: 'act-1',
            leadId: 'lead-1',
            type: 'NOTE',
            title: 'Conversa inicial',
            description: 'Gerente solicitou proposta na sexta.',
            createdAt: '2026-10-02T10:00:00Z',
          },
        ],
        stageHistory: [],
      },
    ];

    const incoming: RawBusinessLead[] = [
      {
        externalId: 'osm-node-999',
        name: 'Hamburgueria do Bairro - Matriz',
        category: 'Hamburgueria',
        city: 'São Paulo',
        state: 'SP',
        phone: '+55 11 98888-7777', // Mesmo número com formatação diferente
        website: 'https://hamburgueria.com.br',
        source: 'OPENSTREETMAP_OVERPASS',
      },
      {
        externalId: 'osm-node-1000',
        name: 'Nova Pizzaria',
        category: 'Pizzaria',
        city: 'São Paulo',
        state: 'SP',
        phone: '11977776666', // Novo lead
        source: 'OPENSTREETMAP_OVERPASS',
      },
    ];

    const result = deduplicateAndMerge(existing, incoming, 'prod-mesago');

    expect(result.newCount).toBe(1);
    expect(result.updatedCount).toBe(0);
    expect(result.mergedLeads).toHaveLength(2);

    // O lead existente manteve seu histórico e estágio
    const lead1 = result.mergedLeads.find((l) => l.id === 'lead-1');
    expect(lead1?.pipelineStage).toBe('QUALIFIED');
    expect(lead1?.activities).toHaveLength(1);
    expect(lead1?.activities[0].title).toBe('Conversa inicial');
  });
});

describe('3. Deterministic Lead Scoring & Segment Matching', () => {
  it('should score food businesses higher for MesaGo when phone and website exist', () => {
    const mesaGoResult = calculateLeadScore({
      category: 'Hamburgueria Artesanal',
      productSlug: 'mesago',
      hasPhone: true,
      hasWebsite: true,
      rating: 4.8,
      reviewsCount: 50,
      hasDigitalMenu: true,
    });

    expect(mesaGoResult.score).toBeGreaterThanOrEqual(80);
    expect(mesaGoResult.factors).toContain('Segmento de alimentação altamente aderente ao MesaGo (+30)');
    expect(mesaGoResult.factors).toContain('Telefone comercial público disponível para contato (+30)');
  });

  it('should score auto workshops higher for TorqueOS', () => {
    const torqueResult = calculateLeadScore({
      category: 'Oficina Mecânica e Centro Automotivo',
      productSlug: 'torqueos',
      hasPhone: true,
      hasWebsite: false,
    });

    expect(torqueResult.score).toBe(60); // 30 segmento + 30 fone
    expect(torqueResult.factors).toContain('Segmento automotivo com forte necessidade de Ordem de Serviço (+30)');
  });

  it('should penalize leads with sparse data (no phone)', () => {
    const sparseResult = calculateLeadScore({
      category: 'Restaurante',
      productSlug: 'mesago',
      hasPhone: false,
      hasWebsite: false,
    });

    expect(sparseResult.score).toBe(30); // Apenas categoria
    expect(sparseResult.factors).toContain('Telefone comercial ausente na consulta original (0)');
  });
});

describe('4. LGPD Compliance & Suppression Protection', () => {
  it('should detect when an identifier is present in the suppression list', () => {
    const testPhone = '(11) 94444-3333';
    addSuppressionEntry(testPhone, 'PHONE', 'Solicitou exclusão');

    expect(isSuppressed(testPhone)).toBe(true);
    expect(isSuppressed('11944443333')).toBe(true);
    expect(isSuppressed('11999990000')).toBe(false);
  });
});
