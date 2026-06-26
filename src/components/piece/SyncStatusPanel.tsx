import type { PieceJson, SyncStatus } from '@/types/piece';

const SYNC_LABELS: Record<SyncStatus, string> = {
  IN_SYNC: 'Sincronizado',
  OUT_OF_SYNC: 'Desatualizado',
  CONFLICT: 'Conflito',
  SYNCING: 'A sincronizar…',
};

const SYNC_CLASS: Record<SyncStatus, string> = {
  IN_SYNC: 'badge-done',
  OUT_OF_SYNC: 'badge-progress',
  CONFLICT: 'badge-pending',
  SYNCING: 'badge-progress',
};

export function SyncStatusPanel({
  piece,
  onSync,
  syncing,
}: {
  piece: PieceJson;
  onSync: () => void;
  syncing: boolean;
}) {
  const status = piece.syncStatus ?? 'OUT_OF_SYNC';

  return (
    <div className="panel">
      <h2>Sincronização Industrial</h2>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <span className={`badge ${SYNC_CLASS[status]}`}>{SYNC_LABELS[status]}</span>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            Origem: <strong>{piece.source ?? 'LOCAL'}</strong>
            {piece.factoryId ? ` · Fábrica ${piece.factoryId}` : ''}
          </p>
          {piece.syncedAt ? (
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
              Último sync: {new Date(piece.syncedAt).toLocaleString('pt-PT')}
            </p>
          ) : null}
        </div>
        <button type="button" className="btn btn-primary" disabled={syncing || !piece.qr} onClick={onSync}>
          {syncing ? 'A sincronizar…' : 'Sincronizar agora'}
        </button>
      </div>
    </div>
  );
}
