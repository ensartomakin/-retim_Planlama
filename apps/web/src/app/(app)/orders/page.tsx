import { prisma } from '@tekstil/db';
import { StatusChip } from '@/components/status-chip';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      model: { select: { code: true, name: true, customer: { select: { name: true } } } },
      workshop: { select: { name: true } },
      variants: { include: { color: true, size: true } },
    },
    take: 100,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold">Siparişler</h1>
        <span className="text-sm text-ink-3">{orders.length} kayıt</span>
      </div>

      <div className="card overflow-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              {['Sipariş', 'Model', 'Müşteri', 'Atölye', 'Adet', 'Asorti', 'Termin', 'Durum'].map((h) => (
                <th key={h} className="text-left p-2.5 text-xs font-bold text-ink-2 border-b border-gray-200">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="p-2.5 text-sm font-bold border-b border-gray-200">{o.code}</td>
                <td className="p-2.5 text-sm border-b border-gray-200">{o.model.code}</td>
                <td className="p-2.5 text-sm border-b border-gray-200">{o.model.customer.name}</td>
                <td className="p-2.5 text-sm border-b border-gray-200">{o.workshop?.name ?? '—'}</td>
                <td className="p-2.5 text-sm border-b border-gray-200">
                  {o.totalQty.toLocaleString('tr-TR')}
                </td>
                <td className="p-2.5 text-xs text-ink-3 border-b border-gray-200">
                  {o.variants.length} varyant
                </td>
                <td className="p-2.5 text-sm border-b border-gray-200">
                  {o.dueDate ? new Date(o.dueDate).toLocaleDateString('tr-TR') : '—'}
                </td>
                <td className="p-2.5 text-sm border-b border-gray-200">
                  <StatusChip status={o.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
