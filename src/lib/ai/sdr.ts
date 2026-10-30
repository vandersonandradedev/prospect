import { BusinessLead, PipelineStage } from '@/types';

export interface SdrDecision {
  intent: 'SCHEDULE_DEMO' | 'QUESTION_INTEREST' | 'OBJECTION' | 'OPT_OUT' | 'NEUTRAL';
  replyText: string;
  newStage: PipelineStage;
  shouldPauseAutomation: boolean;
  notes?: string;
}

export interface ChatMessage {
  from: 'LEAD' | 'SDR';
  text: string;
  date: string;
}

const MESAGO_KNOWLEDGE = `
PRODUTO: MesaGo
PÚBLICO-ALVO: Hamburguerias, Pizzarias, Restaurantes, Lanchonetes, Açaíterias, Dark Kitchens.
PROBLEMAS QUE RESOLVE:
1. Comissões abusivas de marketplaces (iFood cobrando de 12% a 27% do faturamento).
2. Caos no atendimento manual de pedidos pelo WhatsApp (mensagens perdidas, clientes esperando).
3. Erros de anotação de pedidos e pedidos atrasados na cozinha.
4. Falta de fidelização (no iFood o cliente é da plataforma, no MesaGo a base é do restaurante).
RECURSOS CHAVE:
- Cardápio digital interativo próprio com fotos e adicionais.
- O cliente faz o pedido sozinho e o pedido chega pronto no painel do restaurante e na impressora.
- Gestão de comandas, mesas e salão em tempo real.
- KDS (Kitchen Display System) para a cozinha controlar tempo de preparo.
- Taxa zero por pedido.
OBJETIVO DO SDR: Entender o modelo de pedidos atual e agendar uma demonstração rápida online de 10 a 15 minutos sem compromisso.
`;

const TORQUEOS_KNOWLEDGE = `
PRODUTO: TorqueOS
PÚBLICO-ALVO: Oficinas Mecânicas, Centros Automotivos, Auto Elétricas, Oficinas de Moto, Troca de Óleo.
PROBLEMAS QUE RESOLVE:
1. Ordens de serviço (OS) em papel ou planilhas que somem ou causam retrabalho.
2. Dificuldade de aprovar orçamentos com o cliente (demora para responder telefone).
3. Falta de controle de estoque de peças e lubrificantes (peças somem ou falta produto).
4. Cálculo demorado e contestado de comissão de mecânicos no fim do mês.
RECURSOS CHAVE:
- Ordem de Serviço 100% digital com checklist veicular e fotos de avarias.
- Envio de orçamento direto para o WhatsApp do cliente com botão de aprovação em 1 clique.
- Histórico completo de manutenções por placa do veículo.
- Controle de estoque com baixa automática e cálculo automático de comissão por mecânico.
OBJETIVO DO SDR: Entender se usam papel/planilha e agendar uma demonstração rápida online de 10 a 15 minutos para ver a OS digital funcionando na prática.
`;

export function generateSdrOutreachMessage(lead: BusinessLead): string {
  const isTorque = lead.productId === 'prod-torqueos' || lead.productName === 'TorqueOS';

  if (isTorque) {
    return (
      `Olá, tudo bem? Notei a atuação e o destaque da ${lead.name} na manutenção automotiva em ${lead.city}.\n\n` +
      `Sou da equipe da Vision Solutions. Desenvolvemos o *TorqueOS*, um sistema feito especificamente para oficinas organizarem suas Ordens de Serviço (OS) digitais, enviarem orçamentos com fotos direto pelo WhatsApp e controlarem o estoque de peças.\n\n` +
      `Como funciona hoje o fluxo de aprovação de orçamentos e abertura de OS na oficina? Vocês ainda utilizam blocos de papel ou já têm um sistema digital?`
    );
  }

  // Padrão: MesaGo
  return (
    `Olá! Tudo bem? Acompanhei o trabalho da ${lead.name} no setor de alimentação em ${lead.city}.\n\n` +
    `Sou da equipe da Vision Solutions. Criamos o *MesaGo*, uma plataforma completa com cardápio digital próprio e gestão ágil de pedidos para delivery e salão, sem cobrar comissões abusivas sobre suas vendas.\n\n` +
    `Como vocês organizam os pedidos nos horários de pico hoje? O atendimento é todo manual pelo WhatsApp ou já possuem cardápio digital próprio?`
  );
}

