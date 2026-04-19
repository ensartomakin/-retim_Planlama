import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tekstil MES',
  description: 'Tekstil Üretim Yönetim Sistemi',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
