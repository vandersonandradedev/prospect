import { EvolutionSettings } from '@/types';
import { getStoredEvolutionConfig } from '@/lib/db';

export function getEvolutionConfig(): EvolutionSettings {
  let stored: { serverUrl?: string; apiKey?: string; instanceName?: string } | undefined;
  try {
    stored = getStoredEvolutionConfig();
  } catch {}

  let rawUrl = (
    stored?.serverUrl ||
    process.env.EVOLUTION_API_URL ||
    process.env.NEXT_PUBLIC_EVOLUTION_URL ||
    ''
  ).trim();

  const isCloudEnv = Boolean(
    process.env.RENDER ||
    process.env.VERCEL ||
    process.env.NODE_ENV === 'production'
  );

  // Se a URL estiver vazia, ou for localhost/túnel temporário (.loca.lt) em ambiente de nuvem
  if (!rawUrl || (isCloudEnv && (rawUrl.includes('localhost') || rawUrl.includes('.loca.lt')))) {
    rawUrl = 'https://vision-evolution-api.onrender.com';
  }

  let serverUrl = rawUrl.replace(/\/$/, '');
  if (!serverUrl.startsWith('http://') && !serverUrl.startsWith('https://')) {
    serverUrl = `http://${serverUrl}`;
  }

  // No Render Free Tier, serviços se comunicam pela URL pública HTTPS:
  if (serverUrl.includes('vision-evolution-api') && !serverUrl.includes('.onrender.com')) {
    serverUrl = 'https://vision-evolution-api.onrender.com';
  }

  return {
    serverUrl,
    apiKey: stored?.apiKey || process.env.EVOLUTION_API_KEY || 'vision_evolution_secret_key_2026',
    instanceName: stored?.instanceName || process.env.EVOLUTION_INSTANCE_NAME || 'VisionLeads',
    autoOutreachEnabled: process.env.AUTO_OUTREACH_ENABLED !== 'false',
    autoReplyEnabled: process.env.AUTO_REPLY_ENABLED !== 'false',
    webhookUrl: process.env.EVOLUTION_WEBHOOK_URL,
  };
}

export function formatWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';

  // Se já começa com 55 e tem 12 ou 13 dígitos
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }

  // Se é número brasileiro com DDD (10 ou 11 dígitos, ex: 11988887777 ou 4133334444)
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return digits;
}

export class EvolutionClient {
  private customConfig?: Partial<EvolutionSettings>;

  constructor(customConfig?: Partial<EvolutionSettings>) {
    this.customConfig = customConfig;
  }

