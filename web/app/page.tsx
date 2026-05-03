import Link from 'next/link';
import { Activity, ArrowRight, BarChart3, Bell, Camera, Crown, Dumbbell, Medal, Repeat2, ShieldCheck, Sparkles, Trophy, Users } from 'lucide-react';
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

const screenshots = [
  {
    src: '/images/appleSotre/home.PNG',
    alt: 'Push Counter home screen',
    label: 'Home',
  },
  {
    src: '/images/appleSotre/workoutminscreen.PNG',
    alt: 'Push Counter workout setup screen',
    label: 'Workout',
  },
  {
    src: '/images/appleSotre/rank.PNG',
    alt: 'Push Counter leaderboard screen',
    label: 'Rank',
  },
  {
    src: '/images/appleSotre/chalings.PNG',
    alt: 'Push Counter challenges screen',
    label: 'Challenges',
  },
  {
    src: '/images/appleSotre/porfile.PNG',
    alt: 'Push Counter profile screen',
    label: 'Profile',
  },
];

const steps = [
  {
    title: 'Choose the workout',
    body: 'Start an open session, timer, limit, or sets workout depending on how you want to train today.',
    icon: Dumbbell,
  },
  {
    title: 'Track the set',
    body: 'Use camera-assisted counting when conditions are good, or keep moving with manual fallback.',
    icon: Camera,
  },
  {
    title: 'Build the streak',
    body: 'Save workouts, follow progress, and return with reminders that fit your routine.',
    icon: Repeat2,
  },
];

