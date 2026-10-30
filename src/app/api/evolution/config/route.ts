import { NextRequest, NextResponse } from 'next/server';
import { getEvolutionConfig, EvolutionClient } from '@/lib/evolution/client';
import { saveStoredEvolutionConfig } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const config = getEvolutionConfig();
  return NextResponse.json({
    serverUrl: config.serverUrl,
    apiKey: config.apiKey ? '••••••••' + config.apiKey.slice(-4) : '',
    instanceName: config.instanceName,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { serverUrl, apiKey, instanceName } = body;

    if (!serverUrl || typeof serverUrl !== 'string') {
      return NextResponse.json({ error: 'Informe uma URL válida para a Evolution API.' }, { status: 400 });
    }

    const cleanUrl = serverUrl.trim().replace(/\/$/, '');
    const cleanApiKey = apiKey ? apiKey.trim() : undefined;
    const cleanInstance = instanceName ? instanceName.trim() : undefined;

    // Testar se o servidor responde
    const testClient = new EvolutionClient({
      serverUrl: cleanUrl,
      ...(cleanApiKey ? { apiKey: cleanApiKey } : {}),
      ...(cleanInstance ? { instanceName: cleanInstance } : {}),
    });

    const health = await testClient.checkHealth();

    // Salvar configuração persistente
    saveStoredEvolutionConfig({
      serverUrl: cleanUrl,
      ...(cleanApiKey ? { apiKey: cleanApiKey } : {}),
      ...(cleanInstance ? { instanceName: cleanInstance } : {}),
    });

    return NextResponse.json({
      success: true,
      message: health.available
        ? `Conectado com sucesso em ${cleanUrl}!`
        : `URL salva (${cleanUrl}), mas o servidor retornou: ${health.message}. Verifique se o Docker e o túnel local estão ativos.`,
      available: health.available,
      serverUrl: cleanUrl,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Erro ao salvar configuração da Evolution API.' },
      { status: 500 }
    );
  }
}
