'use client';

import { useTransition } from 'react';
import { cn } from '@/lib/utils/cn';

interface Props {
  label: string;
  description?: string;
  disabled?: boolean;
  disabledReason?: string;
  tone?: 'primary' | 'warn' | 'danger' | 'neutral';
  action: () => Promise<unknown>;
  onSuccess?: () => void;
}

const TONE_CLS: Record<string, string> = {
  primary: 'bg-brand text-white border-brand hover:bg-brand-700',
  warn: 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600',
  danger: 'bg-red-600 text-white border-red-600 hover:bg-red-700',
  neutral: '',
};

export function TransitionButton({ label, description, disabled, disabledReason, tone = 'primary', action, onSuccess }: Props) {
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (disabled || pending) return;
    startTransition(async () => {
      try {
        await action();
        onSuccess?.();
      } catch (e) {
        alert((e as Error).message);
      }
    });
  }

  const isDisabled = disabled || pending;

  return (
    <div className="flex flex-col gap-0.5">
      <button
        onClick={onClick}
        disabled={isDisabled}
        title={disabledReason}
        className={cn(
          'btn transition-opacity',
          TONE_CLS[tone],
          isDisabled && 'opacity-40 cursor-not-allowed',
        )}
      >
        {pending ? 'İşleniyor…' : label}
      </button>
      {disabledReason && disabled && (
        <span className="text-[11px] text-ink-3 max-w-[180px]">{disabledReason}</span>
      )}
      {description && !disabled && (
        <span className="text-[11px] text-ink-3 max-w-[180px]">{description}</span>
      )}
    </div>
  );
}
