'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addPatternVersion, closePattern } from '@/lib/actions/pattern';

interface Props {
  patternId: string;
  isClosed: boolean;
  isModalist: boolean;
}

export function PatternForm({ patternId, isClosed, isModalist }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showClose, setShowClose] = useState(false);

  if (!isModalist) return null;

  async function handleAddVersion(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await addPatternVersion({ patternId, note: note || undefined, fileUrl: fileUrl || undefined });
        setNote('');
        setFileUrl('');
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  async function handleClose() {
    setError(null);
    startTransition(async () => {
      try {
        await closePattern(patternId);
        router.refresh();
        setShowClose(false);
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  if (isClosed) return <div className="text-sm text-ink-3 italic">Bu kalıp kapatılmış.</div>;

  return (
    <div className="flex flex-col gap-4">
      {/* Yeni versiyon formu */}
      <form onSubmit={handleAddVersion} className="card p-4 flex flex-col gap-3">
        <div className="text-sm font-bold border-b border-gray-100 pb-2">Yeni Versiyon Ekle</div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-ink-2">Dosya URL (Supabase Storage)</label>
          <input
            value={fileUrl}
            onChange={(e) => setFileUrl(e.target.value)}
            placeholder="https://... (opsiyonel)"
            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-brand"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-ink-2">Not</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Revize notu..."
            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm resize-none focus:outline-none focus:border-brand"
          />
        </div>
        {error && <div className="text-xs text-red-600">{error}</div>}
        <button className="btn btn-primary self-start" disabled={pending}>
          {pending ? 'Kaydediliyor…' : '+ Versiyon Ekle'}
        </button>
      </form>

      {/* Kalıbı kapat */}
      {!showClose ? (
        <button className="btn self-start" onClick={() => setShowClose(true)}>
          Kalıbı Kapat
        </button>
      ) : (
        <div className="card p-4 flex flex-col gap-3 border-amber-300 bg-amber-50">
          <div className="text-sm font-bold text-amber-800">Kalıbı kapatmak istediğinizden emin misiniz?</div>
          <div className="text-xs text-amber-700">Bu işlem geri alınamaz. Kapanan kalıba versiyon eklenemez.</div>
          <div className="flex gap-2">
            <button className="btn" style={{ background: '#f59e0b', color: '#fff', borderColor: '#f59e0b' }}
              onClick={handleClose} disabled={pending}>
              Evet, Kapat
            </button>
            <button className="btn" onClick={() => setShowClose(false)}>İptal</button>
          </div>
        </div>
      )}
    </div>
  );
}
