import { NextRequest, NextResponse } from 'next/server';
import { getLeads, saveLead, isSuppressed, addAuditLog } from '@/lib/db';
import { evolutionClient } from '@/lib/evolution/client';
import { generateSdrOutreachMessage } from '@/lib/ai/sdr';
import { LeadActivity, LeadStageHistory } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { productId, limit = 20 } = body;

    // 1. Checa status da conexão da Evolution API
    const evoStatus = await evolutionClient.getInstanceStatus();
    if (evoStatus.state !== 'open') {
      return NextResponse.json(
        {
          success: false,
          error:
            'A instância do WhatsApp na Evolution API não está conectada (status atual: ' +
            evoStatus.state +
            '). Conecte seu WhatsApp no menu Configurações antes de disparar.',
        },
        { status: 400 }
      );
    }

    // 2. Busca leads na etapa NEW que possuem telefone e não estão na lista de supressão
    const allLeads = getLeads(productId ? { productId } : undefined);
    const eligibleLeads = allLeads
      .filter((l) => l.pipelineStage === 'NEW' && l.phone && !isSuppressed(l.phone))
      .slice(0, Number(limit));

    if (eligibleLeads.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        message: 'Nenhum lead novo pendente com telefone válido para disparo.',
      });
    }

    let contactedCount = 0;
    const errors: string[] = [];

    for (const lead of eligibleLeads) {
      try {
        const outreachText = generateSdrOutreachMessage(lead);
        const sendResult = await evolutionClient.sendTextMessage({
          phone: lead.phone!,
          text: outreachText,
        });

        if (sendResult.success) {
          contactedCount++;
          const now = new Date().toISOString();

          const outActivity: LeadActivity = {
            id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            leadId: lead.id,
            type: 'WHATSAPP_SENT',
            title: 'Primeiro Contato SDR Enviado (Disparo Manual/Lote)',
            description: outreachText,
            createdAt: now,
            operatorName: 'Vision SDR IA',
          };

          const stageChange: LeadStageHistory = {
            id: `sh-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            fromStage: 'NEW',
            toStage: 'CONTACTED',
            reason: 'Disparo de prospecção via WhatsApp acionado no CRM',
            changedAt: now,
          };

          lead.pipelineStage = 'CONTACTED';
          lead.automationStatus = 'WAITING_REPLY';
          lead.automationPaused = false;
          lead.lastOutboundMessageAt = now;
          lead.activities = [outActivity, ...lead.activities];
          lead.stageHistory = [stageChange, ...lead.stageHistory];

          saveLead(lead);
        } else {
          errors.push(`Falha ao enviar para ${lead.name} (${lead.phone}): ${sendResult.error}`);
        }
      } catch (err: any) {
        errors.push(`Erro para ${lead.name}: ${err?.message}`);
      }
    }

    if (contactedCount > 0) {
      addAuditLog(
        'BATCH_OUTREACH_EXECUTED',
        'LEAD',
        `${contactedCount} mensagens disparadas em lote para novos leads pendentes.`
      );
    }

    return NextResponse.json({
      success: true,
      count: contactedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `${contactedCount} lead(s) contatado(s) com sucesso via WhatsApp!`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro interno ao disparar leads' }, { status: 500 });
  }
}