export async function processSdrIncomingMessage(
  lead: BusinessLead,
  incomingText: string,
  history: ChatMessage[] = []
): Promise<SdrDecision> {
  const textLower = incomingText.toLowerCase().trim();

  // 1. Verificação Imediata de Opt-Out / LGPD
  const optOutKeywords = [
    'sair',
    'pare',
    'parar',
    'cancelar',
    'cancela',
    'remover',
    'remover meu',
    'não quero',
    'nao quero',
    'não tenho interesse',
    'nao tenho interesse',
    'não autorizo',
    'nao autorizo',
    'desinscrever',
    'spam',
    'bloquear',
    'excluir',
  ];

  if (optOutKeywords.some((kw) => textLower === kw || textLower.includes(kw))) {
    return {
      intent: 'OPT_OUT',
      replyText: 'Entendido perfeitamente! Removemos seu número de qualquer contato futuro da nossa base. Desejamos muito sucesso nos negócios!',
      newStage: 'DO_NOT_CONTACT',
      shouldPauseAutomation: true,
      notes: `Opt-out solicitado pelo titular: "${incomingText}"`,
    };
  }

  // 2. Se a IA Gemini estiver disponível, realiza análise contextual inteligente
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const decision = await runGeminiSdrPrompt(lead, incomingText, history, apiKey);
      if (decision) return decision;
    } catch (err) {
      console.warn('Falha no processador Gemini SDR, usando fallback determinístico:', err);
    }
  }

  // 3. Fallback Determinístico baseado em regras de negócio
  return runDeterministicSdr(lead, incomingText);
}

async function runGeminiSdrPrompt(
  lead: BusinessLead,
  incomingText: string,
  history: ChatMessage[],
  apiKey: string
): Promise<SdrDecision | null> {
  const isTorque = lead.productId === 'prod-torqueos' || lead.productName === 'TorqueOS';
  const knowledge = isTorque ? TORQUEOS_KNOWLEDGE : MESAGO_KNOWLEDGE;

  const conversationFormatted = history
    .map((m) => `${m.from === 'SDR' ? 'Você (SDR Vision Solutions)' : lead.name}: ${m.text}`)
    .join('\n');

  const prompt = `
Você é o SDR Comercial Sênior da Vision Solutions no Brasil.
Seu objetivo é conduzir um diálogo consultivo via WhatsApp com o responsável da empresa ${lead.name} (${lead.category} em ${lead.city}-${lead.state}).
Você está apresentando o produto: ${lead.productName}.

${knowledge}

HISTÓRICO DA CONVERSA:
${conversationFormatted || '(Início do contato)'}

NOVA MENSAGEM DO CLIENTE:
"${incomingText}"

DIRETRIZES E REGRAS ESTRITAS:
1. Responda em português brasileiro de forma natural, simpática, humanizada e profissional (como em um WhatsApp real, sem soar como bot genérico).
2. Não use termos excessivamente formais ou robóticos. Use parágrafos curtos.
3. Se o cliente tiver dúvidas sobre preço, funcionalidades ou compatibilidade: responda com clareza com base nos recursos do produto e convide-o para ver na prática em uma apresentação rápida de 10 a 15 minutos.
4. SE O CLIENTE ACEITAR O AGENDAMENTO, concordar em ver a demonstração, sugerir dia/horário ("pode ser", "quarta às 14h", "vamos marcar", "manda o link", "pode ligar"):
   - Defina "intent": "SCHEDULE_DEMO".
   - Confirme cordialmente e avise que nosso especialista entrará em contato pontualmente para realizar a demonstração.
   - Defina "shouldPauseAutomation": true (o humano assumirá o atendimento).
5. SE O CLIENTE APENAS FEZ PERGUNTAS OU DEMONSTROU INTERESSE:
   - Defina "intent": "QUESTION_INTEREST".
   - Responda à dúvida e sugira o agendamento da demo.
   - Defina "shouldPauseAutomation": false.
6. SE O CLIENTE DISSE QUE NÃO TEM INTERESSE:
   - Defina "intent": "OBJECTION".
   - Agradeça a atenção cordialmente.

Responda ESTRITAMENTE em formato JSON com o seguinte schema:
{
  "intent": "SCHEDULE_DEMO" | "QUESTION_INTEREST" | "OBJECTION" | "NEUTRAL",
  "replyText": "texto da mensagem para enviar no WhatsApp",
  "newStage": "DEMO_SCHEDULED" | "RESPONDED" | "LOST",
  "shouldPauseAutomation": boolean,
  "notes": "resumo do que o cliente respondeu"
}
`;

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    }),
  });

  if (!response.ok) return null;
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;

  const parsed = JSON.parse(text);
  return {
    intent: parsed.intent || 'QUESTION_INTEREST',
    replyText: parsed.replyText || 'Obrigado pelo retorno!',
    newStage: parsed.intent === 'SCHEDULE_DEMO' ? 'DEMO_SCHEDULED' : (parsed.newStage as PipelineStage) || 'RESPONDED',
    shouldPauseAutomation: parsed.intent === 'SCHEDULE_DEMO' || Boolean(parsed.shouldPauseAutomation),
    notes: parsed.notes,
  };
}

