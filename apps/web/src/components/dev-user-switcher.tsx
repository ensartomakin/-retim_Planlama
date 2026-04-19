'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

type DevUser = { email: string; fullName: string; roles: string[] };

export function DevUserSwitcher({
  currentEmail,
  users,
}: {
  currentEmail: string;
  users: DevUser[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function switchTo(email: string) {
    startTransition(async () => {
      await fetch('/api/dev/switch-user', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <span className="opacity-70">Kullanıcı:</span>
      <select
        value={currentEmail}
        onChange={(e) => switchTo(e.target.value)}
        disabled={pending}
        className="bg-black/10 border border-black/20 rounded px-1.5 py-0.5 text-xs font-semibold"
      >
        {users.map((u) => (
          <option key={u.email} value={u.email}>
            {u.fullName} · {u.roles.join('+')}
          </option>
        ))}
      </select>
    </div>
  );
}
