import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as webhookPost } from '@/app/api/webhooks/evolution/route';
import { POST as leadPost, GET as leadGet } from '@/app/api/leads/route';
import { POST as outreachPost } from '@/app/api/leads/outreach/route';
import {
  saveLead,
  getLeadById,
  deleteLead,
  isSuppressed,
  removeSuppressionEntry,
  getSuppressionList,
  addAuditLog,
} from '@/lib/db';
import { evolutionClient, formatWhatsAppNumber } from '@/lib/evolution/client';
import { generateSdrOutreachMessage, processSdrIncomingMessage } from '@/lib/ai/sdr';
import { BusinessLead } from '@/types';

describe('QA END-TO-END: Fluxo Completo de Automação e Qualificação SDR', () => {
  const runId = Math.floor(1000 + Math.random() * 9000).toString();

  const TEST_MESAGO_ID = `qa-lead-mesago-${Date.now()}`;
  const TEST_TORQUE_ID = `qa-lead-torque-${Date.now()}`;
  const TEST_OPTOUT_ID = `qa-lead-optout-${Date.now()}`;

  const MESAGO_PHONE = `(41) 99123-${runId}`;
  const MESAGO_PHONE_CLEAN = `554199123${runId}`;

  const TORQUE_PHONE = `(47) 98877-${runId}`;
  const TORQUE_PHONE_CLEAN = `554798877${runId}`;

  const OPTOUT_PHONE = `(11) 97766-${runId}`;
  const OPTOUT_PHONE_CLEAN = `551197766${runId}`;

  let sendSpy: any;

  beforeEach(() => {
    // Mock do envio de mensagens via Evolution API para isolamento
    sendSpy = vi.spyOn(evolutionClient, 'sendTextMessage').mockResolvedValue({
      success: true,
      messageId: `msg-mock-${Date.now()}`,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(() => {
    // Limpeza de isolamento após o término dos testes de QA
    deleteLead(TEST_MESAGO_ID, 'QA_CLEANUP');
    deleteLead(TEST_TORQUE_ID, 'QA_CLEANUP');
    deleteLead(TEST_OPTOUT_ID, 'QA_CLEANUP');
    removeSuppressionEntry(OPTOUT_PHONE);
    removeSuppressionEntry(OPTOUT_PHONE_CLEAN);
    removeSuppressionEntry('(11) 97766-5544');
  });

  // =========================================================================
  // FASE 1: INGESTÃO E QUALIFICAÇÃO DO LEAD (CRM & SCORING)
  // =========================================================================
  describe('Fase 1: Ingestão, Normalização e Validação do Lead', () => {
    it('deve cadastrar um lead MesaGo com estágio inicial NEW e pontuação correta', () => {
      const mesaGoLead: BusinessLead = {
        id: TEST_MESAGO_ID,
        name: 'Hamburgueria QA Prime',
        category: 'Hamburgueria',
        productId: 'prod-mesago',
        productName: 'MesaGo',
        city: 'Curitiba',
        state: 'PR',
        phone: MESAGO_PHONE,
        website: 'https://hamburgueriaqaprime.com.br',
        source: 'MANUAL_ENTRY',
        dataConfidence: 'HIGH',
        verificationStatus: 'PHONE_VERIFIED',
        pipelineStage: 'NEW',
        priority: 'HIGH',
        score: 85,
        scoreFactors: [],
        firstCollectedAt: new Date().toISOString(),
        lastVerifiedAt: new Date().toISOString(),
        evidences: [],
        activities: [],
        stageHistory: [],
      };

      saveLead(mesaGoLead);

      const saved = getLeadById(TEST_MESAGO_ID);
      expect(saved).not.toBeNull();
      expect(saved?.name).toBe('Hamburgueria QA Prime');
      expect(saved?.pipelineStage).toBe('NEW');
      expect(saved?.phone).toBe(MESAGO_PHONE);
    });

    it('deve cadastrar um lead TorqueOS para oficina mecânica', () => {
      const torqueLead: BusinessLead = {
        id: TEST_TORQUE_ID,
        name: 'Oficina Mecânica Turbo QA',
        category: 'Oficina Mecânica',
        productId: 'prod-torqueos',
        productName: 'TorqueOS',
        city: 'Joinville',
        state: 'SC',
        phone: TORQUE_PHONE,
        website: 'https://turboqa.com.br',
        source: 'MANUAL_ENTRY',
        dataConfidence: 'HIGH',
        verificationStatus: 'PHONE_VERIFIED',
        pipelineStage: 'NEW',
        priority: 'HIGH',
        score: 90,
        scoreFactors: [],
        firstCollectedAt: new Date().toISOString(),
        lastVerifiedAt: new Date().toISOString(),
        evidences: [],
        activities: [],
        stageHistory: [],
      };

      saveLead(torqueLead);

      const saved = getLeadById(TEST_TORQUE_ID);
      expect(saved).not.toBeNull();
      expect(saved?.productName).toBe('TorqueOS');
      expect(saved?.pipelineStage).toBe('NEW');
    });

    it('deve isolar estritamente o disparo por produto: disparar para MesaGo NUNCA deve enviar pitch de TorqueOS', async () => {
      // Mock do status da Evolution API para simular instância conectada
      vi.spyOn(evolutionClient, 'getInstanceStatus').mockResolvedValue({
        exists: true,
        state: 'open',
      });

      // Dispara outreach exclusivo para MesaGo
      const req = new NextRequest('http://localhost:3000/api/leads/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: 'prod-mesago' }),
      });

      const res = await outreachPost(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);

      // O lead TorqueOS DEVE continuar intacto em NEW sem disparo!
      const torqueLead = getLeadById(TEST_TORQUE_ID)!;
      expect(torqueLead.pipelineStage).toBe('NEW');

      // O lead MesaGo DEVE ter sido contatado
      const mesaGoLead = getLeadById(TEST_MESAGO_ID)!;
      expect(mesaGoLead.pipelineStage).toBe('CONTACTED');

      // Assegura que todas as mensagens enviadas continham o pitch de MesaGo e NUNCA de TorqueOS
      expect(sendSpy).toHaveBeenCalled();
      for (const call of sendSpy.mock.calls) {
        expect(call[0].text).toContain('MesaGo');
        expect(call[0].text).not.toContain('TorqueOS');
        expect(call[0].text).not.toContain('Ordens de Serviço');
      }
    });
  });

  // =========================================================================
  // FASE 2: GERAÇÃO E FORMATAÇÃO DE MENSAGENS OUTBOUND (SDR)
  // =========================================================================
  describe('Fase 2: Motor SDR e Pitch Personalizado Outbound', () => {
    it('deve formatar números de telefone brasileiros com código do país 55', () => {
      expect(formatWhatsAppNumber(MESAGO_PHONE)).toBe(MESAGO_PHONE_CLEAN);
      expect(formatWhatsAppNumber(TORQUE_PHONE)).toBe(TORQUE_PHONE_CLEAN);
      expect(formatWhatsAppNumber('+55 41 99123-4567')).toBe('5541991234567');
      expect(formatWhatsAppNumber('41991234567')).toBe('5541991234567');
    });

    it('deve gerar pitch personalizado para MesaGo mencionando cardápio digital e economia', () => {
      const lead = getLeadById(TEST_MESAGO_ID)!;
      const pitch = generateSdrOutreachMessage(lead);

      expect(pitch).toContain('MesaGo');
      expect(pitch).toContain('Hamburgueria QA Prime');
      expect(pitch).toContain('Curitiba');
      expect(pitch).toContain('cardápio digital');
      expect(pitch).toContain('comissões');
    });

    it('deve gerar pitch personalizado para TorqueOS mencionando Ordens de Serviço digitais', () => {
      const lead = getLeadById(TEST_TORQUE_ID)!;
      const pitch = generateSdrOutreachMessage(lead);

      expect(pitch).toContain('TorqueOS');
      expect(pitch).toContain('Oficina Mecânica Turbo QA');
      expect(pitch).toContain('Joinville');
      expect(pitch).toContain('Ordens de Serviço');
      expect(pitch).toContain('WhatsApp');
    });

    it('deve registrar atividade de mensagem outbound (fromMe: true) no CRM', async () => {
      const req = new NextRequest('http://localhost:3000/api/webhooks/evolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'messages.upsert',
          data: {
            key: {
              remoteJid: `${MESAGO_PHONE_CLEAN}@s.whatsapp.net`,
              fromMe: true,
              id: 'outbound-msg-1',
            },
            message: {
              conversation: 'Olá! Mensagem de prospecção enviada pela Vision Solutions.',
            },
          },
        }),
      });

      const res = await webhookPost(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.type).toBe('OUTBOUND_LOGGED');

      const lead = getLeadById(TEST_MESAGO_ID)!;
      expect(lead.activities.length).toBeGreaterThanOrEqual(1);
      expect(lead.activities[0].type).toBe('WHATSAPP_SENT');
      expect(lead.lastOutboundMessageAt).toBeDefined();
    });
  });

  // =========================================================================
  // FASE 3: WEBHOOK INBOUND - DIÁLOGO CONSULTIVO (MesaGo)
  // =========================================================================
  describe('Fase 3: Resposta Consultiva Inbound (MesaGo)', () => {
    it('deve receber dúvida sobre taxa/preço do cardápio digital, responder consultivamente e manter automação ativa', async () => {
      const req = new NextRequest('http://localhost:3000/api/webhooks/evolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'messages.upsert',
          data: {
            key: {
              remoteJid: `${MESAGO_PHONE_CLEAN}@s.whatsapp.net`,
              fromMe: false,
              id: 'inbound-msg-question-1',
            },
            message: {
              conversation: 'Como funciona o cardápio digital? Vocês cobram taxa ou porcentagem por pedido igual o iFood?',
            },
          },
        }),
      });

      const res = await webhookPost(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.action).toBe('CONSULTATIVE_REPLY_SENT');
      expect(data.stage).toBe('RESPONDED');

      // Verifica envio de mensagem pelo robô
      expect(sendSpy).toHaveBeenCalled();
      const sendCallArgs = sendSpy.mock.calls[0][0];
      expect(sendCallArgs.phone).toContain(MESAGO_PHONE_CLEAN);
      expect(sendCallArgs.text.toLowerCase()).toContain('mesago');

      // Verifica atualização de status do lead no banco
      const updatedLead = getLeadById(TEST_MESAGO_ID)!;
      expect(updatedLead.pipelineStage).toBe('RESPONDED');
      expect(updatedLead.automationStatus).toBe('ENGAGED');
      expect(updatedLead.automationPaused).toBeFalsy();
      expect(updatedLead.activities.some((a) => a.title.includes('Resposta SDR IA'))).toBe(true);
    });
  });

  // =========================================================================
  // FASE 4: WEBHOOK INBOUND - AGENDAMENTO DE DEMO E PASSAGEM DE BASTÃO (TorqueOS)
  // =========================================================================
  describe('Fase 4: Agendamento de Demonstração e Passagem de Bastão para Humano (TorqueOS)', () => {
    it('deve detectar interesse de agendamento, transicionar para DEMO_SCHEDULED e PAUSAR automação', async () => {
      const req = new NextRequest('http://localhost:3000/api/webhooks/evolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'messages.upsert',
          data: {
            key: {
              remoteJid: `${TORQUE_PHONE_CLEAN}@s.whatsapp.net`,
              fromMe: false,
              id: 'inbound-msg-schedule-1',
            },
            message: {
              conversation: 'Show de bola! Vamos agendar amanhã às 15 horas para você me mostrar a OS digital.',
            },
          },
        }),
      });

      const res = await webhookPost(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.action).toBe('DEMO_SCHEDULED');
      expect(data.stage).toBe('DEMO_SCHEDULED');
      expect(data.automationPaused).toBe(true);

      // Robô enviou mensagem cordial de confirmação da reunião
      expect(sendSpy).toHaveBeenCalled();
      const sendCallArgs = sendSpy.mock.calls[sendSpy.mock.calls.length - 1][0];
      expect(sendCallArgs.text.toLowerCase()).toContain('demonstração');

      // Verifica integridade do lead
      const updatedLead = getLeadById(TEST_TORQUE_ID)!;
      expect(updatedLead.pipelineStage).toBe('DEMO_SCHEDULED');
      expect(updatedLead.automationStatus).toBe('HANDED_OFF_TO_HUMAN');
      expect(updatedLead.automationPaused).toBe(true); // REGRA CRÍTICA: Automação desligada!
    });
  });

  // =========================================================================
  // FASE 5: REGRA CRÍTICA DE OURO - HUMAN TAKEOVER GUARD
  // =========================================================================
  describe('Fase 5: Guarda de Intervenção Humana (Human Takeover)', () => {
    it('NÃO deve responder com robô se o lead já está em DEMO_SCHEDULED com automação pausada', async () => {
      sendSpy.mockClear();

      // Cliente manda uma mensagem de acompanhamento
      const req = new NextRequest('http://localhost:3000/api/webhooks/evolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'messages.upsert',
          data: {
            key: {
              remoteJid: `${TORQUE_PHONE_CLEAN}@s.whatsapp.net`,
              fromMe: false,
              id: 'inbound-msg-human-guard-1',
            },
            message: {
              conversation: 'Qual link do Google Meet ou Teams vocês vão mandar amanhã?',
            },
          },
        }),
      });

      const res = await webhookPost(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.action).toBe('HUMAN_ATTENTION_REQUIRED');
      expect(data.automationPaused).toBe(true);

      // O robô NÃO DEVE ENVIAR NENHUMA MENSAGEM AUTOMÁTICA!
      expect(sendSpy).not.toHaveBeenCalled();

      // O lead continuou com automação pausada e no mesmo estágio
      const lead = getLeadById(TEST_TORQUE_ID)!;
      expect(lead.pipelineStage).toBe('DEMO_SCHEDULED');
      expect(lead.automationPaused).toBe(true);
    });
  });

  // =========================================================================
  // FASE 6: LGPD COMPLIANCE & LISTA DE SUPRESSÃO (OPT-OUT)
  // =========================================================================
  describe('Fase 6: Conformidade LGPD e Lista de Supressão Automática', () => {
    it('deve processar opt-out, enviar resposta de despedida, mover para DO_NOT_CONTACT e incluir na lista de supressão', async () => {
      // 1. Cadastra o lead
      const optOutLead: BusinessLead = {
        id: TEST_OPTOUT_ID,
        name: 'Auto Peças Express',
        category: 'Oficina Mecânica',
        productId: 'prod-torqueos',
        productName: 'TorqueOS',
        city: 'São Paulo',
        state: 'SP',
        phone: OPTOUT_PHONE,
        website: null,
        source: 'MANUAL_ENTRY',
        dataConfidence: 'MEDIUM',
        verificationStatus: 'PHONE_VERIFIED',
        pipelineStage: 'NEW',
        priority: 'LOW',
        score: 50,
        scoreFactors: [],
        firstCollectedAt: new Date().toISOString(),
        lastVerifiedAt: new Date().toISOString(),
        evidences: [],
        activities: [],
        stageHistory: [],
      };
      saveLead(optOutLead);

      sendSpy.mockClear();

      // 2. Cliente envia mensagem de cancelamento / opt-out
      const req = new NextRequest('http://localhost:3000/api/webhooks/evolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'messages.upsert',
          data: {
            key: {
              remoteJid: `${OPTOUT_PHONE_CLEAN}@s.whatsapp.net`,
              fromMe: false,
              id: 'inbound-msg-optout-1',
            },
            message: {
              conversation: 'Não tenho interesse nenhum, favor remover meu número da base de dados de vocês.',
            },
          },
        }),
      });

      const res = await webhookPost(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.action).toBe('OPT_OUT_PROCESSED');

      // Verifica que o número foi adicionado à lista de supressão
      expect(isSuppressed(OPTOUT_PHONE)).toBe(true);
      expect(isSuppressed(OPTOUT_PHONE_CLEAN)).toBe(true);

      // Lead atualizado no CRM
      const updatedLead = getLeadById(TEST_OPTOUT_ID)!;
      expect(updatedLead.pipelineStage).toBe('DO_NOT_CONTACT');
      expect(updatedLead.automationPaused).toBe(true);
      expect(updatedLead.automationStatus).toBe('OPT_OUT');
    });

    it('deve barrar tentativa de cadastrar novo lead com telefone já suprimido (HTTP 403)', async () => {
      const req = new NextRequest('http://localhost:3000/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Nova Loja Mesma Linha',
          category: 'Oficina Mecânica',
          productId: 'prod-torqueos',
          city: 'São Paulo',
          state: 'SP',
          phone: OPTOUT_PHONE, // Telefone na lista de supressão!
        }),
      });

      const res = await leadPost(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toContain('lista de supressão LGPD');
    });
  });

  // =========================================================================
  // FASE 7: RESILIÊNCIA E FILTRAGEM DE RUÍDO (Grupos e Broadcasts)
  // =========================================================================
  describe('Fase 7: Filtragem de Grupos, Broadcasts e Payloads Malformados', () => {
    it('deve ignorar com sucesso mensagens originadas de grupos do WhatsApp (@g.us)', async () => {
      sendSpy.mockClear();

      const req = new NextRequest('http://localhost:3000/api/webhooks/evolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'messages.upsert',
          data: {
            key: {
              remoteJid: '120363024823948234@g.us', // Grupo
              fromMe: false,
            },
            message: {
              conversation: 'Conversa aleatória de grupo',
            },
          },
        }),
      });

      const res = await webhookPost(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.message).toContain('grupo/canal ignorada');
      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('deve ignorar com sucesso mensagens de newsletters (@newsletter)', async () => {
      const req = new NextRequest('http://localhost:3000/api/webhooks/evolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'messages.upsert',
          data: {
            key: {
              remoteJid: '120363024823948234@newsletter',
              fromMe: false,
            },
            message: {
              conversation: 'Novidade do canal',
            },
          },
        }),
      });

      const res = await webhookPost(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.message).toContain('grupo/canal ignorada');
    });

    it('deve tratar com segurança eventos sem texto processável', async () => {
      const req = new NextRequest('http://localhost:3000/api/webhooks/evolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'messages.upsert',
          data: {
            key: {
              remoteJid: `${MESAGO_PHONE_CLEAN}@s.whatsapp.net`,
              fromMe: false,
            },
            message: {}, // Mensagem vazia / sticker sem texto
          },
        }),
      });

      const res = await webhookPost(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.message).toContain('sem conteúdo textual');
    });
  });
});
