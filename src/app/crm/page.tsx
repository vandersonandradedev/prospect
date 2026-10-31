'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Kanban,
  Building2,
  Phone,
  Flame,
  ChevronRight,
  Filter,
  RefreshCw,
  Plus,
  UserCheck,
  Bot,
  Zap,
  MessageSquare,
  Radio,
} from 'lucide-react';
import { BusinessLead, PipelineStage } from '@/types';
import { useRealtimeLeads } from '@/hooks/useRealtime';

const STAGES: Array<{ id: PipelineStage; label: string; headerColor: string; isHumanStage?: boolean }> = [
  { id: 'NEW', label: '1. Novos Leads', headerColor: 'border-slate-400 text-slate-700' },
  { id: 'VALIDATING', label: '2. Em Validação', headerColor: 'border-blue-400 text-blue-700' },
  { id: 'QUALIFIED', label: '3. Qualificados', headerColor: 'border-emerald-400 text-emerald-700' },
  { id: 'READY_TO_CONTACT', label: '4. Prontos Contato', headerColor: 'border-indigo-400 text-indigo-700' },
  { id: 'CONTACTED', label: '5. Contatados (SDR IA)', headerColor: 'border-amber-400 text-amber-700' },
  { id: 'RESPONDED', label: '6. Responderam (SDR IA)', headerColor: 'border-cyan-400 text-cyan-700' },
  { id: 'DEMO_SCHEDULED', label: '7. Demo Agendada (Humano)', headerColor: 'border-purple-600 bg-purple-50 text-purple-900', isHumanStage: true },
  { id: 'PROPOSAL_SENT', label: '8. Proposta Enviada', headerColor: 'border-orange-400 text-orange-700' },
  { id: 'NEGOTIATING', label: '9. Em Negociação', headerColor: 'border-yellow-500 text-yellow-800' },
  { id: 'CONVERTED', label: '10. Convertidos', headerColor: 'border-emerald-600 text-emerald-800 font-bold' },
  { id: 'LOST', label: '11. Perdidos', headerColor: 'border-rose-400 text-rose-700' },
  { id: 'DO_NOT_CONTACT', label: '12. Não Contatar (LGPD)', headerColor: 'border-red-600 text-red-800' },
];

