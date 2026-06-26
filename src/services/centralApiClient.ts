import { CENTRAL_API_BASE } from '../config/api';

const PROFILE_STORAGE = 'pimo-industrial-profile';

export const CENTRAL_API_TOKEN_SUPERVISOR = 'pimo-industrial-dev-token';
export const CENTRAL_API_TOKEN_OPERATOR = 'pimo-industrial-operator-token';

export { CENTRAL_API_BASE };

export function getActiveToken(): string {
  const profile = localStorage.getItem(PROFILE_STORAGE);
  return profile === 'operator' ? CENTRAL_API_TOKEN_OPERATOR : CENTRAL_API_TOKEN_SUPERVISOR;
}

export function centralHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getActiveToken()}`,
  };
}

export async function centralFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${CENTRAL_API_BASE}${path}`, {
    ...init,
    headers: { ...centralHeaders(), ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(err?.error ?? `Central API HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface FactoryFloorData {
  workstations: Array<{
    id: string;
    type: string;
    status: string;
    currentPiece: string | null;
    lastHeartbeat: string;
    factoryId: string;
  }>;
  piecesInProcess: Array<{ workstationId: string; type: string; qr: string | null }>;
  completedToday: Array<{ qr: string; pieceName: string; progressPercent: number; lastUpdatedAt: string | null }>;
  activeAlerts: Array<{ type?: string; message?: string; qr?: string; pieceName?: string }>;
  activeAnomalies: Array<{ anomalyCode?: string; severity?: string; message?: string; qr?: string; pieceName?: string }>;
  operatorProductivity: Array<{ operator: string; pieces: number; ops: number; minutes: number }>;
  avgOpMinutes: Array<{ operation: string; avgMinutes: number; count: number }>;
  atRiskPieces: Array<{ qr: string; pieceName: string; progressPercent: number; pieceStatus: string }>;
  syncSummary: { inSync: number; outOfSync: number; conflict: number };
  factories: Array<{ factoryId: string; nome: string; localizacao: string }>;
  wsClients: number;
}

export async function fetchFactoryFloor(): Promise<FactoryFloorData> {
  return centralFetch<FactoryFloorData>('/factory/floor');
}
