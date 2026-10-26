import { NextRequest, NextResponse } from 'next/server';
import { getLeadById, updateLead, deleteLead, addAuditLog } from '@/lib/db';
import { PipelineStage } from '@/types';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const lead = getLeadById(params.id);
    if (!lead) {
      return NextResponse.json({ error: 'Lead não encontrado.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, lead });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const current = getLeadById(params.id);
    if (!current) {
      return NextResponse.json({ error: 'Lead não encontrado.' }, { status: 404 });
    }

    const body = await req.json();
    const updates: any = {};

    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.phone !== undefined) updates.phone = body.phone;
    if (body.website !== undefined) updates.website = body.website;
    if (body.email !== undefined) updates.email = body.email;

    // Mudança de estágio do Pipeline
    if (body.pipelineStage && body.pipelineStage !== current.pipelineStage) {
      const newStage = body.pipelineStage as PipelineStage;
      updates.pipelineStage = newStage;

      const stageEntry = {
        id: `sh-${Date.now()}`,
        fromStage: current.pipelineStage,
        toStage: newStage,
        reason: body.stageChangeReason || 'Alteração pelo operador',
        changedAt: new Date().toISOString(),
      };

      updates.stageHistory = [stageEntry, ...current.stageHistory];

      const activity = {
        id: `act-${Date.now()}`,
        leadId: current.id,
        type: 'STAGE_CHANGE' as const,
        title: 'Estágio Alterado',
        description: `Lead movido de '${current.pipelineStage}' para '${newStage}'. Motivo: ${body.stageChangeReason || 'Avanço do funil'}`,
        createdAt: new Date().toISOString(),
        operatorName: body.operatorName || 'Operador Comercial',
      };

      updates.activities = [activity, ...current.activities];
      addAuditLog('LEAD_STAGE_CHANGED', 'LEAD', `Lead ${current.name} movido para ${newStage}`, current.id);
    }

    const updated = updateLead(params.id, updates);
    return NextResponse.json({ success: true, lead: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const success = deleteLead(params.id, 'SOLICITACAO_TITULAR_LGPD');
    if (!success) {
      return NextResponse.json({ error: 'Lead não encontrado.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Lead excluído definitivamente em conformidade com a LGPD.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
