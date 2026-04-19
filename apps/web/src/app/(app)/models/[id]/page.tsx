import { notFound } from 'next/navigation';
import { prisma } from '@tekstil/db';
import { getSessionUser } from '@/lib/auth/session';
import { StatusChip } from '@/components/status-chip';
import { ModelTransitions } from './model-transitions';

export const dynamic = 'force-dynamic';

export default async function ModelDetailPage({ params }: { params: { id: string } }) {
  const [model, user] = await Promise.all([
    prisma.model.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        season: true,
        designer: true,
        attachments: true,
        samples: { orderBy: { createdAt: 'desc' } },
        patterns: {
          include: {
            assignee: { select: { fullName: true } },
            versions: { orderBy: { versionNo: 'desc' } },
          },
        },
        boms: { where: { isActive: true }, include: { items: { include: { material: true } } } },
        orders: {
          where: { status: { notIn: ['KAPALI', 'IPTAL'] } },
          include: { workshop: true },
        },
      },
    }),
    getSessionUser(),
  ]);

  if (!model || !user) notFound();

  const activeBom = model.boms[0];
  const latestPattern = model.patterns[0];
  const latestSample = model.samples[0];

  const guard = {
    hasTechnicalDrawing: model.attachments.some((a) => a.type === 'teknik_cizim'),
    hasCriticalNotes: model.samples.some((s) => !!s.criticalNotes),
    hasActivePatternVersion: model.patterns.some((p) => p.versions.length > 0),
    hasActiveOrders: model.orders.length > 0,
  };

  const auditLogs = await prisma.auditLog.findMany({
    where: { entity: 'model', entityId: model.id },
    orderBy: { ts: 'desc' },
    take: 10,
    include: { user: { select: { fullName: true } } },
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Başlık */}
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <div className="text-xs text-ink-3 mb-1">
            <a href="/models" className="hover:underline">Modeller</a> › {model.code}
          </div>
          <h1 className="text-xl font-bold">{model.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <StatusChip status={model.status} />
            <span className="text-sm text-ink-2">{model.customer.name}</span>
            <span className="text-sm text-ink-3">· {model.season.code}</span>
            <span className="text-sm text-ink-3">· {model.category}</span>
          </div>
        </div>
        <ModelTransitions modelId={model.id} status={model.status} user={user} guard={guard} />
      </div>

      <div className="grid grid-cols-[2fr_1fr] gap-4 max-[900px]:grid-cols-1">
        <div className="flex flex-col gap-4">
          {/* Bilgi kartı */}
          <div className="card p-4 grid grid-cols-2 gap-3">
            <InfoRow label="Model Kodu" value={model.code} />
            <InfoRow label="Müşteri" value={model.customer.name} />
            <InfoRow label="Sezon" value={model.season.code} />
            <InfoRow label="Kategori" value={model.category} />
            <InfoRow label="Tasarımcı" value={model.designer?.fullName ?? '—'} />
            <InfoRow
              label="Termin"
              value={model.dueDate ? new Date(model.dueDate).toLocaleDateString('tr-TR') : '—'}
            />
          </div>

          {/* Numune */}
          <div className="card">
            <div className="px-4 py-3 border-b border-gray-200 font-bold text-sm">Numune</div>
            {latestSample ? (
              <div className="p-4 grid grid-cols-2 gap-3 text-sm">
                <InfoRow label="Kumaş Notu" value={latestSample.fabricNote ?? '—'} />
                <InfoRow label="Aksesuar Notu" value={latestSample.accessoryNote ?? '—'} />
                <InfoRow label="Kalite Notu" value={latestSample.qualityNote ?? '—'} />
                <InfoRow label="Kritik Notlar" value={latestSample.criticalNotes ?? '—'} />
                <InfoRow label="Durum" value={latestSample.status} />
              </div>
            ) : (
              <div className="p-4 text-sm text-ink-3">Numune kaydı yok.</div>
            )}
          </div>

          {/* Kalıp */}
          <div className="card">
            <div className="px-4 py-3 border-b border-gray-200 font-bold text-sm">
              Kalıp — {latestPattern ? `${latestPattern.totalRevisions} revize` : 'Henüz yok'}
            </div>
            {latestPattern ? (
              <div className="p-4">
                <div className="text-sm mb-2 text-ink-2">
                  Modalist: <b>{latestPattern.assignee?.fullName ?? '—'}</b>
                </div>
                <div className="flex flex-col gap-1.5">
                  {latestPattern.versions.map((v) => (
                    <div key={v.id} className="flex items-center gap-2 border border-dashed border-gray-200 rounded-lg p-2 text-sm">
                      <span className="chip bg-brand-100 text-brand-700">v{v.versionNo}</span>
                      <span className="text-ink-2 flex-1">{v.note ?? '—'}</span>
                      <span className="text-xs text-ink-3">
                        {new Date(v.createdAt).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 text-sm text-ink-3">Kalıp atanmamış.</div>
            )}
          </div>

          {/* BOM */}
          <div className="card">
            <div className="px-4 py-3 border-b border-gray-200 font-bold text-sm">
              Reçete (BOM) {activeBom ? `— v${activeBom.version}` : '— Yok'}
            </div>
            {activeBom ? (
              <div className="overflow-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      {['Malzeme', 'Tip', 'Miktar/Adet', 'Birim', 'Fire %'].map((h) => (
                        <th key={h} className="text-left p-2.5 text-xs font-bold text-ink-2 border-b border-gray-200">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeBom.items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="p-2.5 text-sm border-b border-gray-200 font-semibold">{item.material.name}</td>
                        <td className="p-2.5 text-sm border-b border-gray-200">{item.material.type}</td>
                        <td className="p-2.5 text-sm border-b border-gray-200">{Number(item.qtyPerUnit)}</td>
                        <td className="p-2.5 text-sm border-b border-gray-200">{item.uom}</td>
                        <td className="p-2.5 text-sm border-b border-gray-200">{Number(item.wastePct)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 text-sm text-ink-3">Reçete tanımlanmamış.</div>
            )}
          </div>
        </div>

        {/* Sağ: ekler + aktif siparişler + audit */}
        <div className="flex flex-col gap-4">
          {/* Teknik çizimler */}
          <div className="card">
            <div className="px-4 py-3 border-b border-gray-200 font-bold text-sm">Ekler</div>
            {model.attachments.length === 0 ? (
              <div className="p-4 text-sm text-ink-3">Dosya yüklenmemiş.</div>
            ) : (
              <div className="p-3 flex flex-col gap-2">
                {model.attachments.map((a) => (
                  <a
                    key={a.id}
                    href={a.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg hover:border-brand text-sm"
                  >
                    <span className="chip bg-brand-100 text-brand-700">{a.type}</span>
                    <span className="truncate text-ink-2">{a.fileUrl.split('/').pop()}</span>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Aktif siparişler */}
          {model.orders.length > 0 && (
            <div className="card">
              <div className="px-4 py-3 border-b border-gray-200 font-bold text-sm">Aktif Siparişler</div>
              <div className="p-3 flex flex-col gap-2">
                {model.orders.map((o) => (
                  <a key={o.id} href={`/orders/${o.id}`}
                    className="flex items-center justify-between p-2.5 border border-gray-200 rounded-lg hover:border-brand text-sm">
                    <span className="font-semibold">{o.code}</span>
                    <span className="text-ink-3">{o.workshop?.name ?? '—'}</span>
                    <StatusChip status={o.status} />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
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
