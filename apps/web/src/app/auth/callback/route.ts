import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { prisma } from '@tekstil/db';

function safeNextPath(value: string | null, fallback = '/dashboard'): string {
  if (!value) return fallback;
  if (!value.startsWith('/')) return fallback;
  if (value.startsWith('//')) return fallback;
  return value;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const tokenHash =
    url.searchParams.get('token_hash') ?? url.searchParams.get('tokenHash');
  const type = url.searchParams.get('type');
  const next = safeNextPath(url.searchParams.get('next'));

  const supabase = createSupabaseServerClient();

  let email: string | undefined;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    email = data.user?.email ?? undefined;
    if (error) {
      return NextResponse.redirect(new URL('/login?error=exchange', url.origin));
    }
  } else if (tokenHash && type) {
    // Bazı Supabase e-posta linkleri `token_hash&type=magiclink` ile gelir.
    const { data, error } = await supabase.auth.verifyOtp({
      type: type as 'magiclink',
      token_hash: tokenHash,
    });
    email = data.user?.email ?? undefined;
    if (error) {
      return NextResponse.redirect(new URL('/login?error=verify', url.origin));
    }
  } else {
    return NextResponse.redirect(new URL('/login?error=missing_token', url.origin));
  }

  if (!email) {
    return NextResponse.redirect(new URL('/login?error=no_email', url.origin));
  }

  // Beyaz liste kontrolü — sistemde tanımlı değilse oturumu sonlandır.
  const known = await prisma.user.findUnique({
    where: { email },
    select: { id: true, isActive: true },
  });
  if (!known || !known.isActive) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/login?error=not_whitelisted', url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
