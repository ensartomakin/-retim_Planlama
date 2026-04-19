import type { RoleCode } from '../roles';

export type OrderStatus =
  | 'TASLAK'
  | 'BOM_DOGRULAMA'
  | 'MALZEME_BEKLIYOR'
  | 'HAZIR'
  | 'ATOLYEYE_GONDERILDI'
  | 'KAPALI'
  | 'IPTAL';

export type OrderEvent =
  | 'save'
  | 'bom_ok_but_stock_missing'
  | 'bom_ok_and_stock_ok'
  | 'purchase_approved'
  | 'release_to_workshop'
  | 'all_work_orders_done'
  | 'cancel';

const transitions: Record<OrderStatus, Partial<Record<OrderEvent, OrderStatus>>> = {
  TASLAK: { save: 'BOM_DOGRULAMA', cancel: 'IPTAL' },
  BOM_DOGRULAMA: {
    bom_ok_but_stock_missing: 'MALZEME_BEKLIYOR',
    bom_ok_and_stock_ok: 'HAZIR',
    cancel: 'IPTAL',
  },
  MALZEME_BEKLIYOR: { purchase_approved: 'HAZIR', cancel: 'IPTAL' },
  HAZIR: { release_to_workshop: 'ATOLYEYE_GONDERILDI', cancel: 'IPTAL' },
  ATOLYEYE_GONDERILDI: { all_work_orders_done: 'KAPALI' },
  KAPALI: {},
  IPTAL: {},
};

export function nextOrder(status: OrderStatus, event: OrderEvent): OrderStatus {
  const to = transitions[status][event];
  if (!to) throw new Error(`İzinsiz geçiş: ${status} --${event}-->`);
  return to;
}

export interface OrderGuardContext {
  hasActiveBom: boolean;
  stockCoversDemand: boolean;
  activePurchaseApproved: boolean;
  workshopCapacityOk: boolean;
  variantsMatchTotal: boolean;
  userRoles: RoleCode[];
}

export function canFireOrder(
  status: OrderStatus,
  event: OrderEvent,
  ctx: OrderGuardContext,
): { ok: boolean; reason?: string } {
  const hasRole = (...r: RoleCode[]) => ctx.userRoles.includes('super_admin') || r.some((x) => ctx.userRoles.includes(x));
  switch (event) {
    case 'save':
      if (!hasRole('planlama')) return { ok: false, reason: 'Yetki yok (planlama)' };
      if (!ctx.variantsMatchTotal) return { ok: false, reason: 'Asorti toplamı sipariş adediyle eşleşmiyor' };
      return { ok: true };
    case 'bom_ok_and_stock_ok':
      return ctx.hasActiveBom && ctx.stockCoversDemand
        ? { ok: true }
        : { ok: false, reason: 'BOM veya stok yetersiz' };
    case 'purchase_approved':
      return ctx.activePurchaseApproved
        ? { ok: true }
        : { ok: false, reason: 'Onaylı satın alma talebi yok' };
    case 'release_to_workshop':
      if (!hasRole('planlama')) return { ok: false, reason: 'Yetki yok (planlama)' };
      return ctx.workshopCapacityOk
        ? { ok: true }
        : { ok: false, reason: 'Atölye kapasitesi dolu — super_admin override gerekli' };
    default:
      return { ok: true };
  }
}
