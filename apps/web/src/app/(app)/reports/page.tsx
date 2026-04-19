import { prisma } from '@tekstil/db';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const [ordersByStatus, wosByStatus, totalStockValue] = await Promise.all([
    prisma.order.groupBy({ by: ['status'], _count: true }),
    prisma.workOrder.groupBy({ by: ['status'], _count: true }),
    prisma.stock.findMany({ select: { qtyOnHand: true } }),
  ]);

  const totalItems = totalStockValue.reduce((s, r) => s + Number(r.qtyOnHand), 0);

  const ORDER_TR: Record<string, string> = {
    TASLAK: 'Taslak', BOM_DOGRULAMA: 'BOM Doğrulama', MALZEME_BEKLIYOR: 'Malzeme Bekleniyor',
    HAZIR: 'Hazır', ATOLYEYE_GONDERILDI: 'Atölyede', KAPALI: 'Kapandı', IPTAL: 'İptal',
  };
  const WO_TR: Record<string, string> = {
    OLUSTURULDU: 'Oluşturuldu', KESIM: 'Kesim', DIKIM: 'Dikim', KALITE: 'Kalite',
    PAKETLEME: 'Paketleme', DURAKLADI: 'Duraksadı', TAMAMLANDI: 'Tamamlandı', IPTAL: 'İptal',
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">Raporlar</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <div className="px-4 py-3 border-b border-gray-200 font-bold text-sm">Siparişler — Duruma Göre</div>
          <table className="w-full">
            <tbody>
              {ordersByStatus.map((r) => (
                <tr key={r.status} className="border-b border-dashed border-gray-100 hover:bg-gray-50">
                  <td className="p-3 text-sm">{ORDER_TR[r.status] ?? r.status}</td>
                  <td className="p-3 text-sm font-bold text-right">{r._count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="px-4 py-3 border-b border-gray-200 font-bold text-sm">İş Emirleri — Duruma Göre</div>
          <table className="w-full">
            <tbody>
              {wosByStatus.map((r) => (
                <tr key={r.status} className="border-b border-dashed border-gray-100 hover:bg-gray-50">
                  <td className="p-3 text-sm">{WO_TR[r.status] ?? r.status}</td>
                  <td className="p-3 text-sm font-bold text-right">{r._count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-4">
        <div className="text-xs text-ink-3 mb-0.5">Stokta toplam kalem adedi</div>
        <div className="text-2xl font-extrabold">{totalItems.toLocaleString('tr-TR')}</div>
      </div>

      <div className="card p-8 text-center text-ink-3 text-sm">
        Tarih aralıklı özet raporlar — Faz 4&apos;te gelecek.
      </div>
    </div>
  );
}
