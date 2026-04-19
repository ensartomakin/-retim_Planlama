'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@tekstil/db';
import { requireUser } from '@/lib/auth/session';
import { withAudit } from '@/lib/audit';
import { hasRole } from '@tekstil/contracts';
import { z } from 'zod';

const AssignInput = z.object({
  modelId: z.string().uuid(),
  assignedTo: z.string().uuid(),
});

export async function assignPattern(input: unknown) {
  const user = await requireUser();
  if (!hasRole(user, 'planlama', 'tasarim', 'modalist'))
    throw new Error('Yetki yok');

  const { modelId, assignedTo } = AssignInput.parse(input);

  // Modelde zaten kalıp var mı?
  const existing = await prisma.pattern.findFirst({ where: { modelId } });
  if (existing) {
    const updated = await withAudit(user.id, 'pattern', existing.id, 'update',
      { assignedTo: existing.assignedTo },
      () => prisma.pattern.update({
        where: { id: existing.id },
        data: { assignedTo, startedAt: existing.startedAt ?? new Date() },
      }),
    );
    revalidatePath(`/patterns/${existing.id}`);
    return updated;
  }

  const pattern = await withAudit(user.id, 'pattern', 'new', 'create', null, () =>
    prisma.pattern.create({
      data: { modelId, assignedTo, startedAt: new Date() },
    }),
  );
  revalidatePath('/patterns');
  revalidatePath(`/models/${modelId}`);
  return pattern;
}

const AddVersionInput = z.object({
  patternId: z.string().uuid(),
  note: z.string().max(500).optional(),
  fileUrl: z.string().url().optional(),
});

export async function addPatternVersion(input: unknown) {
  const user = await requireUser();
  if (!hasRole(user, 'modalist')) throw new Error('Yetki yok (modalist)');

  const { patternId, note, fileUrl } = AddVersionInput.parse(input);

  const pattern = await prisma.pattern.findUniqueOrThrow({
    where: { id: patternId },
    include: { versions: { orderBy: { versionNo: 'desc' }, take: 1 } },
  });

  const nextVersionNo = (pattern.versions[0]?.versionNo ?? 0) + 1;

  const [version] = await prisma.$transaction([
    prisma.patternVersion.create({
      data: {
        patternId,
        versionNo: nextVersionNo,
        note: note ?? null,
        fileUrl: fileUrl ?? null,
        createdBy: user.id,
      },
    }),
    prisma.pattern.update({
      where: { id: patternId },
      data: { totalRevisions: { increment: 1 } },
    }),
    prisma.auditLog.create({
      data: {
        userId: user.id,
        entity: 'pattern',
        entityId: patternId,
        action: 'update',
        afterJson: { newVersionNo: nextVersionNo, note: note ?? null },
      },
    }),
  ]);

  revalidatePath(`/patterns/${patternId}`);
  revalidatePath(`/models/${pattern.modelId}`);
  return version;
}

export async function closePattern(patternId: string) {
  const user = await requireUser();
  if (!hasRole(user, 'modalist', 'tasarim')) throw new Error('Yetki yok');

  const updated = await withAudit(user.id, 'pattern', patternId, 'update',
    { closedAt: null },
    () => prisma.pattern.update({ where: { id: patternId }, data: { closedAt: new Date() } }),
  );
  revalidatePath('/patterns');
  revalidatePath(`/patterns/${patternId}`);
  return updated;
}
