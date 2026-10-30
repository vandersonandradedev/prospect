import { NextRequest, NextResponse } from 'next/server';
import { evolutionClient, getEvolutionConfig } from '@/lib/evolution/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const config = getEvolutionConfig();
    const status = await evolutionClient.getInstanceStatus();

    if (!status.exists) {
      const createRes = await evolutionClient.createInstance();
      return NextResponse.json({
        success: createRes.success,
        message: createRes.message,
        qrCodeBase64: createRes.qrCodeBase64,
        pairingCode: createRes.pairingCode,
      });
    }

    const connectRes = await evolutionClient.getConnectQrCode();
    return NextResponse.json({
      success: true,
      state: connectRes.state,
      qrCodeBase64: connectRes.qrCodeBase64,
      pairingCode: connectRes.pairingCode,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro ao conectar instância' }, { status: 500 });
  }
}
