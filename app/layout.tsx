import type {Metadata} from 'next';
import './globals.css';
import { Rubik } from 'next/font/google';
import { AuthProvider } from '@/hooks/use-auth';
import { CartProvider } from '@/hooks/use-cart';

const rubik = Rubik({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'POD House - Delivery',
  description: 'POD House - Os melhores pods e acessórios com entrega rápida em Londrina - PR.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" className={`${rubik.variable} antialiased`}>
      <body suppressHydrationWarning className="bg-white">
        <AuthProvider>
          <CartProvider>
            {children}
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
