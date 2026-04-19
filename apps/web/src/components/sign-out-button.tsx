'use client';

import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

export function SignOutButton() {
  async function onClick() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  }
  return (
    <button className="btn" onClick={onClick} title="Çıkış">
      Çıkış
    </button>
  );
}
