import type { PieceJson } from '@/types/piece';

const SEVERITY_CLASS: Record<string, string> = {
  LOW: 'badge-pending',
  MEDIUM: 'badge-progress',
  HIGH: 'badge-done',
};

export function AnomaliesPanel({ piece }: { piece: PieceJson }) {
  const anomalies = piece.anomalies ?? [];

  return (
    <div className="panel">
      <h2>Anomalias ({anomalies.length})</h2>
      {anomalies.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>Nenhuma anomalia detectada.</p>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {anomalies.map((a) => (
            <div key={`${a.anomalyCode}-${a.timestamp}`} style={{ fontSize: 13 }}>
              <span className={`badge ${SEVERITY_CLASS[a.severity] ?? 'badge-pending'}`}>{a.severity}</span>
              <strong style={{ marginLeft: 8 }}>{a.anomalyCode}</strong>
              <p style={{ margin: '4px 0 0', color: 'var(--text-muted)' }}>{a.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
