import type {
  CreateQualityInspectionInput,
  QualityInspectionPoint,
} from '@/industrial/quality/types';
import type { OperationName, PieceJson } from '@/types/piece';

const LOCAL_BASE = '/api/industrial';

async function postPieceAction<T>(
  user: string,
  project: string,
  box: string,
  pieceName: string,
  suffix: string,
  body: unknown
): Promise<T> {
  const url = `${LOCAL_BASE}/projects/${encodeURIComponent(user)}/${encodeURIComponent(project)}/${encodeURIComponent(box)}/${encodeURIComponent(pieceName)}/${suffix}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(err?.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function getSupervisorDashboard(user: string, project: string) {
  return fetch(
    `${LOCAL_BASE}/projects/${encodeURIComponent(user)}/${encodeURIComponent(project)}/supervisor`
  ).then(async (res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  });
}

export function completeWorkOrderApi(
  user: string,
  project: string,
  box: string,
  pieceName: string,
  operation: OperationName,
  options?: { user?: string; override?: boolean; notes?: string }
) {
  return postPieceAction<{ pieceJson: PieceJson }>(
    user,
    project,
    box,
    pieceName,
    `work-orders/${encodeURIComponent(operation)}`,
    { action: 'complete', ...options }
  ).then((r) => r.pieceJson);
}

export function registerQualityApi(
  user: string,
  project: string,
  box: string,
  pieceName: string,
  input: CreateQualityInspectionInput
) {
  return postPieceAction<{ pieceJson: PieceJson }>(
    user,
    project,
    box,
    pieceName,
    'quality',
    input
  ).then((r) => r.pieceJson);
}

export function createReworkApi(
  user: string,
  project: string,
  box: string,
  pieceName: string,
  input: { reason: string; toOperationId?: string; requestedBy?: string }
) {
  return postPieceAction<{ pieceJson: PieceJson }>(
    user,
    project,
    box,
    pieceName,
    'rework',
    input
  ).then((r) => r.pieceJson);
}

export function resolveReworkApi(
  user: string,
  project: string,
  box: string,
  pieceName: string,
  reworkId: string,
  status: 'resolved' | 'rejected' | 'in_progress',
  resolvedBy?: string
) {
  return postPieceAction<{ pieceJson: PieceJson }>(
    user,
    project,
    box,
    pieceName,
    `rework/${encodeURIComponent(reworkId)}/resolve`,
    { status, resolvedBy }
  ).then((r) => r.pieceJson);
}

export type { QualityInspectionPoint };
