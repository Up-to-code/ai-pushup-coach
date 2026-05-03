import type { Metadata } from 'next';
import Link from 'next/link';
import { Outfit } from 'next/font/google';
import './globals.css';
import { webUrl } from '@/lib/config';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(webUrl),
  title: {
    default: 'Push Counter',
    template: '%s | Push Counter',
  },
  description: 'Push Counter helps you build a stronger push-up habit with live rep tracking, training plans, and focused progress history.',
  openGraph: {
    title: 'Push Counter',
    description: 'Live push-up tracking, progress history, and social motivation for focused training.',
    images: ['/images/icon.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={outfit.variable}>
      <body className="font-sans antialiased">
        <div className="shell">
          <header className="site-header">
            <nav className="nav" aria-label="Main navigation">
              <Link className="brand" href="/">
                <img src="/images/logo-push-up.png" alt="" />
                <span>Push Counter</span>
              </Link>
              <div className="nav-links">
                <Link href="/privacy">Privacy</Link>
                <Link href="/terms">Terms</Link>
                <Link href="/support">Support</Link>
              </div>
            </nav>
          </header>
          {children}
          <footer className="footer">
            <div className="footer-inner">
              <span>© 2026 Nexfiy. Push Counter.</span>
              <div className="nav-links">
                <Link href="/privacy">Privacy</Link>
                <Link href="/terms">Terms</Link>
                <Link href="/support">Support</Link>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
