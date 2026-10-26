'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  Search,
  Filter,
  Download,
  Phone,
  Globe,
  ExternalLink,
  ChevronRight,
  Flame,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { BusinessLead, PipelineStage, PriorityLevel } from '@/types';

export default function LeadsPage() {
  const [leads, setLeads] = useState<BusinessLead[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedStage, setSelectedStage] = useState('');

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedProduct) params.set('productId', selectedProduct);
      if (selectedStage) params.set('stage', selectedStage);
      if (searchTerm) params.set('search', searchTerm);

      const res = await fetch(`/api/leads?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setLeads(data.leads);
      }
    } catch (e) {
      console.error('Falha ao buscar leads:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [selectedProduct, selectedStage]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLeads();
  };

  const getPriorityBadge = (priority: PriorityLevel) => {
    switch (priority) {
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Alta</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Média</span>;
      case 'LOW':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">Baixa</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-50 text-slate-500">Incompleto</span>;
    }
  };

  const getStageBadge = (stage: PipelineStage) => {
    const map: Record<PipelineStage, { label: string; color: string }> = {
      NEW: { label: 'Novo Lead', color: 'bg-slate-100 text-slate-700' },
      VALIDATING: { label: 'Validando Dados', color: 'bg-blue-50 text-blue-700' },
      QUALIFIED: { label: 'Qualificado', color: 'bg-emerald-50 text-emerald-700' },
      READY_TO_CONTACT: { label: 'Pronto Contato', color: 'bg-indigo-50 text-indigo-700' },
      CONTACTED: { label: 'Contatado', color: 'bg-amber-50 text-amber-700' },
      RESPONDED: { label: 'Respondeu', color: 'bg-cyan-50 text-cyan-700' },
      DEMO_SCHEDULED: { label: 'Demo Agendada', color: 'bg-purple-50 text-purple-700' },
      PROPOSAL_SENT: { label: 'Proposta Enviada', color: 'bg-orange-50 text-orange-700' },
      NEGOTIATING: { label: 'Negociando', color: 'bg-yellow-50 text-yellow-800' },
      CONVERTED: { label: 'Convertido', color: 'bg-emerald-100 text-emerald-800 font-bold' },
      LOST: { label: 'Perdido', color: 'bg-rose-50 text-rose-700' },
      DO_NOT_CONTACT: { label: 'Não Contatar', color: 'bg-red-100 text-red-800 font-bold' },
    };

    const cfg = map[stage] || { label: stage, color: 'bg-slate-100 text-slate-600' };
    return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>{cfg.label}</span>;
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-sky-600" />
            Base de Leads Comerciais Reais
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Empresas reais identificadas, com canais públicos de contato e rastreabilidade total.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/api/export"
            download
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Exportar CSV
          </a>
          <Link
            href="/busca"
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors shadow-sm shadow-sky-600/20"
          >
            <Search className="w-4 h-4" />
            Nova Pesquisa
          </Link>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por nome, telefone ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
          />
        </form>

        <div className="flex items-center gap-2">
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          >
            <option value="">Todos os Produtos</option>
            <option value="prod-mesago">MesaGo</option>
            <option value="prod-torqueos">TorqueOS</option>
            <option value="prod-fiscal">Software Fiscal</option>
          </select>

          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          >
            <option value="">Todos os Estágios</option>
            <option value="NEW">Novo Lead</option>
            <option value="QUALIFIED">Qualificado</option>
            <option value="READY_TO_CONTACT">Pronto Contato</option>
            <option value="CONTACTED">Contatado</option>
            <option value="DEMO_SCHEDULED">Demo Agendada</option>
            <option value="CONVERTED">Convertido</option>
            <option value="DO_NOT_CONTACT">Não Contatar</option>
          </select>

          <button
            onClick={fetchLeads}
            className="p-2 text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabela de Leads */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">Carregando leads reais...</div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-base font-bold text-slate-800">Nenhum lead encontrado</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Realize uma nova consulta na página de pesquisa para coletar estabelecimentos verificáveis.
            </p>
            <Link
              href="/busca"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700 mt-2"
            >
              Iniciar Pesquisa
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Empresa / Categoria</th>
                  <th className="py-3 px-4">Produto</th>
                  <th className="py-3 px-4">Localização</th>
                  <th className="py-3 px-4">Canais de Contato</th>
                  <th className="py-3 px-4 text-center">Score</th>
                  <th className="py-3 px-4">Estágio</th>
                  <th className="py-3 px-4">Fonte</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Empresa / Categoria */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{lead.name}</div>
                      <div className="text-xs text-slate-500">{lead.category}</div>
                    </td>

                    {/* Produto */}
                    <td className="py-3.5 px-4">
                      <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
                        {lead.productName}
                      </span>
                    </td>

                    {/* Localização */}
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      <div>{lead.city} - {lead.state}</div>
                      {lead.address && <div className="text-[11px] text-slate-400 line-clamp-1">{lead.address}</div>}
                    </td>

                    {/* Canais */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        {lead.phone ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <Phone className="w-3 h-3 text-emerald-600" />
                            {lead.phone}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Sem fone</span>
                        )}

                        {lead.website && (
                          <a
                            href={lead.website.startsWith('http') ? lead.website : `http://${lead.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded"
                            title="Visitar site oficial"
                          >
                            <Globe className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Score */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1 font-bold text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        <Flame className="w-3 h-3 text-emerald-500" />
                        {lead.score}
                      </div>
                    </td>

                    {/* Estágio */}
                    <td className="py-3.5 px-4">
                      {getStageBadge(lead.pipelineStage)}
                    </td>

                    {/* Fonte */}
                    <td className="py-3.5 px-4">
                      <div className="text-[11px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 inline-block">
                        {lead.source.replace('_', ' ')}
                      </div>
                    </td>

                    {/* Ação */}
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-800 hover:underline"
                      >
                        Ver 360° <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
