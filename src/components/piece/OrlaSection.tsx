import { completeWorkOrder } from '@/core/workOrders';
import { DEFAULT_OPERATOR } from '@/core/sessions';
import type { PieceJson } from '@/types/piece';

export function OrlaSection({
  piece,
  onSave,
  saving,
}: {
  piece: PieceJson;
  onSave: (next: PieceJson) => Promise<void>;
  saving: boolean;
}) {
  const { orla } = piece;
  const orlarDone = piece.workOrders.find((w) => w.operation === 'ORLAR')?.status === 'DONE';

  async function markOrlarDone() {
    const result = completeWorkOrder(piece, 'ORLAR', { user: DEFAULT_OPERATOR });
    if (!result.blocked) await onSave(result.piece);
  }

  return (
    <div className="panel">
      <h2>ORLAR</h2>
      {orla.hasOrla ? (
        <>
          <p style={{ margin: '0 0 8px' }}>
            Fita: <strong>{orla.type || 'PVC'}</strong>
          </p>
          <p style={{ margin: '0 0 12px', color: 'var(--text-muted)' }}>
            Lados: {orla.edges.length > 0 ? orla.edges.join(', ') : '—'}
          </p>
          {!orlarDone ? (
            <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void markOrlarDone()}>
              Marcar ORLAR concluído
            </button>
          ) : (
            <p style={{ color: 'var(--success)', fontSize: 13 }}>ORLAR concluído</p>
          )}
        </>
      ) : (
        <p style={{ color: 'var(--text-muted)' }}>Esta peça não tem orla.</p>
      )}
    </div>
  );
}
