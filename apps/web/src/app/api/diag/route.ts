import { NextResponse } from 'next/server';
import { prisma } from '@tekstil/db';

export const dynamic = 'force-dynamic';

function isEnabled(url: URL): boolean {
  const token = process.env.DIAG_TOKEN;
  if (!token) return false;
  return url.searchParams.get('token') === token;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!isEnabled(url)) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const env = {
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    hasDirectUrl: Boolean(process.env.DIRECT_URL),
    hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hasSupabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    devMode: process.env.DEV_MODE === 'true',
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, env, db: { ok: true } });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, env, db: { ok: false, message } }, { status: 500 });
  }
}

