'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { BusinessLead, PipelineStage } from '@/types';

const STAGES: Array<{ id: PipelineStage; label: string; headerColor: string }> = [
  { id: 'NEW', label: '1. Novos Leads', headerColor: 'border-slate-400 text-slate-700' },
  { id: 'VALIDATING', label: '2. Em Validação', headerColor: 'border-blue-400 text-blue-700' },
  { id: 'QUALIFIED', label: '3. Qualificados', headerColor: 'border-emerald-400 text-emerald-700' },
  { id: 'READY_TO_CONTACT', label: '4. Prontos Contato', headerColor: 'border-indigo-400 text-indigo-700' },
  { id: 'CONTACTED', label: '5. Contatados', headerColor: 'border-amber-400 text-amber-700' },
  { id: 'RESPONDED', label: '6. Responderam', headerColor: 'border-cyan-400 text-cyan-700' },
  { id: 'DEMO_SCHEDULED', label: '7. Demo Agendada', headerColor: 'border-purple-400 text-purple-700' },
  { id: 'PROPOSAL_SENT', label: '8. Proposta Enviada', headerColor: 'border-orange-400 text-orange-700' },
  { id: 'NEGOTIATING', label: '9. Em Negociação', headerColor: 'border-yellow-500 text-yellow-800' },
  { id: 'CONVERTED', label: '10. Convertidos', headerColor: 'border-emerald-600 text-emerald-800 font-bold' },
  { id: 'LOST', label: '11. Perdidos', headerColor: 'border-rose-400 text-rose-700' },
  { id: 'DO_NOT_CONTACT', label: '12. Não Contatar', headerColor: 'border-red-600 text-red-800' },
];

export default function CrmKanbanPage() {
  const [leads, setLeads] = useState<BusinessLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState('');

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedProduct) params.set('productId', selectedProduct);

      const res = await fetch(`/api/leads?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setLeads(data.leads);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [selectedProduct]);

  const handleMoveStage = async (leadId: string, newStage: PipelineStage) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipelineStage: newStage }),
      });
      const data = await res.json();
      if (data.success) {
        setLeads((prev) => prev.map((l) => (l.id === leadId ? data.lead : l)));
      }
    } catch (e) {
      console.error('Falha ao mover lead:', e);
    }
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

        <div className="flex items-center gap-3">
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

          <button
            onClick={fetchLeads}
            className="p-1.5 text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50"
            title="Atualizar Kanban"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

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
                <div className={`p-3 border-b-2 bg-white rounded-t-xl flex items-center justify-between ${stg.headerColor}`}>
                  <span className="font-bold text-xs">{stg.label}</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                    {loading ? '…' : stageLeads.length}
                  </span>
                </div>

                {/* Stage Cards */}
                <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                  {loading ? (
                    <div className="space-y-2 p-1 animate-pulse">
                      <div className="h-20 bg-white/70 rounded-lg border border-slate-200" />
                      <div className="h-20 bg-white/50 rounded-lg border border-slate-200" />
                    </div>
                  ) : stageLeads.length === 0 ? (
                    <div className="text-center py-8 text-[11px] text-slate-400">Nenhum lead nesta etapa</div>
                  ) : (
                    stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className="bg-white p-3 rounded-lg border border-slate-200/90 shadow-sm hover:shadow transition-shadow space-y-2"
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
