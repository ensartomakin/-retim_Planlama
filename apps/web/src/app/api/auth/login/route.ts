import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@tekstil/db';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

const DEV_MODE =
  process.env.DEV_MODE === 'true' ||
  !supabaseUrl ||
  !supabaseKey ||
  supabaseUrl === 'http://localhost:54321' ||
  supabaseKey.startsWith('eyJhbGciOi...') ||
  supabaseKey === 'dev_placeholder';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, redirectTo } = body as { email?: string; redirectTo?: string };

    if (!email) {
      return NextResponse.json({ error: 'E-posta gerekli' }, { status: 400 });
    }

    if (DEV_MODE) {
      // DB bağlantısı yoksa bile DEV_MODE'da giriş izni ver
      try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (user && !user.isActive) {
          return NextResponse.json(
            { error: 'Bu kullanıcı hesabı devre dışı' },
            { status: 403 },
          );
        }
      } catch {
        // DB erişilemiyorsa DEV_MODE'da yine de devam et
      }

      cookies().set('dev_user_email', email, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      });

      return NextResponse.json({ ok: true, mode: 'dev', redirect: redirectTo ?? '/' });
    }

    // Production: Supabase magic link
    // PKCE flow için code_verifier cookie'sinin yazılabilmesi gerekir.
    const supabase = createSupabaseServerClient();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, mode: 'otp' });
  } catch (err) {
    console.error('[auth/login]', err);
    return NextResponse.json(
      { error: 'Sunucu hatası, lütfen tekrar deneyin' },
      { status: 500 },
    );
  }
}
