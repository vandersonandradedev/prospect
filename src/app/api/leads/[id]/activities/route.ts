import { NextRequest, NextResponse } from 'next/server';
import { getLeadById, updateLead, addAuditLog } from '@/lib/db';
import { LeadActivity } from '@/types';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const lead = getLeadById(params.id);
    if (!lead) {
      return NextResponse.json({ error: 'Lead não encontrado.' }, { status: 404 });
    }

    const body = await req.json();
    const { type, title, description, operatorName = 'Operador Comercial' } = body;

    if (!type || !title) {
      return NextResponse.json({ error: 'Campos type e title são obrigatórios.' }, { status: 400 });
    }

    const newActivity: LeadActivity = {
      id: `act-${Date.now()}`,
      leadId: lead.id,
      type,
      title,
      description: description || '',
      createdAt: new Date().toISOString(),
      operatorName,
    };

    const updated = updateLead(lead.id, {
      activities: [newActivity, ...lead.activities],
    });

    addAuditLog('LEAD_ACTIVITY_REGISTERED', 'LEAD', `${type}: ${title}`, lead.id);

    return NextResponse.json({ success: true, activity: newActivity, lead: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
