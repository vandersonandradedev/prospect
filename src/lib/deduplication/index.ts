import { BusinessLead, DataConfidence, PriorityLevel, RawBusinessLead } from '@/types';
import { calculateLeadScore } from '@/lib/qualification';
import { getProductById } from '@/lib/db';

export function normalizePhone(rawPhone?: string | null): string | null {
  if (!rawPhone) return null;
  let digits = rawPhone.replace(/\D/g, '');

  // Tratar DDI +55
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }

  // Telefones no Brasil têm 10 (fixo) ou 11 (celular/whatsapp) dígitos com DDD
  if (digits.length >= 10 && digits.length <= 11) {
    const ddd = digits.slice(0, 2);
    const num = digits.slice(2);
    if (num.length === 9) {
      return `(${ddd}) ${num.slice(0, 5)}-${num.slice(5)}`;
    } else {
      return `(${ddd}) ${num.slice(0, 4)}-${num.slice(4)}`;
    }
  }

  return rawPhone.trim();
}

export function normalizeDomain(rawUrl?: string | null): string | null {
  if (!rawUrl) return null;
  try {
    let clean = rawUrl.trim().toLowerCase();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `http://${clean}`;
    }
    const parsed = new URL(clean);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return rawUrl.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
  }
}

export function deduplicateAndMerge(
  existingLeads: BusinessLead[],
  incomingLeads: RawBusinessLead[],
  targetProductId: string
): {
  mergedLeads: BusinessLead[];
  createdLeads: BusinessLead[];
  newCount: number;
  updatedCount: number;
} {
  const product = getProductById(targetProductId);
  const productName = product?.name || 'MesaGo';

  const phoneMap = new Map<string, BusinessLead>();
  const domainMap = new Map<string, BusinessLead>();
  const externalIdMap = new Map<string, BusinessLead>();

  for (const lead of existingLeads) {
    if (lead.phone) {
      const clean = lead.phone.replace(/\D/g, '');
      if (clean.length >= 8) phoneMap.set(clean, lead);
    }
    if (lead.website) {
      const domain = normalizeDomain(lead.website);
      if (domain) domainMap.set(domain, lead);
    }
    if (lead.sourceExternalId) {
      externalIdMap.set(lead.sourceExternalId, lead);
    }
  }

  let newCount = 0;
  let updatedCount = 0;
  const createdLeads: BusinessLead[] = [];
  const resultLeads = [...existingLeads];

  for (const raw of incomingLeads) {
    const cleanPhoneDigits = raw.phone ? raw.phone.replace(/\D/g, '') : null;
    const cleanDomain = normalizeDomain(raw.website);

    // Verificar se já existe por ID externo, Telefone ou Domínio
    let existingMatch: BusinessLead | undefined = undefined;

    if (raw.externalId && externalIdMap.has(raw.externalId)) {
      existingMatch = externalIdMap.get(raw.externalId);
    } else if (cleanPhoneDigits && cleanPhoneDigits.length >= 8 && phoneMap.has(cleanPhoneDigits)) {
      existingMatch = phoneMap.get(cleanPhoneDigits);
    } else if (cleanDomain && domainMap.has(cleanDomain)) {
      existingMatch = domainMap.get(cleanDomain);
    }

    if (existingMatch) {
      // Atualizar dados observados preservando pipeline, notas e histórico comercial
      let wasUpdated = false;

      if (!existingMatch.phone && raw.phone) {
        existingMatch.phone = normalizePhone(raw.phone);
        wasUpdated = true;
      }
      if (!existingMatch.website && raw.website) {
        existingMatch.website = raw.website;
        wasUpdated = true;
      }
      if (!existingMatch.address && raw.address) {
        existingMatch.address = raw.address;
        wasUpdated = true;
      }
      if (raw.latitude && raw.longitude && !existingMatch.latitude) {
        existingMatch.latitude = raw.latitude;
        existingMatch.longitude = raw.longitude;
        wasUpdated = true;
      }

      existingMatch.lastVerifiedAt = new Date().toISOString();
      if (wasUpdated) updatedCount++;
    } else {
      // Criar novo lead real
      const normPhone = normalizePhone(raw.phone);
      const scoreResult = calculateLeadScore({
        category: raw.category,
        productSlug: product?.slug || 'mesago',
        hasPhone: !!normPhone,
        hasWebsite: !!raw.website,
        rating: raw.rating,
        reviewsCount: raw.reviewsCount,
      });

      const dataConfidence: DataConfidence = normPhone && raw.website ? 'HIGH' : normPhone || raw.website ? 'MEDIUM' : 'LOW';
      const priority: PriorityLevel = scoreResult.score >= 70 ? 'HIGH' : scoreResult.score >= 40 ? 'MEDIUM' : 'LOW';

      const newLead: BusinessLead = {
        id: `lead-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: raw.name,
        legalName: null,
        cnpj: null,
        category: raw.category,
        productId: targetProductId,
        productName,
        address: raw.address || null,
        city: raw.city,
        state: raw.state,
        latitude: raw.latitude || null,
        longitude: raw.longitude || null,
        phone: normPhone,
        website: raw.website || null,
        email: raw.email || null,
        rating: raw.rating || null,
        reviewsCount: raw.reviewsCount || null,
        source: raw.source,
        sourceUrl: raw.sourceUrl || null,
        sourceExternalId: raw.externalId,
        dataConfidence,
        verificationStatus: raw.website ? 'WEBSITE_VERIFIED' : 'UNVERIFIED',
        pipelineStage: 'NEW',
        priority,
        score: scoreResult.score,
        scoreFactors: scoreResult.factors,
        firstCollectedAt: new Date().toISOString(),
        lastVerifiedAt: new Date().toISOString(),
        notes: null,
        evidences: [
          {
            id: `ev-${Date.now()}-1`,
            category: 'ORIGEM_VERIFICADA',
            description: `Empresa identificada em consulta na base ${raw.source}.`,
            evidenceUrl: raw.sourceUrl || null,
            detectedAt: new Date().toISOString(),
          },
        ],
        activities: [
          {
            id: `act-${Date.now()}-1`,
            leadId: '',
            type: 'STATUS_UPDATE',
            title: 'Lead Ingerido',
            description: `Lead cadastrado na base de prospecção via ${raw.source}.`,
            createdAt: new Date().toISOString(),
            operatorName: 'Sistema',
          },
        ],
        stageHistory: [
          {
            id: `sh-${Date.now()}-1`,
            fromStage: 'NEW',
            toStage: 'NEW',
            reason: 'Criação inicial do lead',
            changedAt: new Date().toISOString(),
          },
        ],
        aiAnalysis: null,
      };

      // Garantir ID da atividade
      newLead.activities[0].leadId = newLead.id;

      resultLeads.unshift(newLead);
      createdLeads.unshift(newLead);

      if (normPhone) {
        const cleanDigits = normPhone.replace(/\D/g, '');
        if (cleanDigits.length >= 8) phoneMap.set(cleanDigits, newLead);
      }
      if (cleanDomain) {
        domainMap.set(cleanDomain, newLead);
      }
      if (raw.externalId) {
        externalIdMap.set(raw.externalId, newLead);
      }

      newCount++;
    }
  }

  return {
    mergedLeads: resultLeads,
    createdLeads,
    newCount,
    updatedCount,
  };
}
