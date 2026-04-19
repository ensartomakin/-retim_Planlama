import { notFound } from 'next/navigation';
import { prisma } from '@tekstil/db';
import { getSessionUser } from '@/lib/auth/session';
import { StatusChip } from '@/components/status-chip';
import { OrderActions } from './order-actions';
import { canWrite } from '@tekstil/contracts';

export const dynamic = 'force-dynamic';

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const [order, user] = await Promise.all([
    prisma.order.findUnique({
      where: { id: params.id },
      include: {
        model: {
          include: {
            customer: true,
            boms: {
              where: { isActive: true },
              include: {
                items: {
                  include: {
                    material: { include: { stock: true } },
                  },
                },
              },
            },
          },
        },
        workshop: true,
        variants: {
          include: {
            color: true,
            size: { orderBy: { orderIndex: 'asc' } },
          },
        },
        workOrders: { orderBy: { code: 'asc' } },
        purchaseReqs: {
          include: { items: { include: { material: true } }, supplier: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    }),
    getSessionUser(),
  ]);

  if (!order || !user) notFound();

  // Asorti matris: renk satırları × beden sütunları
  const colors = [...new Map(order.variants.map((v) => [v.colorId, v.color])).values()];
  const sizes = [...new Map(order.variants.map((v) => [v.sizeId, v.size])).values()].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );
  const variantMap = new Map(order.variants.map((v) => [`${v.colorId}:${v.sizeId}`, v.qty]));

  // BOM stok özeti
  const activeBom = order.model.boms[0];
  const bomCheck = activeBom?.items.map((item) => {
    const needed = Number(item.qtyPerUnit) * order.totalQty * (1 + Number(item.wastePct) / 100);
    const available =
      Number(item.material.stock?.qtyOnHand ?? 0) - Number(item.material.stock?.qtyReserved ?? 0);
    return {
      name: item.material.name,
      uom: item.uom,
      needed: needed.toFixed(2),
      available: available.toFixed(2),
      ok: available >= needed,
    };
  });

  const auditLogs = await prisma.auditLog.findMany({
    where: { entity: 'order', entityId: order.id },
    orderBy: { ts: 'desc' },
    take: 10,
    include: { user: { select: { fullName: true } } },
  });

  const canActAsPlanning = canWrite(user, 'order');

  return (
    <div className="flex flex-col gap-4">
      {/* Başlık */}
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-ink-3 mb-1">
            <a href="/orders" className="hover:underline">Siparişler</a> › {order.code}
          </div>
          <h1 className="text-xl font-bold">{order.code}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <StatusChip status={order.status} />
            <span className="text-sm text-ink-2">{order.model.name}</span>
            <span className="text-sm text-ink-3">· {order.model.customer.name}</span>
            <span className="text-sm text-ink-3">· {order.totalQty.toLocaleString('tr-TR')} adet</span>
          </div>
        </div>
        <OrderActions orderId={order.id} status={order.status} canActAsPlanning={canActAsPlanning} />
      </div>

      <div className="grid grid-cols-[2fr_1fr] gap-4 max-[900px]:grid-cols-1">
        <div className="flex flex-col gap-4">
          {/* Bilgi */}
          <div className="card p-4 grid grid-cols-2 gap-3">
            <InfoRow label="Sipariş Kodu" value={order.code} />
            <InfoRow label="Atölye" value={order.workshop?.name ?? '—'} />
            <InfoRow label="Toplam Adet" value={order.totalQty.toLocaleString('tr-TR')} />
            <InfoRow label="Termin" value={order.dueDate ? new Date(order.dueDate).toLocaleDateString('tr-TR') : '—'} />
          </div>

          {/* Asorti Matrisi */}
          <div className="card">
            <div className="px-4 py-3 border-b border-gray-200 font-bold text-sm">
              Asorti Matrisi ({order.variants.length} varyant)
            </div>
            <div className="overflow-auto p-1">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="p-2.5 text-xs font-bold text-ink-2 border-b border-gray-200 text-left">Renk</th>
                    {sizes.map((s) => (
                      <th key={s.id} className="p-2.5 text-xs font-bold text-ink-2 border-b border-gray-200 text-center">
                        {s.code}
                      </th>
                    ))}
                    <th className="p-2.5 text-xs font-bold text-ink-2 border-b border-gray-200 text-center">Toplam</th>
                  </tr>
                </thead>
                <tbody>
                  {colors.map((c) => {
                    const rowTotal = sizes.reduce((sum, s) => sum + (variantMap.get(`${c.id}:${s.id}`) ?? 0), 0);
                    return (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="p-2.5 text-sm font-semibold border-b border-gray-200">
                          <span className="flex items-center gap-2">
                            {c.hex && (
                              <span className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0" style={{ background: c.hex }} />
                            )}
                            {c.name}
                          </span>
                        </td>
                        {sizes.map((s) => (
                          <td key={s.id} className="p-2.5 text-sm text-center border-b border-gray-200">
                            {variantMap.get(`${c.id}:${s.id}`) ?? <span className="text-ink-3">—</span>}
                          </td>
                        ))}
                        <td className="p-2.5 text-sm font-bold text-center border-b border-gray-200 text-brand">
                          {rowTotal}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-gray-50 font-bold">
                    <td className="p-2.5 text-sm border-t-2 border-gray-300">Toplam</td>
                    {sizes.map((s) => (
                      <td key={s.id} className="p-2.5 text-sm text-center border-t-2 border-gray-300">
                        {colors.reduce((sum, c) => sum + (variantMap.get(`${c.id}:${s.id}`) ?? 0), 0)}
                      </td>
                    ))}
                    <td className="p-2.5 text-sm text-center border-t-2 border-gray-300 text-brand">
                      {order.totalQty}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* BOM Stok Kontrolü */}
          {bomCheck && (
            <div className="card">
              <div className="px-4 py-3 border-b border-gray-200 font-bold text-sm">BOM / Stok Durumu</div>
              <div className="overflow-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      {['Malzeme', 'Gerekli', 'Mevcut', 'Birim', 'Durum'].map((h) => (
                        <th key={h} className="text-left p-2.5 text-xs font-bold text-ink-2 border-b border-gray-200">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bomCheck.map((row) => (
                      <tr key={row.name} className="hover:bg-gray-50">
                        <td className="p-2.5 text-sm font-semibold border-b border-gray-200">{row.name}</td>
                        <td className="p-2.5 text-sm border-b border-gray-200">{row.needed}</td>
                        <td className={`p-2.5 text-sm font-semibold border-b border-gray-200 ${row.ok ? 'text-emerald-700' : 'text-red-600'}`}>
                          {row.available}
                        </td>
                        <td className="p-2.5 text-sm border-b border-gray-200">{row.uom}</td>
                        <td className="p-2.5 border-b border-gray-200">
                          <span className={`chip ${row.ok ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                            {row.ok ? '✓ Yeterli' : '✗ Eksik'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* İş Emirleri */}
          {order.workOrders.length > 0 && (
            <div className="card">
              <div className="px-4 py-3 border-b border-gray-200 font-bold text-sm">
                İş Emirleri ({order.workOrders.length} parti)
              </div>
              <div className="overflow-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      {['Kod', 'Adet', 'Durum', 'Başlangıç', 'Bitiş'].map((h) => (
                        <th key={h} className="text-left p-2.5 text-xs font-bold text-ink-2 border-b border-gray-200">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {order.workOrders.map((wo) => (
                      <tr key={wo.id} className="hover:bg-gray-50">
                        <td className="p-2.5 text-sm font-bold font-mono border-b border-gray-200">{wo.code}</td>
                        <td className="p-2.5 text-sm border-b border-gray-200">{wo.qty}</td>
                        <td className="p-2.5 border-b border-gray-200">
                          <StatusChip status={wo.status} />
                        </td>
                        <td className="p-2.5 text-sm text-ink-3 border-b border-gray-200">
                          {wo.startedAt ? new Date(wo.startedAt).toLocaleDateString('tr-TR') : '—'}
                        </td>
                        <td className="p-2.5 text-sm text-ink-3 border-b border-gray-200">
                          {wo.finishedAt ? new Date(wo.finishedAt).toLocaleDateString('tr-TR') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Sağ sütun */}
        <div className="flex flex-col gap-4">
          {/* Satın alma talepleri */}
          {order.purchaseReqs.length > 0 && (
            <div className="card">
              <div className="px-4 py-3 border-b border-gray-200 font-bold text-sm">Satın Alma Talepleri</div>
              {order.purchaseReqs.map((pr) => (
                <div key={pr.id} className="p-3 border-b border-dashed border-gray-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-bold">{pr.code}</span>
                    <StatusChip status={pr.status} />
                  </div>
                  <div className="text-xs text-ink-3 mb-1.5">Tedarikçi: {pr.supplier?.name ?? '—'}</div>
                  {pr.items.map((item) => (
                    <div key={item.id} className="text-xs text-ink-2 flex justify-between">
                      <span>{item.material.name}</span>
                      <span className="font-semibold">{Number(item.qty).toFixed(2)} {item.material.uom}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Audit timeline */}
          <div className="card">
            <div className="px-4 py-3 border-b border-gray-200 font-bold text-sm">Geçmiş</div>
            {auditLogs.map((a) => {
              const after = a.afterJson as Record<string, unknown> | null;
              const before = a.beforeJson as Record<string, unknown> | null;
              return (
                <div key={a.id.toString()} className="grid grid-cols-[10px_1fr] gap-2.5 px-4 py-2.5 border-b border-dashed border-gray-100">
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
            {auditLogs.length === 0 && (
              <div className="p-4 text-sm text-ink-3">Henüz hareket yok.</div>
            )}
          </div>
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
