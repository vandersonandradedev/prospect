'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Radio,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { CollectionJob } from '@/types';

export default function JobsPage() {
  const [jobs, setJobs] = useState<CollectionJob[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      if (data.success) {
        setJobs(data.jobs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Concluído
          </span>
        );
      case 'COMPLETED_WITH_WARNINGS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5" /> Com Avisos
          </span>
        );
      case 'RUNNING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-sky-50 text-sky-700 border border-sky-200 animate-pulse">
            <Clock className="w-3.5 h-3.5 animate-spin" /> Em Execução
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5" /> Falhou
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-600">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Radio className="w-6 h-6 text-sky-600" />
            Trabalhos de Coleta e Ingestão
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Registro detalhado de cada consulta realizada nas fontes de dados autorizadas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchJobs}
            className="p-2 text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg bg-white hover:bg-slate-50"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/busca"
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700 shadow-sm"
          >
            <Search className="w-4 h-4" />
            Nova Pesquisa
          </Link>
        </div>
      </div>

      {/* Tabela de Trabalhos */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">Carregando histórico de coletas...</div>
        ) : jobs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Radio className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-base font-bold text-slate-800">Nenhum trabalho de coleta realizado</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Execute sua primeira consulta para iniciar a captação de clientes reais.
            </p>
            <Link
              href="/busca"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700 mt-2"
            >
              Criar Trabalho de Coleta
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Identificador / Consulta</th>
                  <th className="py-3 px-4">Produto</th>
                  <th className="py-3 px-4">Provedor</th>
                  <th className="py-3 px-4 text-center">Encontrados / Ingeridos</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Início / Conclusão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{job.searchQuery}</div>
                      <div className="text-xs font-mono text-slate-400">{job.id}</div>
                      {job.errorMessage && (
                        <div className="text-xs text-rose-600 mt-1 font-medium">{job.errorMessage}</div>
                      )}
                      {job.warningMessage && (
                        <div className="text-xs text-amber-600 mt-1 font-medium">{job.warningMessage}</div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-xs text-slate-700">
                      {job.targetProduct}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {job.provider}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="font-bold text-slate-900">{job.itemsFound}</span>
                      <span className="text-slate-400 mx-1">/</span>
                      <span className="font-bold text-emerald-600">+{job.itemsImported}</span>
                    </td>

                    <td className="py-3.5 px-4">{getStatusBadge(job.status)}</td>

                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      <div>{new Date(job.startedAt).toLocaleString('pt-BR')}</div>
                      {job.finishedAt && (
                        <div className="text-[11px] text-slate-400">
                          {new Date(job.finishedAt).toLocaleTimeString('pt-BR')}
                        </div>
                      )}
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
