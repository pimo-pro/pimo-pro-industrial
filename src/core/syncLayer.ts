import { centralFetch } from '@/services/centralApiClient';
import { applyIndustrialIntelligence } from './intelligencePipeline';
import { migratePieceJson } from './pieceNormalizer';
import {
  prepareSyncPayload,
  diffSyncPayloads,
  type SyncDiff,
} from './syncLayerTypes';
import type { DataSource, PieceJson, SyncStatus } from '../types/piece';

const LOCAL_BASE = '/api/industrial';

async function localFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(err?.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function getLocalPiece(
  user: string,
  project: string,
  box: string,
  pieceName: string
): Promise<PieceJson> {
  const detail = await localFetch<{ pieceJson: PieceJson }>(
    `${LOCAL_BASE}/projects/${encodeURIComponent(user)}/${encodeURIComponent(project)}/${encodeURIComponent(box)}/${encodeURIComponent(pieceName)}`
  );
  return detail.pieceJson;
}

async function saveLocalPiece(
  user: string,
  project: string,
  box: string,
  pieceName: string,
  piece: PieceJson
): Promise<PieceJson> {
  const res = await localFetch<{ pieceJson: PieceJson }>(
    `${LOCAL_BASE}/projects/${encodeURIComponent(user)}/${encodeURIComponent(project)}/${encodeURIComponent(box)}/${encodeURIComponent(pieceName)}/piece.json`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(piece),
    }
  );
  return res.pieceJson;
}

export interface SyncResult {
  piece: PieceJson;
  diff: SyncDiff[];
  syncStatus: SyncStatus;
  winner: 'LOCAL' | 'CENTRAL' | 'CONFLICT';
}

function mergeSyncFields(piece: PieceJson, central: Record<string, unknown>): PieceJson {
  return {
    ...piece,
    factoryId: String(central.factoryId ?? piece.factoryId ?? 'F1'),
    syncedAt: String(central.syncedAt ?? piece.syncedAt ?? new Date().toISOString()),
    syncStatus: (central.syncStatus as SyncStatus) ?? piece.syncStatus ?? 'OUT_OF_SYNC',
    source: (central.source as DataSource) ?? piece.source ?? 'LOCAL',
  };
}

function timestampOf(piece: PieceJson | Record<string, unknown>): number {
  const ts = piece.lastUpdatedAt;
  return ts ? new Date(String(ts)).getTime() : 0;
}

export async function syncPieceLocalToCentral(qr: string, localPiece: PieceJson): Promise<SyncResult> {
  const qrNorm = qr.toLowerCase();
  const migrated = migratePieceJson(localPiece);

  const response = await centralFetch<{
    piece: Record<string, unknown>;
    diff: SyncDiff[];
  }>(`/piece/${encodeURIComponent(qrNorm)}/update`, {
    method: 'POST',
    body: JSON.stringify({ piece: migrated, source: 'LOCAL' }),
  });

  const central = response.piece;
  const localTs = timestampOf(migrated);
  const centralTs = timestampOf(central);
  let winner: SyncResult['winner'] = 'LOCAL';
  let merged = mergeSyncFields(migrated, central);

  if (response.diff.some((d) => d.field === 'checksum') && localTs > 0 && centralTs > 0) {
    if (localTs > centralTs) {
      winner = 'LOCAL';
      merged = applyIndustrialIntelligence({ ...merged, ...migrated, syncStatus: 'IN_SYNC', source: 'LOCAL' });
    } else if (centralTs > localTs) {
      winner = 'CENTRAL';
      merged = applyIndustrialIntelligence({
        ...merged,
        ...(central as unknown as PieceJson),
        syncStatus: 'OUT_OF_SYNC',
        source: 'CENTRAL',
      });
    } else {
      winner = 'CONFLICT';
      merged = applyIndustrialIntelligence({
        ...merged,
        syncStatus: 'CONFLICT',
        alerts: [
          ...merged.alerts,
          {
            type: 'ALERTA',
            message: 'Conflito de sincronização — rever local e central.',
            timestamp: new Date().toISOString(),
            pieceName: merged.pieceName,
          },
        ],
      });
    }
  } else {
    merged = applyIndustrialIntelligence({ ...merged, syncStatus: 'IN_SYNC', source: 'LOCAL' });
  }

  const diff = [
    ...response.diff,
    ...diffSyncPayloads(prepareSyncPayload(merged), prepareSyncPayload(central as unknown as PieceJson)),
  ];

  return { piece: merged, diff, syncStatus: merged.syncStatus ?? 'IN_SYNC', winner };
}

