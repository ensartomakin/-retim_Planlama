import { prisma, Prisma } from '@tekstil/db';
import type { AuditAction } from '@tekstil/db';

/**
 * Tüm state geçişleri ve CRUD mutasyonları bu helper üzerinden geçer.
 * Prisma transaction içinde hem veriyi günceller hem de audit satırını yazar.
 */
export async function withAudit<T>(
  userId: string | null,
  entity: string,
  entityId: string,
  action: AuditAction,
  before: Record<string, unknown> | null,
  fn: () => Promise<T>,
): Promise<T> {
  const result = await prisma.$transaction(async (tx) => {
    const outcome = await fn();
    await tx.auditLog.create({
      data: {
        userId: userId ?? undefined,
        entity,
        entityId,
        action,
        beforeJson: (before ?? undefined) as Prisma.InputJsonValue | undefined,
        afterJson: pickDiff(before, outcome as Record<string, unknown>) as Prisma.InputJsonValue,
      },
    });
    return outcome;
  });
  return result;
}

/** Yalnızca değişen alanları after_json'a yazar — gürültüyü azaltır. */
function pickDiff(
  before: Record<string, unknown> | null,
  after: Record<string, unknown>,
): Record<string, unknown> {
  if (!before) return after;
  const diff: Record<string, unknown> = {};
  for (const key of Object.keys(after)) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      diff[key] = after[key];
    }
  }
  return diff;
}
