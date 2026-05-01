import { cache } from 'react';
import { cookies } from 'next/headers';
import { prisma } from '@tekstil/db';
import type { SessionUser, RoleCode } from '@tekstil/contracts';

const DEV_USER_COOKIE = 'dev_user_email';

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  // Auth devre dışı: cookie (dev switcher) → SUPER_ADMIN_EMAIL → ilk aktif kullanıcı
  const cookieEmail = cookies().get(DEV_USER_COOKIE)?.value;
  const preferredEmail = cookieEmail || process.env.SUPER_ADMIN_EMAIL || undefined;

  const dbUser = preferredEmail
    ? await prisma.user.findUnique({
        where: { email: preferredEmail },
        include: { roles: { include: { role: true } } },
      })
    : null;

  const activeUser =
    dbUser && dbUser.isActive
      ? dbUser
      : await prisma.user.findFirst({
          where: { isActive: true },
          include: { roles: { include: { role: true } } },
          orderBy: { createdAt: 'asc' },
        });

  if (!activeUser) return null;

  return {
    id: activeUser.id,
    email: activeUser.email,
    fullName: activeUser.fullName,
    roles: activeUser.roles.map((r) => r.role.code as RoleCode),
  };
});

export async function requireUser(): Promise<SessionUser> {
  const u = await getSessionUser();
  if (u) return u;

  // Auth devre dışı: DB'de kullanıcı yoksa bile UI'ın çalışması için
  // fallback bir "super_admin" kullanıcı döndür.
  return {
    id: '0',
    email: process.env.SUPER_ADMIN_EMAIL || 'admin@local',
    fullName: process.env.SUPER_ADMIN_NAME || 'Admin',
    roles: ['super_admin'] as RoleCode[],
  };
}
