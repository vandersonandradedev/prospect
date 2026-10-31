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

    return NextResponse.json({
      available: true,
      message: health.message,
      state: instanceStatus.state,
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
