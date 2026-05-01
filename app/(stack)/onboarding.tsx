import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Camera } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSubscription } from '../../src/revenuecat';
import { useSettingsStore } from '../../src/store';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type StepId = 'launch' | 'goal' | 'friction' | 'style' | 'camera' | 'preview' | 'ready';

type SelectableItem = {
  id: string;
  title: string;
  detail: string;
  icon: IconName;
  meta?: string;
};

type OnboardingStep = {
  id: StepId;
  kicker: string;
  title: string;
  body: string;
};

const steps: OnboardingStep[] = [
  {
    id: 'launch',
    kicker: 'Coach Mode',
    title: 'Train cleaner.',
    body: 'Sets, rest, counting, progress.',
  },
  {
    id: 'goal',
    kicker: 'Target',
    title: 'Choose the outcome.',
    body: 'Pick the win you want first.',
  },
  {
    id: 'friction',
    kicker: 'Blockers',
    title: 'What breaks the habit?',
    body: 'Choose what gets in the way.',
  },
  {
    id: 'style',
    kicker: 'Training Feel',
    title: 'Set the coaching style.',
    body: 'Decide how hard the coach should push.',
  },
  {
    id: 'camera',
    kicker: 'Permissions',
    title: 'Use the camera.',
    body: 'Count reps live. Manual mode stays available.',
  },
  {
    id: 'preview',
    kicker: 'First Session',
    title: 'First session.',
    body: 'Short ladder. Clean reps. Clear rest.',
  },
  {
    id: 'ready',
    kicker: 'Ready',
    title: 'You are ready.',
    body: 'Next: level, days, time.',
  },
];

const goals: SelectableItem[] = [
  { id: 'first_25', title: 'First 25', detail: 'Build the base.', icon: 'flag-outline', meta: 'Base' },
  { id: 'road_50', title: 'Road to 50', detail: 'Volume and pace.', icon: 'trending-up-outline', meta: 'Grow' },
  { id: 'road_100', title: 'Road to 100', detail: 'Hard milestones.', icon: 'trophy-outline', meta: 'Peak' },
  { id: 'form', title: 'Fix form', detail: 'Cleaner counted reps.', icon: 'scan-outline', meta: 'Form' },
];

const frictions: SelectableItem[] = [
  { id: 'counting', title: 'Lose count', detail: 'Focus breaks.', icon: 'calculator-outline' },
  { id: 'plan', title: 'Random workouts', detail: 'No next step.', icon: 'calendar-outline' },
  { id: 'form', title: 'Form doubts', detail: 'Need feedback.', icon: 'body-outline' },
  { id: 'motivation', title: 'Motivation fades', detail: 'Need pressure.', icon: 'pulse-outline' },
];

const stylesForTraining: SelectableItem[] = [
  { id: 'short_sets', title: 'Short sets', detail: 'Fast and clear.', icon: 'flash-outline', meta: '15m' },
  { id: 'steady_plan', title: 'Steady plan', detail: 'Balanced volume.', icon: 'bar-chart-outline', meta: '3x' },
  { id: 'coach_push', title: 'Push me', detail: 'More pressure.', icon: 'megaphone-outline', meta: 'Push' },
  { id: 'form_first', title: 'Form first', detail: 'Clean over fast.', icon: 'shield-checkmark-outline', meta: 'Clean' },
];

const sessionPreview = [
  { label: 'Set 1', value: '3', detail: 'Start' },
  { label: 'Rest', value: '45s', detail: 'Recover' },
  { label: 'Set 2', value: '4', detail: 'Build' },
  { label: 'Set 3', value: '5', detail: 'Push' },
  { label: 'Finish', value: '1+', detail: 'Clean' },
];

const launchBackground = require('../../assets/bg.png');

