import Link from 'next/link';
import { prisma } from '@tekstil/db';
import { StatusChip } from '@/components/status-chip';

export const dynamic = 'force-dynamic';

const STATUS_ORDER = ['TASLAK', 'ONAY_BEKLIYOR', 'ONAYLI', 'TESLIM_ALINDI', 'IPTAL'];

export default async function PurchasePage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const where = searchParams.status ? { status: searchParams.status as any } : {};

  const [requests, counts] = await Promise.all([
    prisma.purchaseRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        supplier: true,
        order: { select: { code: true } },
        items: {
          include: { material: { select: { name: true, uom: true } } },
          take: 3,
        },
      },
    }),
    prisma.purchaseRequest.groupBy({ by: ['status'], _count: true }),
  ]);

  const countByStatus = Object.fromEntries(counts.map((c) => [c.status, c._count]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold">Satın Alma</h1>
        <span className="text-sm text-ink-3">{requests.length} talep</span>
      </div>

      {/* Filtre */}
      <div className="flex gap-2 flex-wrap">
        <Link href="/purchase"
          className={`chip cursor-pointer px-3 py-1.5 ${!searchParams.status ? 'bg-brand text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
          Tümü ({counts.reduce((s, c) => s + c._count, 0)})
        </Link>
        {STATUS_ORDER.map((s) => (
          <Link key={s} href={`/purchase?status=${s}`}
            className={`chip cursor-pointer px-3 py-1.5 ${searchParams.status === s ? 'bg-brand text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            {STATUS_TR[s]} ({countByStatus[s] ?? 0})
          </Link>
        ))}
      </div>

      <div className="card overflow-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              {['Talep No', 'Sipariş', 'Tedarikçi', 'Malzemeler', 'Termin', 'Durum', 'İşlem'].map((h) => (
                <th key={h} className="text-left p-2.5 text-xs font-bold text-ink-2 border-b border-gray-200 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {requests.map((pr) => (
              <tr key={pr.id} className="hover:bg-gray-50">
                <td className="p-2.5 border-b border-gray-200">
                  <Link href={`/purchase/${pr.id}`} className="text-sm font-bold hover:text-brand hover:underline">
                    {pr.code}
                  </Link>
                </td>
                <td className="p-2.5 text-sm border-b border-gray-200">
                  {pr.order ? (
                    <Link href={`/orders/${pr.orderId}`} className="hover:text-brand hover:underline">
                      {pr.order.code}
                    </Link>
                  ) : '—'}
                </td>
                <td className="p-2.5 text-sm border-b border-gray-200">{pr.supplier?.name ?? '—'}</td>
                <td className="p-2.5 border-b border-gray-200">
                  <div className="flex flex-col gap-0.5">
                    {pr.items.map((item) => (
                      <div key={item.id} className="text-xs text-ink-2">
                        {item.material.name} — {Number(item.qty).toFixed(2)} {item.material.uom}
                      </div>
                    ))}
                  </div>
                </td>
                <td className="p-2.5 text-sm text-ink-3 border-b border-gray-200 whitespace-nowrap">
                  {pr.dueDate ? new Date(pr.dueDate).toLocaleDateString('tr-TR') : '—'}
                </td>
                <td className="p-2.5 border-b border-gray-200">
                  <StatusChip status={pr.status} />
                </td>
                <td className="p-2.5 border-b border-gray-200">
                  <Link href={`/purchase/${pr.id}`} className="btn text-xs">
                    Detay →
                  </Link>
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-ink-3 text-sm">Talep bulunamadı.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const STATUS_TR: Record<string, string> = {
  TASLAK: 'Taslak',
  ONAY_BEKLIYOR: 'Onay Bekliyor',
  ONAYLI: 'Onaylı',
  TESLIM_ALINDI: 'Teslim Alındı',
  IPTAL: 'İptal',
};
