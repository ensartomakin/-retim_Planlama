import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { prisma } from '@tekstil/db';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/dashboard';

  if (!code) {
    return NextResponse.redirect(new URL('/login', url.origin));
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user?.email) {
    return NextResponse.redirect(new URL('/login?error=exchange', url.origin));
  }

  // Beyaz liste kontrolü — sistemde tanımlı değilse oturumu sonlandır.
  const known = await prisma.user.findUnique({
    where: { email: data.user.email },
    select: { id: true, isActive: true },
  });
  if (!known || !known.isActive) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/login?error=not_whitelisted', url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
