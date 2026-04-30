import React, { useMemo, useState } from 'react';
import {
  ImageBackground,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Camera } from 'expo-camera';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NeonButton } from '../../src/components/NeonButton';
import { useSubscription } from '../../src/revenuecat';
import { useSettingsStore } from '../../src/store';
import { borderRadius, colors, layout, spacing, typography } from '../../src/theme';
import { requestNotificationPermission } from '../../src/services/notifications';

type ScreenKind =
  | 'welcome'
  | 'single'
  | 'multi'
  | 'proof'
  | 'cards'
  | 'solution'
  | 'permission'
  | 'processing'
  | 'demo'
  | 'value'
  | 'paywall';

type Option = {
  id: string;
  label: string;
  detail: string;
  badge: string;
};

type OnboardingStep = {
  id: string;
  kind: ScreenKind;
  eyebrow: string;
  title: string;
  body: string;
  options?: Option[];
};

const goalOptions: Option[] = [
  {
    id: 'first_25',
    label: 'Reach my first clean 25',
    detail: 'Build the base without guessing what to do next.',
    badge: '25',
  },
  {
    id: 'road_50',
    label: 'Get strong enough for 50',
    detail: 'Follow a plan that pushes volume without burning out.',
    badge: '50',
  },
  {
    id: 'road_100',
    label: 'Chase a 100-rep milestone',
    detail: 'Train for a serious number with structured progress.',
    badge: '100',
  },
  {
    id: 'form',
    label: 'Fix my form',
    detail: 'Use the camera to make reps cleaner and more consistent.',
    badge: 'OK',
  },
  {
    id: 'compete',
    label: 'Compete and stay accountable',
    detail: 'Use streaks, leaderboards, and country ranking as fuel.',
    badge: 'VS',
  },
];

const painOptions: Option[] = [
  {
    id: 'counting',
    label: 'I lose count mid-set',
    detail: 'Manual counting breaks focus when the set gets hard.',
    badge: '01',
  },
  {
    id: 'plan',
    label: 'I do random workouts',
    detail: 'No clear progression, just vibes and sore arms.',
    badge: '02',
  },
  {
    id: 'form',
    label: 'I am not sure reps are clean',
    detail: 'Bad reps make numbers feel bigger than progress.',
    badge: '03',
  },
  {
    id: 'motivation',
    label: 'I start strong, then stop',
    detail: 'Consistency fades when there is no visible streak.',
    badge: '04',
  },
  {
    id: 'benchmark',
    label: 'I cannot tell if I am improving',
    detail: 'Best sets, volume, and recovery blur together.',
    badge: '05',
  },
];

const statementOptions: Option[] = [
  {
    id: 'no_counter',
    label: 'I want to focus on the set, not the count.',
    detail: 'Agree if camera-counted reps would help.',
    badge: 'A',
  },
  {
    id: 'needs_plan',
    label: 'I train harder when the next workout is already chosen.',
    detail: 'Agree if structure keeps you moving.',
    badge: 'B',
  },
  {
    id: 'needs_game',
    label: 'A streak or leaderboard makes me show up.',
    detail: 'Agree if competition gives you energy.',
    badge: 'C',
  },
];

const preferenceOptions: Option[] = [
  {
    id: 'short_sets',
    label: 'Short sharp sets',
    detail: 'Fast sessions with clear targets.',
    badge: '15m',
  },
  {
    id: 'steady_plan',
    label: 'Steady progression',
    detail: 'Balanced volume across the week.',
    badge: '3x',
  },
  {
    id: 'coach_push',
    label: 'Coach me hard',
    detail: 'More direct prompts and higher accountability.',
    badge: 'GO',
  },
  {
    id: 'form_first',
    label: 'Form first',
    detail: 'Camera setup and clean reps over speed.',
    badge: 'OK',
  },
];

