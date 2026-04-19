import Link from 'next/link';
import { prisma } from '@tekstil/db';
import { KpiCard } from '@/components/kpi-card';
import { ProcessWheel } from '@/components/process-wheel';
import { StatusChip } from '@/components/status-chip';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in7days = new Date(today.getTime() + 7 * 86400000);

  const [
    modelCounts,
    orderCounts,
    workshopList,
    recentOrders,
    auditTail,
    pendingPRs,
    overdueOrders,
    malzemeBekleyen,
    patternCounts,
  ] = await Promise.all([
    // Model durum dağılımı
    prisma.model.groupBy({ by: ['status'], _count: true }),
    // Sipariş durum dağılımı
    prisma.order.groupBy({ by: ['status'], _count: true }),
    // Atölye kapasitesi
    prisma.workshop.findMany({
      include: {
        capacityDays: {
          where: { day: { gte: today, lte: in7days } },
        },
      },
    }),
    // Son siparişler
    prisma.order.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: {
        model: { select: { code: true, customer: { select: { name: true } } } },
        workshop: { select: { name: true } },
      },
    }),
    // Audit tail
    prisma.auditLog.findMany({
      take: 8,
      orderBy: { ts: 'desc' },
      include: { user: { select: { fullName: true } } },
    }),
    // Bekleyen satın alma
    prisma.purchaseRequest.count({ where: { status: 'TASLAK' } }),
    // Gecikmiş siparişler
    prisma.order.findMany({
      where: {
        dueDate: { lt: today },
        status: { notIn: ['KAPALI', 'IPTAL'] },
      },
      select: { id: true, code: true, dueDate: true },
    }),
    // Malzeme bekleyen + model/PR detayı
    prisma.order.findMany({
      where: { status: 'MALZEME_BEKLIYOR' },
      include: {
        model: { select: { name: true, code: true } },
        purchaseReqs: {
          where: { status: { notIn: ['ONAYLI', 'TESLIM_ALINDI', 'IPTAL'] } },
          include: { items: { include: { material: { select: { name: true } } } } },
        },
      },
      take: 5,
    }),
    // Kalıp iş yükü
    prisma.pattern.groupBy({ by: ['assignedTo'], _count: true, where: { closedAt: null } }),
  ]);

  // KPI hesapları
  const activeModels = modelCounts
    .filter((m) => !['IPTAL'].includes(m.status))
    .reduce((s, m) => s + m._count, 0);

  const openOrders = orderCounts
    .filter((o) => !['KAPALI', 'IPTAL'].includes(o.status))
    .reduce((s, o) => s + o._count, 0);

  const waitingMaterial = orderCounts.find((o) => o.status === 'MALZEME_BEKLIYOR')?._count ?? 0;
  const atölyede = orderCounts.find((o) => o.status === 'ATOLYEYE_GONDERILDI')?._count ?? 0;

  // Süreç yüzdesi hesabı (basit: o statüde olan / toplam)
  const totalModels = modelCounts.reduce((s, m) => s + m._count, 0) || 1;
  const totalOrders = orderCounts.reduce((s, o) => s + o._count, 0) || 1;
  const approvedModels = modelCounts.find((m) => m.status === 'ONAYLANDI')?._count ?? 0;
  const readyOrders = orderCounts.find((o) => o.status === 'HAZIR')?._count ?? 0;

  // Atölye doluluk (bugünkü booked / kapasite)
  const workshopCapacity = workshopList.map((w) => {
    const bookedToday = w.capacityDays.reduce((s, d) => s + d.bookedPcs, 0);
    const pct = Math.min(100, Math.round((bookedToday / Math.max(1, w.dailyCapacityPcs)) * 100));
    return { ...w, bookedToday, pct };
  });
  const avgCapacityPct =
    workshopCapacity.length > 0
      ? Math.round(workshopCapacity.reduce((s, w) => s + w.pct, 0) / workshopCapacity.length)
      : 0;

  // Alert öncelik sırası
  const alerts: Array<{ tone: 'bad' | 'warn' | 'info'; title: string; sub: string; href?: string }> = [];

  if (overdueOrders.length > 0) {
    for (const o of overdueOrders) {
      alerts.push({
        tone: 'bad',
        title: `Termin aşıldı — ${o.code}`,
        sub: `Son tarih: ${o.dueDate ? new Date(o.dueDate).toLocaleDateString('tr-TR') : '?'}`,
        href: `/orders/${o.id}`,
      });
    }
  }

  for (const order of malzemeBekleyen) {
    const matNames = order.purchaseReqs
      .flatMap((pr) => pr.items.map((i) => i.material.name))
      .slice(0, 3)
      .join(', ');
    alerts.push({
      tone: 'bad',
      title: `Üretim başlatılamaz — ${order.code}`,
      sub: matNames ? `Eksik: ${matNames}` : 'Satın alma onayı bekleniyor',
      href: `/orders/${order.id}`,
    });
  }

  if (pendingPRs > 0) {
    alerts.push({
      tone: 'warn',
      title: `${pendingPRs} satın alma talebi onay bekliyor`,
      sub: 'Satın alma modülüne git',
      href: '/purchase',
    });
  }

  if (avgCapacityPct > 85) {
    alerts.push({
      tone: 'warn',
      title: 'Atölye kapasitesi kritik seviyede',
      sub: `Ortalama doluluk: %${avgCapacityPct}`,
      href: '/orders',
    });
  }

  if (alerts.length === 0) {
    alerts.push({ tone: 'info', title: 'Tüm süreçler normal', sub: 'Kritik uyarı yok' });
  }

  const TONE_CLS = {
    bad: 'bg-red-500',
    warn: 'bg-amber-500',
    info: 'bg-sky-400',
  };
  const TONE_ICON = { bad: '!', warn: '⚠', info: 'i' };

  return (
    <div className="flex flex-col gap-4">
      {/* KPI */}
      <div className="grid grid-cols-4 gap-3 max-[1100px]:grid-cols-2">
        <KpiCard label="Aktif Model" value={activeModels}
          delta={`${approvedModels} onaylı`} tone="ok" icon="M" />
        <KpiCard label="Açık Sipariş" value={openOrders}
          delta={`${atölyede} atölyede`} tone={openOrders > 20 ? 'warn' : 'ok'} icon="S" />
        <KpiCard label="Malzeme Bekleyen" value={waitingMaterial}
          delta={waitingMaterial > 0 ? 'Aksiyon gerekli' : 'Sorun yok'}
          tone={waitingMaterial > 0 ? 'bad' : 'ok'} icon="K" />
        <KpiCard label="Onay Bekleyen PR" value={pendingPRs}
          delta={pendingPRs > 0 ? 'Satın alma bekliyor' : 'Temiz'}
          tone={pendingPRs > 0 ? 'warn' : 'ok'} icon="P" />
      </div>

      {/* Süreç çarkları + uyarılar */}
      <div className="grid grid-cols-[2fr_1fr] gap-4 max-[1100px]:grid-cols-1">
        <div className="card">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-bold">Süreç Çarkları</h3>
            <span className="text-xs text-ink-3">· anlık</span>
            <div className="flex-1" />
            <a href="/api/export/orders" className="btn text-xs">⤓ Excel</a>
          </div>
          <div className="grid grid-cols-4 gap-3 p-4 max-[900px]:grid-cols-2">
            <ProcessWheel
              label="Tasarım"
              percent={totalModels > 0 ? Math.round((approvedModels / totalModels) * 100) : 0}
              color="#7c3aed"
              sub={`${activeModels} aktif, ${approvedModels} onaylı`}
            />
            <ProcessWheel
              label="Kalıp"
              percent={patternCounts.length > 0 ? Math.min(100, patternCounts.length * 10) : 0}
              color="#0ea5e9"
              sub={`${patternCounts.length} açık atama`}
            />
            <ProcessWheel
              label="Planlama"
              percent={totalOrders > 0 ? Math.round((readyOrders / totalOrders) * 100) : 0}
              color="#f59e0b"
              sub={`${openOrders} açık, ${readyOrders} hazır`}
            />
            <ProcessWheel
              label="Atölye"
              percent={avgCapacityPct}
              color={avgCapacityPct > 85 ? '#ef4444' : '#16a34a'}
              sub={`Ort. doluluk %${avgCapacityPct}`}
            />
          </div>

          {/* Atölye kapasitesi */}
          <div className="grid grid-cols-2 gap-3 p-4 pt-0 max-[900px]:grid-cols-1">
            {workshopList.map((w) => {
              const cap = workshopCapacity.find((c) => c.id === w.id)!;
              return (
                <div key={w.id} className="border border-gray-200 rounded-xl p-3">
                  <div className="flex justify-between font-bold text-sm">
                    <span>{w.name}</span>
                    <span className={cap.pct > 85 ? 'text-red-600' : cap.pct > 70 ? 'text-amber-600' : 'text-emerald-600'}>
                      {cap.pct}%
                    </span>
                  </div>
                  <div className="text-base font-semibold my-1">
                    {cap.bookedToday.toLocaleString('tr-TR')} / {w.dailyCapacityPcs.toLocaleString('tr-TR')} adet
                  </div>
                  <div className="bar">
                    <span style={{ width: `${cap.pct}%`, background: cap.pct > 85 ? '#ef4444' : undefined }} />
                  </div>
                </div>
              );
            })}
            {workshopList.length === 0 && (
              <div className="text-sm text-ink-3 col-span-2 p-2">Atölye kaydı yok.</div>
            )}
          </div>
        </div>

        {/* Uyarılar */}
        <div className="card">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-bold">Uyarılar</h3>
            <span className={`chip ${alerts.some(a => a.tone === 'bad') ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
              {alerts.filter(a => a.tone !== 'info').length} aktif
            </span>
          </div>
          <div className="flex flex-col">
            {alerts.map((a, i) => (
              <div key={i} className="flex gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50">
                <div className={`w-6 h-6 rounded-lg flex-shrink-0 grid place-items-center text-white font-extrabold text-xs ${TONE_CLS[a.tone]}`}>
                  {TONE_ICON[a.tone]}
                </div>
                <div className="min-w-0">
                  {a.href ? (
                    <Link href={a.href} className="text-sm font-semibold hover:text-brand hover:underline block truncate">
                      {a.title}
                    </Link>
                  ) : (
                    <div className="text-sm font-semibold truncate">{a.title}</div>
                  )}
                  <div className="text-xs text-ink-3 truncate">{a.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sipariş tablosu + audit */}
      <div className="grid grid-cols-[2fr_1fr] gap-4 max-[1100px]:grid-cols-1">
        <div className="card">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-bold">Son Siparişler</h3>
            <div className="flex-1" />
            <Link href="/orders" className="text-xs text-brand hover:underline">Tümü →</Link>
          </div>
          <div className="overflow-auto max-h-[380px]">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 sticky top-0">
                  {['Sipariş', 'Model', 'Müşteri', 'Atölye', 'Adet', 'Termin', 'Durum'].map((h) => (
                    <th key={h} className="text-left p-2.5 text-xs font-bold text-ink-2 border-b border-gray-200 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="p-2.5 text-sm border-b border-gray-200">
                      <Link href={`/orders/${o.id}`} className="font-bold hover:text-brand hover:underline">
                        {o.code}
                      </Link>
                    </td>
                    <td className="p-2.5 text-sm border-b border-gray-200">{o.model.code}</td>
                    <td className="p-2.5 text-sm border-b border-gray-200">{o.model.customer.name}</td>
                    <td className="p-2.5 text-sm border-b border-gray-200">{o.workshop?.name ?? '—'}</td>
                    <td className="p-2.5 text-sm border-b border-gray-200">{o.totalQty.toLocaleString('tr-TR')}</td>
                    <td className="p-2.5 text-sm border-b border-gray-200 whitespace-nowrap">
                      {o.dueDate ? new Date(o.dueDate).toLocaleDateString('tr-TR') : '—'}
                    </td>
                    <td className="p-2.5 border-b border-gray-200">
                      <StatusChip status={o.status} />
                    </td>
                  </tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-ink-3 text-sm">
                      Henüz sipariş yok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit */}
        <div className="card">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-bold">Son Hareketler</h3>
            <div className="flex-1" />
            <Link href="/audit" className="text-xs text-brand hover:underline">Tümü →</Link>
          </div>
          {auditTail.map((a) => {
            const after = a.afterJson as Record<string, unknown> | null;
            const before = a.beforeJson as Record<string, unknown> | null;
            const isTransition = a.action === 'transition' && before?.status && after?.status;
            return (
              <div key={a.id.toString()}
                className="grid grid-cols-[10px_1fr_auto] gap-2.5 px-4 py-2.5 border-b border-dashed border-gray-100">
                <div className="w-2.5 h-2.5 rounded-full bg-brand mt-1.5 ring-4 ring-brand-100 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">
                    {isTransition
                      ? `${before.status} → ${after.status}`
                      : `${a.entity} · ${a.action}`}
                  </div>
                  <div className="text-xs text-ink-3 truncate">{a.user?.fullName ?? 'Sistem'}</div>
                </div>
                <div className="text-xs text-ink-3 whitespace-nowrap">
                  {new Date(a.ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            );
          })}
          {auditTail.length === 0 && (
            <div className="p-6 text-sm text-ink-3 text-center">Henüz hareket yok.</div>
          )}
        </div>
      </div>
    </div>
  );
}