const spotlights = [
  {
    eyebrow: 'Workout',
    title: 'Start fast, stay focused.',
    body: 'The workout screen keeps the choices simple: mode, target, camera flow, and the next set. Less setup, more training.',
    image: '/images/appleSotre/workoutminscreen.PNG',
    alt: 'Push Counter workout mode screen',
  },
  {
    eyebrow: 'Competition',
    title: 'Ranks and challenges without the noise.',
    body: 'Leaderboards, country rank, friends, and challenges give the habit a little pressure without turning training into clutter.',
    image: '/images/appleSotre/rank.PNG',
    alt: 'Push Counter leaderboard screen',
  },
  {
    eyebrow: 'Profile',
    title: 'Share progress when it matters.',
    body: 'Public profile links show safe summary stats so athletes can share progress with friends while private account data stays protected.',
    image: '/images/appleSotre/porfile.PNG',
    alt: 'Push Counter profile screen',
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
            Track push-ups, build streaks, compete with friends, and keep every set focused with a camera-aware training app designed around clean progress.
          </p>
          <div className="hero-actions">
            {appStoreUrl ? (
              <a className="button primary" href={appStoreUrl}>
                Get on the App Store <ArrowRight size={18} aria-hidden="true" />
              </a>
            ) : (
              <span className="button primary">Launching on the App Store</span>
            )}
            <Link className="button secondary" href="/support">
              Contact support
            </Link>
          </div>
        </div>

        <div className="hero-showcase" aria-label="Push Counter app screenshots">
          <div className="screen-card main-screen">
            <img src="/images/appleSotre/home.PNG" alt="Push Counter home dashboard" />
          </div>
          <div className="screen-card floating-screen">
            <img src="/images/appleSotre/workoutminscreen.PNG" alt="Push Counter workout screen" />
          </div>
          <div className="hero-meter">
            <Sparkles size={18} aria-hidden="true" />
            <span>100 reps starts with one clean set.</span>
          </div>
        </div>
      </section>

      <section className="page stat-strip" aria-label="App facts">
        <div className="stat">
          <strong>Live</strong>
          <span>Camera-assisted workout tracking</span>
        </div>
        <div className="stat">
          <strong>Social</strong>
          <span>Friends, rank, challenges, and profiles</span>
        </div>
        <div className="stat">
          <strong>Local</strong>
          <span>Guest workouts stay usable offline</span>
        </div>
      </section>

      <section className="page section marketing-band">
        <div className="section-heading">
          <p className="eyebrow">Why it exists</p>
          <h2>Most push-up trackers either feel too manual or too noisy.</h2>
          <p className="lede">
            Push Counter keeps the workout centered: count the reps, save the progress, and give just enough motivation to come back tomorrow.
          </p>
        </div>
        <div className="benefit-grid">
          <article className="benefit">
            <span className="benefit-number">01</span>
            <h3>Train without losing rhythm</h3>
            <p>Quick workout modes and camera-aware counting keep setup out of the way.</p>
          </article>
          <article className="benefit">
            <span className="benefit-number">02</span>
            <h3>Know what improved</h3>
            <p>Reps, streaks, best sets, history, and rankings turn effort into visible progress.</p>
          </article>
          <article className="benefit">
            <span className="benefit-number">03</span>
            <h3>Keep privacy practical</h3>
            <p>Guest mode works locally, camera video is not saved by default, and profile sharing is limited.</p>
          </article>
        </div>
      </section>

      <section className="page section">
        <div className="section-heading">
          <p className="eyebrow">Inside the app</p>
          <h2>The real Push Counter experience.</h2>
          <p className="lede">
            The landing page uses the same screens people see in the app: workouts, ranks, challenges, and shareable profiles.
          </p>
        </div>
        <div className="screenshot-rail" aria-label="App screenshots">
          {screenshots.map((screenshot) => (
            <figure className="screenshot-card" key={screenshot.src}>
              <img src={screenshot.src} alt={screenshot.alt} />
              <figcaption>{screenshot.label}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="page section">
        <div className="section-heading">
          <p className="eyebrow">How it works</p>
          <h2>Three steps, every session.</h2>
        </div>
        <div className="steps-grid">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <article className="step-card" key={step.title}>
                <Icon size={24} aria-hidden="true" />
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="page section">
        <div className="split feature-split">
          <div>
            <p className="eyebrow">Training flow</p>
            <h2>Camera when it helps. Manual when it does not.</h2>
            <p className="lede">
              Push Counter is designed for calm, focused fitness tracking. Camera access is requested only for live workout tracking, and workout video is not saved to your photo library by default.
            </p>
            <div className="proof-list">
              <span><Camera size={18} aria-hidden="true" /> Live rep tracking</span>
              <span><ShieldCheck size={18} aria-hidden="true" /> Local-first guest mode</span>
              <span><Users size={18} aria-hidden="true" /> Optional social sync</span>
            </div>
          </div>
          <div className="wide-image">
            <img src="/images/appleSotre/workoutminscreen.PNG" alt="Push Counter workout setup preview" />
          </div>
        </div>
      </section>

      {spotlights.map((spotlight, index) => (
        <section className="page section spotlight-section" key={spotlight.title}>
          <div className={`split spotlight ${index % 2 === 1 ? 'reverse' : ''}`}>
            <div>
              <p className="eyebrow">{spotlight.eyebrow}</p>
              <h2>{spotlight.title}</h2>
              <p className="lede">{spotlight.body}</p>
            </div>
            <div className="spotlight-phone">
              <img src={spotlight.image} alt={spotlight.alt} />
            </div>
          </div>
        </section>
      ))}

      <section className="page section">
        <div className="section-heading">
          <p className="eyebrow">Built for consistency</p>
          <h2>Everything needed to keep the habit moving.</h2>
        </div>
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

      <section className="page section proof-band">
        <div className="proof-copy">
          <p className="eyebrow">Trust built in</p>
          <h2>Designed for real workouts, not vanity metrics.</h2>
          <p className="lede">
            Push Counter keeps sensitive flows obvious: camera access is requested only for live tracking, guest mode stays useful, and web profiles expose only safe public summaries.
          </p>
        </div>
        <div className="trust-grid">
          <article className="trust-card">
            <ShieldCheck size={24} aria-hidden="true" />
            <h3>Privacy-aware camera use</h3>
            <p>Workout video is not saved to the photo library by default.</p>
          </article>
          <article className="trust-card">
            <Bell size={24} aria-hidden="true" />
            <h3>Local reminders</h3>
            <p>Workout reminders are scheduled from your chosen plan and settings.</p>
          </article>
          <article className="trust-card">
            <Medal size={24} aria-hidden="true" />
            <h3>Progress with context</h3>
            <p>Best reps, streaks, ranks, and challenges support consistency.</p>
          </article>
        </div>
      </section>

      <section className="page section final-cta">
        <div>
          <p className="eyebrow">Push Counter</p>
          <h2>Make the next set count.</h2>
          <p className="lede">
            Start with a focused workout, keep the streak alive, and share progress from your public profile when you are ready.
          </p>
        </div>
        <div className="action-row">
          {appStoreUrl ? (
            <a className="button primary" href={appStoreUrl}>
              Get the app
            </a>
          ) : (
            <span className="button primary">App Store launch ready</span>
          )}
          <Link className="button secondary" href="/privacy">
            Privacy policy
          </Link>
        </div>
      </section>
    </main>
  );
}
