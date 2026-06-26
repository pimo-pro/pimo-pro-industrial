import type { PieceJson } from '@/types/piece';
import { StatusBadge } from '@/components/common/StatusBadge';

export function PieceHeader({ piece }: { piece: PieceJson }) {
  const syncLabel =
    piece.syncStatus === 'IN_SYNC'
      ? '● Sync OK'
      : piece.syncStatus === 'CONFLICT'
        ? '● Conflito'
        : '● Local';

  return (
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--accent)', letterSpacing: 1 }}>
            QR: {piece.qr ?? '—'} · {syncLabel} · {piece.source ?? 'LOCAL'}
          </p>
          <h1 className="page-title" style={{ marginBottom: 4 }}>
            {piece.pieceName}
          </h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            {piece.material} · {piece.thickness}mm · {piece.width} × {piece.height} mm
            {piece.factoryId ? ` · ${piece.factoryId}` : ''}
          </p>
        </div>
        <StatusBadge status={piece.pieceStatus} />
      </div>
    </div>
  );
}
