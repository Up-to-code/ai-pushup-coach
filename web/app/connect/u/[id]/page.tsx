import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, ExternalLink, UserPlus } from 'lucide-react';
import { getSharedProfile } from '@/lib/convex';
import { appStoreUrl } from '@/lib/config';

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: 'Connect on Push Counter',
};

export default async function ConnectProfilePage({ params }: Props) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  const encodedId = encodeURIComponent(decodedId);
  const profile = await getSharedProfile(decodedId);

  if (!profile) notFound();

  const appUrl = `pushcounter://user/${encodedId}`;
  const webProfileUrl = `/u/${encodedId}`;

  return (
    <main className="shared-profile-page">
      <section className="shared-profile-cta">
        <div className="apple-profile-avatar shared-profile-avatar" style={{ margin: '0 auto 24px' }}>
          {profile.avatar ? <img src={profile.avatar} alt={profile.displayName} /> : <span>{profile.displayName.slice(0, 1).toUpperCase()}</span>}
        </div>
        <p className="apple-eyebrow">Push Counter connection</p>
        <h2>Connect with {profile.displayName}</h2>
        <p>Open Push Counter to follow this athlete, compare weekly progress, and turn shared proof into a friendly challenge.</p>
        <div className="shared-profile-actions">
          <a className="button primary" href={appUrl}>
            Open profile in app <UserPlus size={18} aria-hidden="true" />
          </a>
          <Link className="button secondary" href={webProfileUrl}>
            View web profile <ArrowRight size={18} aria-hidden="true" />
          </Link>
          {appStoreUrl ? (
            <a className="button secondary" href={appStoreUrl}>
              Get the app <ExternalLink size={18} aria-hidden="true" />
            </a>
          ) : null}
        </div>
      </section>
    </main>
  );
}
