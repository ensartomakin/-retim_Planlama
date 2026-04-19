import { prisma } from '@tekstil/db';
import { getSessionUser } from '@/lib/auth/session';
import { hasRole } from '@tekstil/contracts';
import { StatusChip } from '@/components/status-chip';
import { WOTransition } from './wo-transition';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const STATUS_ORDER = ['OLUSTURULDU', 'KESIM', 'DIKIM', 'KALITE', 'PAKETLEME', 'DURAKLADI', 'TAMAMLANDI', 'IPTAL'];

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const [user, counts] = await Promise.all([
    getSessionUser(),
    prisma.workOrder.groupBy({ by: ['status'], _count: true }),
  ]);

  const where = searchParams.status ? { status: searchParams.status as any } : {};

  const workOrders = await prisma.workOrder.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      order: {
        include: {
          model: { include: { customer: { select: { name: true } } } },
          workshop: { select: { name: true } },
        },
      },
    },
  });

  const countByStatus = Object.fromEntries(counts.map((c) => [c.status, c._count]));
  const canAct = user ? hasRole(user, 'uretim', 'planlama') : false;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold">İş Emirleri</h1>
        <span className="text-sm text-ink-3">{workOrders.length} kayıt</span>
      </div>

      {/* Filtre + özet */}
      <div className="flex gap-2 flex-wrap">
        <Link href="/work-orders"
          className={`chip cursor-pointer px-3 py-1.5 ${!searchParams.status ? 'bg-brand text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
          Tümü ({counts.reduce((s, c) => s + c._count, 0)})
        </Link>
        {STATUS_ORDER.filter((s) => countByStatus[s]).map((s) => (
          <Link key={s} href={`/work-orders?status=${s}`}
            className={`chip cursor-pointer px-3 py-1.5 ${searchParams.status === s ? 'bg-brand text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            {STATUS_TR[s] ?? s} ({countByStatus[s]})
          </Link>
        ))}
      </div>

      <div className="card overflow-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              {['İş Emri', 'Sipariş', 'Model', 'Müşteri', 'Atölye', 'Adet', 'Durum', ...(canAct ? ['İşlem'] : [])].map((h) => (
                <th key={h} className="text-left p-2.5 text-xs font-bold text-ink-2 border-b border-gray-200 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {workOrders.map((wo) => (
              <tr key={wo.id} className="hover:bg-gray-50">
                <td className="p-2.5 border-b border-gray-200">
                  <span className="font-mono text-sm font-bold">{wo.code}</span>
                </td>
                <td className="p-2.5 text-sm border-b border-gray-200">
                  <Link href={`/orders/${wo.orderId}`} className="hover:text-brand hover:underline">
                    {wo.order.code}
                  </Link>
                </td>
                <td className="p-2.5 text-sm border-b border-gray-200">{wo.order.model.code}</td>
                <td className="p-2.5 text-sm border-b border-gray-200">{wo.order.model.customer.name}</td>
                <td className="p-2.5 text-sm border-b border-gray-200">{wo.order.workshop?.name ?? '—'}</td>
                <td className="p-2.5 text-sm border-b border-gray-200 font-semibold">{wo.qty}</td>
                <td className="p-2.5 border-b border-gray-200">
                  <StatusChip status={wo.status} />
                </td>
                {canAct && (
                  <td className="p-2.5 border-b border-gray-200">
                    <WOTransition woId={wo.id} status={wo.status} />
                  </td>
                )}
              </tr>
            ))}
            {workOrders.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-ink-3 text-sm">
                  İş emri bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const STATUS_TR: Record<string, string> = {
  OLUSTURULDU: 'Oluşturuldu',
  KESIM: 'Kesim',
  DIKIM: 'Dikim',
  KALITE: 'Kalite',
  PAKETLEME: 'Paketleme',
  DURAKLADI: 'Duraklamış',
  TAMAMLANDI: 'Tamamlandı',
  IPTAL: 'İptal',
};
