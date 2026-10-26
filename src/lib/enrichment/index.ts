import { LeadEvidence } from '@/types';

function isSafeUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;

    const hostname = parsed.hostname.toLowerCase();
    // Proteção contra SSRF e IPs privados
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.local') ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('172.16.') ||
      hostname === '169.254.169.254'
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export interface EnrichmentResult {
  isWebsiteOnline: boolean;
  httpStatus?: number;
  extractedPhone?: string | null;
  extractedEmail?: string | null;
  hasWhatsAppLink: boolean;
  hasDigitalMenu: boolean;
  hasOnlineOrdering: boolean;
  evidences: LeadEvidence[];
}

export async function enrichBusinessWebsite(websiteUrl: string): Promise<EnrichmentResult> {
  const result: EnrichmentResult = {
    isWebsiteOnline: false,
    extractedPhone: null,
    extractedEmail: null,
    hasWhatsAppLink: false,
    hasDigitalMenu: false,
    hasOnlineOrdering: false,
    evidences: [],
  };

  if (!websiteUrl || !isSafeUrl(websiteUrl)) {
    return result;
  }

  let formattedUrl = websiteUrl.trim();
  if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
    formattedUrl = `https://${formattedUrl}`;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(formattedUrl, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    result.httpStatus = res.status;
    result.isWebsiteOnline = res.ok;

    if (!res.ok) {
      result.evidences.push({
        id: `ev-${Date.now()}-1`,
        category: 'WEBSITE_OFFLINE',
        description: `Site retornou status HTTP ${res.status}.`,
        evidenceUrl: formattedUrl,
        detectedAt: new Date().toISOString(),
      });
      return result;
    }

    result.evidences.push({
      id: `ev-${Date.now()}-online`,
      category: 'WEBSITE_ATIVO',
      description: 'Site oficial responsivo e operacional (HTTP 200).',
      evidenceUrl: formattedUrl,
      detectedAt: new Date().toISOString(),
    });

    const html = await res.text();
    const htmlLower = html.toLowerCase();

    // 1. Detectar WhatsApp
    if (htmlLower.includes('wa.me') || htmlLower.includes('api.whatsapp.com') || htmlLower.includes('whatsapp')) {
      result.hasWhatsAppLink = true;
      result.evidences.push({
        id: `ev-${Date.now()}-wa`,
        category: 'CANAL_WHATSAPP',
        description: 'Link direto para WhatsApp comercial identificado na página.',
        evidenceUrl: formattedUrl,
        detectedAt: new Date().toISOString(),
      });
    }

    // 2. Detectar Cardápio Digital ou Pedidos Online
    const menuIndicators = ['cardapio', 'cardápio', 'menu', 'pedidos', 'anota.ai', 'goomer', 'cardapioweb', 'ifood', 'delivery'];
    if (menuIndicators.some((kw) => htmlLower.includes(kw))) {
      result.hasDigitalMenu = true;
      result.evidences.push({
        id: `ev-${Date.now()}-menu`,
        category: 'CARDAPIO_DIGITAL',
        description: 'Presença de cardápio digital ou canal de pedidos online na web.',
        evidenceUrl: formattedUrl,
        detectedAt: new Date().toISOString(),
      });
    }

    // 3. Extrair E-mail público (mailto ou regex)
    const emailMatch = html.match(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch && emailMatch[1]) {
      const email = emailMatch[1].toLowerCase();
      if (!email.includes('wix') && !email.includes('wordpress') && !email.includes('example')) {
        result.extractedEmail = email;
        result.evidences.push({
          id: `ev-${Date.now()}-email`,
          category: 'EMAIL_PUBLICO',
          description: `E-mail comercial público encontrado no site: ${email}`,
          evidenceUrl: formattedUrl,
          detectedAt: new Date().toISOString(),
        });
      }
    }

    return result;
  } catch (err: any) {
    result.evidences.push({
      id: `ev-${Date.now()}-err`,
      category: 'WEBSITE_ERROR',
      description: `Falha ao conectar ao site: ${err?.message || 'Timeout de conexão'}`,
      evidenceUrl: formattedUrl,
      detectedAt: new Date().toISOString(),
    });
    return result;
  }
}
