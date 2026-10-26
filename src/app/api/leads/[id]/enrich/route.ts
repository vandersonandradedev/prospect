import { NextRequest, NextResponse } from 'next/server';
import { getLeadById, updateLead, addAuditLog } from '@/lib/db';
import { enrichBusinessWebsite } from '@/lib/enrichment';
import { calculateLeadScore } from '@/lib/qualification';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const lead = getLeadById(params.id);
    if (!lead) {
      return NextResponse.json({ error: 'Lead não encontrado.' }, { status: 404 });
    }

    if (!lead.website) {
      return NextResponse.json(
        { error: 'Este lead não possui site cadastrado para enriquecimento.' },
        { status: 400 }
      );
    }

    const enrichment = await enrichBusinessWebsite(lead.website);

    // Mesclar evidências sem duplicar descrições
    const existingDesc = new Set(lead.evidences.map((e) => e.description));
    const newEvidences = [...lead.evidences];

    for (const ev of enrichment.evidences) {
      if (!existingDesc.has(ev.description)) {
        newEvidences.push(ev);
        existingDesc.add(ev.description);
      }
    }

    // Recalcular score com novas evidências
    const newScoreResult = calculateLeadScore({
      category: lead.category,
      productSlug: lead.productId.replace('prod-', ''),
      hasPhone: !!lead.phone,
      hasWebsite: true,
      hasEmail: !!(lead.email || enrichment.extractedEmail),
      rating: lead.rating,
      reviewsCount: lead.reviewsCount,
      hasDigitalMenu: enrichment.hasDigitalMenu,
      hasOnlineOrders: enrichment.hasOnlineOrdering,
    });

    const updates: any = {
      evidences: newEvidences,
      score: newScoreResult.score,
      scoreFactors: newScoreResult.factors,
      verificationStatus: enrichment.isWebsiteOnline ? 'WEBSITE_VERIFIED' : 'FAILED_VERIFICATION',
    };

    if (!lead.email && enrichment.extractedEmail) {
      updates.email = enrichment.extractedEmail;
    }

    // Atividade de enriquecimento
    updates.activities = [
      {
        id: `act-enrich-${Date.now()}`,
        leadId: lead.id,
        type: 'STATUS_UPDATE',
        title: 'Enriquecimento Web Executado',
        description: enrichment.isWebsiteOnline
          ? `Site verificado com sucesso. Novas evidências coletadas (${enrichment.evidences.length}).`
          : 'Site oficial inacessível ou fora do ar.',
        createdAt: new Date().toISOString(),
        operatorName: 'Robô de Enriquecimento',
      },
      ...lead.activities,
    ];

    const updated = updateLead(lead.id, updates);
    addAuditLog('LEAD_ENRICHED', 'LEAD', `Enriquecimento executado para ${lead.name}`, lead.id);

    return NextResponse.json({
      success: true,
      enrichment,
      lead: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
