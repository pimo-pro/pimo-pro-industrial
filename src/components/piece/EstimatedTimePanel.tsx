import type { PieceJson } from '@/types/piece';

export function EstimatedTimePanel({ piece }: { piece: PieceJson }) {
  const minutes = piece.intelligence?.estimatedMinutesRemaining ?? 0;

  return (
    <div className="panel">
      <h2>Tempo estimado restante</h2>
      {piece.pieceStatus === 'DONE' ? (
        <p style={{ color: 'var(--success)' }}>Peça concluída — sem tempo restante.</p>
      ) : (
        <>
          <p style={{ fontSize: 28, margin: '0 0 8px', fontWeight: 700 }}>
            {minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60}min`}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
            Baseado em {piece.workOrders.filter((w) => w.required && w.status !== 'DONE').length} WO pendentes
            e histórico de operações.
          </p>
        </>
      )}
    </div>
  );
}
