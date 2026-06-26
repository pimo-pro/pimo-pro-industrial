import { centralWebSocketUrl } from '../config/api';

export type RealtimeStatus = 'disconnected' | 'connecting' | 'connected' | 'offline';

export type RealtimeUpdate = {
  type: string;
  qr?: string;
  projectId?: string;
  payload: unknown;
  event?: { type: string; timestamp: string; payload: Record<string, unknown> };
};

type UpdateCallback = (update: RealtimeUpdate) => void;

let status: RealtimeStatus = 'disconnected';
let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const subscribers = new Map<string, Set<UpdateCallback>>();

function wsUrl(): string {
  return centralWebSocketUrl();
}

function notifySubscribers(update: RealtimeUpdate): void {
  const keys = [
    'global',
    update.qr ? `piece:${update.qr.toLowerCase()}` : '',
    update.projectId ? `project:${update.projectId}` : '',
    'factory',
    'workstations',
  ].filter(Boolean);
  for (const key of keys) {
    for (const cb of subscribers.get(key) ?? []) cb(update);
  }
}

function sendSubscribe(channel: string): void {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ action: 'subscribe', channel }));
  }
}

function handleMessage(raw: MessageEvent): void {
  try {
    const msg = JSON.parse(String(raw.data)) as Record<string, unknown>;
    if (msg.type === 'event' && msg.event) {
      const event = msg.event as { type: string; timestamp: string; payload: Record<string, unknown> };
      notifySubscribers({
        type: event.type,
        qr: event.payload.qr ? String(event.payload.qr) : undefined,
        projectId: event.payload.projectId ? String(event.payload.projectId) : undefined,
        payload: event.payload,
        event,
      });
      return;
    }
    const qr = msg.qr ? String(msg.qr) : undefined;
    const projectId = msg.projectId ? String(msg.projectId) : undefined;
    notifySubscribers({
      type: String(msg.type ?? 'unknown'),
      qr,
      projectId,
      payload: msg,
    });
  } catch {
    /* ignore */
  }
}

function scheduleReconnect(): void {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectWebSocket();
  }, 5000);
}

export function connectWebSocket(): RealtimeStatus {
  if (socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) {
    return status;
  }

  status = 'connecting';
  try {
    socket = new WebSocket(wsUrl());
  } catch {
    status = 'offline';
    scheduleReconnect();
    return status;
  }

  socket.onopen = () => {
    status = 'connected';
    sendSubscribe('global');
    sendSubscribe('factory');
    sendSubscribe('workstations');
    for (const key of subscribers.keys()) {
      if (!['global', 'factory', 'workstations'].includes(key)) sendSubscribe(key);
    }
  };

  socket.onmessage = handleMessage;

  socket.onclose = () => {
    status = 'disconnected';
    socket = null;
    scheduleReconnect();
  };

  socket.onerror = () => {
    status = 'offline';
  };

  return status;
}

export function getRealtimeStatus(): RealtimeStatus {
  return status;
}

export function disconnectWebSocket(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  socket?.close();
  socket = null;
  status = 'disconnected';
}

export function subscribeToPiece(qr: string, callback: UpdateCallback): () => void {
  const key = `piece:${qr.toLowerCase()}`;
  if (!subscribers.has(key)) subscribers.set(key, new Set());
  subscribers.get(key)!.add(callback);
  sendSubscribe(key);
  return () => subscribers.get(key)?.delete(callback);
}

export function subscribeToProject(projectId: string, callback: UpdateCallback): () => void {
  const key = `project:${projectId}`;
  if (!subscribers.has(key)) subscribers.set(key, new Set());
  subscribers.get(key)!.add(callback);
  sendSubscribe(key);
  return () => subscribers.get(key)?.delete(callback);
}

export function onUpdate(callback: UpdateCallback): () => void {
  const key = 'global';
  if (!subscribers.has(key)) subscribers.set(key, new Set());
  subscribers.get(key)!.add(callback);
  return () => subscribers.get(key)?.delete(callback);
}

export function emitRealtimeUpdate(update: RealtimeUpdate): void {
  notifySubscribers(update);
}

export function pingRealtime(): void {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ action: 'ping' }));
  }
}
