'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@tekstil/db';
import { requireUser } from '@/lib/auth/session';
import { withAudit } from '@/lib/audit';
import { canWrite } from '@tekstil/contracts';
import { nextOrder, canFireOrder, type OrderEvent } from '@tekstil/contracts';
import { CreateOrderInput, OrderCodeFormat } from '@tekstil/contracts';

export async function createOrder(input: unknown) {
  const user = await requireUser();
  if (!canWrite(user, 'order')) throw new Error('Yetki yok (planlama)');

  const data = CreateOrderInput.parse(input);

  const seq = (await prisma.order.count()) + 1;
  const code = OrderCodeFormat.build(seq);

  const order = await withAudit(user.id, 'order', 'new', 'create', null, () =>
    prisma.order.create({
      data: {
        code,
        modelId: data.modelId,
        workshopId: data.workshopId,
        totalQty: data.totalQty,
        dueDate: data.dueDate,
        createdBy: user.id,
        variants: { create: data.variants },
      },
    }),
  );

  revalidatePath('/orders');
  return order;
}

/** BOM + stok kontrolü yapar, uygun event'i ateşler, purchase_request taslağı oluşturur. */
export async function validateAndAdvanceOrder(orderId: string) {
  const user = await requireUser();
  if (!canWrite(user, 'order')) throw new Error('Yetki yok (planlama)');

  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      model: {
        include: {
          boms: {
            where: { isActive: true },
            include: {
              items: {
                include: {
                  material: { include: { stock: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (order.status !== 'TASLAK')
    throw new Error(`Yalnızca TASLAK siparişler doğrulanabilir (şu an: ${order.status})`);

  const activeBom = order.model.boms[0];
  if (!activeBom) {
    // BOM yok — TASLAK'ta bırak
    throw new Error('Modelin aktif bir reçetesi (BOM) bulunamadı');
  }

  const missing: Array<{ materialId: string; name: string; shortfall: number; uom: string; supplierId: string | null }> = [];

  for (const item of activeBom.items) {
    const needed = Number(item.qtyPerUnit) * order.totalQty * (1 + Number(item.wastePct) / 100);
    const available = Number(item.material.stock?.qtyOnHand ?? 0) - Number(item.material.stock?.qtyReserved ?? 0);
    if (available < needed) {
      missing.push({
        materialId: item.materialId,
        name: item.material.name,
        shortfall: needed - available,
        uom: item.uom,
        supplierId: item.material.supplierDefaultId,
      });
    }
  }

  if (missing.length === 0) {
    // Stok yeterli → HAZIR
    const ctx = {
      hasActiveBom: true,
      stockCoversDemand: true,
      activePurchaseApproved: false,
      workshopCapacityOk: true,
      variantsMatchTotal: true,
      userRoles: user.roles,
    };
    const guard = canFireOrder('TASLAK', 'save', ctx);
    if (!guard.ok) throw new Error(guard.reason);

    await withAudit(user.id, 'order', orderId, 'transition', { status: 'TASLAK' }, () =>
      prisma.order.update({ where: { id: orderId }, data: { status: 'BOM_DOGRULAMA' } }),
    );
    const updated = await withAudit(user.id, 'order', orderId, 'transition', { status: 'BOM_DOGRULAMA' }, () =>
      prisma.order.update({ where: { id: orderId }, data: { status: 'HAZIR' } }),
    );
    revalidatePath(`/orders/${orderId}`);
    return { status: 'HAZIR' as const, missing: [] };
  }

  // Stok eksik → purchase_request otomatik oluştur, MALZEME_BEKLIYOR
  await withAudit(user.id, 'order', orderId, 'transition', { status: 'TASLAK' }, () =>
    prisma.order.update({ where: { id: orderId }, data: { status: 'MALZEME_BEKLIYOR' } }),
  );

  const prSeq = (await prisma.purchaseRequest.count()) + 1;
  const prCode = `PR-${new Date().getFullYear()}-${String(prSeq).padStart(6, '0')}`;

  // Tedarikçi bazında grupla
  const bySupplier = new Map<string | null, typeof missing>();
  for (const m of missing) {
    const key = m.supplierId;
    if (!bySupplier.has(key)) bySupplier.set(key, []);
    bySupplier.get(key)!.push(m);
  }

  for (const [supplierId, items] of bySupplier) {
    await prisma.purchaseRequest.create({
      data: {
        code: `${prCode}-${supplierId?.slice(0, 4) ?? 'GEN'}`,
        orderId,
        supplierId: supplierId ?? undefined,
        createdBy: user.id,
        items: {
          create: items.map((i) => ({
            materialId: i.materialId,
            qty: i.shortfall,
            note: `Otomatik — ${i.name} eksik`,
          })),
        },
      },
    });
  }

  revalidatePath(`/orders/${orderId}`);
  revalidatePath('/orders');
  return { status: 'MALZEME_BEKLIYOR' as const, missing };
}

/** Atölyeye gönder — kapasite kontrolü + work_order'ları oluştur. */
export async function releaseToWorkshop(orderId: string, overrideReason?: string) {
  const user = await requireUser();
  if (!canWrite(user, 'order')) throw new Error('Yetki yok (planlama)');

  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { workshop: true },
  });

  if (order.status !== 'HAZIR') throw new Error(`Sipariş HAZIR değil (şu an: ${order.status})`);
  if (!order.workshopId || !order.workshop) throw new Error('Atölye seçilmemiş');

  // Kapasite kontrolü (bugünden itibaren dueDate'e kalan iş günü)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = order.dueDate ? new Date(order.dueDate) : new Date(today.getTime() + 14 * 86400000);
  const workdays = Math.max(1, Math.ceil((due.getTime() - today.getTime()) / 86400000));
  const qtyPerDay = Math.ceil(order.totalQty / workdays);
  const capacityOk = qtyPerDay <= order.workshop.dailyCapacityPcs;

  if (!capacityOk && !overrideReason && !user.roles.includes('super_admin'))
    throw new Error(`Kapasite aşımı: günlük ${qtyPerDay} adet > kapasite ${order.workshop.dailyCapacityPcs}. Super Admin override gerekli.`);

  // Work order'ları oluştur (parti bölme)
  const batchSize = order.workshop.maxBatchPcs;
  const batchCount = Math.ceil(order.totalQty / batchSize);
  const seq = (await prisma.order.count());

  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status: 'ATOLYEYE_GONDERILDI' } });

    for (let i = 0; i < batchCount; i++) {
      const batchQty = i < batchCount - 1 ? batchSize : order.totalQty - batchSize * i;
      const woCode = `WO-${new Date().getFullYear()}-${String(seq).padStart(6, '0')}-${String(i + 1).padStart(2, '0')}`;
      await tx.workOrder.create({
        data: { code: woCode, orderId, qty: batchQty },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: user.id,
        entity: 'order',
        entityId: orderId,
        action: 'transition',
        beforeJson: { status: 'HAZIR' },
        afterJson: { status: 'ATOLYEYE_GONDERILDI', batchCount, overrideReason: overrideReason ?? null },
      },
    });
  });

  revalidatePath(`/orders/${orderId}`);
  revalidatePath('/orders');
  revalidatePath('/dashboard');
  return { batchCount };
}

export async function transitionOrder(orderId: string, event: OrderEvent) {
  const user = await requireUser();
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  const nextStatus = nextOrder(order.status, event);

  await withAudit(user.id, 'order', orderId, 'transition', { status: order.status }, () =>
    prisma.order.update({ where: { id: orderId }, data: { status: nextStatus } }),
  );

  revalidatePath(`/orders/${orderId}`);
  return nextStatus;
}
