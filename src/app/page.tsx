'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  CheckCircle2,
  Phone,
  Globe,
  TrendingUp,
  AlertCircle,
  Search,
  ArrowRight,
  Flame,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { DashboardMetrics } from '@/types';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      if (data.success) {
        setMetrics(data.metrics);
      }
    } catch (e) {
      console.error('Falha ao carregar métricas:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Painel Comercial — Vision Solutions
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Métricas de prospecção calculadas estritamente a partir de dados reais persistidos.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchMetrics}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          <Link
            href="/busca"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors shadow-sm shadow-sky-600/20"
          >
            <Search className="w-4 h-4" />
            Nova Pesquisa
          </Link>
        </div>
      </div>

      {/* Estado Inicial: Se o banco estiver vazio */}
      {metrics && metrics.totalFound === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center max-w-xl mx-auto shadow-sm my-12">
          <div className="w-16 h-16 bg-sky-50 text-sky-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Base de Prospecção Vazia</h2>
          <p className="text-sm text-slate-500 mt-2 mb-6">
            Nenhum lead real cadastrado ainda. Em estrita conformidade com a política do sistema, nenhum dado fictício ou simulado é exibido no painel.
          </p>
          <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 text-left text-xs text-slate-600 mb-6 space-y-2">
            <div className="font-semibold text-slate-800">Passos para iniciar a primeira prospecção:</div>
            <div>1. Clique em <strong>Nova Pesquisa</strong> no menu ou no botão abaixo.</div>
            <div>2. Selecione o produto alvo (ex: <em>MesaGo</em> para restaurantes ou <em>TorqueOS</em> para oficinas).</div>
            <div>3. Defina a cidade e o segmento desejado para consultar estabelecimentos reais.</div>
          </div>
          <Link
            href="/busca"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors shadow-sm"
          >
            <Search className="w-4 h-4" />
            Fazer Primeira Coleta de Leads
          </Link>
        </div>
      ) : (
        <>
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Empresas Reais
                </span>
                <div className="p-2 bg-sky-50 text-sky-600 rounded-lg">
                  <Building2 className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-extrabold text-slate-900">{metrics?.uniqueLeads || 0}</div>
                <div className="text-xs text-slate-500 mt-1">Total de leads únicos no sistema</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Leads Qualificados
                </span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Flame className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-extrabold text-emerald-600">{metrics?.qualifiedLeads || 0}</div>
                <div className="text-xs text-slate-500 mt-1">Score igual ou superior a 50 pontos</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Com Telefone Público
                </span>
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Phone className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-extrabold text-slate-900">{metrics?.leadsWithPhone || 0}</div>
                <div className="text-xs text-slate-500 mt-1">Prontos para primeiro contato</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Taxa de Conversão
                </span>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-extrabold text-slate-900">{metrics?.conversionRate || 0}%</div>
                <div className="text-xs text-slate-500 mt-1">
                  {metrics?.convertedClients || 0} convertidos de {metrics?.contactsMade || 0} contatados
                </div>
              </div>
            </div>
          </div>

          {/* Funil Comercial (Pipeline Stages Breakdown) */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Evolução no Funil de Vendas (CRM)</h2>
                <p className="text-xs text-slate-500 mt-0.5">Distribuição dos leads pelas 12 etapas do processo comercial.</p>
              </div>
              <Link href="/crm" className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1">
                Abrir Kanban <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-xs font-medium text-slate-500">Novos</div>
                <div className="text-xl font-bold text-slate-900 mt-1">{metrics?.byStage['NEW'] || 0}</div>
              </div>
              <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                <div className="text-xs font-medium text-blue-600">Qualificados</div>
                <div className="text-xl font-bold text-blue-900 mt-1">{metrics?.byStage['QUALIFIED'] || 0}</div>
              </div>
              <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                <div className="text-xs font-medium text-indigo-600">Prontos Contato</div>
                <div className="text-xl font-bold text-indigo-900 mt-1">{metrics?.byStage['READY_TO_CONTACT'] || 0}</div>
              </div>
              <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                <div className="text-xs font-medium text-amber-600">Contatados</div>
                <div className="text-xl font-bold text-amber-900 mt-1">{metrics?.byStage['CONTACTED'] || 0}</div>
              </div>
              <div className="p-3 bg-purple-50/50 rounded-lg border border-purple-100">
                <div className="text-xs font-medium text-purple-600">Demonstrações</div>
                <div className="text-xl font-bold text-purple-900 mt-1">{metrics?.byStage['DEMO_SCHEDULED'] || 0}</div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                <div className="text-xs font-medium text-emerald-700">Convertidos</div>
                <div className="text-xl font-bold text-emerald-700 mt-1">{metrics?.byStage['CONVERTED'] || 0}</div>
              </div>
            </div>
          </div>

          {/* Desempenho por Produto e por Fonte */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Produtos */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 mb-4">Leads por Linha de Produto</h2>
              <div className="space-y-3">
                {metrics?.byProduct && Object.keys(metrics.byProduct).length > 0 ? (
                  Object.entries(metrics.byProduct).map(([prod, count]) => (
                    <div key={prod} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="font-medium text-sm text-slate-800">{prod}</div>
                      <span className="px-2.5 py-1 text-xs font-bold bg-white text-slate-700 border border-slate-200 rounded-full shadow-sm">
                        {count} leads
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-400 py-4 text-center">Nenhum produto com leads registrados.</div>
                )}
              </div>
            </div>

            {/* Fontes de Dados */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 mb-4">Proveniência por Fonte</h2>
              <div className="space-y-3">
                {metrics?.bySource && Object.keys(metrics.bySource).length > 0 ? (
                  Object.entries(metrics.bySource).map(([src, count]) => (
                    <div key={src} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="font-mono text-xs text-slate-700">{src}</div>
                      <span className="px-2.5 py-1 text-xs font-bold bg-sky-50 text-sky-700 border border-sky-100 rounded-full">
                        {count} coletados
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-400 py-4 text-center">Nenhuma fonte utilizada ainda.</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
