import { NextRequest, NextResponse } from 'next/server';
import { evolutionClient, getEvolutionConfig } from '@/lib/evolution/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    let forceRestart = false;
    try {
      const body = await req.json();
      if (body?.forceRestart) forceRestart = true;
    } catch {}

    const config = getEvolutionConfig();
    const status = await evolutionClient.getInstanceStatus();

    // 1. Se a instância não existe ainda, cria com QR Code ativado
    if (!status.exists) {
      const createRes = await evolutionClient.createInstance();
      return NextResponse.json({
        success: createRes.success,
        message: createRes.message,
        qrCodeBase64: createRes.qrCodeBase64,
        pairingCode: createRes.pairingCode,
        state: 'connecting',
      });
    }

    // 2. Se já estiver aberta/conectada e não solicitou reinício forçado
    if (status.state === 'open' && !forceRestart) {
      return NextResponse.json({
        success: true,
        state: 'open',
        message: 'WhatsApp já conectado e operacional.',
      });
    }

    // 3. Se forçado ou se for atualização de QR Code, tenta obter ou reiniciar
    let connectRes = await evolutionClient.getConnectQrCode();

    if (forceRestart || !connectRes.qrCodeBase64) {
      const restartRes = await evolutionClient.restartInstance();
      if (restartRes.qrCodeBase64) {
        connectRes = {
          state: 'connecting',
          qrCodeBase64: restartRes.qrCodeBase64,
          pairingCode: restartRes.pairingCode,
        };
      } else {
        // Fallback: se restart não retornou QR imediato, tenta nova chamada de connect
        const freshConnect = await evolutionClient.getConnectQrCode();
        if (freshConnect.qrCodeBase64) {
          connectRes = freshConnect;
        }
      }
    }

    // 4. Configura webhook para garantir recebimento de mensagens quando conectar
    if (config.webhookUrl) {
      evolutionClient.configureWebhook(config.webhookUrl).catch(() => null);
    }

    return NextResponse.json({
      success: true,
      state: connectRes.state || 'connecting',
      qrCodeBase64: connectRes.qrCodeBase64,
      pairingCode: connectRes.pairingCode,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro ao conectar instância na Evolution API' }, { status: 500 });
  }
}
