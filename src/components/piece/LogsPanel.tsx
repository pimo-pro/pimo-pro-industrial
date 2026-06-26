import type { PieceJson } from '@/types/piece';

const ACTION_LABELS: Record<string, string> = {
  DONE: 'Concluído',
  UNDO: 'Desfeito',
  OVERRIDE: 'Override',
  START: 'Início',
};

export function LogsPanel({ piece }: { piece: PieceJson }) {
  const logs = [...piece.logs].reverse();

  return (
    <div className="panel">
      <h2>Logs ({piece.logs.length})</h2>
      {logs.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>Sem registos ainda.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ fontSize: 13 }}>
            <thead>
              <tr>
                <th>Data</th>
                <th>Operação</th>
                <th>Ação</th>
                <th>Utilizador</th>
                <th>Override</th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={`${log.timestamp}-${i}`}>
                  <td>{new Date(log.timestamp).toLocaleString('pt-PT')}</td>
                  <td>{log.operation}</td>
                  <td>{ACTION_LABELS[log.action] ?? log.action}</td>
                  <td>{log.user}</td>
                  <td>{log.override ? 'Sim' : '—'}</td>
                  <td>{log.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
