'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Radio,
  ShieldAlert,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { SuppressionEntry } from '@/types';

export default function SettingsPage() {
  const [sources, setSources] = useState<any[]>([]);
  const [suppressionList, setSuppressionList] = useState<SuppressionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulário de Supressão
  const [identifier, setIdentifier] = useState('');
  const [type, setType] = useState<'PHONE' | 'EMAIL' | 'DOMAIN'>('PHONE');
  const [reason, setReason] = useState('Solicitação de Opt-out do Titular');
  const [adding, setAdding] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [srcRes, supRes] = await Promise.all([
        fetch('/api/sources/health'),
        fetch('/api/suppression'),
      ]);
      const srcData = await srcRes.json();
      const supData = await supRes.json();

      if (srcData.sources) setSources(srcData.sources);
      if (supData.suppressionList) setSuppressionList(supData.suppressionList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddSuppression = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier) return;
    setAdding(true);
    try {
      const res = await fetch('/api/suppression', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, type, reason }),
      });
      const data = await res.json();
      if (data.success) {
        setIdentifier('');
        fetchData();
        alert(`'${identifier}' adicionado à lista de supressão. Todos os contatos futuros estão bloqueados.`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-sky-600" />
          Configurações, Fontes & Privacidade (LGPD)
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Monitoramento em tempo real dos serviços de coleta e gerenciamento de exclusão/supressão de dados.
        </p>
      </div>

      {/* 1. Status das Fontes de Coleta */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Radio className="w-4 h-4 text-sky-600" />
            Integradores e Provedores de Dados
          </h2>
          <button
            onClick={fetchData}
            className="p-1.5 text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50"
            title="Recarregar status"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {loading && sources.length === 0 ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 animate-pulse h-28">
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-3 bg-slate-200 rounded w-2/3" />
                <div className="h-8 bg-slate-100 rounded mt-2" />
              </div>
            ))
          ) : (
            sources.map((src) => (
              <div key={src.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800">{src.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      src.available ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {src.available ? 'DISPONÍVEL' : 'OFFLINE'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">{src.description}</p>
                <div className="text-[11px] font-medium text-slate-700 bg-white p-2 rounded border border-slate-100">
                  {src.message}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. Lista de Supressão e Descadastramento (LGPD) */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 text-rose-700">
            <ShieldAlert className="w-4 h-4" />
            Lista de Supressão LGPD (Opt-out e Bloqueio de Contato)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Qualquer número, e-mail ou domínio adicionado aqui é imediatamente bloqueado para envio de mensagens, ligações ou nova coleta.
          </p>
        </div>

        {/* Adicionar Bloqueio */}
        <form onSubmit={handleAddSuppression} className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Identificador</label>
            <input
              type="text"
              required
              placeholder="Ex: (11) 98888-7777 ou dominio.com.br"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Tipo</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
            >
              <option value="PHONE">Telefone</option>
              <option value="DOMAIN">Domínio / Site</option>
              <option value="EMAIL">E-mail</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Motivo</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={adding}
              className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              {adding ? 'Bloqueando...' : 'Adicionar Bloqueio'}
            </button>
          </div>
        </form>

        {/* Tabela de Supressão */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-700">Registros Bloqueados ({suppressionList.length})</div>

          {suppressionList.length === 0 ? (
            <div className="text-xs text-slate-400 py-3 text-center">Nenhum registro bloqueado na lista de supressão.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="py-2 px-3">Identificador</th>
                    <th className="py-2 px-3">Tipo</th>
                    <th className="py-2 px-3">Motivo</th>
                    <th className="py-2 px-3">Data da Supressão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {suppressionList.map((entry) => (
                    <tr key={entry.id}>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{entry.identifier}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-600">{entry.type}</td>
                      <td className="py-2.5 px-3 text-slate-600">{entry.reason}</td>
                      <td className="py-2.5 px-3 text-slate-400">{new Date(entry.suppressedAt).toLocaleString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
