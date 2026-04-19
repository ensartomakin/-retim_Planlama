'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { transitionWorkOrder } from '@/lib/actions/work-order';
import type { WorkOrderEvent } from '@tekstil/contracts';

const NEXT_EVENTS: Record<string, { event: WorkOrderEvent; label: string; tone?: string }[]> = {
  OLUSTURULDU: [{ event: 'start_cut', label: '▶ Kesime Başla', tone: 'primary' }],
  KESIM: [
    { event: 'cut_done', label: '✓ Kesim Tamam', tone: 'primary' },
    { event: 'pause', label: '⏸ Duraklat' },
  ],
  DIKIM: [
    { event: 'sew_done', label: '✓ Dikim Tamam', tone: 'primary' },
    { event: 'pause', label: '⏸ Duraklat' },
  ],
  KALITE: [
    { event: 'qc_passed', label: '✓ Kalite OK', tone: 'primary' },
    { event: 'qc_failed_rework', label: '↩ Yeniden Dik', tone: 'warn' },
  ],
  PAKETLEME: [{ event: 'packed', label: '✓ Paketlendi', tone: 'primary' }],
  DURAKLADI: [
    { event: 'resume_cut', label: '▶ Kesime Devam' },
    { event: 'resume_sew', label: '▶ Dikime Devam' },
  ],
};

export function WOTransition({ woId, status }: { woId: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const actions = NEXT_EVENTS[status];
  if (!actions?.length) return null;

  function fire(event: WorkOrderEvent) {
    startTransition(async () => {
      try {
        await transitionWorkOrder(woId, event);
        router.refresh();
      } catch (e) {
        alert((e as Error).message);
      }
    });
  }

  return (
    <div className="flex gap-1.5 flex-wrap">
      {actions.map(({ event, label, tone }) => (
        <button
          key={event}
          onClick={() => fire(event)}
          disabled={pending}
          className={`btn text-xs ${tone === 'primary' ? 'btn-primary' : tone === 'warn' ? 'bg-amber-500 text-white border-amber-500' : ''}`}
        >
          {pending ? '…' : label}
        </button>
      ))}
    </div>
  );
}
