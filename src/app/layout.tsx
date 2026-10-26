import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'Vision Solutions - LeadHunter B2B',
  description: 'Sistema Funcional de Prospecção Comercial B2B e Captação de Clientes Reais',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon.png', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="flex h-screen overflow-hidden bg-slate-50 antialiased font-sans">
        <Sidebar />
        <main className="flex-1 overflow-y-auto flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
