import { bidirectionalSync, syncPieceCentralToLocal, syncPieceLocalToCentral } from './syncLayer';
import { onUpdate, subscribeToPiece } from './realtime';
import type { PieceJson } from '../types/piece';

const PUSH_INTERVAL_MS = 30_000;
const PULL_INTERVAL_MS = 30_000;

let pushTimer: ReturnType<typeof setInterval> | null = null;
let pullTimer: ReturnType<typeof setInterval> | null = null;
let wsUnsub: (() => void) | null = null;

type SyncContext = {
  qr: string;
  route: { user: string; project: string; box: string; pieceName: string };
  getLocalPiece: () => Promise<PieceJson>;
  onSynced?: (piece: PieceJson) => void;
};

let activeContext: SyncContext | null = null;

export function setContinuousSyncContext(ctx: SyncContext | null): void {
  activeContext = ctx;
}

export async function syncNowImmediate(): Promise<void> {
  if (!activeContext) return;
  const { qr, route, getLocalPiece, onSynced } = activeContext;
  try {
    const local = await getLocalPiece();
    const result = await bidirectionalSync(qr, route, { ...local, syncStatus: 'SYNCING' });
    onSynced?.(result.piece);
  } catch {
    /* API offline — continua local */
  }
}

async function pushCycle(): Promise<void> {
  if (!activeContext) return;
  const { qr, getLocalPiece } = activeContext;
  try {
    const local = await getLocalPiece();
    await syncPieceLocalToCentral(qr, { ...local, syncStatus: 'SYNCING' });
  } catch {
    /* ignore */
  }
}

async function pullCycle(): Promise<void> {
  if (!activeContext) return;
  const { qr, route, onSynced } = activeContext;
  try {
    const result = await syncPieceCentralToLocal(qr, route);
    onSynced?.(result.piece);
  } catch {
    /* ignore */
  }
}

export function startContinuousSync(): void {
  stopContinuousSync();

  pushTimer = setInterval(() => void pushCycle(), PUSH_INTERVAL_MS);
  pullTimer = setInterval(() => void pullCycle(), PULL_INTERVAL_MS);

  wsUnsub = onUpdate((update) => {
    if (
      update.type.startsWith('piece.') ||
      update.type === 'piece.updated' ||
      update.type === 'piece.synced' ||
      update.type === 'piece.conflict'
    ) {
      void pullCycle();
    }
  });
}

export function stopContinuousSync(): void {
  if (pushTimer) clearInterval(pushTimer);
  if (pullTimer) clearInterval(pullTimer);
  pushTimer = null;
  pullTimer = null;
  wsUnsub?.();
  wsUnsub = null;
}

export function subscribePieceContinuousSync(
  qr: string,
  route: { user: string; project: string; box: string; pieceName: string },
  getLocalPiece: () => Promise<PieceJson>,
  onSynced: (piece: PieceJson) => void
): () => void {
  setContinuousSyncContext({ qr, route, getLocalPiece, onSynced });
  const unsubWs = subscribeToPiece(qr, () => void pullCycle());
  return () => {
    unsubWs();
    setContinuousSyncContext(null);
  };
}
