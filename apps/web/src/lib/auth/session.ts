import { cache } from 'react';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { prisma } from '@tekstil/db';
import type { SessionUser, RoleCode } from '@tekstil/contracts';

const DEV_MODE = process.env.DEV_MODE === 'true';
const DEV_USER_COOKIE = 'dev_user_email';

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  let email: string | undefined;

  if (DEV_MODE) {
    email =
      cookies().get(DEV_USER_COOKIE)?.value ||
      process.env.SUPER_ADMIN_EMAIL ||
      undefined;
  } else {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email;
  }

  if (!email) return null;

  const dbUser = await prisma.user.findUnique({
    where: { email },
    include: { roles: { include: { role: true } } },
  });
  if (!dbUser || !dbUser.isActive) return null;

  return {
    id: dbUser.id,
    email: dbUser.email,
    fullName: dbUser.fullName,
    roles: dbUser.roles.map((r) => r.role.code as RoleCode),
  };
});

export async function requireUser(): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) throw new Error('UNAUTHENTICATED');
  return u;
}
