import { getActiveSession } from '@/core/sessions';
import type { PieceJson } from '@/types/piece';

export function SessionsPanel({ piece }: { piece: PieceJson }) {
  const active = getActiveSession(piece);
  const sessions = [...piece.sessions].reverse();

  return (
    <div className="panel">
      <h2>Sessões</h2>
      {active ? (
        <p style={{ fontSize: 13, color: 'var(--accent)', margin: '0 0 12px' }}>
          Sessão activa: {active.user} · desde {new Date(active.startedAt).toLocaleString('pt-PT')}
          {active.activeMinutes != null ? ` · ${active.activeMinutes} min activos` : ''}
        </p>
      ) : (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 12px' }}>Sem sessão activa.</p>
      )}
      {sessions.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>Sem sessões registadas.</p>
      ) : (
        <table className="table" style={{ fontSize: 13 }}>
          <thead>
            <tr>
              <th>Utilizador</th>
              <th>Início</th>
              <th>Fim</th>
              <th>Activos</th>
              <th>Produtiv.</th>
              <th>Peças</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.sessionId}>
                <td>{s.user}</td>
                <td>{new Date(s.startedAt).toLocaleString('pt-PT')}</td>
                <td>{s.endedAt ? new Date(s.endedAt).toLocaleString('pt-PT') : '—'}</td>
                <td>{s.activeMinutes != null ? `${s.activeMinutes} min` : '—'}</td>
                <td>{s.productivityPerHour != null ? `${s.productivityPerHour}/h` : '—'}</td>
                <td>{s.piecesWorked.length > 0 ? s.piecesWorked.join(', ') : piece.pieceName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
