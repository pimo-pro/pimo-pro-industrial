import type { TrackingStatus } from '@/types/piece';

const LABELS: Record<TrackingStatus, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em processo',
  DONE: 'Concluída',
};

export function StatusBadge({ status, label }: { status: TrackingStatus; label?: string }) {
  const cls =
    status === 'DONE' ? 'badge-done' : status === 'IN_PROGRESS' ? 'badge-progress' : 'badge-pending';
  return <span className={`badge ${cls}`}>{label ?? LABELS[status]}</span>;
}
