import type { PieceJson } from '../types/piece';

export interface PieceSyncPayload {
  version: 3;
  pieceName: string;
  qr?: string;
  pieceStatus: string;
  progressPercent: number;
  workOrders: PieceJson['workOrders'];
  logsCount: number;
  anomaliesCount: number;
  lastUpdatedAt: string | null;
  checksum: string;
}

export interface ProjectSyncPayload {
  version: 3;
  user: string;
  project: string;
  pieceCount: number;
  progressPercent: number;
  pieces: PieceSyncPayload[];
  generatedAt: string;
}

export interface SyncDiff {
  pieceName?: string;
  field: string;
  local: unknown;
  central?: unknown;
  remote?: unknown;
}

function simpleChecksum(data: string): string {
  let h = 0;
  for (let i = 0; i < data.length; i++) h = (h * 31 + data.charCodeAt(i)) | 0;
  return `c${Math.abs(h).toString(16)}`;
}

export function prepareSyncPayload(piece: PieceJson): PieceSyncPayload {
  const core = JSON.stringify({
    pieceName: piece.pieceName,
    qr: piece.qr,
    status: piece.pieceStatus,
    progress: piece.progressPercent,
    wo: piece.workOrders.map((w) => ({ op: w.operation, s: w.status })),
  });
  return {
    version: 3,
    pieceName: piece.pieceName,
    qr: piece.qr,
    pieceStatus: piece.pieceStatus,
    progressPercent: piece.progressPercent,
    workOrders: piece.workOrders,
    logsCount: piece.logs.length,
    anomaliesCount: piece.anomalies?.length ?? 0,
    lastUpdatedAt: piece.lastUpdatedAt,
    checksum: simpleChecksum(core),
  };
}

export function prepareProjectSyncPayload(
  meta: { user: string; project: string },
  pieces: PieceJson[]
): ProjectSyncPayload {
  const payloads = pieces.map(prepareSyncPayload);
  const progressPercent =
    pieces.length > 0
      ? Math.round(pieces.reduce((s, p) => s + p.progressPercent, 0) / pieces.length)
      : 0;
  return {
    version: 3,
    user: meta.user,
    project: meta.project,
    pieceCount: pieces.length,
    progressPercent,
    pieces: payloads,
    generatedAt: new Date().toISOString(),
  };
}

export function diffSyncPayloads(local: PieceSyncPayload, remote: PieceSyncPayload): SyncDiff[] {
  const diffs: SyncDiff[] = [];
  if (local.pieceStatus !== remote.pieceStatus) {
    diffs.push({
      pieceName: local.pieceName,
      field: 'pieceStatus',
      local: local.pieceStatus,
      central: remote.pieceStatus,
      remote: remote.pieceStatus,
    });
  }
  if (local.progressPercent !== remote.progressPercent) {
    diffs.push({
      pieceName: local.pieceName,
      field: 'progressPercent',
      local: local.progressPercent,
      central: remote.progressPercent,
      remote: remote.progressPercent,
    });
  }
  if (local.checksum !== remote.checksum) {
    diffs.push({
      pieceName: local.pieceName,
      field: 'checksum',
      local: local.checksum,
      central: remote.checksum,
      remote: remote.checksum,
    });
  }
  return diffs;
}
