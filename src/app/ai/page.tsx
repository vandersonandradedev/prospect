'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Building2,
  Phone,
  Globe,
  Flame,
  CheckCircle2,
  ArrowRight,
  MessageSquare,
  Copy,
  RefreshCw,
} from 'lucide-react';
import { BusinessLead } from '@/types';

export default function AiAssistantPage() {
  const [leads, setLeads] = useState<BusinessLead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetch('/api/leads')
      .then((res) => res.json())
      .then((data) => {
        if (data.leads && data.leads.length > 0) {
          setLeads(data.leads);
          setSelectedLeadId(data.leads[0].id);
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const currentLead = leads.find((l) => l.id === selectedLeadId) || leads[0];

  const handleGenerateAi = async () => {
    if (!currentLead) return;
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/leads/${currentLead.id}/ai-analysis`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setLeads((prev) => prev.map((l) => (l.id === currentLead.id ? data.lead : l)));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-indigo-600" />
          Assistente de IA Comercial — Vision Solutions
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Síntese de dados reais, diferenciação de fatos e hipóteses, e roteiros de abordagem consultiva.
        </p>
      </div>

      {leads.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center max-w-md mx-auto shadow-sm my-8">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h2 className="font-bold text-slate-900">Nenhum lead real disponível</h2>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            A IA só analisa empresas reais e verificáveis. Realize uma coleta na página de busca para começar.
          </p>
          <Link
            href="/busca"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700"
          >
            Fazer Pesquisa
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Seletor de Leads */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Selecione o Lead para Análise
            </h2>

            <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
              {leads.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setSelectedLeadId(l.id)}
                  className={`w-full text-left p-3 rounded-lg border text-xs transition-all ${
                    selectedLeadId === l.id
                      ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-600/20'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-slate-900 truncate">{l.name}</div>
                  <div className="text-slate-500 mt-0.5 truncate">{l.category} • {l.city}</div>
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100 text-[11px]">
                    <span className="font-medium text-indigo-700">{l.productName}</span>
                    <span className="font-bold text-emerald-600">{l.score} pts</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Painel de Análise da IA */}
          <div className="lg:col-span-2 space-y-6">
            {currentLead && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{currentLead.name}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {currentLead.category} • {currentLead.city} - {currentLead.state}
                    </p>
                  </div>

                  <button
                    onClick={handleGenerateAi}
                    disabled={analyzing}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {analyzing ? 'Gerando Análise...' : currentLead.aiAnalysis ? 'Regerar Diagnóstico' : 'Gerar Análise com IA'}
                  </button>
                </div>

                {currentLead.aiAnalysis ? (
                  <div className="space-y-4 text-xs">
                    {/* Diagnóstico */}
                    <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-1">
                      <div className="font-bold text-indigo-900">Resumo da Oportunidade Comercial</div>
                      <p className="text-indigo-950 leading-relaxed">{currentLead.aiAnalysis.summary}</p>
                    </div>

                    {/* Fatos vs Hipóteses */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-2">
                        <div className="font-bold text-emerald-800 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Fatos Observados (Comprovados)
                        </div>
                        <ul className="space-y-1 text-slate-700">
                          {currentLead.aiAnalysis.observedFacts.map((f, i) => (
                            <li key={i}>• {f}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100 space-y-2">
                        <div className="font-bold text-amber-800 flex items-center gap-1.5">
                          <Flame className="w-4 h-4 text-amber-600" />
                          Hipóteses Não Confirmadas
                        </div>
                        <ul className="space-y-1 text-slate-700">
                          {currentLead.aiAnalysis.unconfirmedHypotheses.map((h, i) => (
                            <li key={i}>• {h}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Roteiro */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">Roteiro Consultivo de Abordagem</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(currentLead.aiAnalysis!.pitch);
                            alert('Mensagem copiada para a área de transferência!');
                          }}
                          className="text-xs font-semibold text-sky-600 hover:underline flex items-center gap-1"
                        >
                          <Copy className="w-3.5 h-3.5" /> Copiar Mensagem
                        </button>
                      </div>
                      <p className="p-3 bg-white border border-slate-100 rounded-lg text-slate-800 italic leading-relaxed">
                        &ldquo;{currentLead.aiAnalysis.pitch}&rdquo;
                      </p>
                    </div>

                    {/* Perguntas Diagnósticas */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <div className="font-bold text-slate-900">Perguntas Investigativas Recomendadas</div>
                      <ul className="space-y-1 text-slate-700">
                        {currentLead.aiAnalysis.diagnosticQuestions.map((q, i) => (
                          <li key={i}>• {q}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Próxima Ação */}
                    <div className="p-3 bg-sky-50 border border-sky-100 rounded-lg flex items-center justify-between text-sky-900">
                      <div>
                        <span className="font-bold">Próxima Ação Sugerida: </span>
                        <span>{currentLead.aiAnalysis.nextAction}</span>
                      </div>
                      <Link
                        href={`/leads/${currentLead.id}`}
                        className="text-xs font-bold text-sky-700 hover:underline flex items-center gap-1"
                      >
                        Abrir Lead <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400 space-y-2">
                    <Sparkles className="w-8 h-8 text-slate-300 mx-auto" />
                    <div>Nenhuma análise gerada para este lead ainda.</div>
                    <button
                      onClick={handleGenerateAi}
                      className="text-xs font-bold text-indigo-600 hover:underline"
                    >
                      Clique para analisar agora com IA
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
