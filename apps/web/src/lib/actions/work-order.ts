'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@tekstil/db';
import { requireUser } from '@/lib/auth/session';
import { hasRole } from '@tekstil/contracts';
import { nextWorkOrder, type WorkOrderEvent } from '@tekstil/contracts';

export async function transitionWorkOrder(workOrderId: string, event: WorkOrderEvent) {
  const user = await requireUser();
  if (!hasRole(user, 'uretim', 'planlama'))
    throw new Error('Yetki yok (üretim veya planlama)');

  const wo = await prisma.workOrder.findUniqueOrThrow({ where: { id: workOrderId } });
  const nextStatus = nextWorkOrder(wo.status, event);

  await prisma.$transaction(async (tx) => {
    await tx.workOrder.update({
      where: { id: workOrderId },
      data: {
        status: nextStatus,
        startedAt: nextStatus === 'KESIM' && !wo.startedAt ? new Date() : wo.startedAt,
        finishedAt: nextStatus === 'TAMAMLANDI' ? new Date() : wo.finishedAt,
      },
    });

    await tx.workOrderEvent.create({
      data: {
        workOrderId,
        fromStatus: wo.status,
        toStatus: nextStatus,
        userId: user.id,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        entity: 'work_order',
        entityId: workOrderId,
        action: 'transition',
        beforeJson: { status: wo.status },
        afterJson: { status: nextStatus },
      },
    });

    // Sipariş tüm iş emirleri tamamlandıysa KAPALI yap
    if (nextStatus === 'TAMAMLANDI') {
      const remaining = await tx.workOrder.count({
        where: {
          orderId: wo.orderId,
          status: { not: 'TAMAMLANDI' },
          id: { not: workOrderId },
        },
      });
      if (remaining === 0) {
        await tx.order.update({ where: { id: wo.orderId }, data: { status: 'KAPALI' } });
        await tx.auditLog.create({
          data: {
            userId: user.id,
            entity: 'order',
            entityId: wo.orderId,
            action: 'transition',
            beforeJson: { status: 'ATOLYEYE_GONDERILDI' },
            afterJson: { status: 'KAPALI', reason: 'Tüm iş emirleri tamamlandı' },
          },
        });
      }
    }
  });

  revalidatePath('/work-orders');
  revalidatePath(`/orders/${wo.orderId}`);
  revalidatePath('/dashboard');
  return nextStatus;
}
