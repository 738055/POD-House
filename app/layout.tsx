import type {Metadata} from 'next';
import './globals.css'; // Global styles
import { Inter, Anton } from 'next/font/google';
import { AuthProvider } from '@/hooks/use-auth';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const anton = Anton({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'House Delivery - Pod House',
  description: 'Sistema de delivery para Pods e acessórios com variações, estoque, promoções e cashback.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${anton.variable}`}>
      <body suppressHydrationWarning className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
