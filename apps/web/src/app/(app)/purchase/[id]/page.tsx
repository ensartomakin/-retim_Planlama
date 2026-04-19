import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@tekstil/db';
import { getSessionUser } from '@/lib/auth/session';
import { hasRole } from '@tekstil/contracts';
import { StatusChip } from '@/components/status-chip';
import { PRActions } from './pr-actions';

export const dynamic = 'force-dynamic';

export default async function PurchaseDetailPage({ params }: { params: { id: string } }) {
  const [pr, user] = await Promise.all([
    prisma.purchaseRequest.findUnique({
      where: { id: params.id },
      include: {
        supplier: true,
        order: {
          select: {
            id: true,
            code: true,
            status: true,
            model: { select: { name: true, code: true } },
          },
        },
        items: {
          include: {
            material: {
              include: { stock: true },
            },
          },
        },
      },
    }),
    getSessionUser(),
  ]);

  if (!pr || !user) notFound();

  const auditLogs = await prisma.auditLog.findMany({
    where: { entity: 'purchase_request', entityId: pr.id },
    orderBy: { ts: 'desc' },
    take: 15,
    include: { user: { select: { fullName: true } } },
  });

  const canAct = hasRole(user, 'satinalma');
  const totalValue = pr.items.reduce((s, i) => s + (Number(i.qty) * Number(i.unitPrice ?? 0)), 0);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-xs text-ink-3 mb-1">
          <Link href="/purchase" className="hover:underline">Satın Alma</Link>
          {' › '}{pr.code}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold">{pr.code}</h1>
          <StatusChip status={pr.status} />
          <PRActions prId={pr.id} status={pr.status} canAct={canAct} />
        </div>
      </div>

      <div className="grid grid-cols-[2fr_1fr] gap-4 max-[900px]:grid-cols-1">
        <div className="flex flex-col gap-4">
          {/* Genel bilgi */}
          <div className="card p-4 grid grid-cols-2 gap-3">
            <InfoRow label="Talep No" value={pr.code} />
            <InfoRow label="Tedarikçi" value={pr.supplier?.name ?? '—'} />
            <InfoRow label="Termin" value={pr.dueDate ? new Date(pr.dueDate).toLocaleDateString('tr-TR') : '—'} />
            {pr.order && (
              <>
                <div>
                  <div className="text-xs text-ink-3 mb-0.5">Bağlı Sipariş</div>
                  <Link href={`/orders/${pr.order.id}`} className="text-sm font-semibold hover:text-brand hover:underline">
                    {pr.order.code}
                  </Link>
                </div>
                <InfoRow label="Model" value={pr.order.model.name} />
              </>
            )}
          </div>

          {/* Kalem listesi */}
          <div className="card">
            <div className="px-4 py-3 border-b border-gray-200 font-bold text-sm flex justify-between items-center">
              <span>Kalemler ({pr.items.length})</span>
              {totalValue > 0 && (
                <span className="text-sm font-bold text-brand">
                  Toplam: {totalValue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                </span>
              )}
            </div>
            <div className="overflow-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    {['Malzeme', 'Tip', 'Miktar', 'Birim', 'Birim Fiyat', 'Stok Mevcut', 'Not'].map((h) => (
                      <th key={h} className="text-left p-2.5 text-xs font-bold text-ink-2 border-b border-gray-200 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pr.items.map((item) => {
                    const available = Number(item.material.stock?.qtyOnHand ?? 0)
                      - Number(item.material.stock?.qtyReserved ?? 0);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="p-2.5 text-sm font-semibold border-b border-gray-200">{item.material.name}</td>
                        <td className="p-2.5 text-xs border-b border-gray-200">{item.material.type}</td>
                        <td className="p-2.5 text-sm border-b border-gray-200 font-semibold">{Number(item.qty).toFixed(2)}</td>
                        <td className="p-2.5 text-sm border-b border-gray-200">{item.material.uom}</td>
                        <td className="p-2.5 text-sm border-b border-gray-200">
                          {item.unitPrice ? `₺${Number(item.unitPrice).toFixed(2)}` : '—'}
                        </td>
                        <td className={`p-2.5 text-sm border-b border-gray-200 font-semibold ${available <= 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                          {available.toFixed(2)} {item.material.uom}
                        </td>
                        <td className="p-2.5 text-xs text-ink-3 border-b border-gray-200">{item.note ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Audit */}
        <div className="card">
          <div className="px-4 py-3 border-b border-gray-200 font-bold text-sm">Geçmiş</div>
          {auditLogs.map((a) => {
            const after = a.afterJson as Record<string, unknown> | null;
            const before = a.beforeJson as Record<string, unknown> | null;
            return (
              <div key={a.id.toString()}
                className="grid grid-cols-[10px_1fr] gap-2.5 px-4 py-2.5 border-b border-dashed border-gray-100">
                <div className="w-2.5 h-2.5 rounded-full bg-brand mt-1 ring-4 ring-brand-100" />
                <div>
                  <div className="text-sm font-semibold">
                    {a.action === 'transition' && before?.status && after?.status
                      ? `${before.status} → ${after.status}`
                      : a.action}
                  </div>
                  <div className="text-xs text-ink-3">
                    {a.user?.fullName ?? 'Sistem'} · {new Date(a.ts).toLocaleString('tr-TR')}
                  </div>
                </div>
              </div>
            );
          })}
          {auditLogs.length === 0 && <div className="p-4 text-sm text-ink-3">Kayıt yok.</div>}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-ink-3 mb-0.5">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}
