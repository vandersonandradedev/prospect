import { NextRequest, NextResponse } from 'next/server';
import { getSuppressionList, addSuppressionEntry } from '@/lib/db';

export async function GET() {
  try {
    const list = getSuppressionList();
    return NextResponse.json({ success: true, count: list.length, suppressionList: list });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identifier, type = 'PHONE', reason = 'Solicitação de Opt-out do Titular' } = body;

    if (!identifier) {
      return NextResponse.json({ error: 'Identificador (telefone, email ou domínio) é obrigatório.' }, { status: 400 });
    }

    const entry = addSuppressionEntry(identifier, type, reason);
    return NextResponse.json({ success: true, entry }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
