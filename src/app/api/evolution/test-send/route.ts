import { NextRequest, NextResponse } from 'next/server';
import { evolutionClient } from '@/lib/evolution/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { phone, text } = await req.json();

    if (!phone || !text) {
      return NextResponse.json({ error: 'Parâmetros "phone" e "text" são obrigatórios' }, { status: 400 });
    }

    const res = await evolutionClient.sendTextMessage({ phone, text });
    if (!res.success) {
      return NextResponse.json({ error: res.error || 'Falha ao enviar mensagem' }, { status: 400 });
    }

    return NextResponse.json({ success: true, messageId: res.messageId });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro ao enviar mensagem de teste' }, { status: 500 });
  }
}
