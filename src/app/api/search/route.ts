import { NextRequest, NextResponse } from 'next/server';
import { CollectionJob, LeadSource, LeadActivity, LeadStageHistory } from '@/types';
import { getProvider } from '@/lib/providers';
import { deduplicateAndMerge } from '@/lib/deduplication';
import { addAuditLog, getLeads, getProductById, saveJob, saveLead, updateJob, isSuppressed } from '@/lib/db';
import { enrichBusinessWebsite } from '@/lib/enrichment';
import { evolutionClient } from '@/lib/evolution/client';
import { generateSdrOutreachMessage } from '@/lib/ai/sdr';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      productId = 'prod-mesago',
      category,
      city,
      state,
      maxResults = 20,
      provider: requestedProvider = 'GOOGLE_PLACES_API',
      autoContact = true,
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

    // 2. Executar Coleta via Provedor com Fallback Inteligente entre Fontes
    let rawLeads: any[] = [];
    let effectiveProvider = requestedProvider as LeadSource;
    let fallbackNotice: string | null = null;
    const hasGoogleKey = !!(process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY);

    try {
      const providerInstance = getProvider(effectiveProvider);
      rawLeads = await providerInstance.searchBusinesses({
        category,
        city,
        state,
        maxResults: Number(maxResults),
      });
    } catch (collectErr: any) {
      console.warn(`Provedor ${effectiveProvider} falhou (${collectErr?.message}).`);
    }

    // Se o provedor principal retornou 0 resultados ou falhou, tenta automaticamente fontes alternativas
    if (rawLeads.length === 0) {
      if (effectiveProvider !== 'GOOGLE_PLACES_API' && hasGoogleKey) {
        try {
          console.log(`Fonte ${effectiveProvider} sem resultados. Tentando Google Places API oficial...`);
          const googleProvider = getProvider('GOOGLE_PLACES_API');
          rawLeads = await googleProvider.searchBusinesses({
            category,
            city,
            state,
            maxResults: Number(maxResults),
          });
          if (rawLeads.length > 0) {
            effectiveProvider = 'GOOGLE_PLACES_API';
            fallbackNotice = 'Busca complementada via Google Places API oficial com dados atualizados.';
          }
        } catch (gErr: any) {
          console.warn('Fallback Google Places falhou:', gErr);
        }
      }

      if (rawLeads.length === 0 && effectiveProvider !== 'OPENSTREETMAP_OVERPASS') {
        try {
          console.log(`Tentando OpenStreetMap para ${city}-${state}...`);
          const osmProvider = getProvider('OPENSTREETMAP_OVERPASS');
          rawLeads = await osmProvider.searchBusinesses({
            category,
            city,
            state,
            maxResults: Number(maxResults),
          });
          if (rawLeads.length > 0) {
            effectiveProvider = 'OPENSTREETMAP_OVERPASS';
            fallbackNotice = `Provedor ${requestedProvider} sem dados. Busca realizada via OpenStreetMap.`;
          }
        } catch (osmErr: any) {
          console.warn('Fallback OpenStreetMap falhou:', osmErr);
        }
      }
    }

    // 3. Enriquecimento Rápido Automático de Contatos para Leads com Site e sem Telefone
    if (rawLeads.length > 0) {
      await Promise.allSettled(
        rawLeads.slice(0, 10).map(async (lead) => {
          if (lead.website && !lead.phone) {
            try {
              const enrich = await enrichBusinessWebsite(lead.website);
              if (enrich.extractedPhone) {
                lead.phone = enrich.extractedPhone;
              }
              if (enrich.extractedEmail && !lead.email) {
                lead.email = enrich.extractedEmail;
              }
            } catch {
              // Silencioso em caso de timeout
            }
          }
        })
      );
    }

    // 4. Deduplicar e Ingerir
    const currentLeads = getLeads();
    const { mergedLeads, createdLeads, newCount, updatedCount } = deduplicateAndMerge(
      currentLeads,
      rawLeads,
      productId
    );

    // Salvar novos e atualizados
    for (const lead of mergedLeads) {
      saveLead(lead);
    }

    // 5. Automação SDR: Disparo Automático Imediato para MesaGo e TorqueOS
    let autoContactedCount = 0;
    const isTargetProduct = productId === 'prod-mesago' || productId === 'prod-torqueos';

    if (autoContact && isTargetProduct && newCount > 0) {
      try {
        const evoStatus = await evolutionClient.getInstanceStatus();
        if (evoStatus.state === 'open') {
          // Filtra APENAS os leads recém-criados NESTA busca que pertencem estritamente ao produto alvo
          const leadsToContact = (createdLeads || []).filter(
            (l) =>
              l.productId === productId &&
              l.phone &&
              l.pipelineStage === 'NEW' &&
              !isSuppressed(l.phone)
          );

          for (const lead of leadsToContact) {
            try {
              const outreachText = generateSdrOutreachMessage(lead);
              const sendResult = await evolutionClient.sendTextMessage({
                phone: lead.phone!,
                text: outreachText,
              });

              if (sendResult.success) {
                autoContactedCount++;
                const now = new Date().toISOString();

                const outActivity: LeadActivity = {
                  id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                  leadId: lead.id,
                  type: 'WHATSAPP_SENT',
                  title: 'Primeiro Contato SDR Enviado (Automático)',
                  description: outreachText,
                  createdAt: now,
                  operatorName: 'Vision SDR IA',
                };

                const stageChange: LeadStageHistory = {
                  id: `sh-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                  fromStage: 'NEW',
                  toStage: 'CONTACTED',
                  reason: 'Disparo inicial de prospecção via WhatsApp',
                  changedAt: now,
                };

                lead.pipelineStage = 'CONTACTED';
                lead.automationStatus = 'WAITING_REPLY';
                lead.automationPaused = false;
                lead.lastOutboundMessageAt = now;
                lead.activities = [outActivity, ...lead.activities];
                lead.stageHistory = [stageChange, ...lead.stageHistory];

                saveLead(lead);
              }
            } catch (leadSendErr) {
              console.warn(`Falha ao disparar mensagem para ${lead.name} (${lead.phone}):`, leadSendErr);
            }
          }

          if (autoContactedCount > 0) {
            addAuditLog(
              'AUTO_OUTREACH_EXECUTED',
              'JOB',
              `${autoContactedCount} mensagens de WhatsApp disparadas automaticamente para leads de ${category} em ${city}-${state}`,
              job.id
            );
          }
        } else {
          console.log('Evolution API não está conectada ao WhatsApp no momento. Disparo automático postergado.');
        }
      } catch (evoErr) {
        console.warn('Erro ao verificar status da Evolution API para disparo automático:', evoErr);
      }
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
      autoContactedCount,
    });
  } catch (error: any) {
    console.error('Erro na rota de busca:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro interno no servidor ao executar busca.' },
      { status: 500 }
    );
  }
}
