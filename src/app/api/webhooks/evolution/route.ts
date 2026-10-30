import { NextRequest, NextResponse } from 'next/server';
import { getLeads, updateLead, isSuppressed, addSuppressionEntry, addAuditLog } from '@/lib/db';
import { evolutionClient, formatWhatsAppNumber } from '@/lib/evolution/client';
import { processSdrIncomingMessage, ChatMessage } from '@/lib/ai/sdr';
import { BusinessLead, LeadActivity } from '@/types';

function findLeadByWhatsAppPhone(phoneDigits: string): BusinessLead | null {
  if (!phoneDigits || phoneDigits.length < 8) return null;
  const leads = getLeads();

  // Remove código do país 55 para comparar apenas DDD + número
  const cleanPhone = phoneDigits.startsWith('55') && phoneDigits.length >= 12
    ? phoneDigits.substring(2)
    : phoneDigits;

  const last8 = cleanPhone.slice(-8);

  return (
    leads.find((l) => {
      if (!l.phone) return false;
      const lDigits = l.phone.replace(/\D/g, '');
      return lDigits.endsWith(last8) || cleanPhone.endsWith(lDigits.slice(-8));
    }) || null
  );
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    // Aceita tanto o formato padrão da Evolution v2 (messages.upsert) quanto variações
    const event = payload?.event || payload?.type;
    const data = payload?.data || payload;

    const key = data?.key;
    if (!key) {
      return NextResponse.json({ success: true, message: 'Evento ignorado (sem key)' });
    }

    const remoteJid = key.remoteJid || '';
    // Ignora mensagens de grupos ou canais do WhatsApp
    if (!remoteJid || remoteJid.includes('@g.us') || remoteJid.includes('@newsletter') || remoteJid === 'status@broadcast') {
      return NextResponse.json({ success: true, message: 'Mensagem de grupo/canal ignorada' });
    }

    const fromMe = Boolean(key.fromMe);
    const senderNumber = remoteJid.replace('@s.whatsapp.net', '').replace(/\D/g, '');

    // Extrai o conteúdo textual da mensagem
    const messageObj = data?.message;
    const textContent =
      messageObj?.conversation ||
      messageObj?.extendedTextMessage?.text ||
      messageObj?.imageMessage?.caption ||
      messageObj?.videoMessage?.caption ||
      data?.content?.text ||
      '';

    if (!textContent || typeof textContent !== 'string') {
      return NextResponse.json({ success: true, message: 'Mensagem sem conteúdo textual processável' });
    }

    const cleanText = textContent.trim();
    const lead = findLeadByWhatsAppPhone(senderNumber);

    if (!lead) {
      console.log(`Webhook Evolution: Mensagem recebida de ${senderNumber}, porém lead não localizado no CRM.`);
      return NextResponse.json({ success: true, message: 'Lead não encontrado na base' });
    }

    const now = new Date().toISOString();

    // 1. Mensagem enviada por NÓS (outbound)
    if (fromMe) {
      const outActivity: LeadActivity = {
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        leadId: lead.id,
        type: 'WHATSAPP_SENT',
        title: 'Mensagem WhatsApp Enviada',
        description: cleanText,
        createdAt: now,
        operatorName: 'Vision Solutions SDR',
      };

      updateLead(lead.id, {
        activities: [outActivity, ...lead.activities],
        lastOutboundMessageAt: now,
      });

      return NextResponse.json({ success: true, type: 'OUTBOUND_LOGGED' });
    }

    // 2. Mensagem RECEBIDA DO LEAD (inbound)
    const inActivity: LeadActivity = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      leadId: lead.id,
      type: 'STATUS_UPDATE',
      title: 'Mensagem Recebida do Cliente (WhatsApp)',
      description: cleanText,
      createdAt: now,
      operatorName: lead.name,
    };

    // Registrar recebimento imediatamente no lead
    let updatedLead = updateLead(lead.id, {
      activities: [inActivity, ...lead.activities],
      lastInboundMessageAt: now,
    }) || lead;

    // Verificar se o lead está suprimido (LGPD)
    if (lead.phone && isSuppressed(lead.phone)) {
      return NextResponse.json({ success: true, message: 'Lead na lista de supressão, automação não responde.' });
    }

    // =========================================================================
    // 3. REGRA CRÍTICA: SE O LEAD JÁ ESTÁ EM "DEMO_SCHEDULED" OU COM AUTOMAÇÃO PAUSADA
    // O robô para imediatamente e não envia nada para que Vanderson assuma o atendimento manual.
    // =========================================================================
    if (
      updatedLead.pipelineStage === 'DEMO_SCHEDULED' ||
      updatedLead.automationPaused === true ||
      updatedLead.pipelineStage === 'PROPOSAL_SENT' ||
      updatedLead.pipelineStage === 'NEGOTIATING' ||
      updatedLead.pipelineStage === 'CONVERTED'
    ) {
      addAuditLog(
        'HUMAN_ATTENTION_REQUIRED',
        'LEAD',
        `Nova mensagem de ${lead.name} em etapa avançada (${updatedLead.pipelineStage}). Automação pausada para atendimento manual.`,
        lead.id
      );

      return NextResponse.json({
        success: true,
        action: 'HUMAN_ATTENTION_REQUIRED',
        stage: updatedLead.pipelineStage,
        automationPaused: true,
      });
    }

    // 4. Montar histórico recente para alimentar o SDR com contexto
    const history: ChatMessage[] = (updatedLead.activities || [])
      .filter((a) => a.type === 'WHATSAPP_SENT' || a.title.includes('WhatsApp'))
      .slice(0, 8)
      .map((a) => ({
        from: a.type === 'WHATSAPP_SENT' ? ('SDR' as const) : ('LEAD' as const),
        text: a.description,
        date: a.createdAt,
      }))
      .reverse();

    // 5. Processar mensagem com o SDR Inteligente (Gemini + Regras)
    const decision = await processSdrIncomingMessage(updatedLead, cleanText, history);

    // Caso A: Opt-out / Pedido de remoção LGPD
    if (decision.intent === 'OPT_OUT') {
      if (lead.phone) {
        addSuppressionEntry(lead.phone, 'PHONE', decision.notes || 'Solicitação via WhatsApp');
      }

      await evolutionClient.sendTextMessage({
        phone: senderNumber,
        text: decision.replyText,
      });

      updateLead(lead.id, {
        pipelineStage: 'DO_NOT_CONTACT',
        automationPaused: true,
        automationStatus: 'OPT_OUT',
        notes: `${lead.notes || ''} [LGPD Opt-out via WhatsApp: "${cleanText}"]`,
      });

      return NextResponse.json({
        success: true,
        action: 'OPT_OUT_PROCESSED',
      });
    }

    // Caso B: Agendamento de Demonstração (Etapa 7 - DEMO_SCHEDULED)
    // -> Envia confirmação cordial e PAUSA a automação permanentemente para o humano
    if (decision.intent === 'SCHEDULE_DEMO' || decision.newStage === 'DEMO_SCHEDULED') {
      // 1. Enviar confirmação calorosa pelo WhatsApp
      await evolutionClient.sendTextMessage({
        phone: senderNumber,
        text: decision.replyText,
      });

      const confirmActivity: LeadActivity = {
        id: `act-${Date.now()}-sched`,
        leadId: lead.id,
        type: 'STAGE_CHANGE',
        title: '⭐ Demonstração Agendada (Bastão Passado para Atendimento Humano)',
        description: `Lead demonstrou interesse/agendou: "${cleanText}". Resposta enviada. Automação pausada para Vanderson conduzir.`,
        createdAt: new Date().toISOString(),
        operatorName: 'Vision SDR IA',
      };

      updateLead(lead.id, {
        pipelineStage: 'DEMO_SCHEDULED',
        automationPaused: true, // PARADA DA AUTOMAÇÃO!
        automationStatus: 'HANDED_OFF_TO_HUMAN',
        activities: [confirmActivity, ...updatedLead.activities],
        notes: `${lead.notes || ''} [Demonstração Agendada: "${cleanText}"]`,
      });

      addAuditLog(
        'DEMO_SCHEDULED',
        'LEAD',
        `Demonstração agendada com ${lead.name} (${lead.productName}). Automação desligada para que o consultor humano assuma a demo.`,
        lead.id
      );

      return NextResponse.json({
        success: true,
        action: 'DEMO_SCHEDULED',
        stage: 'DEMO_SCHEDULED',
        automationPaused: true,
      });
    }

    // Caso C: Dúvidas ou Diálogo Comercial Consultivo (MesaGo / TorqueOS)
    if (decision.replyText) {
      await evolutionClient.sendTextMessage({
        phone: senderNumber,
        text: decision.replyText,
      });

      const sdrReplyActivity: LeadActivity = {
        id: `act-${Date.now()}-sdr`,
        leadId: lead.id,
        type: 'WHATSAPP_SENT',
        title: 'Resposta SDR IA Enviada',
        description: decision.replyText,
        createdAt: new Date().toISOString(),
        operatorName: 'Vision SDR IA',
      };

      updateLead(lead.id, {
        pipelineStage: 'RESPONDED',
        automationStatus: 'ENGAGED',
        activities: [sdrReplyActivity, ...updatedLead.activities],
      });

      return NextResponse.json({
        success: true,
        action: 'CONSULTATIVE_REPLY_SENT',
        stage: 'RESPONDED',
      });
    }

    return NextResponse.json({ success: true, action: 'NO_REPLY_NEEDED' });
  } catch (error: any) {
    console.error('Erro no processamento do webhook Evolution:', error);
    return NextResponse.json({ error: error?.message || 'Erro interno no webhook' }, { status: 500 });
  }
}
