import { NextRequest, NextResponse } from 'next/server';
import { evolutionClient, getEvolutionConfig } from '@/lib/evolution/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    let forceRestart = false;
    let phoneNumber: string | undefined;
    try {
      const body = await req.json();
      if (body?.forceRestart) forceRestart = true;
      if (body?.phoneNumber && typeof body.phoneNumber === 'string') {
        phoneNumber = body.phoneNumber.trim();
      }
    } catch {}

    const config = getEvolutionConfig();

    // 1. Se informou número de telefone (Pairing Code) ou solicitou reinício forçado, recria a instância de forma limpa
    if (phoneNumber || forceRestart) {
      await evolutionClient.deleteInstance(config.instanceName).catch(() => null);
      const createRes = await evolutionClient.createInstance(config.instanceName, phoneNumber);
      let connectRes = await evolutionClient.getConnectQrCode(config.instanceName, phoneNumber);
      return NextResponse.json({
        success: true,
        message: phoneNumber
          ? 'Código de pareamento gerado com sucesso. Digite no celular.'
          : 'Instância reiniciada e sessão limpa com sucesso.',
        qrCodeBase64: connectRes.qrCodeBase64 || createRes.qrCodeBase64,
        pairingCode: connectRes.pairingCode || createRes.pairingCode,
        state: 'connecting',
      });
    }

    const status = await evolutionClient.getInstanceStatus();

    // 2. Se a instância não existe ainda, cria
    if (!status.exists) {
      const createRes = await evolutionClient.createInstance(config.instanceName);
      let connectRes = await evolutionClient.getConnectQrCode(config.instanceName, phoneNumber);
      return NextResponse.json({
        success: true,
        message: createRes.message,
        qrCodeBase64: connectRes.qrCodeBase64 || createRes.qrCodeBase64,
        pairingCode: connectRes.pairingCode || createRes.pairingCode,
        state: 'connecting',
      });
    }

    // 3. Se já estiver aberta/conectada
    if (status.state === 'open') {
      return NextResponse.json({
        success: true,
        state: 'open',
        message: 'WhatsApp já conectado e operacional.',
      });
    }

    // 4. Obtém o QR Code ou Pairing Code vivo
    let connectRes = await evolutionClient.getConnectQrCode(config.instanceName, phoneNumber);

    if (!connectRes.qrCodeBase64 && !connectRes.pairingCode) {
      const restartRes = await evolutionClient.restartInstance(config.instanceName);
      if (restartRes.qrCodeBase64 || restartRes.pairingCode) {
        connectRes = {
          state: 'connecting',
          qrCodeBase64: restartRes.qrCodeBase64,
          pairingCode: restartRes.pairingCode,
        };
      } else {
        const freshConnect = await evolutionClient.getConnectQrCode(config.instanceName, phoneNumber);
        if (freshConnect.qrCodeBase64 || freshConnect.pairingCode) {
          connectRes = freshConnect;
        }
      }
    }

    // 5. Configura webhook para garantir recebimento de mensagens quando conectar
    if (config.webhookUrl) {
      evolutionClient.configureWebhook(config.webhookUrl, config.instanceName).catch(() => null);
    }

    return NextResponse.json({
      success: true,
      state: connectRes.state || 'connecting',
      qrCodeBase64: connectRes.qrCodeBase64,
      pairingCode: connectRes.pairingCode,
    });
  } catch (error: any) {
    const config = getEvolutionConfig();
    const isFetchFailed = error?.message?.includes('fetch failed') || error?.cause?.code === 'ECONNREFUSED';
    const friendlyError = isFetchFailed
      ? `Servidor Evolution API inacessível em "${config.serverUrl}". Como o sistema roda na nuvem (Vercel/Render), ele não alcança localhost diretamente. Insira a URL do túnel localtunnel/ngrok no campo abaixo e clique em Salvar.`
      : (error?.message || 'Erro ao conectar instância na Evolution API');
    return NextResponse.json({ error: friendlyError }, { status: 500 });
  }
}
