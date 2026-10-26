import { NextRequest, NextResponse } from 'next/server';
import { getLeads, addAuditLog } from '@/lib/db';
import { PipelineStage } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId') || undefined;
    const stage = (searchParams.get('stage') as PipelineStage) || undefined;
    const city = searchParams.get('city') || undefined;
    const state = searchParams.get('state') || undefined;

    const leads = getLeads({ productId, stage, city, state });

    const headers = [
      'ID',
      'Nome Comercial',
      'Produto',
      'Categoria',
      'Cidade',
      'Estado',
      'Endereço',
      'Telefone',
      'Website',
      'E-mail',
      'Estágio Funil',
      'Prioridade',
      'Score',
      'Fonte',
      'Primeira Coleta',
      'Ultima Verificacao',
    ];

    const escapeCsv = (val?: string | number | null) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = leads.map((l) => [
      escapeCsv(l.id),
      escapeCsv(l.name),
      escapeCsv(l.productName),
      escapeCsv(l.category),
      escapeCsv(l.city),
      escapeCsv(l.state),
      escapeCsv(l.address),
      escapeCsv(l.phone),
      escapeCsv(l.website),
      escapeCsv(l.email),
      escapeCsv(l.pipelineStage),
      escapeCsv(l.priority),
      escapeCsv(l.score),
      escapeCsv(l.source),
      escapeCsv(l.firstCollectedAt),
      escapeCsv(l.lastVerifiedAt),
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    addAuditLog('LEADS_EXPORTED_CSV', 'EXPORT', `Exportados ${leads.length} leads para CSV.`);

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="leads_vision_solutions_${Date.now()}.csv"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