const steps: OnboardingStep[] = [
  {
    id: 'welcome',
    kind: 'welcome',
    eyebrow: 'Push-Up Coach',
    title: 'Turn every set into a counted training plan.',
    body: 'Answer a few questions, try a mini plan, then start with camera-counted reps and a path you can actually follow.',
  },
  {
    id: 'goal',
    kind: 'single',
    eyebrow: 'Your goal',
    title: 'What are you training for first?',
    body: 'Pick the outcome that would make this app worth opening tomorrow.',
    options: goalOptions,
  },
  {
    id: 'pains',
    kind: 'multi',
    eyebrow: 'What gets in the way',
    title: 'What usually stops your progress?',
    body: 'Choose everything that sounds familiar. This tunes the plan we show you.',
    options: painOptions,
  },
  {
    id: 'proof',
    kind: 'proof',
    eyebrow: 'Why it works',
    title: 'Structure beats motivation on tired days.',
    body: 'People stick with training when the next action is obvious, the progress is visible, and the workout feels measured.',
  },
  {
    id: 'statements',
    kind: 'cards',
    eyebrow: 'Quick check',
    title: 'Which statements sound like you?',
    body: 'Tap agree on the ones that match your training style.',
    options: statementOptions,
  },
  {
    id: 'solution',
    kind: 'solution',
    eyebrow: 'Your coach setup',
    title: 'Here is the smarter way to build push-ups.',
    body: 'We mirror the problems you picked into the first plan you will try.',
  },
  {
    id: 'preferences',
    kind: 'multi',
    eyebrow: 'Preferences',
    title: 'How should your first plan feel?',
    body: 'These choices shape the mini demo and the setup that comes next.',
    options: preferenceOptions,
  },
  {
    id: 'camera',
    kind: 'permission',
    eyebrow: 'Camera priming',
    title: 'Let the camera count while you train.',
    body: 'Push-Up Coach uses the front camera during workouts to track movement and count reps. Nothing is needed until a live session starts.',
  },
  {
    id: 'processing',
    kind: 'processing',
    eyebrow: 'Building',
    title: 'Preparing your first push-up path...',
    body: 'We are matching your goal, blockers, and training style to a starter set.',
  },
  {
    id: 'demo',
    kind: 'demo',
    eyebrow: 'Mini demo',
    title: 'Build your first 3-part session.',
    body: 'Pick three blocks. This is the core loop: choose a target, train, then let the app record your progress.',
  },
  {
    id: 'value',
    kind: 'value',
    eyebrow: 'Your starter plan',
    title: 'Your first session is ready.',
    body: 'Keep this plan, share it, or move into setup to make it real.',
  },
  {
    id: 'notifications',
    kind: 'permission',
    eyebrow: 'Reminder priming',
    title: 'Never miss the set you planned.',
    body: 'Workout reminders and missed-session nudges help keep the streak alive after the first session.',
  },
  {
    id: 'paywall',
    kind: 'paywall',
    eyebrow: 'Push-Up Coach Pro',
    title: 'Keep the plan and unlock the full coach.',
    body: 'Start Pro for camera-guided training, smarter plans, streak protection, and leaderboard fuel.',
  },
];

