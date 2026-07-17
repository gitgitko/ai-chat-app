import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Advanced AI Chat',
  description: 'Real-time AI chat powered by Llama 3',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gray-900 text-gray-100">{children}</body>
    </html>
  );
}
