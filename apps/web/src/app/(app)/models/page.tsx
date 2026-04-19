import { prisma } from '@tekstil/db';
import { StatusChip } from '@/components/status-chip';
import { getSessionUser } from '@/lib/auth/session';
import { canWrite } from '@tekstil/contracts';

export const dynamic = 'force-dynamic';

export default async function ModelsPage() {
  const user = await getSessionUser();
  const models = await prisma.model.findMany({
    orderBy: { createdAt: 'desc' },
    include: { customer: true, season: true, designer: true },
    take: 50,
  });

  const writable = user ? canWrite(user, 'model') : false;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold">Modeller</h1>
        <span className="text-sm text-ink-3">{models.length} kayıt</span>
        <div className="flex-1" />
        {writable && <button className="btn-primary">+ Yeni Model</button>}
      </div>

      <div className="card overflow-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              {['Kod', 'İsim', 'Müşteri', 'Sezon', 'Kategori', 'Termin', 'Durum'].map((h) => (
                <th key={h} className="text-left p-2.5 text-xs font-bold text-ink-2 border-b border-gray-200">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {models.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="p-2.5 text-sm font-bold border-b border-gray-200">{m.code}</td>
                <td className="p-2.5 text-sm border-b border-gray-200">{m.name}</td>
                <td className="p-2.5 text-sm border-b border-gray-200">{m.customer.name}</td>
                <td className="p-2.5 text-sm border-b border-gray-200">{m.season.code}</td>
                <td className="p-2.5 text-sm border-b border-gray-200">{m.category}</td>
                <td className="p-2.5 text-sm border-b border-gray-200">
                  {m.dueDate ? new Date(m.dueDate).toLocaleDateString('tr-TR') : '—'}
                </td>
                <td className="p-2.5 text-sm border-b border-gray-200">
                  <StatusChip status={m.status} />
                </td>
              </tr>
            ))}
            {models.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-ink-3 text-sm">
                  Henüz model yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
