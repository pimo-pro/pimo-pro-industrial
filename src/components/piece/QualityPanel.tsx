import { useState } from 'react';

import type { QualityDecision } from '@/types/piece';

interface QualityPanelProps {
  inspections: import('@/types/piece').QualityInspection[];
  onRegister: (input: {
    decision: QualityDecision;
    reason?: string;
    notes?: string;
  }) => Promise<void>;
  disabled?: boolean;
}

export function QualityPanel({ inspections, onRegister, disabled }: QualityPanelProps) {
  const [decision, setDecision] = useState<QualityDecision>('approved');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    setBusy(true);
    try {
      await onRegister({ decision, reason: reason || undefined });
      setReason('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="industrial-panel">
      <h3>Qualidade</h3>
      <ul className="industrial-list compact">
        {inspections.length === 0 ? <li>Sem inspeções</li> : null}
        {inspections.map((q) => (
          <li key={q.id}>
            {q.decision} — {new Date(q.createdAt).toLocaleString()}
            {q.reason ? ` (${q.reason})` : ''}
          </li>
        ))}
      </ul>
      <div className="industrial-form-row">
        <select value={decision} onChange={(e) => setDecision(e.target.value as QualityDecision)} disabled={disabled || busy}>
          <option value="approved">Aprovado</option>
          <option value="rework">Retrabalho</option>
          <option value="rejected">Rejeitado</option>
        </select>
        <input
          type="text"
          placeholder="Motivo"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={disabled || busy}
        />
        <button type="button" onClick={() => void handleSubmit()} disabled={disabled || busy}>
          Registar QC
        </button>
      </div>
    </section>
  );
}
