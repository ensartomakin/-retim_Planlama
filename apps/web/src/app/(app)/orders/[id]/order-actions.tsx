'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { validateAndAdvanceOrder, releaseToWorkshop } from '@/lib/actions/order';

interface MissingItem {
  materialId: string;
  name: string;
  shortfall: number;
  uom: string;
  supplierId: string | null;
}

interface Props {
  orderId: string;
  status: string;
  canActAsPlanning: boolean;
}

export function OrderActions({ orderId, status, canActAsPlanning }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [missing, setMissing] = useState<MissingItem[]>([]);
  const [overrideReason, setOverrideReason] = useState('');
  const [showOverride, setShowOverride] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleValidate() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await validateAndAdvanceOrder(orderId);
        if (result.missing.length > 0) {
          setMissing(result.missing);
        }
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  async function handleRelease() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await releaseToWorkshop(orderId, overrideReason || undefined);
        router.refresh();
        setShowOverride(false);
        alert(`✓ Atölyeye gönderildi. ${result.batchCount} iş emri oluşturuldu.`);
      } catch (e) {
        const msg = (e as Error).message;
        if (msg.includes('Kapasite aşımı') && !showOverride) {
          setShowOverride(true);
          setError(msg);
        } else {
          setError(msg);
        }
      }
    });
  }

  if (!canActAsPlanning) return null;

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">
          {error}
        </div>
      )}

      {status === 'TASLAK' && (
        <button className="btn btn-primary" onClick={handleValidate} disabled={pending}>
          {pending ? 'Kontrol ediliyor…' : 'BOM + Stok Kontrol Et'}
        </button>
      )}

      {status === 'HAZIR' && (
        <>
          {showOverride ? (
            <div className="flex flex-col gap-2 p-3 border border-amber-300 bg-amber-50 rounded-xl">
              <div className="text-sm font-semibold text-amber-800">Kapasite Override — Super Admin</div>
              <input
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Override gerekçesi (zorunlu)"
                className="border border-amber-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  className="btn btn-primary"
                  onClick={handleRelease}
                  disabled={pending || !overrideReason.trim()}
                >
                  Zorla Gönder
                </button>
                <button className="btn" onClick={() => { setShowOverride(false); setError(null); }}>
                  İptal
                </button>
              </div>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={handleRelease} disabled={pending}>
              {pending ? 'Gönderiliyor…' : '▶ Üretimi Başlat'}
            </button>
          )}
        </>
      )}

      {missing.length > 0 && status === 'MALZEME_BEKLIYOR' && (
        <div className="card p-3">
          <div className="text-sm font-bold mb-2 text-red-600">Eksik Malzemeler (satın alma talebi oluşturuldu)</div>
          <div className="flex flex-col gap-1.5">
            {missing.map((m) => (
              <div key={m.materialId} className="flex items-center justify-between text-sm border border-dashed border-red-200 rounded-lg p-2">
                <span className="font-semibold">{m.name}</span>
                <span className="text-red-600 font-bold">
                  {m.shortfall.toFixed(2)} {m.uom} eksik
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
