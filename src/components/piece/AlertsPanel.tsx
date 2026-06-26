import { alertSeverityClass } from '@/core/alerts';
import type { PieceJson } from '@/types/piece';

export function AlertsPanel({ piece }: { piece: PieceJson }) {
  const alerts = [...(piece.alerts ?? [])].reverse();

  return (
    <div className="panel">
      <h2>Alertas ({alerts.length})</h2>
      {alerts.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>Sem alertas activos.</p>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {alerts.map((alert, i) => (
            <div key={`${alert.timestamp}-${i}`} className={`alert-item ${alertSeverityClass(alert.type)}`}>
              <strong>{alert.type}</strong>
              {alert.operation ? (
                <span style={{ marginLeft: 8, color: 'var(--text-muted)', fontSize: 12 }}>{alert.operation}</span>
              ) : null}
              <p style={{ margin: '4px 0 0', fontSize: 13 }}>{alert.message}</p>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {new Date(alert.timestamp).toLocaleString('pt-PT')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
