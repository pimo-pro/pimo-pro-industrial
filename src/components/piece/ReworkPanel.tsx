import { useState } from 'react';

import type { ReworkRequest } from '@/types/piece';

interface ReworkPanelProps {
  requests: ReworkRequest[];
  onCreate: (reason: string) => Promise<void>;
  onResolve: (reworkId: string) => Promise<void>;
  disabled?: boolean;
}

export function ReworkPanel({ requests, onCreate, onResolve, disabled }: ReworkPanelProps) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const open = requests.filter((r) => r.status === 'open' || r.status === 'in_progress');

  return (
    <section className="industrial-panel">
      <h3>Retrabalho</h3>
      <ul className="industrial-list compact">
        {requests.length === 0 ? <li>Sem pedidos</li> : null}
        {requests.map((r) => (
          <li key={r.id}>
            <strong>{r.status}</strong> — {r.reason}
            {r.status === 'open' || r.status === 'in_progress' ? (
              <button
                type="button"
                className="industrial-inline-btn"
                disabled={disabled || busy}
                onClick={() => {
                  setBusy(true);
                  void onResolve(r.id).finally(() => setBusy(false));
                }}
              >
                Resolver
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {open.length === 0 ? (
        <div className="industrial-form-row">
          <input
            type="text"
            placeholder="Motivo do retrabalho"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={disabled || busy}
          />
          <button
            type="button"
            disabled={disabled || busy || !reason.trim()}
            onClick={() => {
              setBusy(true);
              void onCreate(reason)
                .then(() => setReason(''))
                .finally(() => setBusy(false));
            }}
          >
            Abrir rework
          </button>
        </div>
      ) : null}
    </section>
  );
}
