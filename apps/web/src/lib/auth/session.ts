import { cache } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { prisma } from '@tekstil/db';
import type { SessionUser, RoleCode } from '@tekstil/contracts';

/**
 * Supabase auth kullanıcısını `users` + `user_role` tablolarından zenginleştirip
 * (cache edilmiş) SessionUser döner. Beyaz listede olmayan email = null.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
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
