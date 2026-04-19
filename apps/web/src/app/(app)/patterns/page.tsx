import Link from 'next/link';
import { prisma } from '@tekstil/db';
import { getSessionUser } from '@/lib/auth/session';
import { hasRole } from '@tekstil/contracts';

export const dynamic = 'force-dynamic';

export default async function PatternsPage() {
  const [patterns, user] = await Promise.all([
    prisma.pattern.findMany({
      orderBy: { startedAt: 'desc' },
      include: {
        model: { include: { customer: true, season: true } },
        assignee: { select: { fullName: true } },
        versions: { orderBy: { versionNo: 'desc' }, take: 1 },
      },
    }),
    prisma.user.findMany({
      include: { roles: { include: { role: true } } },
    }),
  ]);

  const modalistUsers = patterns; // ← sadece listede kullanılan, atama formu detay sayfasında

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold">Kalıplar</h1>
        <span className="text-sm text-ink-3">{patterns.length} kayıt</span>
        <div className="flex-1" />
        <a href="/api/export/models" className="btn">⤓ Excel (Modeller)</a>
      </div>

      {/* Özet kartlar */}
      <div className="grid grid-cols-3 gap-3 max-[900px]:grid-cols-1">
        <SummaryCard
          label="Açık Kalıp"
          value={patterns.filter((p) => !p.closedAt).length}
          sub="Devam eden çalışmalar"
          color="text-brand"
        />
        <SummaryCard
          label="Toplam Revize"
          value={patterns.reduce((s, p) => s + p.totalRevisions, 0)}
          sub="Tüm zaman"
          color="text-amber-600"
        />
        <SummaryCard
          label="Tamamlanan"
          value={patterns.filter((p) => !!p.closedAt).length}
          sub="Kapatılmış kalıplar"
          color="text-emerald-600"
        />
      </div>

      <div className="card overflow-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              {['Model', 'Müşteri', 'Sezon', 'Modalist', 'Son Versiyon', 'Revize #', 'Başlangıç', 'Durum'].map((h) => (
                <th key={h} className="text-left p-2.5 text-xs font-bold text-ink-2 border-b border-gray-200 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {patterns.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="p-2.5 text-sm border-b border-gray-200">
                  <Link href={`/patterns/${p.id}`} className="font-bold hover:text-brand hover:underline">
                    {p.model.code}
                  </Link>
                  <div className="text-xs text-ink-3">{p.model.name}</div>
                </td>
                <td className="p-2.5 text-sm border-b border-gray-200">{p.model.customer.name}</td>
                <td className="p-2.5 text-sm border-b border-gray-200">{p.model.season.code}</td>
                <td className="p-2.5 text-sm border-b border-gray-200">
                  {p.assignee?.fullName ?? <span className="text-ink-3 italic">Atanmamış</span>}
                </td>
                <td className="p-2.5 text-sm border-b border-gray-200">
                  {p.versions[0] ? (
                    <span className="chip bg-brand-100 text-brand-700">v{p.versions[0].versionNo}</span>
                  ) : (
                    <span className="text-ink-3">—</span>
                  )}
                </td>
                <td className="p-2.5 text-sm border-b border-gray-200 text-center font-semibold">
                  {p.totalRevisions}
                </td>
                <td className="p-2.5 text-sm border-b border-gray-200 text-ink-3 whitespace-nowrap">
                  {p.startedAt ? new Date(p.startedAt).toLocaleDateString('tr-TR') : '—'}
                </td>
                <td className="p-2.5 border-b border-gray-200">
                  {p.closedAt ? (
                    <span className="chip bg-gray-100 text-gray-700">Kapalı</span>
                  ) : (
                    <span className="chip bg-emerald-100 text-emerald-800">Açık</span>
                  )}
                </td>
              </tr>
            ))}
            {patterns.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-ink-3 text-sm">
                  Henüz kalıp kaydı yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, sub, color }: { label: string; value: number; sub: string; color: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-semibold text-ink-2">{label}</div>
      <div className={`text-2xl font-extrabold mt-1 ${color}`}>{value}</div>
      <div className="text-xs text-ink-3 mt-0.5">{sub}</div>
    </div>
  );
}
