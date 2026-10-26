import { NextRequest, NextResponse } from 'next/server';
import { getLeadById, updateLead, addAuditLog } from '@/lib/db';
import { generateLeadAiAnalysis } from '@/lib/ai';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const lead = getLeadById(params.id);
    if (!lead) {
      return NextResponse.json({ error: 'Lead não encontrado.' }, { status: 404 });
    }

    const aiResult = await generateLeadAiAnalysis(lead);

    const updated = updateLead(lead.id, {
      aiAnalysis: aiResult,
      activities: [
        {
          id: `act-ai-${Date.now()}`,
          leadId: lead.id,
          type: 'NOTE',
          title: 'Análise de IA Gerada',
          description: `Análise comercial estruturada gerada para o produto ${aiResult.suggestedProduct}. Próxima ação: ${aiResult.nextAction}`,
          createdAt: new Date().toISOString(),
          operatorName: 'Assistente IA',
        },
        ...lead.activities,
      ],
    });

    addAuditLog('AI_ANALYSIS_GENERATED', 'LEAD', `Análise de IA gerada para ${lead.name}`, lead.id);

    return NextResponse.json({
      success: true,
      analysis: aiResult,
      lead: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
