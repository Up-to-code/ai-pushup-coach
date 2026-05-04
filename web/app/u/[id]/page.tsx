import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Medal, Repeat2, Share2, Trophy, Users } from 'lucide-react';
import { getSharedProfile } from '@/lib/convex';
import { webUrl } from '@/lib/config';

type Props = {
  params: Promise<{ id: string }>;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat('en').format(value);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const profile = await getSharedProfile(decodeURIComponent(id));

  if (!profile) {
    return {
      title: 'Profile unavailable',
    };
  }

  const title = `${profile.displayName} on Push Counter`;
  const description = `${profile.displayName} has logged ${formatNumber(profile.totalReps)} push-up reps with Push Counter.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${webUrl}/u/${encodeURIComponent(profile.clientUserId)}`,
      images: profile.avatar ? [profile.avatar] : ['/images/icon.png'],
    },
  };
}

export default async function SharedProfilePage({ params }: Props) {
  const { id } = await params;
  const profile = await getSharedProfile(decodeURIComponent(id));

  if (!profile) notFound();

  const initial = (profile.displayName?.[0] ?? profile.nickname?.[0] ?? 'P').toUpperCase();
  const profileUrl = `${webUrl}/u/${encodeURIComponent(profile.clientUserId)}`;
  const appUrl = `pushcounter://user/${encodeURIComponent(profile.clientUserId)}`;

  return (
    <main className="apple-section" style={{ minHeight: 'calc(100vh - 120px)' }}>
      <div className="apple-section-inner" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        
        <div className="apple-profile-avatar">
          {profile.avatar ? <img src={profile.avatar} alt={profile.displayName} /> : <span>{initial}</span>}
        </div>
        
        <p className="apple-eyebrow" style={{ marginTop: '24px' }}>
          {profile.countryName || 'Push Counter athlete'}
        </p>
        
        <h1 className="apple-heading" style={{ marginBottom: '12px' }}>{profile.displayName}</h1>
        
        <p className="hero-v3-sub" style={{ marginBottom: '40px' }}>
          {profile.bio || 'Training progress shared from Push Counter.'}
        </p>

        <div className="apple-grid" style={{ maxWidth: '480px', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', width: '100%' }}>
          <div className="apple-stat-card">
            <Trophy size={24} aria-hidden="true" style={{ color: 'var(--accent)' }} />
            <strong>{formatNumber(profile.totalReps)}</strong>
            <span>Total reps</span>
          </div>
          <div className="apple-stat-card">
            <Medal size={24} aria-hidden="true" style={{ color: 'var(--accent)' }} />
            <strong>{formatNumber(profile.bestReps)}</strong>
            <span>Best set</span>
          </div>
          <div className="apple-stat-card">
            <Repeat2 size={24} aria-hidden="true" style={{ color: 'var(--accent)' }} />
            <strong>{formatNumber(profile.streak)}</strong>
            <span>Day streak</span>
          </div>
          <div className="apple-stat-card">
            <Users size={24} aria-hidden="true" style={{ color: 'var(--accent)' }} />
            <strong>{formatNumber(profile.followersCount)}</strong>
            <span>Followers</span>
          </div>
        </div>

        <div className="action-row" style={{ marginTop: '40px', justifyContent: 'center' }}>
          <a className="button primary" href={appUrl}>
            Open in app <ArrowRight size={18} aria-hidden="true" />
          </a>
          <a className="button secondary" href={`mailto:?subject=Push Counter profile&body=${encodeURIComponent(profileUrl)}`}>
            Share <Share2 size={18} aria-hidden="true" />
          </a>
        </div>
        
        <p style={{ marginTop: '40px', color: 'var(--soft)', fontSize: '14px' }}>
          Only public summary fields are shown. Private data is protected.
        </p>
        
        <Link href="/" style={{ marginTop: '12px', color: 'var(--muted)', fontSize: '14px' }}>
          Learn about Push Counter &rarr;
        </Link>
      </div>
    </main>
  );
}
