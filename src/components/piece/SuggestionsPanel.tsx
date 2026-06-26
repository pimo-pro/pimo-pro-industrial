import type { PieceJson } from '@/types/piece';

export function SuggestionsPanel({ piece }: { piece: PieceJson }) {
  const suggestions = piece.intelligence?.suggestions ?? [];

  return (
    <div className="panel">
      <h2>Sugestões automáticas</h2>
      {suggestions.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>Sem sugestões neste momento.</p>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
          {suggestions.map((s) => (
            <li key={s} style={{ marginBottom: 6 }}>
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
