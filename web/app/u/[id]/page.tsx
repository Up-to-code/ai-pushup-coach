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
    <main className="page profile-page">
      <section className="profile-hero">
        <div className="avatar">
          {profile.avatar ? <img src={profile.avatar} alt="" /> : <span>{initial}</span>}
        </div>
        <p className="eyebrow">{profile.countryName || 'Push Counter athlete'}</p>
        <h1 className="profile-title">{profile.displayName}</h1>
        {profile.bio ? <p className="lede">{profile.bio}</p> : <p className="lede">Training progress shared from Push Counter.</p>}
        <div className="action-row">
          <a className="button primary" href={appUrl}>
            Open in app <ArrowRight size={18} aria-hidden="true" />
          </a>
          <a className="button secondary" href={`mailto:?subject=Push Counter profile&body=${encodeURIComponent(profileUrl)}`}>
            Share <Share2 size={18} aria-hidden="true" />
          </a>
        </div>
      </section>

      <aside className="profile-card">
        <h2>Public stats</h2>
        <div className="profile-grid">
          <div className="stat">
            <Trophy size={20} aria-hidden="true" />
            <strong>{formatNumber(profile.totalReps)}</strong>
            <span>Total reps</span>
          </div>
          <div className="stat">
            <Medal size={20} aria-hidden="true" />
            <strong>{formatNumber(profile.bestReps)}</strong>
            <span>Best set</span>
          </div>
          <div className="stat">
            <Repeat2 size={20} aria-hidden="true" />
            <strong>{formatNumber(profile.streak)}</strong>
            <span>Streak</span>
          </div>
          <div className="stat">
            <Users size={20} aria-hidden="true" />
            <strong>{formatNumber(profile.followersCount)}</strong>
            <span>Followers</span>
          </div>
        </div>
        <p>
          Only public summary fields are shown here. Friend state, private workout history, account metadata, and pending-deletion profiles are not exposed.
        </p>
        <Link className="button secondary" href="/">
          Learn about Push Counter
        </Link>
      </aside>
    </main>
  );
}
