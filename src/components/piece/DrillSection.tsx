import { completeWorkOrder } from '@/core/workOrders';
import { DEFAULT_OPERATOR } from '@/core/sessions';
import type { PieceHole, PieceJson } from '@/types/piece';

function edgeDistances(hole: PieceHole, width: number, height: number) {
  return {
    left: hole.x,
    right: width - hole.x,
    top: hole.y,
    bottom: height - hole.y,
  };
}

export function DrillSection({
  piece,
  selectedHoleId,
  onSelectHole,
  onSave,
  saving,
}: {
  piece: PieceJson;
  selectedHoleId: string | null;
  onSelectHole: (id: string | null) => void;
  onSave: (next: PieceJson) => Promise<void>;
  saving: boolean;
}) {
  const allConfirmed = piece.holes.length > 0 && piece.holes.every((h) => h.confirmed);
  const drillDone = piece.workOrders.find((w) => w.operation === 'DRILL')?.status === 'DONE';

  async function toggleHoleConfirm(holeId: string) {
    const holes = piece.holes.map((h) => (h.id === holeId ? { ...h, confirmed: !h.confirmed } : h));
    await onSave({ ...piece, holes });
  }

  async function markDrillDone() {
    const result = completeWorkOrder(piece, 'DRILL', { user: DEFAULT_OPERATOR });
    if (!result.blocked) await onSave(result.piece);
  }

  return (
    <div className="panel">
      <h2>DRILL — Furos ({piece.holes.length})</h2>
      {piece.holes.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>Sem furos nesta peça.</p>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {piece.holes.map((hole) => {
            const dist = edgeDistances(hole, piece.width, piece.height);
            const selected = selectedHoleId === hole.id;
            return (
              <div
                key={hole.id}
                className={`hole-item ${selected ? 'selected' : ''}`}
                onClick={() => onSelectHole(selected ? null : hole.id)}
                onKeyDown={(e) => e.key === 'Enter' && onSelectHole(selected ? null : hole.id)}
                role="button"
                tabIndex={0}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <strong>{hole.id}</strong>
                  <button
                    type="button"
                    className={`btn ${hole.confirmed ? 'btn-done' : ''}`}
                    disabled={saving || drillDone}
                    onClick={(e) => {
                      e.stopPropagation();
                      void toggleHoleConfirm(hole.id);
                    }}
                  >
                    {hole.confirmed ? 'Confirmado' : 'Confirmar furo'}
                  </button>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Ø{hole.diameter}mm · prof. {hole.depth}mm · pos ({hole.x}, {hole.y})
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Bordas: E {dist.left} · D {dist.right} · S {dist.top} · I {dist.bottom} mm
                </div>
              </div>
            );
          })}
        </div>
      )}
      {piece.holes.length > 0 && !drillDone ? (
        <button
          type="button"
          className="btn btn-primary"
          style={{ marginTop: 12, width: '100%' }}
          disabled={saving || !allConfirmed}
          onClick={() => void markDrillDone()}
        >
          Marcar DRILL concluído {allConfirmed ? '' : '(confirme todos os furos)'}
        </button>
      ) : null}
    </div>
  );
}
