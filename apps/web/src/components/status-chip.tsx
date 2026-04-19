import { cn } from '@/lib/utils/cn';

const MAP: Record<string, { label: string; cls: string }> = {
  TASLAK: { label: 'Taslak', cls: 'bg-gray-100 text-gray-700' },
  BOM_DOGRULAMA: { label: 'BOM Doğrulama', cls: 'bg-sky-100 text-sky-800' },
  MALZEME_BEKLIYOR: { label: 'Malzeme Bekleyen', cls: 'bg-amber-100 text-amber-800' },
  HAZIR: { label: 'Hazır', cls: 'bg-emerald-100 text-emerald-800' },
  ATOLYEYE_GONDERILDI: { label: 'Atölyede', cls: 'bg-brand-100 text-brand-700' },
  KAPALI: { label: 'Kapalı', cls: 'bg-gray-200 text-gray-800' },
  IPTAL: { label: 'İptal', cls: 'bg-red-100 text-red-800' },
  NUMUNE_HAZIRLANIYOR: { label: 'Numune', cls: 'bg-sky-100 text-sky-800' },
  REVIZE: { label: 'Revize', cls: 'bg-amber-100 text-amber-800' },
  ONAYLANDI: { label: 'Onaylandı', cls: 'bg-emerald-100 text-emerald-800' },
};

export function StatusChip({ status }: { status: string }) {
  const s = MAP[status] ?? { label: status, cls: 'bg-gray-100 text-gray-700' };
  return <span className={cn('chip', s.cls)}>● {s.label}</span>;
}
