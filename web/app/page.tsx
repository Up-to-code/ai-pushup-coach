import Link from 'next/link';
import { Activity, BarChart3, Camera, Crown, ShieldCheck, Trophy } from 'lucide-react';
import { appStoreUrl } from '@/lib/config';

const features = [
  {
    title: 'Live Rep Tracking',
    body: 'Use the camera during workouts to estimate push-up movement, count reps, and surface simple form feedback.',
    icon: Camera,
  },
  {
    title: 'Personal Training Plans',
    body: 'Build a plan around your level, goal, training days, and preferred workout time.',
    icon: Activity,
  },
  {
    title: 'Progress History',
    body: 'Track completed workouts, reps, duration, calories, streaks, best sessions, and weekly progress.',
    icon: BarChart3,
  },
  {
    title: 'Challenges',
    body: 'Compare progress with global, country, friend, and challenge-based ranking surfaces when signed in.',
    icon: Trophy,
  },
  {
    title: 'Local-First Training',
    body: 'Use guest mode and local workout history for core training flows, with optional account sync.',
    icon: ShieldCheck,
  },
  {
    title: 'Pro Tools',
    body: 'Unlock focused training upgrades when subscription services are available in your region.',
    icon: Crown,
  },
];

export default function HomePage() {
  return (
    <main>
      <section className="page hero">
        <div className="hero-copy">
          <p className="eyebrow">Health & Fitness</p>
          <h1>Push Counter</h1>
          <p className="lede">
            Build a stronger push-up habit with guided plans, live rep tracking, workout history, and progress feedback.
          </p>
          <div className="hero-actions">
            {appStoreUrl ? (
              <a className="button primary" href={appStoreUrl}>
                Get on the App Store
              </a>
            ) : (
              <span className="button primary">Launching on the App Store</span>
            )}
            <Link className="button secondary" href="/support">
              Contact support
            </Link>
          </div>
        </div>

        <div className="phone-stage" aria-hidden="true">
          <div className="phone-frame">
            <img src="/images/home_bg.png" alt="" />
            <div className="phone-overlay">
              <p className="eyebrow">Today</p>
              <h3>100 reps starts with one clean set.</h3>
            </div>
          </div>
        </div>
      </section>

      <section className="page stat-strip" aria-label="App facts">
        <div className="stat">
          <strong>4.9</strong>
          <span>Target rating experience</span>
        </div>
        <div className="stat">
          <strong>v1.0</strong>
          <span>Launch version</span>
        </div>
        <div className="stat">
          <strong>Local</strong>
          <span>Guest workouts stay usable offline</span>
        </div>
      </section>

      <section className="page section">
        <div className="split">
          <div>
            <p className="eyebrow">Training flow</p>
            <h2>Camera when it helps. Manual when it does not.</h2>
            <p className="lede">
              Push Counter is designed for calm, focused fitness tracking. Camera access is requested only for live workout tracking, and workout video is not saved to your photo library by default.
            </p>
          </div>
          <div className="wide-image">
            <img src="/images/onboarding_camera.png" alt="Push Counter camera training preview" />
          </div>
        </div>
      </section>

      <section className="page section">
        <p className="eyebrow">Built for consistency</p>
        <h2>Everything needed to keep the habit moving.</h2>
        <div className="feature-grid">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article className="feature" key={feature.title}>
                <Icon size={24} aria-hidden="true" />
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
