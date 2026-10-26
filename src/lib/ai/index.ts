import { AiAnalysisResult, BusinessLead } from '@/types';

export async function generateLeadAiAnalysis(lead: BusinessLead): Promise<AiAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const prompt = `
Você é um consultor comercial sênior e arquiteto de vendas B2B da Vision Solutions.
Analise a seguinte empresa REAL identificada para prospecção:

Nome: ${lead.name}
Categoria: ${lead.category}
Cidade/Estado: ${lead.city}/${lead.state}
Telefone comercial: ${lead.phone || 'Não informado'}
Website: ${lead.website || 'Não informado'}
Avaliações no Maps: ${lead.rating ? `${lead.rating} estrelas (${lead.reviewsCount} avaliações)` : 'Sem avaliações'}
Produto Alvo Pretendido: ${lead.productName}
Evidências Registradas:
${lead.evidences.map((e) => `- [${e.category}] ${e.description}`).join('\n')}

REGRAS ESTRITAS:
1. NÃO INVENTE fatos sobre a empresa. Use apenas os dados acima.
2. Separe estritamente FATOS OBSERVADOS de HIPÓTESES NÃO CONFIRMADAS.
3. Não afirme que a empresa tem interesse se não houver histórico de conversa.
4. Gere um roteiro de abordagem consultivo (focado em entender a dor, não empurrar venda).
5. Responda ESTRITAMENTE em formato JSON válido com as seguintes chaves:
{
  "summary": "Resumo executivo de 2 a 3 frases",
  "suggestedProduct": "${lead.productName}",
  "observedFacts": ["fato 1", "fato 2"],
  "unconfirmedHypotheses": ["hipótese 1", "hipótese 2"],
  "confidenceLevel": "HIGH" | "MEDIUM" | "LOW",
  "pitch": "Mensagem inicial consultiva e respeitosa para primeiro contato via WhatsApp/telefone",
  "diagnosticQuestions": ["pergunta investigativa 1", "pergunta investigativa 2"],
  "nextAction": "Ação recomendada imediata",
  "missingInformation": ["dado faltante 1"]
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
            temperature: 0.2,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          return {
            ...parsed,
            generatedAt: new Date().toISOString(),
          };
        }
      }
    } catch (err) {
      console.warn('Falha na chamada ao Gemini API, usando síntese analítica determinística.', err);
    }
  }

  // Fallback analítico determinístico baseado em evidências reais
  return generateDeterministicAnalysis(lead);
}

function generateDeterministicAnalysis(lead: BusinessLead): AiAnalysisResult {
  const facts: string[] = [];
  const hypotheses: string[] = [];
  const questions: string[] = [];
  const missing: string[] = [];

  // Fatos observáveis
  facts.push(`Empresa ${lead.name} localizada fisicamente em ${lead.city}-${lead.state}.`);
  if (lead.phone) {
    facts.push(`Possui telefone comercial público publicado (${lead.phone}).`);
  } else {
    missing.push('Telefone comercial direto');
  }

  if (lead.website) {
    facts.push(`Presença digital ativa no endereço ${lead.website}.`);
  } else {
    missing.push('Site oficial próprio');
  }

  if (lead.rating && lead.reviewsCount) {
    facts.push(`Relevância no mercado local comprovada por ${lead.reviewsCount} avaliações com nota ${lead.rating.toFixed(1)}.`);
  }

  // Hipóteses e perguntas baseadas no produto
  let pitch = '';
  let nextAction = '';

  if (lead.productName === 'MesaGo') {
    hypotheses.push('Pode enfrentar gargalos no recebimento manual de pedidos por WhatsApp ou comissões de marketplaces.');
    hypotheses.push('Pode se beneficiar de cardápio digital próprio e sincronização de mesas em tempo real.');
    questions.push('Como vocês organizam os pedidos de delivery nos horários de pico hoje?');
    questions.push('Vocês já possuem cardápio digital próprio ou dependem exclusivamente do iFood/WhatsApp manual?');
    pitch = `Olá! Tudo bem? Sou da equipe da Vision Solutions. Notei o destaque e o excelente atendimento da ${lead.name} em ${lead.city}. Desenvolvemos o MesaGo, uma plataforma especializada em agilizar pedidos e cardápio digital para alimentação. Gostaria de entender como vocês hoje gerenciam a fila de pedidos nos finais de semana?`;
    nextAction = lead.phone ? 'Iniciar primeiro contato respeitoso via WhatsApp' : 'Localizar canal de contato no site';
  } else if (lead.productName === 'TorqueOS') {
    hypotheses.push('Pode gerenciar ordens de serviço e orçamentos em papel ou planilhas suscetíveis a falhas.');
    hypotheses.push('Pode precisar de controle de estoque de peças e histórico de serviços por placa.');
    questions.push('Como funciona o fluxo de aprovação de orçamentos com os clientes da oficina atualmente?');
    questions.push('Vocês emitem ordem de serviço digital ou ainda utilizam blocos físicos e planilhas?');
    pitch = `Olá! Sou da equipe técnica da Vision Solutions. Identifiquei a atuação da ${lead.name} no setor automotivo em ${lead.city}. Desenvolvemos o TorqueOS para centros automotivos organizarem ordens de serviço digitais, envio de orçamentos pelo WhatsApp e controle de peças. Vocês já utilizam algum sistema digital para a gestão da oficina?`;
    nextAction = lead.phone ? 'Realizar ligação consultiva com o responsável da oficina' : 'Verificar contato comercial';
  } else {
    hypotheses.push('Pode buscar maior agilidade na emissão e contingência de notas fiscais (NF-e/NFC-e).');
    questions.push('Qual software fiscal vocês utilizam atualmente para a emissão dos cupons e notas fiscais?');
    questions.push('Vocês já tiveram problemas de lentidão ou suporte no sistema de faturamento atual?');
    pitch = `Olá! Sou consultor da Vision Solutions. Apoiamos empresas em ${lead.city} na emissão rápida e sem travas de documentos fiscais. Vocês estão satisfeitos com o suporte e a estabilidade do sistema fiscal que utilizam hoje?`;
    nextAction = 'Apresentar comparativo de recursos fiscais';
  }

  const confidence = lead.phone && lead.website ? 'HIGH' : lead.phone ? 'MEDIUM' : 'LOW';

  return {
    summary: `Oportunidade comercial em ${lead.city} no segmento ${lead.category}. A empresa possui dados verificados na base e compatibilidade com o ${lead.productName}.`,
    suggestedProduct: lead.productName,
    observedFacts: facts,
    unconfirmedHypotheses: hypotheses,
    confidenceLevel: confidence,
    pitch,
    diagnosticQuestions: questions,
    nextAction,
    missingInformation: missing,
    generatedAt: new Date().toISOString(),
  };
}
