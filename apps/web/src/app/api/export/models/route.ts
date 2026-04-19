import { NextResponse } from 'next/server';
import { prisma } from '@tekstil/db';
import { buildModelsExcel } from '@/lib/export/excel';
import { getSessionUser } from '@/lib/auth/session';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const models = await prisma.model.findMany({
    orderBy: { createdAt: 'desc' },
    include: { customer: true, season: true, designer: true },
  });

  const buffer = await buildModelsExcel(models);
  const filename = `modeller-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