const demoBlocks: Option[] = [
  { id: 'baseline', label: 'Baseline max set', detail: 'Find today\'s clean rep number.', badge: '01' },
  { id: 'volume', label: 'Volume builder', detail: 'Three sets that add reps safely.', badge: '02' },
  { id: 'camera', label: 'Camera-counted form set', detail: 'Let the app count while you focus.', badge: 'OK' },
  { id: 'finisher', label: 'Confidence finisher', detail: 'A short final set you can win.', badge: '03' },
  { id: 'recovery', label: 'Recovery checkpoint', detail: 'Log how the session felt.', badge: 'OK' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { showPaywall, restore, loading } = useSubscription();
  const completeOnboarding = useSettingsStore((state) => state.completeOnboarding);
  const updateOnboardingProfile = useSettingsStore((state) => state.updateOnboardingProfile);
  const setNotificationsEnabled = useSettingsStore((state) => state.setNotificationsEnabled);
  const [index, setIndex] = useState(0);
  const [goal, setGoal] = useState<string | undefined>();
  const [pains, setPains] = useState<string[]>([]);
  const [statements, setStatements] = useState<string[]>([]);
  const [preferences, setPreferences] = useState<string[]>([]);
  const [demoPlan, setDemoPlan] = useState<string[]>([]);
  const [permissionBusy, setPermissionBusy] = useState(false);

  const step = steps[index];
  const progress = (index + 1) / steps.length;

  const selectedGoal = useMemo(
    () => goalOptions.find((option) => option.id === goal),
    [goal]
  );

  const solutionRows = useMemo(() => {
    const selectedPains = painOptions.filter((option) => pains.includes(option.id)).slice(0, 3);
    const fallback = painOptions.slice(0, 3);

    return (selectedPains.length ? selectedPains : fallback).map((pain) => {
      if (pain.id === 'counting') return [pain.label, 'Camera-counted reps keep your focus on form.'];
      if (pain.id === 'plan') return [pain.label, 'A structured path tells you exactly what to do next.'];
      if (pain.id === 'form') return [pain.label, 'Camera setup makes clean reps the standard.'];
      if (pain.id === 'motivation') return [pain.label, 'Streaks and reminders make showing up visible.'];
      return [pain.label, 'Best reps and volume tracking make progress hard to miss.'];
    });
  }, [pains]);

  const planLabels = demoBlocks
    .filter((block) => demoPlan.includes(block.id))
    .map((block) => block.label);

  const canContinue =
    step.kind === 'single'
      ? Boolean(goal)
      : step.id === 'pains'
        ? pains.length > 0
        : step.id === 'preferences'
          ? preferences.length > 0
          : step.kind === 'demo'
            ? demoPlan.length >= 3
            : true;

  function persistCurrentAnswers() {
    updateOnboardingProfile({
      goal,
      pains,
      statements,
      preferences,
      demoPlan,
    });
  }

  function next() {
    persistCurrentAnswers();
    if (index < steps.length - 1) {
      setIndex((current) => current + 1);
    }
  }

  function back() {
    if (index > 0) {
      setIndex((current) => current - 1);
    }
  }

  function toggleValue(value: string, list: string[], setList: (values: string[]) => void) {
    setList(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  async function primeCamera() {
    setPermissionBusy(true);
    try {
      await Camera.requestCameraPermissionsAsync();
      updateOnboardingProfile({ cameraPrimed: true });
    } finally {
      setPermissionBusy(false);
      next();
    }
  }

  async function primeNotifications() {
    setPermissionBusy(true);
    try {
      const granted = await requestNotificationPermission();
      setNotificationsEnabled(granted);
      updateOnboardingProfile({ notificationsPrimed: true });
    } finally {
      setPermissionBusy(false);
      next();
    }
  }

  async function finishOnboarding() {
    persistCurrentAnswers();
    completeOnboarding();
    router.replace('/(stack)/setup/level');
  }

  async function openPaywall() {
    await showPaywall();
    await finishOnboarding();
  }

  async function sharePlan() {
    const summary = planLabels.length ? planLabels.join(', ') : 'Baseline max set, volume builder, camera-counted form set';
    await Share.share({
      message: `My first Push-Up Coach session: ${summary}.`,
    });
  }

  return (
    <ImageBackground
      source={require('../../assets/images/home_bg.png')}
      style={styles.background}
      imageStyle={styles.backgroundImage}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={back} disabled={index === 0} style={styles.backButton}>
            <Text style={[styles.backText, index === 0 && styles.disabledText]}>Back</Text>
          </Pressable>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.count}>{index + 1}/{steps.length}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(350)} style={styles.copyBlock}>
            <Text style={styles.eyebrow}>{step.eyebrow}</Text>
            <Text style={styles.title}>{step.title}</Text>
            <Text style={styles.body}>{step.body}</Text>
          </Animated.View>

          {step.kind === 'single' && step.options && (
            <OptionList
              options={step.options}
              selected={[goal ?? '']}
              onPress={(id) => setGoal(id)}
            />
          )}

          {step.kind === 'multi' && step.options && (
            <OptionList
              options={step.options}
              selected={step.id === 'preferences' ? preferences : pains}
              onPress={(id) =>
                step.id === 'preferences'
                  ? toggleValue(id, preferences, setPreferences)
                  : toggleValue(id, pains, setPains)
              }
              multi
            />
          )}

          {step.kind === 'proof' && (
            <View style={styles.stack}>
              <StatCard stat="3x" label="A week is enough to build rhythm when the next set is planned." />
              <QuoteCard name="Mina" role="Beginner" quote="I stopped guessing and finally knew what number I was chasing." />
              <QuoteCard name="Sam" role="Competitive" quote="The country leaderboard made a solo workout feel like a match." />
            </View>
          )}

          {step.kind === 'cards' && step.options && (
            <View style={styles.stack}>
              {step.options.map((option) => {
                const selected = statements.includes(option.id);
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => toggleValue(option.id, statements, setStatements)}
                    style={[styles.statementCard, selected && styles.optionSelected]}
                  >
                    <Text style={styles.statementQuote}>"{option.label}"</Text>
                    <Text style={styles.optionDetail}>{selected ? 'Agreed' : 'Tap to agree'}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {step.kind === 'solution' && (
            <View style={styles.stack}>
              <View style={styles.goalMirror}>
                <Text style={styles.goalMirrorLabel}>Primary target</Text>
                <Text style={styles.goalMirrorText}>
                  {selectedGoal?.label ?? 'Build stronger, cleaner push-ups'}
                </Text>
              </View>
              {solutionRows.map(([pain, solution]) => (
                <View key={pain} style={styles.solutionRow}>
                  <Text style={styles.solutionPain}>{pain}</Text>
                  <Text style={styles.solutionText}>{solution}</Text>
                </View>
              ))}
            </View>
          )}

          {step.kind === 'permission' && (
            <View style={styles.stack}>
              <PermissionPoint title="You stay in control" body="We ask before the system prompt and you can skip for now." />
              <PermissionPoint
                title={step.id === 'camera' ? 'Only for live workouts' : 'Only for training reminders'}
                body={step.id === 'camera' ? 'The camera is used when you start a session.' : 'Notifications are for workout nudges, not noise.'}
              />
              <PermissionPoint title="Built around your plan" body="The permission has a clear job in the training flow." />
            </View>
          )}

          {step.kind === 'processing' && (
            <View style={styles.processingWrap}>
              <Animated.View entering={FadeIn.duration(450)} style={styles.pulse} />
              <Text style={styles.processingText}>Matching goal, blockers, and session style</Text>
            </View>
          )}

          {step.kind === 'demo' && (
            <OptionList
              options={demoBlocks}
              selected={demoPlan}
              onPress={(id) => {
                if (demoPlan.includes(id)) {
                  setDemoPlan(demoPlan.filter((item) => item !== id));
                  return;
                }
                if (demoPlan.length < 3) {
                  setDemoPlan([...demoPlan, id]);
                }
              }}
              multi
            />
          )}

          {step.kind === 'value' && (
            <View style={styles.stack}>
              {(planLabels.length ? planLabels : ['Baseline max set', 'Volume builder', 'Camera-counted form set']).map((label, itemIndex) => (
                <View key={label} style={styles.planRow}>
                  <Text style={styles.planNumber}>{String(itemIndex + 1).padStart(2, '0')}</Text>
                  <View style={styles.flex}>
                    <Text style={styles.planTitle}>{label}</Text>
                    <Text style={styles.optionDetail}>Ready for your setup flow.</Text>
                  </View>
                </View>
              ))}
              <NeonButton title="Share starter plan" variant="secondary" onPress={sharePlan} />
            </View>
          )}

          {step.kind === 'paywall' && (
            <View style={styles.stack}>
              <QuoteCard name="Push-Up Coach" role="Pro" quote="Camera tracking, adaptive plans, reminders, and competitive progress in one training loop." />
              <View style={styles.paywallBox}>
                <Text style={styles.paywallTitle}>Free trial available</Text>
                <Text style={styles.paywallBody}>RevenueCat will show your configured products. If products are not ready yet, continue with the free plan.</Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {step.id === 'camera' ? (
            <>
              <NeonButton title={permissionBusy ? 'Opening...' : 'Enable camera'} onPress={primeCamera} disabled={permissionBusy} />
              <Pressable onPress={next} style={styles.linkButton}>
                <Text style={styles.linkText}>Not now</Text>
              </Pressable>
            </>
          ) : step.id === 'notifications' ? (
            <>
              <NeonButton title={permissionBusy ? 'Opening...' : 'Enable reminders'} onPress={primeNotifications} disabled={permissionBusy} />
              <Pressable onPress={next} style={styles.linkButton}>
                <Text style={styles.linkText}>Not now</Text>
              </Pressable>
            </>
          ) : step.kind === 'paywall' ? (
            <>
              <NeonButton title={loading ? 'Loading Pro...' : 'Start free trial'} onPress={openPaywall} disabled={loading} />
              <View style={styles.footerLinks}>
                <Pressable onPress={restore}>
                  <Text style={styles.linkText}>Restore purchases</Text>
                </Pressable>
                <Pressable onPress={finishOnboarding}>
                  <Text style={styles.linkText}>Continue free</Text>
                </Pressable>
              </View>
            </>
          ) : (
            index === 0 ? (
              <Pressable
                onPress={next}
                disabled={!canContinue}
                testID="onboarding-next"
                style={({ pressed }) => [
                  styles.welcomeCta,
                  pressed && styles.welcomeCtaPressed,
                  !canContinue && styles.welcomeCtaDisabled,
                ]}
              >
                <Text style={styles.welcomeCtaText}>Let's get started!</Text>
              </Pressable>
            ) : (
              <NeonButton
                title={step.kind === 'processing' ? 'Show my plan' : 'Continue'}
                onPress={next}
                disabled={!canContinue}
                testID="onboarding-next"
              />
            )
          )}
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

function OptionList({
  options,
  selected,
  onPress,
}: {
  options: Option[];
  selected: string[];
  onPress: (id: string) => void;
  multi?: boolean;
}) {
  return (
    <View style={styles.stack}>
      {options.map((option) => {
        const isSelected = selected.includes(option.id);
        return (
          <Pressable
            key={option.id}
            onPress={() => onPress(option.id)}
            style={[styles.option, isSelected && styles.optionSelected]}
          >
            <View style={[styles.badge, isSelected && styles.badgeSelected]}>
              <Text style={[styles.badgeText, isSelected && styles.badgeTextSelected]}>{option.badge}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.optionLabel}>{option.label}</Text>
              <Text style={styles.optionDetail}>{option.detail}</Text>
            </View>
            <Text style={[styles.check, isSelected && styles.checkSelected]}>
              {isSelected ? '✓' : '+'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function StatCard({ stat, label }: { stat: string; label: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.stat}>{stat}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function QuoteCard({ name, role, quote }: { name: string; role: string; quote: string }) {
  return (
    <View style={styles.quoteCard}>
      <Text style={styles.quote}>"{quote}"</Text>
      <Text style={styles.quoteName}>{name}</Text>
      <Text style={styles.optionDetail}>{role}</Text>
    </View>
  );
}

function PermissionPoint({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.permissionPoint}>
      <View style={styles.smallDot} />
      <View style={styles.flex}>
        <Text style={styles.optionLabel}>{title}</Text>
        <Text style={styles.optionDetail}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: colors.backgroundCanvas,
  },
  backgroundImage: {
    opacity: 0,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.mdSm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  backButton: {
    minWidth: 44,
    minHeight: 36,
    justifyContent: 'center',
  },
  backText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  disabledText: {
    color: colors.textDisabled,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
    backgroundColor: colors.accent,
  },
  count: {
    ...typography.captionBold,
    color: colors.textMuted,
    minWidth: 42,
    textAlign: 'right',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.xl,
  },
  copyBlock: {
    gap: spacing.mdSm,
  },
  eyebrow: {
    ...typography.label,
    color: colors.accent,
  },
  title: {
    ...typography.titleLarge,
    color: colors.textPrimary,
    lineHeight: 38,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  phonePreview: {
    borderWidth: 1,
    borderColor: colors.borderAccent,
    borderRadius: borderRadius.xxl,
    backgroundColor: colors.surfaceOverlay,
    padding: spacing.lg,
    gap: spacing.lg,
    maxWidth: layout.maxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  previewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewLabel: {
    ...typography.label,
    color: colors.textMuted,
  },
  previewMetric: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  cameraFrame: {
    height: 220,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.backgroundCanvas,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  scanLine: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    height: 2,
    backgroundColor: colors.accent,
  },
  cameraText: {
    ...typography.captionBold,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  previewBottom: {
    gap: spacing.xs,
  },
  previewTitle: {
    ...typography.headlineMedium,
    color: colors.textPrimary,
  },
  previewSub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  stack: {
    gap: spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceOverlay,
  },
  optionSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentAlpha,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.cardTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSelected: {
    backgroundColor: colors.accent,
  },
  badgeText: {
    ...typography.captionBold,
    color: colors.textPrimary,
  },
  badgeTextSelected: {
    color: colors.accentContrast,
  },
  flex: {
    flex: 1,
  },
  optionLabel: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    lineHeight: 21,
  },
  optionDetail: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  check: {
    ...typography.headline,
    color: colors.textMuted,
    minWidth: 22,
    textAlign: 'center',
  },
  checkSelected: {
    color: colors.accent,
  },
  statCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderAccent,
    backgroundColor: colors.accentAlpha,
  },
  stat: {
    ...typography.titleLarge,
    color: colors.textPrimary,
  },
  statLabel: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 23,
    marginTop: spacing.sm,
  },
  quoteCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceOverlay,
  },
  quote: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    lineHeight: 23,
  },
  quoteName: {
    ...typography.captionBold,
    color: colors.accent,
    marginTop: spacing.md,
  },
  statementCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceOverlay,
    minHeight: 132,
    justifyContent: 'space-between',
  },
  statementQuote: {
    ...typography.headlineMedium,
    color: colors.textPrimary,
    lineHeight: 25,
  },
  goalMirror: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  goalMirrorLabel: {
    ...typography.captionBold,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  goalMirrorText: {
    ...typography.headline,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  solutionRow: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceOverlay,
    borderWidth: 1,
    borderColor: colors.border,
  },
  solutionPain: {
    ...typography.captionBold,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  solutionText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  permissionPoint: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceOverlay,
    borderWidth: 1,
    borderColor: colors.border,
  },
  smallDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
    marginTop: spacing.sm,
  },
  processingWrap: {
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  pulse: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 16,
    borderColor: colors.accent,
    backgroundColor: colors.accentDark,
  },
  processingText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceOverlay,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planNumber: {
    ...typography.captionBold,
    color: colors.accent,
    width: 34,
  },
  planTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  paywallBox: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderAccent,
  },
  paywallTitle: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  paywallBody: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
    marginTop: spacing.sm,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.surfaceOverlay,
  },
  welcomeCta: {
    minHeight: 72,
    borderRadius: borderRadius.full,
    backgroundColor: colors.accentContrast,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  welcomeCtaPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  welcomeCtaDisabled: {
    opacity: 0.58,
  },
  welcomeCtaText: {
    ...typography.bodyBold,
    color: colors.textInverse,
    fontSize: 20,
    letterSpacing: 0,
  },
  linkButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    ...typography.bodyBold,
    color: colors.textSecondary,
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    minHeight: 42,
  },
});
