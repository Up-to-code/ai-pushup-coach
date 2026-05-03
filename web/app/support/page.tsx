import type { Metadata } from 'next';
import { Mail, ShieldCheck, Smartphone } from 'lucide-react';
import { supportEmail } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Support',
  description: 'Get help with Push Counter.',
};

export default function SupportPage() {
  return (
    <main className="page legal-page">
      <p className="eyebrow">Support</p>
      <h1>How can we help?</h1>
      <p className="lede">
        For account, privacy, subscription, camera, or workout tracking questions, contact Push Counter support.
      </p>

      <section className="feature-grid section">
        <article className="feature">
          <Mail size={24} aria-hidden="true" />
          <h3>Email</h3>
          <p>
            <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
          </p>
        </article>
        <article className="feature">
          <Smartphone size={24} aria-hidden="true" />
          <h3>App</h3>
          <p>Use Settings for account deletion, subscriptions, notification preferences, and local data controls.</p>
        </article>
        <article className="feature">
          <ShieldCheck size={24} aria-hidden="true" />
          <h3>Privacy</h3>
          <p>Camera access is only requested for live workout tracking and can be disabled in iOS Settings.</p>
        </article>
      </section>
    </main>
  );
}
