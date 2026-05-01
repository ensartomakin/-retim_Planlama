import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { prisma } from '@tekstil/db';

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
  const { email, redirectTo } = (await req.json()) as {
    email?: string;
    redirectTo?: string;
  };

  if (!email) {
    return NextResponse.json({ error: 'E-posta gerekli' }, { status: 400 });
  }

  if (DEV_MODE) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'Bu e-posta sistemde tanımlı değil' },
        { status: 404 },
      );
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
  const cookieStore = cookies();
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get: (name: string) => cookieStore.get(name)?.value,
      set: () => {},
      remove: () => {},
    },
  });

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, mode: 'otp' });
}