export default function CrmKanbanPage() {
  const [selectedProduct, setSelectedProduct] = useState('');
  const [dispatching, setDispatching] = useState(false);
  const [dispatchFeedback, setDispatchFeedback] = useState<string | null>(null);

  const { leads, loading, isLive, refresh, moveStage } = useRealtimeLeads({
    productId: selectedProduct,
  });

  const currentProductName =
    selectedProduct === 'prod-mesago'
      ? 'MesaGo'
      : selectedProduct === 'prod-torqueos'
      ? 'TorqueOS'
      : '';

  const pendingNewLeadsCount = leads.filter(
    (l) =>
      (!selectedProduct || l.productId === selectedProduct) &&
      l.pipelineStage === 'NEW' &&
      Boolean(l.phone)
  ).length;

  const handleTriggerOutreach = async () => {
    setDispatching(true);
    setDispatchFeedback(null);
    try {
      const res = await fetch('/api/leads/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: selectedProduct || undefined }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDispatchFeedback(`✅ ${data.message}`);
        refresh();
      } else {
        setDispatchFeedback(`❌ ${data.error || 'Erro ao disparar'}`);
      }
    } catch (err: any) {
      setDispatchFeedback(`❌ ${err?.message}`);
    } finally {
      setDispatching(false);
      setTimeout(() => setDispatchFeedback(null), 8000);
    }
  };

  const handleMoveStage = (leadId: string, newStage: PipelineStage) => {
    moveStage(leadId, newStage);
  };

  return (
    <div className="p-8 space-y-6 flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Kanban className="w-6 h-6 text-sky-600" />
            CRM Pipeline — Funil Comercial B2B
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Acompanhamento das 12 etapas do processo comercial até a conversão em cliente pagante.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Kanban Ao Vivo</span>
          </div>

          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg bg-white text-slate-700"
          >
            <option value="">Todas as Linhas de Produto</option>
            <option value="prod-mesago">MesaGo</option>
            <option value="prod-torqueos">TorqueOS</option>
            <option value="prod-fiscal">Software Fiscal</option>
          </select>

          {pendingNewLeadsCount > 0 && (
            <button
              onClick={handleTriggerOutreach}
              disabled={dispatching}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition-colors disabled:opacity-50"
              title="Disparar primeiro contato via WhatsApp para leads pendentes"
            >
              <Zap className={`w-3.5 h-3.5 fill-white ${dispatching ? 'animate-bounce' : ''}`} />
              <span>{dispatching ? 'Disparando...' : `Disparar SDR ${currentProductName ? currentProductName + ' ' : ''}(${pendingNewLeadsCount})`}</span>
            </button>
          )}

          <button
            onClick={refresh}
            className="p-1.5 text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50"
            title="Atualizar Kanban"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {dispatchFeedback && (
        <div className="text-xs px-3.5 py-2 rounded-lg bg-slate-900 text-white font-medium shadow-sm flex items-center justify-between">
          <span>{dispatchFeedback}</span>
          <button
            onClick={() => setDispatchFeedback(null)}
            className="text-slate-400 hover:text-white text-xs ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Board Kanban Horizontal com Scroll */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
        <div className="flex gap-4 h-full min-w-max">
          {STAGES.map((stg) => {
            const stageLeads = leads.filter((l) => l.pipelineStage === stg.id);

            return (
              <div
                key={stg.id}
                className="w-72 bg-slate-100/80 border border-slate-200/80 rounded-xl flex flex-col h-full shadow-sm"
              >
                {/* Stage Header */}
                <div className={`p-3 border-b-2 bg-white rounded-t-xl flex flex-col gap-1 ${stg.headerColor}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      {stg.isHumanStage && <UserCheck className="w-3.5 h-3.5 text-purple-600" />}
                      {stg.label}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                      {loading ? '…' : stageLeads.length}
                    </span>
                  </div>
                  {stg.isHumanStage && (
                    <div className="text-[10px] text-purple-700 font-semibold bg-purple-100/70 px-2 py-0.5 rounded">
                      👤 Bastão Humano (Vanderson) • Automação Pausada
                    </div>
                  )}
                </div>

                {/* Stage Cards */}
                <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                  {loading ? (
                    <div className="space-y-2 p-1 animate-pulse">
                      <div className="h-20 bg-white/70 rounded-lg border border-slate-200" />
                      <div className="h-20 bg-white/50 rounded-lg border border-slate-200" />
                    </div>
                  ) : stageLeads.length === 0 ? (
                    <div className="text-center py-8 text-[11px] text-slate-400">
                      0 Nenhum lead nesta etapa
                    </div>
                  ) : (
                    stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className={`bg-white p-3 rounded-lg border shadow-sm hover:shadow transition-shadow space-y-2 ${
                          stg.isHumanStage ? 'border-purple-300 ring-1 ring-purple-100' : 'border-slate-200/90'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <Link
                            href={`/leads/${lead.id}`}
                            className="font-bold text-xs text-slate-900 hover:text-sky-600 line-clamp-1"
                          >
                            {lead.name}
                          </Link>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                            {lead.score}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500 line-clamp-1">{lead.category}</div>

                        {/* Badges de Automação */}
                        <div className="flex flex-wrap gap-1">
                          {lead.automationPaused ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800">
                              <UserCheck className="w-2.5 h-2.5" /> Atendimento Humano
                            </span>
                          ) : lead.pipelineStage === 'CONTACTED' ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-50 text-amber-700">
                              <Bot className="w-2.5 h-2.5" /> SDR Aguardando
                            </span>
                          ) : lead.pipelineStage === 'RESPONDED' ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-cyan-50 text-cyan-700">
                              <MessageSquare className="w-2.5 h-2.5" /> SDR Engajado
                            </span>
                          ) : null}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-50">
                          <span>{lead.city}</span>
                          <span className="font-medium text-slate-600">{lead.productName}</span>
                        </div>

                        {/* Mover Estágio Dropdown Rápido */}
                        <div className="pt-1">
                          <select
                            value={lead.pipelineStage}
                            onChange={(e) => handleMoveStage(lead.id, e.target.value as PipelineStage)}
                            className="w-full text-[11px] py-1 px-1.5 bg-slate-50 border border-slate-200 rounded text-slate-700"
                          >
                            {STAGES.map((s) => (
                              <option key={s.id} value={s.id}>
                                Mover: {s.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
