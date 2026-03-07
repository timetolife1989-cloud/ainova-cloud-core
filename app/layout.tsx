import type { Metadata } from 'next';
import './globals.css';
import { QueryProvider } from '@/components/providers/QueryProvider';

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME ?? 'Ainova Cloud Core',
  description: 'Manufacturing & Enterprise Dashboard Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hu">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
