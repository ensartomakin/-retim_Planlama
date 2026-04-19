export type WorkOrderStatus =
  | 'OLUSTURULDU'
  | 'KESIM'
  | 'DIKIM'
  | 'KALITE'
  | 'PAKETLEME'
  | 'TAMAMLANDI'
  | 'DURAKLADI'
  | 'IPTAL';

export type WorkOrderEvent =
  | 'start_cut'
  | 'cut_done'
  | 'sew_done'
  | 'qc_passed'
  | 'qc_failed_rework'
  | 'packed'
  | 'pause'
  | 'resume_cut'
  | 'resume_sew'
  | 'cancel';

const transitions: Record<WorkOrderStatus, Partial<Record<WorkOrderEvent, WorkOrderStatus>>> = {
  OLUSTURULDU: { start_cut: 'KESIM', cancel: 'IPTAL' },
  KESIM: { cut_done: 'DIKIM', pause: 'DURAKLADI' },
  DIKIM: { sew_done: 'KALITE', pause: 'DURAKLADI' },
  KALITE: { qc_passed: 'PAKETLEME', qc_failed_rework: 'DIKIM' },
  PAKETLEME: { packed: 'TAMAMLANDI' },
  DURAKLADI: { resume_cut: 'KESIM', resume_sew: 'DIKIM' },
  TAMAMLANDI: {},
  IPTAL: {},
};

export function nextWorkOrder(status: WorkOrderStatus, event: WorkOrderEvent): WorkOrderStatus {
  const to = transitions[status][event];
  if (!to) throw new Error(`İzinsiz iş emri geçişi: ${status} --${event}-->`);
  return to;
}