  get config(): EvolutionSettings {
    return { ...getEvolutionConfig(), ...this.customConfig };
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      apikey: this.config.apiKey,
      'Bypass-Tunnel-Reminder': 'true',
      'bypass-tunnel-reminder': '1',
      'User-Agent': 'VisionSolutions-B2B/1.0',
    };
  }

  async checkHealth(): Promise<{ available: boolean; message: string; version?: string }> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(`${this.config.serverUrl}/instance/fetchInstances`, {
        headers: this.getHeaders(),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        return {
          available: true,
          message: 'Evolution API operacional e conectada.',
        };
      }

      if (res.status === 401 || res.status === 403) {
        return {
          available: false,
          message: 'Falha de autenticação na Evolution API (verifique a apikey).',
        };
      }

      return {
        available: false,
        message: `Evolution API retornou status HTTP ${res.status}.`,
      };
    } catch (err: any) {
      return {
        available: false,
        message: `Evolution API offline em ${this.config.serverUrl}. Verifique o contêiner Docker na porta 8082.`,
      };
    }
  }

  async getInstanceStatus(instanceName = this.config.instanceName): Promise<{
    exists: boolean;
    state: 'open' | 'connecting' | 'close' | 'unknown';
    profileName?: string;
    profilePictureUrl?: string;
  }> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(`${this.config.serverUrl}/instance/connectionState/${instanceName}`, {
        headers: this.getHeaders(),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return { exists: false, state: 'unknown' };
      }

      const data = await res.json();
      const state = (data?.instance?.state || data?.state || 'close').toLowerCase();

      return {
        exists: true,
        state: state === 'open' ? 'open' : state === 'connecting' ? 'connecting' : 'close',
      };
    } catch {
      return { exists: false, state: 'unknown' };
    }
  }

  async createInstance(
    instanceName = this.config.instanceName,
    phoneNumber?: string
  ): Promise<{
    success: boolean;
    qrCodeBase64?: string;
    pairingCode?: string;
    message?: string;
  }> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const formattedNumber = phoneNumber ? formatWhatsAppNumber(phoneNumber) : undefined;
      const res = await fetch(`${this.config.serverUrl}/instance/create`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          instanceName,
          token: this.config.apiKey,
          qrcode: !formattedNumber,
          ...(formattedNumber ? { number: formattedNumber } : {}),
          integration: 'WHATSAPP-BAILEYS',
          reject_call: true,
          msg_call: 'Atendimento automatizado Vision Solutions via mensagem.',
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const data = await res.json();
      if (res.ok || res.status === 201) {
        return {
          success: true,
          qrCodeBase64: data?.qrcode?.base64 || data?.base64,
          pairingCode: data?.qrcode?.pairingCode || data?.pairingCode,
          message: 'Instância criada com sucesso.',
        };
      }

      return {
        success: false,
        message: data?.response?.message || data?.message || 'Falha ao criar instância.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Erro ao comunicar com Evolution API.',
      };
    }
  }

  async getConnectQrCode(
    instanceName = this.config.instanceName,
    phoneNumber?: string
  ): Promise<{
    state: string;
    qrCodeBase64?: string;
    pairingCode?: string;
    code?: string;
  }> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const formattedNumber = phoneNumber ? formatWhatsAppNumber(phoneNumber) : undefined;
      const url = formattedNumber
        ? `${this.config.serverUrl}/instance/connect/${instanceName}?number=${encodeURIComponent(formattedNumber)}`
        : `${this.config.serverUrl}/instance/connect/${instanceName}`;

      const res = await fetch(url, {
        headers: this.getHeaders(),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return { state: 'close' };
      }

      const data = await res.json();
      const qrCode = data?.base64 || data?.qrcode?.base64;
      return {
        state: data?.instance?.state || data?.state || (qrCode ? 'connecting' : 'close'),
        qrCodeBase64: qrCode,
        pairingCode: data?.pairingCode || data?.qrcode?.pairingCode,
        code: data?.code || data?.qrcode?.code,
      };
    } catch {
      return { state: 'close' };
    }
  }

  async restartInstance(instanceName = this.config.instanceName): Promise<{
    success: boolean;
    qrCodeBase64?: string;
    pairingCode?: string;
    message?: string;
  }> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(`${this.config.serverUrl}/instance/restart/${instanceName}`, {
        method: 'POST',
        headers: this.getHeaders(),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const data = await res.json();
      return {
        success: res.ok,
        qrCodeBase64: data?.base64 || data?.qrcode?.base64,
        pairingCode: data?.pairingCode || data?.qrcode?.pairingCode,
        message: data?.message || data?.response?.message,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Erro ao reiniciar instância na Evolution API.',
      };
    }
  }

  async deleteInstance(instanceName = this.config.instanceName): Promise<{ success: boolean }> {
    try {
      const res = await fetch(`${this.config.serverUrl}/instance/delete/${instanceName}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      return { success: res.ok };
    } catch {
      return { success: false };
    }
  }

  async configureWebhook(
    webhookUrl: string,
    instanceName = this.config.instanceName
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch(`${this.config.serverUrl}/webhook/set/${instanceName}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          webhook: {
            enabled: true,
            url: webhookUrl,
            byEvents: false,
            base64: false,
            events: [
              'MESSAGES_UPSERT',
              'MESSAGES_UPDATE',
              'CONNECTION_UPDATE',
            ],
          },
        }),
      });

      if (res.ok) {
        return { success: true };
      }
      const data = await res.json();
      return { success: false, message: data?.message || 'Falha ao salvar webhook.' };
    } catch (err: any) {
      return { success: false, message: err?.message };
    }
  }

  async sendTextMessage(params: {
    phone: string;
    text: string;
    instanceName?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { phone, text, instanceName = this.config.instanceName } = params;
    const cleanNumber = formatWhatsAppNumber(phone);

    if (!cleanNumber || cleanNumber.length < 10) {
      return { success: false, error: 'Número de telefone inválido para envio via WhatsApp.' };
    }

    try {
      const res = await fetch(`${this.config.serverUrl}/message/sendText/${instanceName}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          number: cleanNumber,
          text: text.trim(),
          delay: 1200, // Simulação humanizada de digitação
          linkPreview: false,
        }),
      });

      const data = await res.json();
      if (res.ok && data?.key?.id) {
        return {
          success: true,
          messageId: data.key.id,
        };
      }

      return {
        success: false,
        error: data?.response?.message || data?.message || `Erro HTTP ${res.status} ao enviar mensagem.`,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Falha de conexão ao enviar mensagem via Evolution API.',
      };
    }
  }
}

export const evolutionClient = new EvolutionClient();
