import { NextRequest, NextResponse } from 'next/server';
import { getLeads, saveLead, addAuditLog, isSuppressed } from '@/lib/db';
import { BusinessLead, PipelineStage } from '@/types';
import { normalizePhone } from '@/lib/deduplication';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId') || undefined;
    const stage = (searchParams.get('stage') as PipelineStage) || undefined;
    const city = searchParams.get('city') || undefined;
    const state = searchParams.get('state') || undefined;
    const search = searchParams.get('search') || undefined;

    const leads = getLeads({ productId, stage, city, state, search });
    return NextResponse.json({ success: true, count: leads.length, leads });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, category, productId, productName, city, state, phone, website, notes } = body;

    if (!name || !category || !city || !state) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: name, category, city e state são requeridos.' },
        { status: 400 }
      );
    }

    const normPhone = normalizePhone(phone);
    if (normPhone && isSuppressed(normPhone)) {
      return NextResponse.json(
        { error: 'Este número de telefone está cadastrado na lista de supressão LGPD (opt-out) e não pode ser cadastrado.' },
        { status: 403 }
      );
    }

    const newLead: BusinessLead = {
      id: `lead-manual-${Date.now()}`,
      name,
      legalName: null,
      cnpj: null,
      category,
      productId: productId || 'prod-mesago',
      productName: productName || 'MesaGo',
      address: body.address || null,
      city,
      state,
      phone: normPhone,
      website: website || null,
      email: body.email || null,
      source: 'MANUAL_ENTRY',
      dataConfidence: normPhone && website ? 'HIGH' : 'MEDIUM',
      verificationStatus: 'CONTACT_CONFIRMED',
      pipelineStage: 'NEW',
      priority: 'MEDIUM',
      score: 50,
      scoreFactors: ['Cadastro manual pelo operador (+50)'],
      firstCollectedAt: new Date().toISOString(),
      lastVerifiedAt: new Date().toISOString(),
      notes: notes || null,
      evidences: [
        {
          id: `ev-manual-${Date.now()}`,
          category: 'INFORMADO_MANUALMENTE',
          description: 'Lead cadastrado diretamente pelo operador comercial.',
          detectedAt: new Date().toISOString(),
        },
      ],
      activities: [
        {
          id: `act-manual-${Date.now()}`,
          leadId: '',
          type: 'STATUS_UPDATE',
          title: 'Lead Criado',
          description: 'Cadastro manual realizado no sistema.',
          createdAt: new Date().toISOString(),
          operatorName: 'Operador',
        },
      ],
      stageHistory: [
        {
          id: `sh-manual-${Date.now()}`,
          fromStage: 'NEW',
          toStage: 'NEW',
          reason: 'Criação manual do lead',
          changedAt: new Date().toISOString(),
        },
      ],
      aiAnalysis: null,
    };

    newLead.activities[0].leadId = newLead.id;
    saveLead(newLead);
    addAuditLog('LEAD_MANUAL_CREATED', 'LEAD', `Lead manual criado: ${name}`, newLead.id);

    return NextResponse.json({ success: true, lead: newLead }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
