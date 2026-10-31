'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { BusinessLead, DashboardMetrics, CollectionJob, PipelineStage } from '@/types';
import { RealtimeEvent } from '@/lib/events';

/**
 * Hook universal que conecta ao SSE (/api/realtime) e fornece fallback
 * resiliente de polling quando em background ou caso SSE não esteja disponível.
 */
export function useRealtimeEvent(onEvent?: (event: RealtimeEvent) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isUnmounted = false;

    function connect() {
      if (isUnmounted) return;
      try {
        es = new EventSource('/api/realtime');

        es.onopen = () => {
          if (!isUnmounted) setIsConnected(true);
        };

        es.onmessage = (messageEvent) => {
          if (isUnmounted) return;
          try {
            const data: RealtimeEvent = JSON.parse(messageEvent.data);
            setLastEvent(data);
            setLastSyncTime(new Date());
            if (onEventRef.current) {
              onEventRef.current(data);
            }
          } catch {}
        };

        es.onerror = () => {
          if (!isUnmounted) {
            setIsConnected(false);
            if (es) {
              es.close();
              es = null;
            }
            // Reconexão suave após 5 segundos
            reconnectTimeout = setTimeout(connect, 5000);
          }
        };
      } catch {
        if (!isUnmounted) {
          setIsConnected(false);
          reconnectTimeout = setTimeout(connect, 6000);
        }
      }
    }

    connect();

    return () => {
      isUnmounted = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (es) es.close();
    };
  }, []);

  return { isConnected, lastEvent, lastSyncTime };
}

/**
 * Hook de Métricas do Dashboard em Tempo Real
 */
export function useRealtimeDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date>(new Date());

  const fetchMetrics = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.metrics) {
          setMetrics(data.metrics);
          setLastSync(new Date());
        }
      }
    } catch (e) {
      console.warn('Erro ao atualizar métricas:', e);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  // Carga inicial
  useEffect(() => {
    fetchMetrics(true);
  }, [fetchMetrics]);

  // Atualização em tempo real via SSE
  const { isConnected } = useRealtimeEvent((event) => {
    if (
      event.type === 'DASHBOARD_UPDATED' ||
      event.type === 'LEAD_CREATED' ||
      event.type === 'LEAD_UPDATED' ||
      event.type === 'STAGE_CHANGED' ||
      event.type === 'JOB_COMPLETED'
    ) {
      fetchMetrics(false);
    }
  });

  // Polling de segurança (caso aba volte a ficar visível ou SSE oscile)
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchMetrics(false);
      }
    }, 6000);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchMetrics(false);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchMetrics]);

  return {
    metrics,
    loading,
    isLive: isConnected,
    lastSync,
    refresh: () => fetchMetrics(false),
  };
}

/**
 * Hook de Leads e CRM Kanban em Tempo Real
 */
export function useRealtimeLeads(filters?: {
  productId?: string;
  stage?: string;
  search?: string;
}) {
  const [leads, setLeads] = useState<BusinessLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date>(new Date());

  const productId = filters?.productId || '';
  const stage = filters?.stage || '';
  const search = filters?.search || '';

  const fetchLeads = useCallback(
    async (isInitial = false) => {
      if (isInitial) setLoading(true);
      try {
        const params = new URLSearchParams();
        if (productId) params.set('productId', productId);
        if (stage) params.set('stage', stage);
        if (search) params.set('search', search);

        const res = await fetch(`/api/leads?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.leads)) {
            setLeads(data.leads);
            setLastSync(new Date());
          }
        }
      } catch (e) {
        console.warn('Erro ao atualizar leads:', e);
      } finally {
        if (isInitial) setLoading(false);
      }
    },
    [productId, stage, search]
  );

  useEffect(() => {
    fetchLeads(true);
  }, [fetchLeads]);

  // Atualização em tempo real via SSE
  const { isConnected } = useRealtimeEvent((event) => {
    if (
      event.type === 'LEAD_CREATED' ||
      event.type === 'LEAD_UPDATED' ||
      event.type === 'STAGE_CHANGED' ||
      event.type === 'ACTIVITY_ADDED'
    ) {
      fetchLeads(false);
    }
  });

  // Polling de apoio silencioso a cada 5 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchLeads(false);
      }
    }, 5000);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchLeads(false);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchLeads]);

  const moveStage = async (leadId: string, newStage: PipelineStage) => {
    // Atualização otimista imediata na interface
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, pipelineStage: newStage } : l))
    );

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipelineStage: newStage }),
      });
      const data = await res.json();
      if (data.success && data.lead) {
        setLeads((prev) => prev.map((l) => (l.id === leadId ? data.lead : l)));
      }
    } catch (e) {
      console.error('Falha ao mover lead:', e);
      fetchLeads(false);
    }
  };

  return {
    leads,
    setLeads,
    loading,
    isLive: isConnected,
    lastSync,
    refresh: () => fetchLeads(false),
    moveStage,
  };
}

/**
 * Hook para um Lead específico (Chat, Atividades, Análises em Tempo Real)
 */
export function useRealtimeLead(leadId: string) {
  const [lead, setLead] = useState<BusinessLead | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLead = useCallback(
    async (isInitial = false) => {
      if (!leadId) return;
      if (isInitial) setLoading(true);
      try {
        const res = await fetch(`/api/leads/${leadId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.lead) {
            setLead(data.lead);
          }
        }
      } catch (e) {
        console.warn('Erro ao atualizar lead:', e);
      } finally {
        if (isInitial) setLoading(false);
      }
    },
    [leadId]
  );

  useEffect(() => {
    fetchLead(true);
  }, [fetchLead]);

  const { isConnected } = useRealtimeEvent((event) => {
    if (
      (event.type === 'LEAD_UPDATED' ||
        event.type === 'STAGE_CHANGED' ||
        event.type === 'ACTIVITY_ADDED') &&
      (!event.payload?.id || event.payload?.id === leadId)
    ) {
      fetchLead(false);
    }
  });

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchLead(false);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [fetchLead]);

  return {
    lead,
    setLead,
    loading,
    isLive: isConnected,
    refresh: () => fetchLead(false),
  };
}

/**
 * Hook de Trabalhos de Coleta em Tempo Real
 */
export function useRealtimeJobs() {
  const [jobs, setJobs] = useState<CollectionJob[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const res = await fetch('/api/jobs');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.jobs)) {
          setJobs(data.jobs);
        }
      }
    } catch (e) {
      console.warn('Erro ao atualizar jobs:', e);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs(true);
  }, [fetchJobs]);

  const { isConnected } = useRealtimeEvent((event) => {
    if (
      event.type === 'JOB_STARTED' ||
      event.type === 'JOB_UPDATED' ||
      event.type === 'JOB_COMPLETED'
    ) {
      fetchJobs(false);
    }
  });

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchJobs(false);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [fetchJobs]);

  return {
    jobs,
    loading,
    isLive: isConnected,
    refresh: () => fetchJobs(false),
  };
}
