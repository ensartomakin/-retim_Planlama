export type ModelStatus =
  | 'TASLAK'
  | 'NUMUNE_HAZIRLANIYOR'
  | 'REVIZE'
  | 'ONAYLANDI'
  | 'IPTAL';

export type ModelEvent =
  | 'submit_for_sample'
  | 'request_revision'
  | 'resubmit'
  | 'approve'
  | 'cancel';

const transitions: Record<ModelStatus, Partial<Record<ModelEvent, ModelStatus>>> = {
  TASLAK: { submit_for_sample: 'NUMUNE_HAZIRLANIYOR', cancel: 'IPTAL' },
  NUMUNE_HAZIRLANIYOR: { request_revision: 'REVIZE', approve: 'ONAYLANDI', cancel: 'IPTAL' },
  REVIZE: { resubmit: 'NUMUNE_HAZIRLANIYOR', cancel: 'IPTAL' },
  ONAYLANDI: {},
  IPTAL: {},
};

export function nextModel(status: ModelStatus, event: ModelEvent): ModelStatus {
  const to = transitions[status][event];
  if (!to) throw new Error(`İzinsiz geçiş: ${status} --${event}-->`);
  return to;
}

export interface ModelGuardContext {
  hasTechnicalDrawing: boolean;
  hasCriticalNotes: boolean;
  hasActivePatternVersion: boolean;
  hasActiveOrders: boolean;
}

export function canFireModel(
  status: ModelStatus,
  event: ModelEvent,
  ctx: ModelGuardContext,
): { ok: boolean; reason?: string } {
  switch (event) {
    case 'submit_for_sample':
      return ctx.hasTechnicalDrawing
        ? { ok: true }
        : { ok: false, reason: 'Teknik çizim eklenmemiş' };
    case 'request_revision':
      return ctx.hasCriticalNotes
        ? { ok: true }
        : { ok: false, reason: 'Kritik notlar doldurulmalı' };
    case 'approve':
      return ctx.hasActivePatternVersion
        ? { ok: true }
        : { ok: false, reason: 'Aktif kalıp versiyonu yok' };
    case 'cancel':
      return ctx.hasActiveOrders
        ? { ok: false, reason: 'Aktif sipariş var, önce iptal edin' }
        : { ok: true };
    default:
      return { ok: true };
  }
}
