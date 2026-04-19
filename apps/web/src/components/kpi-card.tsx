import { cn } from '@/lib/utils/cn';

export function KpiCard({
  label,
  value,
  delta,
  tone = 'ok',
  icon,
}: {
  label: string;
  value: string | number;
  delta?: string;
  tone?: 'ok' | 'warn' | 'bad';
  icon?: string;
}) {
  const toneCls =
    tone === 'bad'
      ? 'text-red-600'
      : tone === 'warn'
      ? 'text-amber-600'
      : 'text-emerald-600';
  return (
    <div className="card relative p-4 overflow-hidden">
      <div className="absolute top-3 right-3 w-8 h-8 rounded-lg grid place-items-center bg-brand-50 text-brand font-extrabold text-sm">
        {icon ?? '•'}
      </div>
      <div className="text-xs font-semibold text-ink-2">{label}</div>
      <div className="text-2xl font-extrabold mt-1">{value}</div>
      {delta && <div className={cn('text-xs font-bold mt-1', toneCls)}>{delta}</div>}
    </div>
  );
}
