export interface ScoreCalculationInput {
  category: string;
  productSlug: string;
  hasPhone: boolean;
  hasWebsite: boolean;
  hasEmail?: boolean;
  rating?: number | null;
  reviewsCount?: number | null;
  hasDigitalMenu?: boolean;
  hasOnlineOrders?: boolean;
}

export interface ScoreCalculationResult {
  score: number;
  factors: string[];
}

export function calculateLeadScore(input: ScoreCalculationInput): ScoreCalculationResult {
  let score = 0;
  const factors: string[] = [];

  const catLower = input.category.toLowerCase();

  // 1. Compatibilidade do Segmento com o Produto
  if (input.productSlug === 'mesago') {
    const foodKeywords = ['hamburguer', 'burger', 'pizza', 'restaurante', 'lanchonete', 'açaí', 'acai', 'café', 'cafe', 'bar', 'sushi', 'comida'];
    const matched = foodKeywords.some((k) => catLower.includes(k));
    if (matched) {
      score += 30;
      factors.push('Segmento de alimentação altamente aderente ao MesaGo (+30)');
    } else {
      score += 10;
      factors.push('Segmento comercial compatível (+10)');
    }
  } else if (input.productSlug === 'torqueos') {
    const autoKeywords = ['oficina', 'mecanic', 'auto', 'car', 'moto', 'pneus', 'peças', 'veicular', 'repar'];
    const matched = autoKeywords.some((k) => catLower.includes(k));
    if (matched) {
      score += 30;
      factors.push('Segmento automotivo com forte necessidade de Ordem de Serviço (+30)');
    } else {
      score += 10;
      factors.push('Segmento comercial compatível (+10)');
    }
  } else if (input.productSlug === 'software-fiscal') {
    const retailKeywords = ['loja', 'varejo', 'comercio', 'distribuidora', 'mercado', 'material', 'atacado'];
    const matched = retailKeywords.some((k) => catLower.includes(k));
    if (matched) {
      score += 30;
      factors.push('Atividade comercial com emissão contínua de NF-e/NFC-e (+30)');
    } else {
      score += 15;
      factors.push('Pessoa jurídica potencial emitente (+15)');
    }
  }

  // 2. Canal Comercial Aberto (Telefone)
  if (input.hasPhone) {
    score += 30;
    factors.push('Telefone comercial público disponível para contato (+30)');
  } else {
    factors.push('Telefone comercial ausente na consulta original (0)');
  }

  // 3. Presença Digital Própria (Website)
  if (input.hasWebsite) {
    score += 20;
    factors.push('Possui presença digital / site próprio (+20)');
  }

  // 4. E-mail Comercial
  if (input.hasEmail) {
    score += 10;
    factors.push('E-mail comercial público identificado (+10)');
  }

  // 5. Avaliação e Reputação no Mercado
  if (input.rating && input.rating >= 4.0) {
    score += 10;
    factors.push(`Boa avaliação observada: ${input.rating.toFixed(1)} estrelas (+10)`);
  }

  if (input.reviewsCount && input.reviewsCount >= 15) {
    score += 10;
    factors.push(`Volume consolidado de clientes: ${input.reviewsCount} avaliações (+10)`);
  }

  // 6. Evidências Específicas
  if (input.hasDigitalMenu) {
    score += 10;
    factors.push('Cardápio online identificado no domínio (+10)');
  }
  if (input.hasOnlineOrders) {
    score += 10;
    factors.push('Canal de pedidos ativos identificado (+10)');
  }

  // Normalizar entre 0 e 100
  score = Math.min(score, 100);

  return {
    score,
    factors,
  };
}
