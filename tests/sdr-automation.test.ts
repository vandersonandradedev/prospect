import { describe, it, expect } from 'vitest';
import { formatWhatsAppNumber } from '@/lib/evolution/client';
import { generateSdrOutreachMessage, processSdrIncomingMessage } from '@/lib/ai/sdr';
import { BusinessLead } from '@/types';

const mockMesaGoLead: BusinessLead = {
  id: 'lead-test-mesago',
  name: 'Hamburgueria Artesanal Burger Master',
  category: 'Hamburgueria',
  productId: 'prod-mesago',
  productName: 'MesaGo',
  city: 'Curitiba',
  state: 'PR',
  phone: '(41) 98888-7777',
  source: 'GOOGLE_PLACES_API',
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

const mockTorqueLead: BusinessLead = {
  id: 'lead-test-torque',
  name: 'Auto Mecânica Express',
  category: 'Oficina Mecânica',
  productId: 'prod-torqueos',
  productName: 'TorqueOS',
  city: 'Belo Horizonte',
  state: 'MG',
  phone: '31977776666',
  source: 'GOOGLE_PLACES_API',
  dataConfidence: 'HIGH',
  verificationStatus: 'PHONE_VERIFIED',
  pipelineStage: 'NEW',
  priority: 'HIGH',
  score: 80,
  scoreFactors: [],
  firstCollectedAt: new Date().toISOString(),
  lastVerifiedAt: new Date().toISOString(),
  evidences: [],
  activities: [],
  stageHistory: [],
};

describe('SDR Phone Formatting', () => {
  it('should format Brazilian phone numbers with 55 country code and digits only', () => {
    expect(formatWhatsAppNumber('(11) 98888-7777')).toBe('5511988887777');
    expect(formatWhatsAppNumber('+55 41 9999-8888')).toBe('554199998888');
    expect(formatWhatsAppNumber('31977776666')).toBe('5531977776666');
    expect(formatWhatsAppNumber('5511988887777')).toBe('5511988887777');
  });
});

describe('SDR Outreach Message Generation', () => {
  it('should generate MesaGo specific pitch mentioning cardápio digital and no comissões', () => {
    const message = generateSdrOutreachMessage(mockMesaGoLead);
    expect(message).toContain('MesaGo');
    expect(message).toContain('Hamburgueria Artesanal Burger Master');
    expect(message).toContain('Curitiba');
    expect(message).toContain('cardápio digital');
  });

  it('should generate TorqueOS specific pitch mentioning OS digital and oficina', () => {
    const message = generateSdrOutreachMessage(mockTorqueLead);
    expect(message).toContain('TorqueOS');
    expect(message).toContain('Auto Mecânica Express');
    expect(message).toContain('Belo Horizonte');
    expect(message).toContain('Ordens de Serviço');
  });
});

describe('SDR Inbound Decision Engine & State Machine', () => {
  it('should detect LGPD opt-out and move to DO_NOT_CONTACT with paused automation', async () => {
    const decision = await processSdrIncomingMessage(mockMesaGoLead, 'Não tenho interesse, favor remover meu número');
    expect(decision.intent).toBe('OPT_OUT');
    expect(decision.newStage).toBe('DO_NOT_CONTACT');
    expect(decision.shouldPauseAutomation).toBe(true);
    expect(decision.replyText).toContain('Removemos seu número');
  });

  it('should detect demo scheduling intent, transition to DEMO_SCHEDULED, and PAUSE automation for human', async () => {
    const decision = await processSdrIncomingMessage(mockTorqueLead, 'Gostei! Vamos agendar amanhã às 15h');
    expect(decision.intent).toBe('SCHEDULE_DEMO');
    expect(decision.newStage).toBe('DEMO_SCHEDULED');
    expect(decision.shouldPauseAutomation).toBe(true);
    expect(decision.replyText).toContain('demonstração');
  });

  it('should answer questions consultatively without pausing automation', async () => {
    const decision = await processSdrIncomingMessage(mockMesaGoLead, 'Quanto custa a mensalidade? Tem fidelidade?');
    expect(decision.intent).toBe('QUESTION_INTEREST');
    expect(decision.newStage).toBe('RESPONDED');
    expect(decision.shouldPauseAutomation).toBe(false);
  });
});
