import type { PieceDetailResponse, PieceJson, ProjectDashboard, QrLookupResult } from '@/types/piece';
import { centralFetch } from '@/services/centralApiClient';
import { bidirectionalSync } from '@/core/syncLayer';
import { connectWebSocket } from '@/core/realtime';

const LOCAL_BASE = '/api/industrial';

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(err?.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface PieceRepository {
  listProjects(): Promise<import('@/types/piece').IndustrialProjectSummary[]>;
  getProjectDashboard(user: string, project: string): Promise<ProjectDashboard>;
  getBoxDetail(user: string, project: string, box: string): Promise<import('@/types/piece').BoxDetail>;
  getPiece(user: string, project: string, box: string, pieceName: string): Promise<PieceDetailResponse>;
  updatePiece(user: string, project: string, box: string, pieceName: string, piece: PieceJson): Promise<PieceJson>;
  lookupQr(qrCode: string): Promise<QrLookupResult>;
  /** Fase 4 — QR-first */
  loadPieceByQr(qrCode: string): Promise<PieceDetailResponse>;
  syncPieceNow(qr: string, route: { user: string; project: string; box: string; pieceName: string }, piece: PieceJson): Promise<PieceJson>;
}

export const localPieceRepository: PieceRepository = {
  listProjects: () =>
    fetchJson<{ projects: import('@/types/piece').IndustrialProjectSummary[] }>(`${LOCAL_BASE}/projects`).then(
      (r) => r.projects
    ),

  getProjectDashboard: (user, project) =>
    fetchJson(`${LOCAL_BASE}/projects/${encodeURIComponent(user)}/${encodeURIComponent(project)}`),

  getBoxDetail: (user, project, box) =>
    fetchJson(
      `${LOCAL_BASE}/projects/${encodeURIComponent(user)}/${encodeURIComponent(project)}/${encodeURIComponent(box)}`
    ),

  getPiece: async (user, project, box, pieceName) => {
    const detail = await fetchJson<PieceDetailResponse>(
      `${LOCAL_BASE}/projects/${encodeURIComponent(user)}/${encodeURIComponent(project)}/${encodeURIComponent(box)}/${encodeURIComponent(pieceName)}`
    );
    if (detail.pieceJson.qr) {
      try {
        connectWebSocket();
        const synced = await localPieceRepository.syncPieceNow(
          detail.pieceJson.qr,
          { user, project, box, pieceName },
          detail.pieceJson
        );
        return { ...detail, pieceJson: synced };
      } catch {
        return detail;
      }
    }
    return detail;
  },

  updatePiece: (user, project, box, pieceName, piece) =>
    fetchJson<{ pieceJson: PieceJson }>(
      `${LOCAL_BASE}/projects/${encodeURIComponent(user)}/${encodeURIComponent(project)}/${encodeURIComponent(box)}/${encodeURIComponent(pieceName)}/piece.json`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(piece),
      }
    ).then(async (r) => {
      if (r.pieceJson.qr) {
        try {
          return await localPieceRepository.syncPieceNow(
            r.pieceJson.qr,
            { user, project, box, pieceName },
            r.pieceJson
          );
        } catch {
          return r.pieceJson;
        }
      }
      return r.pieceJson;
    }),

  lookupQr: async (qrCode) => {
    try {
      const central = await centralFetch<QrLookupResult>(`/lookup/${encodeURIComponent(qrCode)}`);
      return central;
    } catch {
      return fetchJson(`${LOCAL_BASE}/qr/${encodeURIComponent(qrCode)}`);
    }
  },

  loadPieceByQr: async (qrCode) => {
    const lookup = await localPieceRepository.lookupQr(qrCode);
    const detail = await localPieceRepository.getPiece(lookup.user, lookup.project, lookup.box, lookup.pieceName);
    if (detail.pieceJson.qr) {
      const synced = await localPieceRepository.syncPieceNow(
        detail.pieceJson.qr,
        { user: lookup.user, project: lookup.project, box: lookup.box, pieceName: lookup.pieceName },
        detail.pieceJson
      );
      return { ...detail, pieceJson: synced };
    }
    return detail;
  },

  syncPieceNow: async (qr, route, piece) => {
    const result = await bidirectionalSync(qr, route, piece);
    return result.piece;
  },
};

export const pieceRepository: PieceRepository = localPieceRepository;

export const listIndustrialProjects = () => pieceRepository.listProjects();
export const getProjectDashboard = (user: string, project: string) =>
  pieceRepository.getProjectDashboard(user, project);
export const getBoxDetail = (user: string, project: string, box: string) =>
  pieceRepository.getBoxDetail(user, project, box);
export const getPieceDetail = (user: string, project: string, box: string, pieceName: string) =>
  pieceRepository.getPiece(user, project, box, pieceName);
export const savePieceJson = (
  user: string,
  project: string,
  box: string,
  pieceName: string,
  pieceJson: PieceJson
) => pieceRepository.updatePiece(user, project, box, pieceName, pieceJson);
export const lookupQr = (qrCode: string) => pieceRepository.lookupQr(qrCode);
export const loadPieceByQr = (qrCode: string) => pieceRepository.loadPieceByQr(qrCode);
