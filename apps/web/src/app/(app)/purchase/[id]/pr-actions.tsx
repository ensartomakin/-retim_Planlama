'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { approvePurchaseRequest, rejectPurchaseRequest, markDelivered } from '@/lib/actions/purchase';

interface Props {
  prId: string;
  status: string;
  canAct: boolean;
}

export function PRActions({ prId, status, canAct }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<unknown>) {
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        alert((e as Error).message);
      }
    });
  }

  if (!canAct) return null;

  return (
    <div className="flex gap-2 flex-wrap">
      {(status === 'TASLAK' || status === 'ONAY_BEKLIYOR') && (
        <>
          <button
            className="btn btn-primary"
            disabled={pending}
            onClick={() => run(() => approvePurchaseRequest(prId))}
          >
            {pending ? 'İşleniyor…' : '✓ Onayla'}
          </button>
          <button
            className="btn"
            style={{ background: '#ef4444', color: '#fff', borderColor: '#ef4444' }}
            disabled={pending}
            onClick={() => {
              const reason = prompt('İptal gerekçesi:');
              if (reason) run(() => rejectPurchaseRequest(prId, reason));
            }}
          >
            ✗ Reddet
          </button>
        </>
      )}
      {status === 'ONAYLI' && (
        <button
          className="btn btn-primary"
          disabled={pending}
          onClick={() => run(() => markDelivered(prId))}
        >
          {pending ? 'İşleniyor…' : '📦 Teslim Alındı'}
        </button>
      )}
    </div>
  );
}
