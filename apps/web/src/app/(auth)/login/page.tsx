'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';

function errorMessage(code: string | null): string | null {
  if (!code) return null;
  switch (code) {
    case 'exchange':
      return 'Giriş bağlantısı doğrulanamadı. Lütfen linki tekrar açın veya yeniden mail isteyin.';
    case 'verify':
      return 'Giriş bağlantısı doğrulanamadı. Lütfen yeniden mail isteyin.';
    case 'missing_token':
      return 'Giriş bağlantısı eksik/bozuk görünüyor. Lütfen yeniden mail isteyin.';
    case 'no_email':
      return 'Supabase kullanıcı e-postasını döndüremedi. Lütfen yeniden deneyin.';
    case 'not_whitelisted':
      return 'Bu e-posta sistemde tanımlı değil veya pasif. Super Admin ile iletişime geçin.';
    default:
      return 'Giriş sırasında hata oluştu. Lütfen yeniden deneyin.';
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isDevMode, setIsDevMode] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          redirectTo: `${window.location.origin}/auth/callback`,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      if (data.mode === 'dev') {
        setIsDevMode(true);
        router.push(data.redirect ?? '/');
        return;
      }

      setStatus('sent');
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Bilinmeyen hata');
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-[var(--bg)] p-4">
      <div className="card w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand to-brand-400 grid place-items-center text-white font-extrabold">
            T
          </div>
          <div>
            <div className="font-bold">Tekstil MES</div>
            <div className="text-xs text-ink-3">Üretim Yönetim Sistemi</div>
          </div>
        </div>

        {status === 'sent' ? (
          <div className="text-sm">
            <div className="font-semibold mb-1">E-posta gönderildi ✓</div>
            <p className="text-ink-2">
              <b>{email}</b> adresinize giriş bağlantısı gönderdik. Bağlantıya tıklayın —
              8 saat geçerli olur.
            </p>
            <button className="btn mt-4" onClick={() => setStatus('idle')}>
              Farklı bir e-posta kullan
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <Suspense fallback={null}>
              <LoginErrorBanner />
            </Suspense>
            <label className="block text-sm font-semibold">E-posta</label>
            <input
              type="email"
              required
              autoFocus
              placeholder="isim@firma.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand"
            />
            <button
              className="btn-primary w-full justify-center"
              disabled={status === 'sending'}
            >
              {status === 'sending' ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
            {error && <div className="text-xs text-red-600">Hata: {error}</div>}
            <p className="text-[11px] text-ink-3 pt-2">
              Yalnızca sistemde tanımlı kullanıcı e-postaları giriş yapabilir. Yeni kullanıcı için
              Super Admin ile iletişime geçin.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

function LoginErrorBanner() {
  const searchParams = useSearchParams();
  const message = errorMessage(searchParams.get('error'));
  if (!message) return null;
  return <div className="text-xs text-red-600">{message}</div>;
}
