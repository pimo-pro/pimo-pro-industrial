import { getSessionSummary } from '@/core/sessions';
import type { PieceJson } from '@/types/piece';

export function ProductivityPanel({ piece }: { piece: PieceJson }) {
  const intel = piece.intelligence;
  const sessionSummary = getSessionSummary(piece);

  return (
    <div className="panel">
      <h2>Produtividade da peça</h2>
      <div className="kpi-row" style={{ marginBottom: 0 }}>
        <div className="kpi">
          <strong>{intel?.productivityScore ?? 0}</strong>
          <span>Score (0–100)</span>
        </div>
        <div className="kpi">
          <strong>{sessionSummary.totalActiveMinutes}</strong>
          <span>Min. activos</span>
        </div>
        <div className="kpi">
          <strong>{sessionSummary.sessionCount}</strong>
          <span>Sessões</span>
        </div>
        <div className="kpi">
          <strong>{intel?.averageMinutesPerOperation ?? '—'}</strong>
          <span>Min/operação</span>
        </div>
      </div>
    </div>
  );
}
