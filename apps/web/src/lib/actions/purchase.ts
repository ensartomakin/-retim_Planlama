'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@tekstil/db';
import { requireUser } from '@/lib/auth/session';
import { withAudit } from '@/lib/audit';
import { hasRole } from '@tekstil/contracts';

/** Satın alma talebini onayla — stok rezervi ve sipariş HAZIR geçişi tetiklenir. */
export async function approvePurchaseRequest(prId: string) {
  const user = await requireUser();
  if (!hasRole(user, 'satinalma')) throw new Error('Yetki yok (satınalma)');

  const pr = await prisma.purchaseRequest.findUniqueOrThrow({
    where: { id: prId },
    include: {
      items: { include: { material: { include: { stock: true } } } },
      order: true,
    },
  });

  if (pr.status !== 'TASLAK' && pr.status !== 'ONAY_BEKLIYOR')
    throw new Error(`Bu talep onaylanamaz (mevcut durum: ${pr.status})`);

  await prisma.$transaction(async (tx) => {
    // 1. PR'ı onayla
    await tx.purchaseRequest.update({
      where: { id: prId },
      data: { status: 'ONAYLI' },
    });

    // 2. Audit
    await tx.auditLog.create({
      data: {
        userId: user.id,
        entity: 'purchase_request',
        entityId: prId,
        action: 'transition',
        beforeJson: { status: pr.status },
        afterJson: { status: 'ONAYLI' },
      },
    });

    // 3. Bağlı sipariş MALZEME_BEKLIYOR'da mı? — tüm PR'lar onaylıysa HAZIR'a geç
    if (pr.orderId && pr.order?.status === 'MALZEME_BEKLIYOR') {
      const remainingBlockers = await tx.purchaseRequest.count({
        where: {
          orderId: pr.orderId,
          id: { not: prId },
          status: { notIn: ['ONAYLI', 'TESLIM_ALINDI', 'IPTAL'] },
        },
      });

      if (remainingBlockers === 0) {
        // Tüm bloklar kalktı → stok rezerv et + sipariş HAZIR
        for (const item of pr.items) {
          if (item.material.stock) {
            await tx.stock.update({
              where: { materialId: item.materialId },
              data: { qtyReserved: { increment: item.qty } },
            });
          }
        }
        await tx.order.update({
          where: { id: pr.orderId },
          data: { status: 'HAZIR' },
        });
        await tx.auditLog.create({
          data: {
            userId: user.id,
            entity: 'order',
            entityId: pr.orderId,
            action: 'transition',
            beforeJson: { status: 'MALZEME_BEKLIYOR' },
            afterJson: { status: 'HAZIR', triggeredBy: `PR ${prId} onayı` },
          },
        });
      }
    }
  });

  revalidatePath(`/purchase/${prId}`);
  revalidatePath('/purchase');
  revalidatePath('/dashboard');
  if (pr.orderId) revalidatePath(`/orders/${pr.orderId}`);
}

export async function rejectPurchaseRequest(prId: string, reason: string) {
  const user = await requireUser();
  if (!hasRole(user, 'satinalma')) throw new Error('Yetki yok (satınalma)');

  await withAudit(user.id, 'purchase_request', prId, 'transition',
    { status: 'TASLAK' },
    () => prisma.purchaseRequest.update({ where: { id: prId }, data: { status: 'IPTAL' } }),
  );

  revalidatePath('/purchase');
  revalidatePath(`/purchase/${prId}`);
}

export async function markDelivered(prId: string) {
  const user = await requireUser();
  if (!hasRole(user, 'satinalma')) throw new Error('Yetki yok (satınalma)');

  const pr = await prisma.purchaseRequest.findUniqueOrThrow({
    where: { id: prId },
    include: { items: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.purchaseRequest.update({ where: { id: prId }, data: { status: 'TESLIM_ALINDI' } });

    // Stok güncelle: gerçek teslim — rezervden stok'a yaz
    for (const item of pr.items) {
      await tx.stock.updateMany({
        where: { materialId: item.materialId },
        data: {
          qtyOnHand: { increment: item.qty },
          qtyReserved: { decrement: item.qty },
        },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: user.id,
        entity: 'purchase_request',
        entityId: prId,
        action: 'transition',
        beforeJson: { status: 'ONAYLI' },
        afterJson: { status: 'TESLIM_ALINDI' },
      },
    });
  });

  revalidatePath('/purchase');
  revalidatePath(`/purchase/${prId}`);
  revalidatePath('/stock');
}
