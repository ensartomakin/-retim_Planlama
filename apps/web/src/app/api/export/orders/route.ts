import { NextResponse } from 'next/server';
import { prisma } from '@tekstil/db';
import { buildOrdersExcel } from '@/lib/export/excel';
import { getSessionUser } from '@/lib/auth/session';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      model: { include: { customer: true } },
      workshop: true,
    },
  });

  const buffer = await buildOrdersExcel(orders);
  const filename = `siparisler-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