export default function OnboardingScreen() {
  const router = useRouter();
  const { showPaywall, loading } = useSubscription();
  const completeOnboarding = useSettingsStore((state) => state.completeOnboarding);
  const updateOnboardingProfile = useSettingsStore((state) => state.updateOnboardingProfile);
  const setNotificationsEnabled = useSettingsStore((state) => state.setNotificationsEnabled);

  const [index, setIndex] = useState(0);
  const [goal, setGoal] = useState<string>();
  const [selectedFrictions, setSelectedFrictions] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const finishingRef = useRef(false);

  const step = steps[index];
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;
  const progressLabel = `${index + 1}/${steps.length}`;
  const progressWidth = `${((index + 1) / steps.length) * 100}%` as `${number}%`;
  const primaryLabel = getPrimaryLabel(step.id, Boolean(goal), selectedFrictions.length, selectedStyles.length);
  const canContinue =
    step.id === 'goal'
      ? Boolean(goal)
      : step.id === 'friction'
        ? selectedFrictions.length > 0
        : step.id === 'style'
          ? selectedStyles.length > 0
          : true;

  function persist() {
    updateOnboardingProfile({
      goal,
      pains: selectedFrictions,
      preferences: selectedStyles,
      statements: [],
      trainingSequence: ['baseline', 'volume', 'camera'],
    });
  }

  function goNext() {
    persist();
    if (isLast) {
      finish();
      return;
    }
    setIndex((current) => Math.min(current + 1, steps.length - 1));
  }

  function goBack() {
    setIndex((current) => Math.max(current - 1, 0));
  }

  function toggleValue(value: string, current: string[], setValue: (next: string[]) => void) {
    setValue(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  async function requestCameraAndContinue() {
    setBusy(true);
    try {
      await Camera.requestCameraPermissionsAsync();
      updateOnboardingProfile({ cameraPrimed: true });
      goNext();
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setFinishing(true);
    setBusy(true);
    try {
      persist();
      setNotificationsEnabled(false);
      updateOnboardingProfile({ notificationsPrimed: false });
      completeOnboarding();
      router.replace('/(stack)/setup/level');
    } catch (error) {
      finishingRef.current = false;
      setBusy(false);
      setFinishing(false);
      throw error;
    }
  }

  async function unlockAndFinish() {
    setBusy(true);
    try {
      await showPaywall();
      await finish();
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.root}>
      {step.id === 'launch' ? (
        <ImageBackground source={launchBackground} resizeMode="cover" style={StyleSheet.absoluteFill} imageStyle={styles.launchImage}>
          <LinearGradient
            colors={['rgba(0,0,0,0.28)', 'rgba(0,0,0,0.62)', 'rgba(0,0,0,0.95)']}
            locations={[0, 0.46, 1]}
            style={StyleSheet.absoluteFill}
          />
        </ImageBackground>
      ) : (
        <LinearGradient
          colors={['#121417', '#070809', '#030303']}
          locations={[0, 0.42, 1]}
          style={StyleSheet.absoluteFill}
        />
      )}
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={goBack}
            disabled={isFirst}
            style={[styles.iconButton, isFirst && styles.hiddenButton]}
          >
            <Ionicons name="chevron-back" size={21} color="#F8FAFC" />
          </Pressable>

          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: progressWidth }]} />
            </View>
            <Text style={styles.progressText}>{progressLabel}</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
            onPress={finish}
            style={styles.skipButton}
          >
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, step.id === 'launch' && styles.launchScroll]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Animated.View
            key={step.id}
            entering={FadeInDown.duration(260)}
            exiting={FadeOut.duration(140)}
            style={[styles.stage, step.id === 'launch' && styles.launchStage]}
          >
            <View style={[styles.titleBlock, step.id === 'launch' && styles.launchTitleBlock]}>
              {step.id !== 'launch' && <Text style={styles.kicker}>{step.kicker}</Text>}
              <Text style={[styles.title, step.id === 'launch' && styles.launchTitle]}>{step.title}</Text>
              <Text style={[styles.body, step.id === 'launch' && styles.launchBody]}>{step.body}</Text>
            </View>

            {step.id === 'goal' && (
              <SelectionGrid
                items={goals}
                selected={goal ? [goal] : []}
                onPress={setGoal}
                mode="single"
              />
            )}

            {step.id === 'friction' && (
              <SelectionGrid
                items={frictions}
                selected={selectedFrictions}
                onPress={(id) => toggleValue(id, selectedFrictions, setSelectedFrictions)}
                mode="multi"
              />
            )}

            {step.id === 'style' && (
              <SelectionGrid
                items={stylesForTraining}
                selected={selectedStyles}
                onPress={(id) => toggleValue(id, selectedStyles, setSelectedStyles)}
                mode="multi"
              />
            )}

            {step.id === 'camera' && <CameraPanel />}

            {step.id === 'preview' && <SessionPreview />}

            {step.id === 'ready' && (
              <ReadyPanel
                goal={goals.find((item) => item.id === goal)?.title ?? 'Adaptive training'}
                frictions={selectedFrictions.length}
                styles={selectedStyles.length}
              />
            )}
          </Animated.View>
        </ScrollView>

        <View style={styles.footer}>
          {step.id === 'camera' ? (
            <>
              <PrimaryButton
                label={busy ? 'Opening camera' : 'Allow camera'}
                icon="camera-outline"
                disabled={busy}
                loading={busy}
                onPress={requestCameraAndContinue}
              />
              <Pressable onPress={goNext} style={styles.secondaryButton}>
                <Text style={styles.secondaryText}>Skip camera</Text>
              </Pressable>
            </>
          ) : step.id === 'ready' ? (
            <>
              <PrimaryButton
                label={loading || busy ? 'Starting' : 'Continue'}
                icon="arrow-forward"
                disabled={busy || loading || finishing}
                loading={busy || loading || finishing}
                onPress={finish}
              />
              <Pressable onPress={unlockAndFinish} disabled={busy || loading || finishing} style={styles.secondaryButton}>
                <Text style={styles.secondaryText}>View Pro</Text>
              </Pressable>
            </>
          ) : (
            <PrimaryButton
              label={primaryLabel}
              icon="arrow-forward"
              disabled={!canContinue || busy}
              onPress={goNext}
            />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

function getPrimaryLabel(stepId: StepId, hasGoal: boolean, frictionCount: number, styleCount: number) {
  if (stepId === 'launch') return 'Start';
  if (stepId === 'goal') return hasGoal ? 'Continue' : 'Choose goal';
  if (stepId === 'friction') return frictionCount > 0 ? 'Continue' : 'Choose one';
  if (stepId === 'style') return styleCount > 0 ? 'Continue' : 'Choose style';
  if (stepId === 'preview') return 'Continue';
  return 'Continue';
}

function PrimaryButton({
  label,
  icon,
  disabled,
  loading,
  onPress,
}: {
  label: string;
  icon: IconName;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.primaryButton,
        disabled && styles.primaryButtonDisabled,
        pressed && !disabled && styles.primaryButtonPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#070809" />
      ) : (
        <>
          <Text style={styles.primaryText}>{label}</Text>
          <View style={styles.primaryIcon}>
            <Ionicons name={icon} size={18} color="#070809" />
          </View>
        </>
      )}
    </Pressable>
  );
}

function SelectionGrid({
  items,
  selected,
  onPress,
  mode,
}: {
  items: SelectableItem[];
  selected: string[];
  onPress: (id: string) => void;
  mode: 'single' | 'multi';
}) {
  return (
    <View style={styles.selectionList}>
      {items.map((item) => {
        const active = selected.includes(item.id);
        return (
          <Pressable
            key={item.id}
            accessibilityRole={mode === 'single' ? 'radio' : 'checkbox'}
            accessibilityState={{ selected: active, checked: active }}
            onPress={() => onPress(item.id)}
            style={({ pressed }) => [
              styles.choiceCard,
              active && styles.choiceCardActive,
              pressed && styles.choiceCardPressed,
            ]}
          >
            <View style={[styles.choiceIcon, active && styles.choiceIconActive]}>
              <Ionicons name={item.icon} size={20} color={active ? '#070809' : '#CBD5E1'} />
            </View>
            <View style={styles.choiceCopy}>
              <View style={styles.choiceTitleRow}>
                <Text style={styles.choiceTitle}>{item.title}</Text>
                {item.meta && <Text style={styles.choiceMeta}>{item.meta}</Text>}
              </View>
              <Text style={styles.choiceDetail}>{item.detail}</Text>
            </View>
            <View style={[styles.checkDot, active && styles.checkDotActive]}>
              {active && <Ionicons name="checkmark" size={14} color="#070809" />}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function CameraPanel() {
  return (
    <View style={styles.permissionPanel}>
      <View style={styles.permissionIcon}>
        <Ionicons name="camera-outline" size={26} color="#FFFFFF" />
      </View>
      <View style={styles.permissionCopy}>
        <Text style={styles.permissionTitle}>Live counting. Cleaner sessions.</Text>
        <Text style={styles.permissionBody}>Skip anytime. Manual mode still works.</Text>
      </View>
      <View style={styles.featureList}>
        <Feature icon="scan-outline" title="Counts reps" />
        <Feature icon="timer-outline" title="Times rest" />
        <Feature icon="shield-checkmark-outline" title="Fallback ready" />
      </View>
    </View>
  );
}

function Feature({ icon, title }: { icon: IconName; title: string }) {
  return (
    <View style={styles.featureRow}>
      <Ionicons name={icon} size={17} color="#FDA4AF" />
      <Text style={styles.featureText}>{title}</Text>
    </View>
  );
}

function SessionPreview() {
  return (
    <View style={styles.previewPanel}>
      {sessionPreview.map((item, index) => (
        <View key={item.label} style={styles.previewRow}>
          <View style={styles.previewIndex}>
            <Text style={styles.previewIndexText}>{index + 1}</Text>
          </View>
          <View style={styles.previewCopy}>
            <Text style={styles.previewLabel}>{item.label}</Text>
            <Text style={styles.previewDetail}>{item.detail}</Text>
          </View>
          <Text style={styles.previewValue}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

function ReadyPanel({ goal, frictions, styles: styleCount }: { goal: string; frictions: number; styles: number }) {
  return (
    <View style={styles.readyPanel}>
      <View style={styles.readyHeader}>
        <Text style={styles.readyTitle}>Plan profile</Text>
        <Text style={styles.readyStatus}>Ready</Text>
      </View>
      <View style={styles.readyRows}>
        <SummaryRow label="Target" value={goal} />
        <SummaryRow label="Blockers mapped" value={`${frictions || 1}`} />
        <SummaryRow label="Coaching signals" value={`${styleCount || 1}`} />
      </View>
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#030303',
  },
  launchImage: {
    opacity: 0.86,
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 8,
  },
  iconButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  hiddenButton: {
    opacity: 0,
  },
  progressWrap: {
    flex: 1,
    gap: 7,
  },
  progressTrack: {
    height: 7,
    overflow: 'hidden',
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: '#F43F5E',
  },
  progressText: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.42)',
    letterSpacing: 0,
    textAlign: 'center',
  },
  skipButton: {
    minWidth: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    fontSize: 13,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.46)',
    letterSpacing: 0,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 132,
  },
  launchScroll: {
    justifyContent: 'center',
    paddingTop: 0,
    paddingBottom: 150,
  },
  stage: {
    gap: 22,
  },
  launchStage: {
    flex: 1,
    justifyContent: 'center',
  },
  titleBlock: {
    gap: 10,
  },
  launchTitleBlock: {
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  kicker: {
    alignSelf: 'flex-start',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(244,63,94,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.28)',
    fontSize: 11,
    fontWeight: '900',
    color: '#FDA4AF',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 38,
    lineHeight: 42,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0,
  },
  launchTitle: {
    maxWidth: 320,
    fontSize: 48,
    lineHeight: 52,
    textAlign: 'center',
  },
  body: {
    maxWidth: 340,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.58)',
    letterSpacing: 0,
  },
  launchBody: {
    maxWidth: 260,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.64)',
  },
  selectionList: {
    gap: 10,
  },
  choiceCard: {
    minHeight: 86,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  choiceCardActive: {
    backgroundColor: 'rgba(244,63,94,0.14)',
    borderColor: 'rgba(251,113,133,0.58)',
  },
  choiceCardPressed: {
    transform: [{ scale: 0.99 }],
  },
  choiceIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  choiceIconActive: {
    backgroundColor: '#FB7185',
  },
  choiceCopy: {
    flex: 1,
    gap: 5,
  },
  choiceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  choiceTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0,
  },
  choiceMeta: {
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    fontSize: 10,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.68)',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  choiceDetail: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0,
  },
  checkDot: {
    width: 25,
    height: 25,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  checkDotActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  permissionPanel: {
    gap: 18,
    padding: 18,
    borderRadius: 8,
    backgroundColor: '#111418',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  permissionIcon: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#F43F5E',
  },
  permissionCopy: {
    gap: 7,
  },
  permissionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0,
  },
  permissionBody: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.52)',
    letterSpacing: 0,
  },
  featureList: {
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 13,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.72)',
    letterSpacing: 0,
  },
  previewPanel: {
    overflow: 'hidden',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#101317',
  },
  previewRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  previewIndex: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  previewIndexText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0,
  },
  previewCopy: {
    flex: 1,
  },
  previewLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0,
  },
  previewDetail: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0,
  },
  previewValue: {
    fontSize: 21,
    fontWeight: '900',
    color: '#FB7185',
    letterSpacing: 0,
  },
  readyPanel: {
    gap: 18,
    padding: 18,
    borderRadius: 8,
    backgroundColor: '#111418',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  readyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  readyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0,
  },
  readyStatus: {
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(34,197,94,0.13)',
    fontSize: 11,
    fontWeight: '900',
    color: '#BBF7D0',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  readyRows: {
    gap: 1,
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  summaryRow: {
    minHeight: 60,
    justifyContent: 'center',
    paddingHorizontal: 14,
    backgroundColor: '#171B20',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.38)',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  summaryValue: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: 9,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 24,
    backgroundColor: 'rgba(3,3,3,0.94)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  primaryButton: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  primaryButtonPressed: {
    transform: [{ scale: 0.99 }],
  },
  primaryButtonDisabled: {
    opacity: 0.35,
  },
  primaryText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#070809',
    letterSpacing: 0,
  },
  primaryIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(7,8,9,0.08)',
  },
  secondaryButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontSize: 13,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.52)',
    letterSpacing: 0,
  },
});
