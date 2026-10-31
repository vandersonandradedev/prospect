import { EventEmitter } from 'events';

export type RealtimeEventType =
  | 'CONNECTED'
  | 'PING'
  | 'LEAD_CREATED'
  | 'LEAD_UPDATED'
  | 'STAGE_CHANGED'
  | 'ACTIVITY_ADDED'
  | 'JOB_STARTED'
  | 'JOB_UPDATED'
  | 'JOB_COMPLETED'
  | 'WHATSAPP_STATE'
  | 'DASHBOARD_UPDATED';

export interface RealtimeEvent<T = any> {
  type: RealtimeEventType;
  payload?: T;
  timestamp: string;
}

// Em Next.js dev e serverless, usa globalThis para manter singleton do emitter
const globalForEvents = globalThis as unknown as {
  realtimeEmitter?: EventEmitter;
};

export const realtimeEmitter =
  globalForEvents.realtimeEmitter || new EventEmitter();

realtimeEmitter.setMaxListeners(200);

if (process.env.NODE_ENV !== 'production') {
  globalForEvents.realtimeEmitter = realtimeEmitter;
}

export function emitRealtime<T = any>(type: RealtimeEventType, payload?: T): void {
  const event: RealtimeEvent<T> = {
    type,
    payload,
    timestamp: new Date().toISOString(),
  };
  try {
    realtimeEmitter.emit('event', event);
    realtimeEmitter.emit(type, event);
  } catch (err) {
    console.error('Falha ao emitir evento em tempo real:', err);
  }
}

export function subscribeRealtime(
  callback: (event: RealtimeEvent) => void,
  eventType?: RealtimeEventType
): () => void {
  const channel = eventType || 'event';
  realtimeEmitter.on(channel, callback);

  return () => {
    realtimeEmitter.off(channel, callback);
  };
}
