import { NextRequest, NextResponse } from 'next/server';
import { CollectionJob, LeadSource } from '@/types';
import { getProvider } from '@/lib/providers';
import { deduplicateAndMerge } from '@/lib/deduplication';
import { addAuditLog, getLeads, getProductById, saveJob, saveLead, updateJob } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      productId = 'prod-mesago',
      category,
      city,
      state,
      maxResults = 20,
      provider: requestedProvider = 'OPENSTREETMAP_OVERPASS',
    } = body;

    if (!category || !city || !state) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios ausentes: category, city e state são requeridos.' },
        { status: 400 }
      );
    }

    const product = getProductById(productId);
    const targetProduct = product?.name || 'MesaGo';

    // 1. Criar Job de Coleta
    const job: CollectionJob = {
      id: `job-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      provider: requestedProvider as LeadSource,
      searchQuery: `${category} em ${city}, ${state}`,
      targetProduct,
      targetCategory: category,
      targetCity: city,
      targetState: state,
      maxResults: Number(maxResults),
      status: 'RUNNING',
      itemsFound: 0,
      itemsImported: 0,
      startedAt: new Date().toISOString(),
    };

    saveJob(job);
    addAuditLog('COLLECTION_JOB_STARTED', 'JOB', `Iniciado job ${job.id} para ${category} em ${city}-${state}`, job.id);

    // 2. Executar Coleta via Provedor com Fallback Automático Resiliente
    let rawLeads: any[] = [];
    let effectiveProvider = requestedProvider as LeadSource;
    let fallbackNotice: string | null = null;

    try {
      const providerInstance = getProvider(effectiveProvider);
      rawLeads = await providerInstance.searchBusinesses({
        category,
        city,
        state,
        maxResults: Number(maxResults),
      });
    } catch (collectErr: any) {
      // Se falhou no scraper local ou Google Places, tenta automaticamente o OpenStreetMap
      if (effectiveProvider !== 'OPENSTREETMAP_OVERPASS') {
        console.warn(
          `Provedor ${effectiveProvider} offline (${collectErr?.message}). Alternando automaticamente para OpenStreetMap.`
        );
        effectiveProvider = 'OPENSTREETMAP_OVERPASS';
        fallbackNotice = `Provedor ${requestedProvider} offline. Busca realizada via OpenStreetMap.`;

        try {
          const fallbackProvider = getProvider('OPENSTREETMAP_OVERPASS');
          rawLeads = await fallbackProvider.searchBusinesses({
            category,
            city,
            state,
            maxResults: Number(maxResults),
          });
        } catch {
          rawLeads = [];
        }
      } else {
        rawLeads = [];
      }
    }

    // 3. Deduplicar e Ingerir
    const currentLeads = getLeads();
    const { mergedLeads, newCount, updatedCount } = deduplicateAndMerge(
      currentLeads,
      rawLeads,
      productId
    );

    // Salvar novos e atualizados
    for (const lead of mergedLeads) {
      saveLead(lead);
    }

    const updatedJob = updateJob(job.id, {
      status: rawLeads.length > 0 ? 'COMPLETED' : 'COMPLETED_WITH_WARNINGS',
      provider: effectiveProvider,
      itemsFound: rawLeads.length,
      itemsImported: newCount,
      warningMessage:
        fallbackNotice ||
        (rawLeads.length === 0
          ? 'Nenhum estabelecimento comercial retornado pela fonte para esta região.'
          : null),
      finishedAt: new Date().toISOString(),
    });

    addAuditLog(
      'COLLECTION_JOB_COMPLETED',
      'JOB',
      `Job ${job.id} concluído. Encontrados: ${rawLeads.length}, Novos leads importados: ${newCount}, Atualizados: ${updatedCount}`,
      job.id
    );

    return NextResponse.json({
      success: true,
      job: updatedJob,
      itemsFound: rawLeads.length,
      newCount,
      updatedCount,
    });
  } catch (error: any) {
    console.error('Erro na rota de busca:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro interno no servidor ao executar busca.' },
      { status: 500 }
    );
  }
}
