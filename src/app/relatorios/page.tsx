'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Building2, Globe, Phone, RefreshCw } from 'lucide-react';
import { DashboardMetrics } from '@/types';

export default function ReportsPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((res) => res.json())
      .then((data) => {
        if (data.metrics) setMetrics(data.metrics);
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-sky-600" />
          Relatórios e Métricas de Conversão Comercial
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Indicadores auditáveis calculados em tempo real sobre os leads reais persistidos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase">Leads com Telefone</div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {metrics?.leadsWithPhone || 0}
            <span className="text-xs font-normal text-slate-400 ml-2">
              ({metrics?.totalFound ? ((metrics.leadsWithPhone / metrics.totalFound) * 100).toFixed(0) : 0}%)
            </span>
          </div>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase">Leads com Site Oficial</div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {metrics?.leadsWithWebsite || 0}
            <span className="text-xs font-normal text-slate-400 ml-2">
              ({metrics?.totalFound ? ((metrics.leadsWithWebsite / metrics.totalFound) * 100).toFixed(0) : 0}%)
            </span>
          </div>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase">Taxa de Conversão em Clientes</div>
          <div className="text-2xl font-black text-emerald-600 mt-2">
            {metrics?.conversionRate || 0}%
          </div>
        </div>
      </div>

      {/* Tabela de Desempenho por Linha de Produto */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Desempenho por Linha de Produto da Vision Solutions
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                <th className="py-2.5 px-3">Produto</th>
                <th className="py-2.5 px-3">Público-Alvo Principal</th>
                <th className="py-2.5 px-3 text-right">Total de Leads Coletados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-3 px-3 font-bold text-slate-900">MesaGo</td>
                <td className="py-3 px-3 text-slate-500 text-xs">Hamburguerias, Pizzarias, Restaurantes e Cafeterias</td>
                <td className="py-3 px-3 text-right font-bold text-slate-800">{metrics?.byProduct['MesaGo'] || 0}</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-bold text-slate-900">TorqueOS</td>
                <td className="py-3 px-3 text-slate-500 text-xs">Oficinas Mecânicas e Centros Automotivos</td>
                <td className="py-3 px-3 text-right font-bold text-slate-800">{metrics?.byProduct['TorqueOS'] || 0}</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-bold text-slate-900">Software Fiscal</td>
                <td className="py-3 px-3 text-slate-500 text-xs">Varejo, Distribuidoras e Prestadores de Serviços</td>
                <td className="py-3 px-3 text-right font-bold text-slate-800">{metrics?.byProduct['Software Fiscal'] || 0}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