function runDeterministicSdr(lead: BusinessLead, incomingText: string): SdrDecision {
  const text = incomingText.toLowerCase();
  const isTorque = lead.productId === 'prod-torqueos' || lead.productName === 'TorqueOS';

  // Detecção de aceite de demonstração
  const scheduleWords = [
    'vamos agendar',
    'pode agendar',
    'quero agendar',
    'quero ver',
    'pode ser',
    'pode ligar',
    'vamos marcar',
    'marca',
    'amanhã',
    'amanha',
    'segunda',
    'terça',
    'terca',
    'quarta',
    'quinta',
    'sexta',
    'às ',
    'as ',
    'horas',
    'como funciona para ver',
    'manda o link',
    'tenho interesse',
  ];

  if (scheduleWords.some((w) => text.includes(w))) {
    return {
      intent: 'SCHEDULE_DEMO',
      replyText:
        `Combinado! Deixei pré-agendada a nossa demonstração rápida de 15 minutos do ${lead.productName}.\n\n` +
        `Nosso especialista comercial entrará em contato direto para confirmar o melhor horário e compartilhar a tela com você. Muito obrigado pelo retorno e até breve!`,
      newStage: 'DEMO_SCHEDULED',
      shouldPauseAutomation: true,
      notes: `Lead confirmou interesse em demonstração: "${incomingText}"`,
    };
  }

  // Perguntas sobre preço / valores
  if (text.includes('preço') || text.includes('preco') || text.includes('quanto') || text.includes('valor') || text.includes('custa')) {
    const valueDetail = isTorque
      ? 'O TorqueOS possui planos acessíveis de acordo com a quantidade de mecânicos e não cobra por OS emitida.'
      : 'O MesaGo não cobra taxa percentual por pedido (ao contrário dos 12% a 27% do iFood), permitindo que você lucre 100% sobre o seu cardápio.';

    return {
      intent: 'QUESTION_INTEREST',
      replyText:
        `${valueDetail}\n\n` +
        `Consigo te apresentar em 10 minutos na tela como ele funciona na prática e simular o plano ideal para a ${lead.name}. Qual o melhor horário para você hoje ou amanhã?`,
      newStage: 'RESPONDED',
      shouldPauseAutomation: false,
    };
  }

  // Resposta padrão consultiva
  return {
    intent: 'QUESTION_INTEREST',
    replyText:
      `Perfeito! O objetivo do ${lead.productName} é justamente eliminar o trabalho manual e os erros no dia a dia da sua empresa.\n\n` +
      `Seria ótimo te mostrar a ferramenta funcionando na prática em uma rápida demonstração online de 10 minutos. Você teria disponibilidade amanhã pela manhã ou à tarde?`,
    newStage: 'RESPONDED',
    shouldPauseAutomation: false,
  };
}
