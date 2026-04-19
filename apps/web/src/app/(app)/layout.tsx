import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { SignOutButton } from '@/components/sign-out-button';
import { NavLink } from '@/components/nav-link';
import { DevUserSwitcher } from '@/components/dev-user-switcher';
import { prisma } from '@tekstil/db';
import type { RoleCode } from '@tekstil/contracts';

const DEV_MODE = process.env.DEV_MODE === 'true';

const NAV = [
  {
    section: 'Ana',
    items: [
      { href: '/dashboard', label: '◈ Dashboard', roles: null },
      { href: '/models', label: '● Modeller', roles: null },
      { href: '/patterns', label: '● Kalıplar', roles: null },
      { href: '/orders', label: '● Siparişler', roles: null },
      { href: '/work-orders', label: '● İş Emirleri', roles: null },
    ],
  },
  {
    section: 'Tedarik',
    items: [
      { href: '/bom', label: '● Reçete (BOM)', roles: null },
      { href: '/purchase', label: '● Satın Alma', roles: null },
      { href: '/stock', label: '● Stok', roles: null },
    ],
  },
  {
    section: 'Sistem',
    items: [
      { href: '/reports', label: '● Raporlar', roles: null },
      { href: '/audit', label: '● Audit Log', roles: null },
      { href: '/users', label: '● Kullanıcılar', roles: ['super_admin'] as RoleCode[] },
    ],
  },
] as const;

const ROLE_LABEL: Record<RoleCode, string> = {
  super_admin: 'Super Admin',
  tasarim: 'Tasarım',
  modalist: 'Modalist',
  planlama: 'Planlama',
  satinalma: 'Satın Alma',
  uretim: 'Üretim',
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const initials = user.fullName
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const devUsers = DEV_MODE
    ? await prisma.user.findMany({
        where: { isActive: true },
        select: {
          email: true,
          fullName: true,
          roles: { include: { role: { select: { code: true } } } },
        },
        orderBy: { fullName: 'asc' },
      })
    : [];

  return (
    <>
      {DEV_MODE && (
        <div className="bg-amber-500 text-black text-xs font-bold px-4 py-1.5 flex items-center justify-between gap-4 sticky top-0 z-20">
          <span>
            ⚠ DEV MODE aktif — kimlik doğrulama atlanıyor. Prod için{' '}
            <code className="bg-black/10 px-1 rounded">DEV_MODE=false</code>.
          </span>
          <DevUserSwitcher
            currentEmail={user.email}
            users={devUsers.map((u) => ({
              email: u.email,
              fullName: u.fullName,
              roles: u.roles.map((r) => r.role.code),
            }))}
          />
        </div>
      )}
      <div className="grid grid-cols-[240px_1fr] min-h-screen max-[1100px]:grid-cols-1">
      <aside className="bg-[#0f1115] text-gray-300 p-4 sticky top-0 h-screen overflow-y-auto max-[1100px]:hidden">
        <div className="flex items-center gap-2.5 text-white font-bold mb-5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand to-brand-400 grid place-items-center font-extrabold text-sm">
            T
          </div>
          Tekstil MES
        </div>
        {NAV.map((group) => (
          <div key={group.section}>
            <div className="mt-3.5 mx-2 mb-1.5 text-[11px] tracking-[.08em] text-gray-500 uppercase">
              {group.section}
            </div>
            <nav className="flex flex-col gap-0.5">
              {group.items
                .filter(
                  (i) =>
                    !i.roles ||
                    i.roles.some((r) => user.roles.includes(r)) ||
                    user.roles.includes('super_admin'),
                )
                .map((i) => (
                  <NavLink key={i.href} href={i.href}>
                    {i.label}
                  </NavLink>
                ))}
            </nav>
          </div>
        ))}
        <div className="mt-6 border-t border-gray-800 pt-4">
          <div className="text-xs text-gray-500 px-2 mb-1">{user.fullName}</div>
          <div className="text-[11px] text-gray-600 px-2">{user.email}</div>
        </div>
      </aside>

      <main className="flex flex-col min-h-screen">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 flex items-center gap-3 px-5 py-2.5">
          <div className="flex-1 max-w-sm relative">
            <input
              placeholder="Model, sipariş no, barkod ara..."
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-brand"
            />
            <span className="absolute left-2.5 top-1.5 text-ink-3 text-base">⌕</span>
          </div>
          <div className="flex-1" />
          <span className="chip bg-brand-100 text-brand-700 hidden sm:inline-flex">
            {user.roles.map((r) => ROLE_LABEL[r]).join(' + ')}
          </span>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-200 to-pink-200 grid place-items-center font-bold text-sm flex-shrink-0">
            {initials}
          </div>
          <SignOutButton />
        </header>

        <div className="p-5 flex-1">{children}</div>
      </main>
      </div>
    </>
  );
}
