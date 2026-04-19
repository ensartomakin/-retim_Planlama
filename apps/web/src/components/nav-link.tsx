'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
  return (
    <Link
      href={href}
      className={cn(
        'px-2.5 py-2 rounded-lg font-medium text-sm transition-colors',
        active
          ? 'bg-gray-800 text-white'
          : 'text-slate-300 hover:bg-gray-900 hover:text-white',
      )}
    >
      {children}
    </Link>
  );
}
