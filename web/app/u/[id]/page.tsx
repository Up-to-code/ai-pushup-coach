import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, BarChart3, CalendarDays, Flame, Medal, Repeat2, Share2, Trophy, Users, type LucideIcon } from 'lucide-react';
import { getSharedProfile } from '@/lib/convex';
import { appStoreUrl, webUrl } from '@/lib/config';

type Props = {
  params: Promise<{ id: string }>;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat('en').format(value);
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatUpdatedAt(value: number) {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const profile = await getSharedProfile(decodeURIComponent(id));

  if (!profile) {
    return {
      title: 'Profile unavailable',
    };
  }

  const title = `${profile.displayName}'s Push Counter profile`;
  const description = `${profile.displayName} has logged ${formatNumber(profile.totalReps)} push-up reps, a ${formatNumber(profile.streak)} day streak, and ${formatNumber(profile.followersCount)} followers.`;
  const profileUrl = `${webUrl}/u/${encodeURIComponent(profile.clientUserId)}`;
  const image = profile.avatar || '/images/icon.png';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: profileUrl,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
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
  const connectUrl = `/connect/u/${encodeURIComponent(profile.clientUserId)}`;
  const maxRecentReps = Math.max(1, ...profile.recentDays.map((day) => day.reps));
  const achievements = [
    {
      label: 'First 100',
      value: profile.totalReps >= 100 ? 'Unlocked' : `${formatNumber(Math.max(0, 100 - profile.totalReps))} to go`,
      active: profile.totalReps >= 100,
    },
    {
      label: '1K Club',
      value: profile.totalReps >= 1000 ? 'Unlocked' : `${formatNumber(Math.max(0, 1000 - profile.totalReps))} to go`,
      active: profile.totalReps >= 1000,
    },
    {
      label: 'Best set',
      value: `${formatNumber(profile.bestReps)} reps`,
      active: profile.bestReps >= 25,
    },
    {
      label: 'Streak',
      value: `${formatNumber(profile.streak)} days`,
      active: profile.streak >= 7,
    },
  ];

  return (
    <main className="shared-profile-page">
      <section className="shared-profile-hero">
        <div className="shared-profile-identity">
          <div className="apple-profile-avatar shared-profile-avatar">
            {profile.avatar ? <img src={profile.avatar} alt={profile.displayName} /> : <span>{initial}</span>}
          </div>
          <p className="apple-eyebrow">{profile.countryName || 'Push Counter athlete'}</p>
          <h1>{profile.displayName}</h1>
          <p>{profile.bio || 'Training progress shared from Push Counter.'}</p>
          <div className="shared-profile-actions">
            <a className="button primary" href={appUrl}>
              Open in app <ArrowRight size={18} aria-hidden="true" />
            </a>
            <Link className="button secondary" href={connectUrl}>
              Follow or connect
            </Link>
            <a className="button secondary" href={`mailto:?subject=Push Counter profile&body=${encodeURIComponent(profileUrl)}`}>
              Share <Share2 size={18} aria-hidden="true" />
            </a>
          </div>
        </div>

        <div className="shared-proof-panel">
          <div className="shared-proof-kicker">Public training proof</div>
          <div className="shared-proof-number">{formatNumber(profile.totalReps)}</div>
          <div className="shared-proof-label">total push-up reps</div>
          <div className="shared-proof-row">
            <span>{formatNumber(profile.followersCount)} followers</span>
            <span>{formatNumber(profile.followingCount)} following</span>
          </div>
          <div className="shared-proof-updated">Updated {formatUpdatedAt(profile.updatedAt)}</div>
        </div>
      </section>

      <section className="shared-profile-section">
        <div className="shared-stat-grid">
          <StatCard icon={Trophy} value={formatNumber(profile.totalReps)} label="Total reps" />
          <StatCard icon={Medal} value={formatNumber(profile.bestReps)} label="Best set" />
          <StatCard icon={Repeat2} value={formatNumber(profile.streak)} label="Day streak" />
          <StatCard icon={Users} value={formatNumber(profile.followersCount)} label="Followers" />
          <StatCard icon={CalendarDays} value={formatNumber(profile.totalWorkouts)} label="Sessions" />
          <StatCard icon={Flame} value={formatNumber(profile.totalCalories)} label="Calories" />
        </div>
      </section>

      <section className="shared-profile-section shared-profile-two-col">
        <div className="shared-card">
          <div className="shared-card-heading">
            <BarChart3 size={20} aria-hidden="true" />
            Recent activity
          </div>
          {profile.recentDays.length ? (
            <div className="shared-activity-chart" aria-label="Recent reps by day">
              {profile.recentDays.map((day) => (
                <div className="shared-activity-day" key={day.dayKey}>
                  <div className="shared-activity-bar" style={{ height: `${Math.max(10, (day.reps / maxRecentReps) * 100)}%` }} />
                  <span>{new Date(`${day.dayKey}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="shared-muted">Recent public workout activity will appear here after synced sessions.</p>
          )}
          <div className="shared-card-foot">
            <span>{formatDuration(profile.totalDuration)} trained</span>
            <span>{formatNumber(profile.totalWorkouts)} sessions</span>
          </div>
        </div>

        <div className="shared-card">
          <div className="shared-card-heading">
            <Trophy size={20} aria-hidden="true" />
            Milestones
          </div>
          <div className="shared-achievements">
            {achievements.map((achievement) => (
              <div className={achievement.active ? 'shared-achievement active' : 'shared-achievement'} key={achievement.label}>
                <span>{achievement.label}</span>
                <strong>{achievement.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="shared-profile-cta">
        <h2>Train alongside {profile.displayName}</h2>
        <p>Open Push Counter to follow this athlete, compare progress, and build your own public proof.</p>
        <div className="shared-profile-actions">
          <a className="button primary" href={appUrl}>
            Open Push Counter <ArrowRight size={18} aria-hidden="true" />
          </a>
          {appStoreUrl ? (
            <a className="button secondary" href={appStoreUrl}>Get the app</a>
          ) : (
            <Link className="button secondary" href="/">Learn about the app</Link>
          )}
        </div>
        <p className="shared-privacy-note">Only public summary fields are shown. Private workout data is protected.</p>
      </section>
    </main>
  );
}

function StatCard({ icon: Icon, value, label }: { icon: LucideIcon; value: string; label: string }) {
  return (
    <div className="apple-stat-card shared-stat-card">
      <Icon size={24} aria-hidden="true" />
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
