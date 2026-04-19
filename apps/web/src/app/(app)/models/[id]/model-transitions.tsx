'use client';

import { useRouter } from 'next/navigation';
import { TransitionButton } from '@/components/transition-button';
import { transitionModel } from '@/lib/actions/model';
import type { ModelEvent } from '@tekstil/contracts';
import type { SessionUser } from '@tekstil/contracts';
import { canWrite } from '@tekstil/contracts';

interface GuardInfo {
  hasTechnicalDrawing: boolean;
  hasCriticalNotes: boolean;
  hasActivePatternVersion: boolean;
  hasActiveOrders: boolean;
}

interface Props {
  modelId: string;
  status: string;
  user: SessionUser;
  guard: GuardInfo;
}

const TRANSITIONS: Record<string, { event: ModelEvent; label: string; tone: 'primary' | 'warn' | 'danger' | 'neutral'; roleRequired: 'model' | null }[]> = {
  TASLAK: [
    { event: 'submit_for_sample', label: 'Numuneye Gönder', tone: 'primary', roleRequired: 'model' },
    { event: 'cancel', label: 'İptal Et', tone: 'danger', roleRequired: 'model' },
  ],
  NUMUNE_HAZIRLANIYOR: [
    { event: 'approve', label: 'Onayla', tone: 'primary', roleRequired: 'model' },
    { event: 'request_revision', label: 'Revize İste', tone: 'warn', roleRequired: 'model' },
    { event: 'cancel', label: 'İptal Et', tone: 'danger', roleRequired: 'model' },
  ],
  REVIZE: [
    { event: 'resubmit', label: 'Tekrar Gönder', tone: 'primary', roleRequired: 'model' },
    { event: 'cancel', label: 'İptal Et', tone: 'danger', roleRequired: 'model' },
  ],
};

export function ModelTransitions({ modelId, status, user, guard }: Props) {
  const router = useRouter();
  const actions = TRANSITIONS[status];
  if (!actions) return null;

  const canAct = canWrite(user, 'model');

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map(({ event, label, tone }) => {
        let disabledReason: string | undefined;
        if (!canAct) {
          disabledReason = 'Yetki yok (tasarım rolü gerekli)';
        } else if (event === 'submit_for_sample' && !guard.hasTechnicalDrawing) {
          disabledReason = 'Teknik çizim eklenmemiş';
        } else if (event === 'approve' && !guard.hasActivePatternVersion) {
          disabledReason = 'Aktif kalıp versiyonu yok';
        } else if (event === 'request_revision' && !guard.hasCriticalNotes) {
          disabledReason = 'Kritik notlar doldurulmalı';
        } else if (event === 'cancel' && guard.hasActiveOrders) {
          disabledReason = 'Aktif sipariş var — önce iptal edin';
        }

        return (
          <TransitionButton
            key={event}
            label={label}
            tone={tone}
            disabled={!!disabledReason}
            disabledReason={disabledReason}
            action={() => transitionModel(modelId, event)}
            onSuccess={() => router.refresh()}
          />
        );
      })}
    </div>
  );
}
