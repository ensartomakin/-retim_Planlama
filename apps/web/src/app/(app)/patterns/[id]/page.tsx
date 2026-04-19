import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@tekstil/db';
import { getSessionUser } from '@/lib/auth/session';
import { hasRole } from '@tekstil/contracts';
import { StatusChip } from '@/components/status-chip';
import { PatternForm } from './pattern-form';

export const dynamic = 'force-dynamic';

export default async function PatternDetailPage({ params }: { params: { id: string } }) {
  const [pattern, user] = await Promise.all([
    prisma.pattern.findUnique({
      where: { id: params.id },
      include: {
        model: { include: { customer: true, season: true } },
        assignee: { select: { id: true, fullName: true, email: true } },
        versions: { orderBy: { versionNo: 'desc' } },
      },
    }),
    getSessionUser(),
  ]);

  if (!pattern || !user) notFound();

  const auditLogs = await prisma.auditLog.findMany({
    where: { entity: 'pattern', entityId: pattern.id },
    orderBy: { ts: 'desc' },
    take: 15,
    include: { user: { select: { fullName: true } } },
  });

  const isModalist = hasRole(user, 'modalist');
  const elapsed = pattern.startedAt
    ? Math.ceil((Date.now() - pattern.startedAt.getTime()) / 86400000)
    : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Başlık */}
      <div>
        <div className="text-xs text-ink-3 mb-1">
          <Link href="/patterns" className="hover:underline">Kalıplar</Link>
          {' › '}
          <Link href={`/models/${pattern.modelId}`} className="hover:underline">{pattern.model.code}</Link>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold">{pattern.model.name}</h1>
          <span className={`chip ${pattern.closedAt ? 'bg-gray-100 text-gray-700' : 'bg-emerald-100 text-emerald-800'}`}>
            {pattern.closedAt ? 'Kapalı' : 'Açık'}
          </span>
          <StatusChip status={pattern.model.status} />
          {elapsed && !pattern.closedAt && (
            <span className="chip bg-amber-100 text-amber-800">{elapsed} gün açık</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[2fr_1fr] gap-4 max-[900px]:grid-cols-1">
        <div className="flex flex-col gap-4">
          {/* Bilgi */}
          <div className="card p-4 grid grid-cols-2 gap-3">
            <InfoRow label="Model Kodu" value={pattern.model.code} />
            <InfoRow label="Müşteri" value={pattern.model.customer.name} />
            <InfoRow label="Sezon" value={pattern.model.season.code} />
            <InfoRow label="Modalist" value={pattern.assignee?.fullName ?? '—'} />
            <InfoRow label="Toplam Revize" value={String(pattern.totalRevisions)} />
            <InfoRow label="Başlangıç" value={pattern.startedAt ? new Date(pattern.startedAt).toLocaleDateString('tr-TR') : '—'} />
            {pattern.closedAt && (
              <InfoRow label="Kapatıldı" value={new Date(pattern.closedAt).toLocaleDateString('tr-TR')} />
            )}
          </div>

          {/* Versiyon geçmişi */}
          <div className="card">
            <div className="px-4 py-3 border-b border-gray-200 font-bold text-sm">
              Versiyon Geçmişi ({pattern.versions.length})
            </div>
            {pattern.versions.length === 0 ? (
              <div className="p-4 text-sm text-ink-3">Henüz versiyon yok.</div>
            ) : (
              <div className="divide-y divide-dashed divide-gray-100">
                {pattern.versions.map((v) => (
                  <div key={v.id} className="flex items-start gap-3 p-3 hover:bg-gray-50">
                    <span className="chip bg-brand-100 text-brand-700 flex-shrink-0 mt-0.5">v{v.versionNo}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold">{v.note ?? <span className="text-ink-3 italic">Not eklenmemiş</span>}</div>
                      <div className="text-xs text-ink-3 mt-0.5">
                        {new Date(v.createdAt).toLocaleString('tr-TR')}
                      </div>
                    </div>
                    {v.fileUrl && (
                      <a href={v.fileUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-brand hover:underline flex-shrink-0">
                        Dosyayı Aç
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modalist formu */}
          <PatternForm patternId={pattern.id} isClosed={!!pattern.closedAt} isModalist={isModalist} />
        </div>

        {/* Sağ: audit */}
        <div className="card">
          <div className="px-4 py-3 border-b border-gray-200 font-bold text-sm">Geçmiş</div>
          {auditLogs.length === 0 && (
            <div className="p-4 text-sm text-ink-3">Kayıt yok.</div>
          )}
          {auditLogs.map((a) => {
            const after = a.afterJson as Record<string, unknown> | null;
            return (
              <div key={a.id.toString()}
                className="grid grid-cols-[10px_1fr] gap-2.5 px-4 py-2.5 border-b border-dashed border-gray-100">
                <div className="w-2.5 h-2.5 rounded-full bg-brand mt-1 ring-4 ring-brand-100" />
                <div>
                  <div className="text-sm font-semibold">
                    {a.action === 'update' && after?.newVersionNo
                      ? `v${after.newVersionNo} eklendi`
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
