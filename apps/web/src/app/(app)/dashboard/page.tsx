import { prisma } from '@tekstil/db';
import { KpiCard } from '@/components/kpi-card';
import { ProcessWheel } from '@/components/process-wheel';
import { StatusChip } from '@/components/status-chip';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [
    activeModels,
    openOrders,
    waitingMaterial,
    recentOrders,
    auditTail,
    workshops,
  ] = await Promise.all([
    prisma.model.count({ where: { status: { notIn: ['IPTAL'] } } }),
    prisma.order.count({ where: { status: { notIn: ['KAPALI', 'IPTAL'] } } }),
    prisma.order.count({ where: { status: 'MALZEME_BEKLIYOR' } }),
    prisma.order.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: {
        model: { select: { code: true, name: true, customer: { select: { name: true } } } },
        workshop: { select: { name: true } },
      },
    }),
    prisma.auditLog.findMany({
      take: 8,
      orderBy: { ts: 'desc' },
      include: { user: { select: { fullName: true } } },
    }),
    prisma.workshop.findMany({ orderBy: { code: 'asc' } }),
  ]);

  // Faz 2'de gerçek kapasite hesabı gelecek; şimdilik dummy türetim
  const capacity = workshops.map((w) => ({
    name: w.name,
    code: w.code,
    cap: w.dailyCapacityPcs,
    booked: Math.round(w.dailyCapacityPcs * (0.4 + Math.random() * 0.5)),
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-3 max-[1100px]:grid-cols-2">
        <KpiCard label="Aktif Model" value={activeModels} delta="▲ güncel" tone="ok" icon="M" />
        <KpiCard label="Açık Sipariş" value={openOrders} delta="canlı" tone="warn" icon="S" />
        <KpiCard label="Malzeme Bekleyen" value={waitingMaterial} delta="acil" tone="bad" icon="K" />
        <KpiCard label="Atölye Sayısı" value={workshops.length} delta="aktif" tone="ok" icon="A" />
      </div>

      <div className="grid grid-cols-[2fr_1fr] gap-4 max-[1100px]:grid-cols-1">
        <div className="card">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-bold">Süreç Çarkları</h3>
            <span className="text-xs text-ink-3">· anlık durum</span>
          </div>
          <div className="grid grid-cols-4 gap-3 p-4 max-[900px]:grid-cols-2">
            <ProcessWheel label="Tasarım" percent={42} color="#7c3aed" sub={`${activeModels} aktif model`} />
            <ProcessWheel label="Kalıp" percent={65} color="#0ea5e9" sub="revize takibi" />
            <ProcessWheel label="Planlama" percent={78} color="#f59e0b" sub={`${openOrders} açık sipariş`} />
            <ProcessWheel label="Atölye" percent={54} color="#16a34a" sub="iş emri akışı" />
          </div>
          <div className="grid grid-cols-2 gap-3 p-4 pt-0 max-[900px]:grid-cols-1">
            {capacity.map((c) => {
              const pct = Math.min(100, Math.round((c.booked / c.cap) * 100));
              return (
                <div key={c.code} className="border border-gray-200 rounded-xl p-3">
                  <div className="flex justify-between font-bold text-sm">
                    <span>{c.name}</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="text-lg my-1 font-semibold">
                    {c.booked.toLocaleString('tr-TR')} / {c.cap.toLocaleString('tr-TR')} adet
                  </div>
                  <div className="bar">
                    <span style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-bold">Audit / Akış</h3>
            <span className="text-xs text-ink-3">· son hareketler</span>
          </div>
          {auditTail.length === 0 && (
            <div className="p-6 text-sm text-ink-3 text-center">Henüz hareket yok.</div>
          )}
          {auditTail.map((a) => (
            <div
              key={a.id.toString()}
              className="grid grid-cols-[16px_1fr_auto] gap-2.5 px-4 py-2.5 border-b border-dashed border-gray-200"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-brand mt-1.5 ring-4 ring-brand-100" />
              <div>
                <div className="font-bold text-sm">
                  {a.entity.toUpperCase()} · {a.action}
                </div>
                <div className="text-xs text-ink-3">
                  {a.user?.fullName ?? 'Sistem'} ·{' '}
                  {a.entityId.slice(0, 8)}
                </div>
              </div>
              <div className="text-xs text-ink-3 whitespace-nowrap">
                {new Date(a.ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-bold">Güncel Siparişler</h3>
          <span className="text-xs text-ink-3">· canlı</span>
        </div>
        <div className="overflow-auto max-h-[420px]">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                {['Sipariş', 'Model', 'Müşteri', 'Atölye', 'Adet', 'Termin', 'Durum'].map((h) => (
                  <th
                    key={h}
                    className="text-left p-2.5 text-xs font-bold text-ink-2 border-b border-gray-200"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="p-2.5 text-sm font-bold border-b border-gray-200">{o.code}</td>
                  <td className="p-2.5 text-sm border-b border-gray-200">{o.model.code}</td>
                  <td className="p-2.5 text-sm border-b border-gray-200">
                    {o.model.customer.name}
                  </td>
                  <td className="p-2.5 text-sm border-b border-gray-200">
                    {o.workshop?.name ?? '—'}
                  </td>
                  <td className="p-2.5 text-sm border-b border-gray-200">
                    {o.totalQty.toLocaleString('tr-TR')}
                  </td>
                  <td className="p-2.5 text-sm border-b border-gray-200">
                    {o.dueDate ? new Date(o.dueDate).toLocaleDateString('tr-TR') : '—'}
                  </td>
                  <td className="p-2.5 text-sm border-b border-gray-200">
                    <StatusChip status={o.status} />
                  </td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-ink-3 text-sm">
                    Henüz sipariş yok. `pnpm db:seed` komutu ile demo veriyi yükleyin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
