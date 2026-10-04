import type { Metadata } from 'next';
import { DM_Sans, Cormorant_Garamond } from 'next/font/google';
import Link from 'next/link';
import { config } from '@/lib/config';
import { formatNaira } from '@/lib/money';
import { CartProvider } from '@/components/cart-provider';
import { Header } from '@/components/header';
import { Logo } from '@/components/logo';
import './globals.css';
const body = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});
const heading = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-heading',
  display: 'swap',
});
export const metadata: Metadata = {
  title: {
    default: config.name + ' | ' + config.tagline,
    template: '%s | ' + config.name,
  },
  description: config.about,
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-NG">
      <body className={`${body.variable} ${heading.variable} font-sans`}>
        <CartProvider>
          <a href="#main" className="sr-only focus:not-sr-only">
            Skip to content
          </a>
          <div className="bg-rose px-4 py-2 text-center text-xs tracking-wide text-white">
            A little care, delivered. Free shipping from{' '}
            {formatNaira(config.freeShippingThresholdKobo)}.
          </div>
          <Header />
          <main
            id="main"
            className="mx-auto min-h-[65vh] max-w-7xl px-5 py-10 md:py-14"
          >
            {children}
          </main>
          <footer className="mt-12 border-t border-rose/10 bg-blush/40">
            <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 md:grid-cols-2">
              <div>
                <Logo />
                <p className="mt-4 max-w-md text-sm leading-6 text-stone-600">
                  {config.about}
                </p>
                <p className="mt-4 text-xs">
                  © {new Date().getFullYear()} {config.name}
                </p>
              </div>
              <nav aria-label="Footer" className="flex gap-8 md:justify-end">
                <Link href="/products">Shop</Link>
                <Link href="/orders">Orders</Link>
                <Link href="/account">Account</Link>
              </nav>
            </div>
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}
