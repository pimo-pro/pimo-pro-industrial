import { useState } from 'react';

import { getPrerequisites } from '@/core/priorityRules';
import { workOrderLabel } from '@/core/operations';
import { completeWorkOrder } from '@/core/workOrders';
import { DEFAULT_OPERATOR } from '@/core/sessions';
import type { OperationName, PieceJson } from '@/types/piece';

export function WorkOrdersPanel({
  piece,
  onSave,
  saving,
}: {
  piece: PieceJson;
  onSave: (next: PieceJson) => Promise<void>;
  saving: boolean;
}) {
  const [confirmOverride, setConfirmOverride] = useState<OperationName | null>(null);
  const [overrideMessage, setOverrideMessage] = useState('');

  async function toggleWo(operation: OperationName, override = false) {
    const result = completeWorkOrder(piece, operation, {
      user: DEFAULT_OPERATOR,
      override,
    });

    if (result.blocked && result.requiresOverride) {
      setConfirmOverride(operation);
      setOverrideMessage(result.message ?? 'Ordem de prioridade incorreta.');
      return;
    }

    setConfirmOverride(null);
    await onSave(result.piece);
  }

  return (
    <div className="panel">
      <h2>Work Orders</h2>
      {confirmOverride ? (
        <div className="override-banner">
          <p style={{ margin: '0 0 8px' }}>{overrideMessage}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void toggleWo(confirmOverride, true)}
            >
              Confirmar override
            </button>
            <button type="button" className="btn" onClick={() => setConfirmOverride(null)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      {piece.workOrders.map((wo) => {
        const prereqs = getPrerequisites(wo.operation);
        const done = wo.status === 'DONE';
        return (
          <div key={wo.operation} className="op-row">
            <div>
              <strong>{workOrderLabel(wo.operation)}</strong>
              <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 6 }}>
                {wo.operation}
              </span>
              {!wo.required ? (
                <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 6 }}>(opcional)</span>
              ) : null}
              {prereqs.length > 0 && !done ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                  Requer: {prereqs.join(' → ')}
                </div>
              ) : null}
              {wo.override ? (
                <div style={{ color: 'var(--warning)', fontSize: 11 }}>⚠ Override registado</div>
              ) : null}
              {wo.doneAt ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  {wo.doneBy} · {new Date(wo.doneAt).toLocaleString('pt-PT')}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className={`btn ${done ? 'btn-done' : ''}`}
              disabled={saving}
              onClick={() => void toggleWo(wo.operation)}
            >
              {done ? '✓ Concluído' : 'Concluir'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
