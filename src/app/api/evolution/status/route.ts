import { NextRequest, NextResponse } from 'next/server';
import { evolutionClient, getEvolutionConfig } from '@/lib/evolution/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const config = getEvolutionConfig();
    const health = await evolutionClient.checkHealth();

    if (!health.available) {
      return NextResponse.json({
        available: false,
        message: health.message,
        config: {
          serverUrl: config.serverUrl,
          instanceName: config.instanceName,
        },
      });
    }

    const instanceStatus = await evolutionClient.getInstanceStatus();

    let qrCodeBase64: string | undefined;
    let pairingCode: string | undefined;

    if (instanceStatus.state !== 'open') {
      const connectData = await evolutionClient.getConnectQrCode();
      qrCodeBase64 = connectData.qrCodeBase64;
      pairingCode = connectData.pairingCode;
    }

    return NextResponse.json({
      available: true,
      message: health.message,
      state: instanceStatus.state,
      qrCodeBase64,
      pairingCode,
      config: {
        serverUrl: config.serverUrl,
        instanceName: config.instanceName,
        autoOutreachEnabled: config.autoOutreachEnabled,
        autoReplyEnabled: config.autoReplyEnabled,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro ao checar status da Evolution API' }, { status: 500 });
  }
}
