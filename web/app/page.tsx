import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Camera,
  Crown,
  Flame,
  Medal,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import { appStoreUrl } from '@/lib/config';

const features = [
  {
    title: 'Live Rep Tracking',
    body: 'Point your camera. Start pushing. The app counts for you — hands-free.',
    icon: Camera,
  },
  {
    title: 'Smart Training Plans',
    body: 'Personalized plans built around your level, goals, and schedule.',
    icon: Flame,
  },
  {
    title: 'Progress Dashboard',
    body: 'Reps, streaks, calories, best sets — all in one clean view.',
    icon: BarChart3,
  },
  {
    title: 'Compete & Challenge',
    body: 'Global leaderboards, friend ranks, and challenges that push you further.',
    icon: Trophy,
  },
  {
    title: 'Works Offline',
    body: 'Guest mode with full local history. Sign in when you are ready.',
    icon: ShieldCheck,
  },
  {
    title: 'Pro Upgrades',
    body: 'Advanced analytics and training tools for serious athletes.',
    icon: Crown,
  },
];

export default function HomePage() {
  return (
    <main>
      {/* ─── HERO ─── */}
      <section className="hero-v3">
        <div className="hero-v3-glow" aria-hidden="true" />
        
        <div className="hero-v3-copy">
          <div className="pill-badge">
            <Sparkles size={16} aria-hidden="true" />
            Now available on iOS
          </div>
          <h1 id="hero-title">
            Make every<br />push-up count.
          </h1>
          <p className="hero-v3-sub">
            The intelligent push-up companion. Camera tracking, personalized plans,
            and real progress — designed for athletes who train with intention.
          </p>
          <div className="action-row" style={{ justifyContent: 'center' }}>
            {appStoreUrl ? (
              <a className="button primary" href={appStoreUrl}>
                Download for iOS <ArrowRight size={18} aria-hidden="true" />
              </a>
            ) : (
              <span className="button primary">Launching on the App Store</span>
            )}
            <Link className="button secondary" href="/support">
              Learn more
            </Link>
          </div>
        </div>

        <div className="hero-v3-phones" aria-label="Push Counter app screenshots">
          <div className="phone-fan phone-fan-left">
            <img src="/images/appleSotre/rank.PNG" alt="Leaderboard" />
          </div>
          <div className="phone-fan phone-fan-center">
            <img src="/images/appleSotre/home.PNG" alt="Home dashboard" />
          </div>
          <div className="phone-fan phone-fan-right">
            <img src="/images/appleSotre/workoutminscreen.PNG" alt="Workout" />
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="apple-section">
        <div className="apple-section-inner">
          <p className="apple-eyebrow">Features</p>
          <h2 className="apple-heading">Everything you need.<br />Nothing you don't.</h2>
          
          <div className="apple-grid">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article className="apple-card" key={feature.title}>
                  <div className="apple-card-icon">
                    <Icon size={28} aria-hidden="true" />
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="apple-section apple-section-dark">
        <div className="apple-section-inner">
          <p className="apple-eyebrow">How it works</p>
          <h2 className="apple-heading">Three steps. Every session.</h2>
          
          <div className="apple-steps">
            <div className="apple-step">
              <span className="apple-step-num">01</span>
              <h3>Choose your workout</h3>
              <p>Open session, timed set, rep target, or structured plan.</p>
            </div>
            <div className="apple-step">
              <span className="apple-step-num">02</span>
              <h3>Track with camera</h3>
              <p>Camera counts your reps. Or tap manually — your choice.</p>
            </div>
            <div className="apple-step">
              <span className="apple-step-num">03</span>
              <h3>Build the streak</h3>
              <p>Save the set. Watch the progress. Come back tomorrow.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TRUST ─── */}
      <section className="apple-section">
        <div className="apple-section-inner">
          <p className="apple-eyebrow">Privacy & Trust</p>
          <h2 className="apple-heading">Built for real athletes.<br />Not vanity metrics.</h2>
          
          <div className="apple-grid apple-grid-3">
            <article className="apple-card">
              <div className="apple-card-icon">
                <Camera size={28} aria-hidden="true" />
              </div>
              <h3>Intentional camera</h3>
              <p>Camera is only used during active tracking. Video is never saved by default.</p>
            </article>
            <article className="apple-card">
              <div className="apple-card-icon">
                <Users size={28} aria-hidden="true" />
              </div>
              <h3>Guest-first</h3>
              <p>Full workout experience without signing in. Your data stays local until you decide.</p>
            </article>
            <article className="apple-card">
              <div className="apple-card-icon">
                <Medal size={28} aria-hidden="true" />
              </div>
              <h3>Honest progress</h3>
              <p>Streaks, ranks, and challenges tuned around real sessions — not engagement tricks.</p>
            </article>
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="apple-section apple-cta">
        <div className="apple-section-inner" style={{ textAlign: 'center' }}>
          <h2 className="apple-heading">Start training<br />with intention.</h2>
          <p className="hero-v3-sub" style={{ margin: '0 auto 40px' }}>
            Download Push Counter and make your next set the beginning of something consistent.
          </p>
          <div className="action-row" style={{ justifyContent: 'center' }}>
            {appStoreUrl ? (
              <a className="button primary" href={appStoreUrl}>
                Get the app <ArrowRight size={18} aria-hidden="true" />
              </a>
            ) : (
              <span className="button primary">App Store ready</span>
            )}
            <Link className="button secondary" href="/privacy">
              Privacy policy
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
