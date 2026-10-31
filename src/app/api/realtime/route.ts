import { NextRequest } from 'next/server';
import { subscribeRealtime, RealtimeEvent } from '@/lib/events';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // 1. Envia saudação de conexão estabelecida
      const initialEvent: RealtimeEvent = {
        type: 'CONNECTED',
        payload: { status: 'online' },
        timestamp: new Date().toISOString(),
      };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialEvent)}\n\n`));

      // 2. Inscreve no barramento de eventos interno
      const unsubscribe = subscribeRealtime((event) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // Stream fechada pelo cliente
        }
      });

      // 3. Heartbeat a cada 15 segundos para evitar timeout de proxy (Cloudflare/Render)
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15000);

      // 4. Limpeza ao desconectar
      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
