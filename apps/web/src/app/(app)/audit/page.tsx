import { prisma, Prisma } from '@tekstil/db';

export const dynamic = 'force-dynamic';

type AuditLogWithUser = Prisma.AuditLogGetPayload<{
  include: { user: { select: { fullName: true; email: true } } };
}>;

const ACTION_LABEL: Record<string, string> = {
  create: 'Oluşturdu',
  update: 'Güncelledi',
  delete: 'Sildi',
  transition: 'Durum geçişi',
  login: 'Giriş',
  logout: 'Çıkış',
};

const ACTION_COLOR: Record<string, string> = {
  create: 'bg-emerald-100 text-emerald-800',
  update: 'bg-sky-100 text-sky-800',
  delete: 'bg-red-100 text-red-800',
  transition: 'bg-brand-100 text-brand-700',
  login: 'bg-gray-100 text-gray-700',
  logout: 'bg-gray-100 text-gray-700',
};

const ENTITY_LABEL: Record<string, string> = {
  model: 'Model',
  order: 'Sipariş',
  work_order: 'İş Emri',
  bom: 'BOM',
  purchase_request: 'Satın Alma',
  user: 'Kullanıcı',
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: { entity?: string; user?: string; action?: string; page?: string };
}) {
  const page = Number(searchParams.page ?? 1);
  const pageSize = 50;
  const where = {
    ...(searchParams.entity ? { entity: searchParams.entity } : {}),
    ...(searchParams.action ? { action: searchParams.action as any } : {}),
    ...(searchParams.user ? { user: { fullName: { contains: searchParams.user, mode: 'insensitive' as const } } } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { ts: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { user: { select: { fullName: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold">Audit Log</h1>
        <span className="text-sm text-ink-3">{total.toLocaleString('tr-TR')} kayıt</span>
      </div>

      {/* Filtreler */}
      <form className="card p-3 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-ink-2">Varlık</label>
          <select
            name="entity"
            defaultValue={searchParams.entity ?? ''}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-brand"
          >
            <option value="">Tümü</option>
            {Object.entries(ENTITY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-ink-2">İşlem</label>
          <select
            name="action"
            defaultValue={searchParams.action ?? ''}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-brand"
          >
            <option value="">Tümü</option>
            {Object.entries(ACTION_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-ink-2">Kullanıcı</label>
          <input
            name="user"
            defaultValue={searchParams.user ?? ''}
            placeholder="İsim ara..."
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-brand"
          />
        </div>
        <button type="submit" className="btn">Filtrele</button>
        <a href="/audit" className="btn">Temizle</a>
      </form>

      <div className="card overflow-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              {['Zaman', 'Kullanıcı', 'Varlık', 'Kayıt ID', 'İşlem', 'Değişiklik'].map((h) => (
                <th key={h} className="text-left p-2.5 text-xs font-bold text-ink-2 border-b border-gray-200 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map((log: AuditLogWithUser) => {
              const after = log.afterJson as Record<string, unknown> | null;
              const before = log.beforeJson as Record<string, unknown> | null;
              const isTransition = log.action === 'transition' && before?.status && after?.status;
              return (
                <tr key={log.id.toString()} className="hover:bg-gray-50">
                  <td className="p-2.5 text-xs text-ink-2 border-b border-gray-200 whitespace-nowrap">
                    {new Date(log.ts).toLocaleString('tr-TR')}
                  </td>
                  <td className="p-2.5 text-sm border-b border-gray-200">
                    <div className="font-semibold">{log.user?.fullName ?? '—'}</div>
                    <div className="text-xs text-ink-3">{log.user?.email}</div>
                  </td>
                  <td className="p-2.5 text-sm border-b border-gray-200">
                    {ENTITY_LABEL[log.entity] ?? log.entity}
                  </td>
                  <td className="p-2.5 text-xs font-mono text-ink-3 border-b border-gray-200">
                    {log.entityId.slice(0, 8)}…
                  </td>
                  <td className="p-2.5 border-b border-gray-200">
                    <span className={`chip ${ACTION_COLOR[log.action] ?? 'bg-gray-100 text-gray-700'}`}>
                      {ACTION_LABEL[log.action] ?? log.action}
                    </span>
                  </td>
                  <td className="p-2.5 text-xs text-ink-2 border-b border-gray-200 max-w-[280px]">
                    {isTransition ? (
                      <span>
                        <span className="font-semibold">{String(before?.status)}</span>
                        {' → '}
                        <span className="font-semibold text-brand">{String(after?.status)}</span>
                      </span>
                    ) : after ? (
                      <span className="font-mono text-[11px] break-all">
                        {JSON.stringify(after).slice(0, 120)}
                      </span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
            {logs.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-ink-3 text-sm">
                  Kayıt bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Sayfalama */}
      {totalPages > 1 && (
        <div className="flex gap-2 justify-center">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`/audit?${new URLSearchParams({ ...searchParams, page: String(p) })}`}
              className={`btn ${p === page ? 'btn-primary' : ''}`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
