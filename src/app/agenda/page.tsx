'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Clock,
  Phone,
  MessageSquare,
  FileText,
  Building2,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { BusinessLead, LeadActivity } from '@/types';

export default function AgendaPage() {
  const [leads, setLeads] = useState<BusinessLead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leads')
      .then((res) => res.json())
      .then((data) => {
        if (data.leads) setLeads(data.leads);
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  // Agregar todas as atividades
  const allActivities: Array<LeadActivity & { leadName: string; leadProduct: string }> = [];
  for (const lead of leads) {
    for (const act of lead.activities) {
      allActivities.push({
        ...act,
        leadName: lead.name,
        leadProduct: lead.productName,
      });
    }
  }

  // Ordenar por data decrescente
  allActivities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'WHATSAPP_SENT':
        return <MessageSquare className="w-4 h-4 text-emerald-600" />;
      case 'PHONE_CALL':
        return <Phone className="w-4 h-4 text-sky-600" />;
      case 'STAGE_CHANGE':
        return <Clock className="w-4 h-4 text-purple-600" />;
      default:
        return <FileText className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Clock className="w-6 h-6 text-sky-600" />
          Histórico e Linha do Tempo Comercial
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Registro cronológico auditável de todas as interações e avanços do funil realizados pelo operador.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        {loading ? (
          <div className="relative pl-6 border-l-2 border-slate-100 space-y-6 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="relative">
                <div className="absolute -left-[31px] top-1 w-6 h-6 rounded-full bg-slate-200 border-2 border-slate-300" />
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-1/3 mb-2" />
                  <div className="h-4 bg-slate-200 rounded w-2/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/4 mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : allActivities.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Nenhuma atividade comercial registrada ainda. Inicie um contato com um lead para gerar histórico.
          </div>
        ) : (
          <div className="relative pl-6 border-l-2 border-slate-100 space-y-6">
            {allActivities.map((act) => (
              <div key={act.id} className="relative group">
                {/* Dot */}
                <div className="absolute -left-[31px] top-1 w-6 h-6 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center shadow-sm">
                  {getActivityIcon(act.type)}
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 hover:bg-slate-50/80 transition-colors space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <Link
                      href={`/leads/${act.leadId}`}
                      className="font-bold text-slate-900 hover:text-sky-600 flex items-center gap-1.5"
                    >
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {act.leadName}
                      <span className="font-normal text-slate-500">({act.leadProduct})</span>
                    </Link>
                    <span className="text-slate-400">
                      {new Date(act.createdAt).toLocaleString('pt-BR')}
                    </span>
                  </div>

                  <div className="font-bold text-sm text-slate-800">{act.title}</div>
                  {act.description && <p className="text-xs text-slate-600">{act.description}</p>}

                  <div className="text-[11px] text-slate-400 font-medium pt-1">
                    Operador: {act.operatorName || 'Sistema'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
