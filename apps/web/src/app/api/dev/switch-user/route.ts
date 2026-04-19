import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@tekstil/db';

const DEV_MODE = process.env.DEV_MODE === 'true';

export async function POST(req: Request) {
  if (!DEV_MODE) return NextResponse.json({ error: 'not in dev mode' }, { status: 403 });

  const { email } = (await req.json()) as { email?: string };
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive)
    return NextResponse.json({ error: 'user not found' }, { status: 404 });

  cookies().set('dev_user_email', email, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({ ok: true });
}
