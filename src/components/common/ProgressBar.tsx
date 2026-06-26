export function ProgressBar({ percent }: { percent: number }) {
  const safe = Math.max(0, Math.min(100, percent));
  return (
    <div className="progress-bar" aria-label={`${safe}% concluído`}>
      <span style={{ width: `${safe}%` }} />
    </div>
  );
}
