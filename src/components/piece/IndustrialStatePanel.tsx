import { StatusBadge } from '@/components/common/StatusBadge';
import { ProgressBar } from '@/components/common/ProgressBar';
import type { PieceJson } from '@/types/piece';

export function IndustrialStatePanel({ piece }: { piece: PieceJson }) {
  return (
    <div className="panel">
      <h2>Estado Industrial</h2>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <StatusBadge status={piece.pieceStatus} />
        <strong>{piece.progressPercent}%</strong>
      </div>
      <ProgressBar percent={piece.progressPercent} />
      <dl style={{ margin: '12px 0 0', fontSize: 14, display: 'grid', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <dt style={{ color: 'var(--text-muted)' }}>Última operação</dt>
          <dd style={{ margin: 0 }}>{piece.lastOperation ?? '—'}</dd>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <dt style={{ color: 'var(--text-muted)' }}>Atualizado em</dt>
          <dd style={{ margin: 0 }}>
            {piece.lastUpdatedAt ? new Date(piece.lastUpdatedAt).toLocaleString('pt-PT') : '—'}
          </dd>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <dt style={{ color: 'var(--text-muted)' }}>Por</dt>
          <dd style={{ margin: 0 }}>{piece.lastUpdatedBy ?? '—'}</dd>
        </div>
      </dl>
    </div>
  );
}
