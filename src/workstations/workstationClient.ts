import { centralFetch } from '@/services/centralApiClient';
import type { Workstation } from './types';

const HEARTBEAT_MS = 10_000;

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let workstationId: string | null = null;

export async function fetchWorkstations(): Promise<Workstation[]> {
  const res = await centralFetch<{ workstations: Workstation[] }>('/workstation');
  return res.workstations ?? [];
}

export async function sendHeartbeat(id: string): Promise<Workstation> {
  const res = await centralFetch<{ workstation: Workstation }>('/workstation/heartbeat', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
  return res.workstation;
}

export async function assignPiece(id: string, qr: string): Promise<Workstation> {
  const res = await centralFetch<{ workstation: Workstation }>('/workstation/assign', {
    method: 'POST',
    body: JSON.stringify({ id, qr }),
  });
  return res.workstation;
}

export async function releasePiece(id: string): Promise<Workstation> {
  const res = await centralFetch<{ workstation: Workstation }>('/workstation/release', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
  return res.workstation;
}

export function startWorkstationHeartbeat(id: string): void {
  workstationId = id;
  stopWorkstationHeartbeat();
  void sendHeartbeat(id);
  heartbeatTimer = setInterval(() => {
    if (workstationId) void sendHeartbeat(workstationId).catch(() => undefined);
  }, HEARTBEAT_MS);
}

export function stopWorkstationHeartbeat(): void {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = null;
  workstationId = null;
}

export function getActiveWorkstationId(): string | null {
  return workstationId;
}
