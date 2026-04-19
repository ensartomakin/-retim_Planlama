'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@tekstil/db';
import { requireUser } from '@/lib/auth/session';
import { withAudit } from '@/lib/audit';
import { canWrite, hasRole } from '@tekstil/contracts';
import { nextModel, canFireModel, type ModelEvent } from '@tekstil/contracts';
import { CreateModelInput } from '@tekstil/contracts';

export async function createModel(input: unknown) {
  const user = await requireUser();
  if (!canWrite(user, 'model')) throw new Error('Yetki yok (tasarim)');

  const data = CreateModelInput.parse(input);

  const count = await prisma.model.count();
  const code =
    (data as { code?: string }).code ??
    `${(await prisma.season.findUnique({ where: { id: data.seasonId } }))?.code}-MDL-${String(count + 1).padStart(3, '0')}`;

  const model = await withAudit(user.id, 'model', 'new', 'create', null, () =>
    prisma.model.create({ data: { ...data, code } }),
  );

  revalidatePath('/models');
  return model;
}

export async function transitionModel(modelId: string, event: ModelEvent) {
  const user = await requireUser();
  if (!canWrite(user, 'model') && !hasRole(user, 'super_admin'))
    throw new Error('Yetki yok');

  const model = await prisma.model.findUniqueOrThrow({
    where: { id: modelId },
    include: {
      attachments: { where: { type: 'teknik_cizim' } },
      patterns: { include: { versions: true } },
      samples: true,
      orders: { where: { status: { notIn: ['KAPALI', 'IPTAL'] } } },
    },
  });

  const ctx = {
    hasTechnicalDrawing: model.attachments.length > 0,
    hasCriticalNotes: model.samples.some((s) => !!s.criticalNotes),
    hasActivePatternVersion: model.patterns.some((p) => p.versions.length > 0),
    hasActiveOrders: model.orders.length > 0,
  };

  const guard = canFireModel(model.status, event, ctx);
  if (!guard.ok) throw new Error(guard.reason ?? 'Geçiş engelinde');

  const nextStatus = nextModel(model.status, event);

  const updated = await withAudit(
    user.id,
    'model',
    modelId,
    'transition',
    { status: model.status },
    () => prisma.model.update({ where: { id: modelId }, data: { status: nextStatus } }),
  );

  revalidatePath(`/models/${modelId}`);
  revalidatePath('/models');
  revalidatePath('/dashboard');
  return updated;
}
