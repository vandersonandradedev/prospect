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
  MessageSquare,
  QrCode,
  Zap,
  Send,
  Smartphone,
} from 'lucide-react';
import { SuppressionEntry } from '@/types';

export default function SettingsPage() {
  const [sources, setSources] = useState<any[]>([]);
  const [suppressionList, setSuppressionList] = useState<SuppressionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Evolution API State
  const [evolutionStatus, setEvolutionStatus] = useState<any>(null);
  const [connectingEvolution, setConnectingEvolution] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Formulário de Supressão
  const [identifier, setIdentifier] = useState('');
  const [type, setType] = useState<'PHONE' | 'EMAIL' | 'DOMAIN'>('PHONE');
  const [reason, setReason] = useState('Solicitação de Opt-out do Titular');
  const [adding, setAdding] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [srcRes, supRes, evoRes] = await Promise.all([
        fetch('/api/sources/health'),
        fetch('/api/suppression'),
        fetch('/api/evolution/status').catch(() => null),
      ]);
      const srcData = await srcRes.json();
      const supData = await supRes.json();
      const evoData = evoRes ? await evoRes.json().catch(() => null) : null;

      if (srcData.sources) setSources(srcData.sources);
      if (supData.suppressionList) setSuppressionList(supData.suppressionList);
      if (evoData) setEvolutionStatus(evoData);
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

  const handleConnectEvolution = async (forceRestart = false) => {
    setConnectingEvolution(true);
    setConnectionError(null);
    try {
      const res = await fetch('/api/evolution/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRestart }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEvolutionStatus((prev: any) => ({
          ...prev,
          available: true,
          state: data.state || 'connecting',
          qrCodeBase64: data.qrCodeBase64,
          pairingCode: data.pairingCode,
        }));
      } else {
        setConnectionError(data.error || data.message || 'Falha ao obter QR Code da Evolution API.');
      }
    } catch (e: any) {
      setConnectionError(e?.message || 'Erro de rede ao conectar com Evolution API.');
    } finally {
      setConnectingEvolution(false);
    }
  };

  // Polling automático suave para detectar conexão quando o usuário escanear o QR Code
  useEffect(() => {
    if (evolutionStatus?.state === 'open') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/evolution/status');
        if (res.ok) {
          const data = await res.json();
          if (data?.state === 'open') {
            setEvolutionStatus((prev: any) => ({ ...prev, ...data }));
          }
        }
      } catch {}
    }, 4000);

    return () => clearInterval(interval);
  }, [evolutionStatus?.state]);

  const handleSendTestWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone) return;
    setSendingTest(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/evolution/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testPhone,
          text: 'Olá! Mensagem de teste da Vision Solutions via Evolution API (SDR Autônomo). Conexão estabelecida com sucesso!',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult('✅ Mensagem enviada com sucesso no WhatsApp!');
        setTestPhone('');
      } else {
        setTestResult(`❌ Erro: ${data.error || 'Falha ao enviar'}`);
      }
    } catch (err: any) {
      setTestResult(`❌ Erro de conexão: ${err?.message}`);
    } finally {
      setSendingTest(false);
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

      {/* 2. WhatsApp & Evolution API (SDR Autônomo) */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              WhatsApp & Evolution API (SDR Autônomo)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Conexão oficial via WhatsApp Baileys para disparo imediato pós-busca e qualificação com IA.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded text-xs font-bold ${
                evolutionStatus?.state === 'open'
                  ? 'bg-emerald-100 text-emerald-800'
                  : evolutionStatus?.available
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {evolutionStatus?.state === 'open'
                ? 'WHATSAPP CONECTADO'
                : evolutionStatus?.available
                ? 'AGUARDANDO LEITURA DO QR CODE'
                : 'EVOLUTION API OFFLINE'}
            </span>
          </div>
        </div>

        {/* Detalhes de Conexão */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-5 rounded-xl border border-slate-200">
          <div className="space-y-4">
            <div>
              <div className="text-xs font-bold text-slate-700">Instância Configurada</div>
              <div className="text-sm font-mono text-slate-900 font-semibold mt-0.5">
                {evolutionStatus?.config?.instanceName || 'VisionSolutions'}
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-slate-700">Servidor Evolution API</div>
              <div className="text-xs font-mono text-slate-600 mt-0.5">
                {evolutionStatus?.config?.serverUrl || 'http://localhost:8082'}
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-slate-700">Webhook de Respostas Automáticas</div>
              <div className="text-xs font-mono text-slate-600 mt-0.5 bg-white p-2 rounded border border-slate-200 break-all">
                /api/webhooks/evolution
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Todas as mensagens recebidas de leads são processadas pelo SDR IA até a etapa 7 (Demo Agendada).
              </p>
            </div>

            <div className="pt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleConnectEvolution(false)}
                disabled={connectingEvolution}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 shadow-sm"
              >
                <QrCode className="w-4 h-4" />
                {connectingEvolution ? 'Gerando QR Code...' : 'Gerar / Atualizar QR Code'}
              </button>
              <button
                type="button"
                onClick={() => handleConnectEvolution(true)}
                disabled={connectingEvolution}
                className="flex items-center gap-2 px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                title="Forçar reinício da sessão Baileys na Evolution API"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${connectingEvolution ? 'animate-spin' : ''}`} />
                Forçar Novo QR Code
              </button>
            </div>

            {connectionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Aviso de Conexão:</strong> {connectionError}
                </div>
              </div>
            )}
          </div>

          {/* QR Code ou Status Conectado */}
          <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-slate-200">
            {evolutionStatus?.state === 'open' ? (
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto text-emerald-600">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="font-bold text-sm text-slate-900">WhatsApp Conectado e Operacional</div>
                <p className="text-xs text-slate-500 max-w-xs">
                  O SDR autônomo está pronto para realizar disparos para MesaGo e TorqueOS e responder dúvidas.
                </p>
              </div>
            ) : typeof evolutionStatus?.qrCodeBase64 === 'string' && evolutionStatus.qrCodeBase64.length > 50 ? (
              <div className="text-center space-y-3">
                <div className="text-xs font-bold text-slate-800">
                  Escaneie com o WhatsApp no seu celular:
                </div>
                <img
                  src={
                    evolutionStatus.qrCodeBase64.startsWith('data:')
                      ? evolutionStatus.qrCodeBase64
                      : `data:image/png;base64,${evolutionStatus.qrCodeBase64}`
                  }
                  alt="WhatsApp QR Code"
                  className="w-56 h-56 mx-auto border-4 border-slate-900 rounded-lg shadow-sm bg-white"
                />
                {evolutionStatus?.pairingCode && (
                  <div className="text-xs text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-200">
                    Ou código de pareamento: <strong className="font-mono text-slate-900">{evolutionStatus.pairingCode}</strong>
                  </div>
                )}
                <div className="text-[11px] text-slate-500 font-medium">
                  Abra WhatsApp &gt; Aparelhos conectados &gt; Conectar aparelho
                </div>
              </div>
            ) : (
              <div className="text-center space-y-2 text-slate-400 py-6">
                <Smartphone className="w-10 h-10 mx-auto stroke-1 text-slate-400" />
                <div className="text-xs font-semibold text-slate-700">Nenhum QR Code ativo no momento.</div>
                <div className="text-[11px] text-slate-500">Clique em "Gerar / Atualizar QR Code" para conectar seu WhatsApp.</div>
              </div>
            )}
          </div>
        </div>

        {/* Teste Rápido de Envio de Mensagem */}
        <form onSubmit={handleSendTestWhatsApp} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
          <div className="font-bold text-slate-800 flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5 text-sky-600" />
            Testar Envio Real pelo WhatsApp Conectado
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Digite seu número com DDD (ex: 11988887777)"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
            <button
              type="submit"
              disabled={sendingTest || !testPhone}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
            >
              {sendingTest ? 'Enviando...' : 'Enviar Teste'}
            </button>
          </div>
          {testResult && (
            <div className="text-xs font-semibold text-slate-700 bg-white p-2 rounded border border-slate-200">
              {testResult}
            </div>
          )}
        </form>
      </div>

      {/* 3. Lista de Supressão e Descadastramento (LGPD) */}
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
