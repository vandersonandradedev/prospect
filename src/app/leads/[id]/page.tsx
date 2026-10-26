'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  Phone,
  Globe,
  Mail,
  MapPin,
  Flame,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Send,
  MessageSquare,
  ShieldAlert,
  Clock,
  CheckSquare,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { BusinessLead, PipelineStage, PriorityLevel } from '@/types';

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.id as string;

  const [lead, setLead] = useState<BusinessLead | null>(null);
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  const [analyzingAi, setAnalyzingAi] = useState(false);

  // Modal / Formulário de Atividade
  const [activityType, setActivityType] = useState<'PHONE_CALL' | 'WHATSAPP_SENT' | 'NOTE'>('WHATSAPP_SENT');
  const [activityTitle, setActivityTitle] = useState('');
  const [activityDesc, setActivityDesc] = useState('');
  const [submittingAct, setSubmittingAct] = useState(false);

  const fetchLead = async () => {
    try {
      const res = await fetch(`/api/leads/${leadId}`);
      const data = await res.json();
      if (data.success) {
        setLead(data.lead);
      }
    } catch (e) {
      console.error('Erro ao carregar lead:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLead();
  }, [leadId]);

  const handleStageChange = async (newStage: PipelineStage) => {
    if (!lead) return;
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipelineStage: newStage }),
      });
      const data = await res.json();
      if (data.success) {
        setLead(data.lead);
      }
    } catch (e) {
      console.error('Falha ao mudar estágio:', e);
    }
  };

  const handleEnrich = async () => {
    if (!lead) return;
    setEnriching(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/enrich`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setLead(data.lead);
      } else {
        alert(data.error || 'Falha no enriquecimento');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setEnriching(false);
    }
  };

  const handleAiAnalysis = async () => {
    if (!lead) return;
    setAnalyzingAi(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/ai-analysis`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setLead(data.lead);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzingAi(false);
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !activityTitle) return;
    setSubmittingAct(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activityType,
          title: activityTitle,
          description: activityDesc,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setLead(data.lead);
        setActivityTitle('');
        setActivityDesc('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingAct(false);
    }
  };

  const handleSuppress = async () => {
    if (!lead) return;
    const identifier = lead.phone || lead.website || lead.name;
    if (!confirm(`Deseja adicionar '${identifier}' à Lista de Supressão LGPD? O lead será movido para NÃO CONTATAR e bloqueado.`)) {
      return;
    }

    try {
      await fetch('/api/suppression', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier,
          type: lead.phone ? 'PHONE' : lead.website ? 'DOMAIN' : 'EMAIL',
          reason: 'Solicitação de Não Contato (Opt-out)',
        }),
      });
      fetchLead();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-sm text-slate-500">Carregando detalhes do lead...</div>;
  }

  if (!lead) {
    return (
      <div className="p-12 text-center space-y-3">
        <div className="text-base font-bold text-slate-800">Lead não encontrado</div>
        <Link href="/leads" className="text-xs text-sky-600 hover:underline">
          Voltar para a lista
        </Link>
      </div>
    );
  }

  // Preparar link de WhatsApp (DDI +55)
  const phoneDigits = lead.phone ? lead.phone.replace(/\D/g, '') : '';
  const waUrl = phoneDigits
    ? `https://wa.me/55${phoneDigits}?text=${encodeURIComponent(
        lead.aiAnalysis?.pitch || `Olá! Sou da Vision Solutions e gostaria de falar com o responsável da ${lead.name}.`
      )}`
    : null;

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/leads"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar para Base de Leads
        </Link>

        {/* Supressão LGPD */}
        <button
          onClick={handleSuppress}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
          Lista de Supressão (Opt-out LGPD)
        </button>
      </div>

      {/* Header Principal da Empresa */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{lead.name}</h1>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-sky-50 text-sky-700 border border-sky-100">
                {lead.productName}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
              <span>{lead.category}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {lead.city} - {lead.state}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Score */}
            <div className="text-right">
              <div className="text-xs text-slate-500 font-medium">Pontuação Comercial</div>
              <div className="flex items-center justify-end gap-1 text-2xl font-black text-emerald-600">
                <Flame className="w-5 h-5 text-emerald-500" />
                {lead.score} / 100
              </div>
            </div>

            {/* Mudança de Estágio */}
            <div className="border-l border-slate-200 pl-4">
              <div className="text-xs text-slate-500 font-medium mb-1">Estágio no Funil</div>
              <select
                value={lead.pipelineStage}
                onChange={(e) => handleStageChange(e.target.value as PipelineStage)}
                className="text-xs font-bold px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="NEW">1. Novo Lead</option>
                <option value="VALIDATING">2. Dados em Validação</option>
                <option value="QUALIFIED">3. Qualificado</option>
                <option value="READY_TO_CONTACT">4. Pronto para Contato</option>
                <option value="CONTACTED">5. Contato Realizado</option>
                <option value="RESPONDED">6. Respondeu</option>
                <option value="DEMO_SCHEDULED">7. Demonstração Agendada</option>
                <option value="PROPOSAL_SENT">8. Proposta Enviada</option>
                <option value="NEGOTIATING">9. Em Negociação</option>
                <option value="CONVERTED">10. Convertido</option>
                <option value="LOST">11. Perdido</option>
                <option value="DO_NOT_CONTACT">12. Não Contatar</option>
              </select>
            </div>
          </div>
        </div>

        {/* Proveniência & Auditoria dos Dados */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block">Fonte Rastreada:</span>
            <span className="font-mono font-medium text-slate-700">{lead.source}</span>
          </div>
          <div>
            <span className="text-slate-400 block">Data da Primeira Coleta:</span>
            <span className="font-medium text-slate-700">
              {new Date(lead.firstCollectedAt).toLocaleString('pt-BR')}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Última Verificação:</span>
            <span className="font-medium text-slate-700">
              {new Date(lead.lastVerifiedAt).toLocaleString('pt-BR')}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Status de Verificação:</span>
            <span className="font-semibold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              {lead.verificationStatus}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1 & 2: Dados Observados, Enriquecimento e IA */}
        <div className="lg:col-span-2 space-y-6">
          {/* Canais Comerciais e Ações Rápidas de Contato */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Canais Comerciais Públicos</span>
              {lead.website && (
                <button
                  onClick={handleEnrich}
                  disabled={enriching}
                  className="flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-800 font-semibold disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${enriching ? 'animate-spin' : ''}`} />
                  {enriching ? 'Verificando Site...' : 'Enriquecer Dados do Site'}
                </button>
              )}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mb-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  Telefone Comercial
                </div>
                {lead.phone ? (
                  <div className="font-mono font-bold text-slate-800">{lead.phone}</div>
                ) : (
                  <div className="text-slate-400 italic text-xs">Não publicado na fonte</div>
                )}
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mb-1">
                  <Globe className="w-3.5 h-3.5 text-sky-600" />
                  Site Oficial
                </div>
                {lead.website ? (
                  <a
                    href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-sky-600 hover:underline truncate block"
                  >
                    {lead.website}
                  </a>
                ) : (
                  <div className="text-slate-400 italic text-xs">Sem site publicado</div>
                )}
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mb-1">
                  <Mail className="w-3.5 h-3.5 text-indigo-600" />
                  E-mail Comercial
                </div>
                {lead.email ? (
                  <div className="font-mono text-slate-800 truncate">{lead.email}</div>
                ) : (
                  <div className="text-slate-400 italic text-xs">Não identificado</div>
                )}
              </div>
            </div>

            {/* Botões de Ação de Primeiro Contato */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                >
                  <MessageSquare className="w-4 h-4" />
                  Abrir WhatsApp Web Oficial (+55)
                </a>
              )}

              {lead.phone && (
                <a
                  href={`tel:${lead.phone.replace(/\D/g, '')}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                >
                  <Phone className="w-4 h-4" />
                  Ligar para o Telefone
                </a>
              )}
            </div>
          </div>

          {/* Fatos Observados vs Hipóteses Comerciais */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Diferenciação Estrita: Fatos Observados vs. Hipóteses
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Fatos Observados */}
              <div className="p-4 bg-emerald-50/50 rounded-lg border border-emerald-100 space-y-2">
                <div className="font-bold text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Fatos Observados Comprovados
                </div>
                <ul className="space-y-1.5 text-slate-700">
                  {lead.evidences.map((ev) => (
                    <li key={ev.id} className="flex items-start gap-1.5">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>
                        <strong>[{ev.category}]</strong> {ev.description}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Fatores de Pontuação */}
              <div className="p-4 bg-sky-50/50 rounded-lg border border-sky-100 space-y-2">
                <div className="font-bold text-sky-800 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-sky-600" />
                  Critérios da Pontuação ({lead.score} pts)
                </div>
                <ul className="space-y-1.5 text-slate-700">
                  {lead.scoreFactors.map((factor, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-sky-500 font-bold">•</span>
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Inteligência Artificial & Roteiro Comercial */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Assistente de IA Comercial
              </h2>
              <button
                onClick={handleAiAnalysis}
                disabled={analyzingAi}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
              >
                {analyzingAi ? 'Analisando Evidências...' : lead.aiAnalysis ? 'Regerar Análise' : 'Gerar Roteiro com IA'}
              </button>
            </div>

            {lead.aiAnalysis ? (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-indigo-50/60 rounded-lg border border-indigo-100 text-indigo-950">
                  <div className="font-bold mb-1">Diagnóstico & Resumo</div>
                  <p>{lead.aiAnalysis.summary}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-800 flex items-center justify-between">
                    <span>Roteiro Sugerido de Abordagem (Editável)</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(lead.aiAnalysis!.pitch);
                        alert('Roteiro copiado para a área de transferência!');
                      }}
                      className="text-sky-600 hover:underline text-[11px]"
                    >
                      Copiar Mensagem
                    </button>
                  </div>
                  <p className="text-slate-700 italic bg-white p-3 rounded border border-slate-100 font-sans leading-relaxed">
                    &ldquo;{lead.aiAnalysis.pitch}&rdquo;
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                    <div className="font-bold text-slate-800">Perguntas de Investigação</div>
                    <ul className="space-y-1 text-slate-600">
                      {lead.aiAnalysis.diagnosticQuestions.map((q, i) => (
                        <li key={i}>• {q}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                    <div className="font-bold text-slate-800">Hipóteses Não Confirmadas</div>
                    <ul className="space-y-1 text-amber-700">
                      {lead.aiAnalysis.unconfirmedHypotheses.map((h, i) => (
                        <li key={i}>• {h}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-3 text-center">
                Clique no botão acima para analisar os dados verificados e gerar roteiro personalizado de abordagem para o {lead.productName}.
              </p>
            )}
          </div>
        </div>

        {/* Coluna 3: Histórico de Atividades e Registro de Contato */}
        <div className="space-y-6">
          {/* Registrar Interação Comercial */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Registrar Contato com o Lead
            </h2>

            <form onSubmit={handleAddActivity} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Tipo de Interação</label>
                <select
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value as any)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="WHATSAPP_SENT">Mensagem no WhatsApp</option>
                  <option value="PHONE_CALL">Ligação Telefônica</option>
                  <option value="NOTE">Anotação Comercial</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Título Resumido</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Primeiro contato realizado com o gerente..."
                  value={activityTitle}
                  onChange={(e) => setActivityTitle(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Detalhes e Resposta Recebida</label>
                <textarea
                  rows={3}
                  placeholder="Registre o feedback real do cliente, objeções ou agendamento de retorno..."
                  value={activityDesc}
                  onChange={(e) => setActivityDesc(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg"
                />
              </div>

              <button
                type="submit"
                disabled={submittingAct}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
              >
                {submittingAct ? 'Salvando...' : 'Salvar Atividade no Histórico'}
              </button>
            </form>
          </div>

          {/* Histórico Comercial do Lead */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-500" />
              Linha do Tempo de Atividades
            </h2>

            <div className="space-y-3 max-h-96 overflow-y-auto text-xs pr-1">
              {lead.activities.map((act) => (
                <div key={act.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-700">{act.operatorName || 'Operador'}</span>
                    <span>{new Date(act.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="font-bold text-slate-800">{act.title}</div>
                  {act.description && <p className="text-slate-600">{act.description}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