export async function syncPieceCentralToLocal(
  qr: string,
  route: { user: string; project: string; box: string; pieceName: string }
): Promise<SyncResult> {
  const qrNorm = qr.toLowerCase();
  const { piece: central } = await centralFetch<{ piece: Record<string, unknown> }>(
    `/piece/${encodeURIComponent(qrNorm)}`
  );

  const local = await getLocalPiece(route.user, route.project, route.box, route.pieceName);
  const localTs = timestampOf(local);
  const centralTs = timestampOf(central);

  let winner: SyncResult['winner'] = 'CENTRAL';
  let merged: PieceJson;

  if (localTs > centralTs) {
    winner = 'LOCAL';
    merged = applyIndustrialIntelligence(mergeSyncFields(local, { ...central, syncStatus: 'OUT_OF_SYNC' }));
  } else if (centralTs > localTs) {
    winner = 'CENTRAL';
    merged = applyIndustrialIntelligence(
      mergeSyncFields({ ...local, ...(central as unknown as PieceJson) }, central)
    );
  } else {
    winner = 'CONFLICT';
    merged = applyIndustrialIntelligence(mergeSyncFields(local, { ...central, syncStatus: 'CONFLICT' }));
  }

  const saved = await saveLocalPiece(route.user, route.project, route.box, route.pieceName, merged);
  const diff = diffSyncPayloads(prepareSyncPayload(local), prepareSyncPayload(saved));
  return { piece: saved, diff, syncStatus: saved.syncStatus ?? 'IN_SYNC', winner };
}

export async function syncProject(user: string, project: string): Promise<{
  synced: number;
  conflicts: number;
}> {
  const central = await centralFetch<{
    pieces: Array<Record<string, unknown> & { qr?: string; route?: { user: string; project: string; box: string; pieceName: string } }>;
  }>(`/project/${encodeURIComponent(user)}/${encodeURIComponent(project)}`);

  let synced = 0;
  let conflicts = 0;

  for (const cp of central.pieces ?? []) {
    const route = cp.route as { user: string; project: string; box: string; pieceName: string } | undefined;
    const qr = String(cp.qr ?? '');
    if (!qr || !route) continue;
    try {
      const local = await getLocalPiece(route.user, route.project, route.box, route.pieceName);
      const r = await syncPieceLocalToCentral(qr, local);
      await saveLocalPiece(route.user, route.project, route.box, route.pieceName, r.piece);
      synced++;
      if (r.syncStatus === 'CONFLICT') conflicts++;
    } catch {
      /* skip */
    }
  }

  return { synced, conflicts };
}

export async function bidirectionalSync(
  qr: string,
  route: { user: string; project: string; box: string; pieceName: string },
  localPiece: PieceJson
): Promise<SyncResult> {
  const toCentral = await syncPieceLocalToCentral(qr, localPiece);
  await saveLocalPiece(route.user, route.project, route.box, route.pieceName, toCentral.piece);
  return syncPieceCentralToLocal(qr, route);
}

export { prepareSyncPayload, prepareProjectSyncPayload, diffSyncPayloads } from './syncLayerTypes';
export type { PieceSyncPayload, ProjectSyncPayload, SyncDiff } from './syncLayerTypes';
