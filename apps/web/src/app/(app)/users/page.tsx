import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@tekstil/db';
import type { RoleCode } from '@tekstil/contracts';

export const dynamic = 'force-dynamic';

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin', tasarim: 'Tasarım', modalist: 'Modalist',
  planlama: 'Planlama', satinalma: 'Satın Alma', uretim: 'Üretim',
};

export default async function UsersPage() {
  const user = await getSessionUser();
  if (!user?.roles.includes('super_admin' as RoleCode)) redirect('/dashboard');

  const users = await prisma.user.findMany({
    include: { roles: { include: { role: true } } },
    orderBy: { fullName: 'asc' },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold">Kullanıcılar</h1>
        <span className="text-sm text-ink-3">{users.length} kullanıcı</span>
      </div>

      <div className="card overflow-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              {['Ad Soyad', 'E-posta', 'Roller', 'Durum'].map((h) => (
                <th key={h} className="text-left p-2.5 text-xs font-bold text-ink-2 border-b border-gray-200 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="p-2.5 text-sm font-semibold border-b border-gray-200">{u.fullName}</td>
                <td className="p-2.5 text-sm border-b border-gray-200 text-ink-3">{u.email}</td>
                <td className="p-2.5 border-b border-gray-200">
                  <div className="flex gap-1 flex-wrap">
                    {u.roles.map((r) => (
                      <span key={r.roleId} className="chip bg-brand-100 text-brand-700 text-xs">
                        {ROLE_LABEL[r.role.code] ?? r.role.code}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-2.5 text-sm border-b border-gray-200">
                  <span className={`chip ${u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {u.isActive ? 'Aktif' : 'Pasif'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card p-4 text-xs text-ink-3">
        Kullanıcı ekleme / rol atama — Faz 4&apos;te gelecek. Şimdilik seed ile ekleniyor.
      </div>
    </div>
  );
}
