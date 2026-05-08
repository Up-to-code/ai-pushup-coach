import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  PanResponder,
  Animated as RNAnimated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn, FadeInDown, FadeInUp, FadeOut } from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../src/auth';
import { useSubscription } from '../../src/subscriptions';
import { useSettingsStore, usePlanStore, useUserStore, type PlanLevel, type PlanGoal } from '../../src/store';
import { generateTrainingPlan } from '../../src/utils/planGenerator';
import { cancelPlanNotifications, syncNotificationsForPlan } from '../../src/services/notifications';
import { useResponsive } from '../../src/hooks/useResponsive';
import { colors, typography } from '../../src/theme';
import { CFEView, NeonButton } from '../../src/components';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type StepId = 'landing' | 'base' | 'ritual' | 'ready';

type SelectableItem = {
  id: string;
  title: string;
  detail: string;
  icon: IconName;
  meta?: string;
};

type OnboardingStep = {
  id: StepId;
  title: string;
};

const welcomeSetupSteps: OnboardingStep[] = [
  { id: 'landing', title: 'Transformation is a ritual.' },
  { id: 'base', title: 'Built for your body.' },
  { id: 'ritual', title: 'Owned by your life.' },
  { id: 'ready', title: 'Your path is clear.' },
];

const directSetupSteps: OnboardingStep[] = [
  { id: 'landing', title: 'Set up your plan.' },
  { id: 'base', title: 'Choose your level and goal.' },
  { id: 'ritual', title: 'Set your training rhythm.' },
  { id: 'ready', title: 'Your plan is ready.' },
];

const rebuildSteps: OnboardingStep[] = [
  { id: 'base', title: 'Update your plan.' },
  { id: 'ritual', title: 'Edit your schedule.' },
  { id: 'ready', title: 'Save your updated plan.' },
];

const levels: SelectableItem[] = [
  { id: 'beginner', title: 'Beginner', detail: '0-10 clean reps', icon: 'walk-outline', meta: 'Start' },
  { id: 'intermediate', title: 'Intermediate', detail: '11-30 clean reps', icon: 'body-outline', meta: 'Grow' },
  { id: 'advanced', title: 'Advanced', detail: '31+ clean reps', icon: 'flame-outline', meta: 'Peak' },
];

const goals: SelectableItem[] = [
  { id: 'first_25', title: 'First 25', detail: 'Build the base.', icon: 'flag-outline', meta: 'Base' },
  { id: 'road_50', title: 'Road to 50', detail: 'Volume and pace.', icon: 'trending-up-outline', meta: 'Grow' },
  { id: 'road_100', title: 'Road to 100', detail: 'Hard milestones.', icon: 'trophy-outline', meta: 'Peak' },
];

const daysOfWeek = [
  { id: 'sun', name: 'Sunday', letter: 'S' },
  { id: 'mon', name: 'Monday', letter: 'M' },
  { id: 'tue', name: 'Tuesday', letter: 'T' },
  { id: 'wed', name: 'Wednesday', letter: 'W' },
  { id: 'thu', name: 'Thursday', letter: 'T' },
  { id: 'fri', name: 'Friday', letter: 'F' },
  { id: 'sat', name: 'Saturday', letter: 'S' },
];

const SLIDER_WIDTH = 300;
const KNOB_SIZE = 60;

// Swipe slider – only on landing
function SwipeSlider({ onComplete }: { onComplete: () => void }) {
  const { normalize } = useResponsive();
  const pan = useRef(new RNAnimated.Value(0)).current;
  const travelDistance = normalize(SLIDER_WIDTH - KNOB_SIZE - 8);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const x = Math.max(0, Math.min(gestureState.dx, travelDistance));
        pan.setValue(x);
        // Tactile feedback during swipe
        if (Math.abs(gestureState.dx % 25) < 2) {
          Haptics.selectionAsync();
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx >= travelDistance * 0.8) {
          RNAnimated.timing(pan, {
            toValue: travelDistance,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onComplete();
          });
        } else {
          RNAnimated.spring(pan, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const textOpacity = pan.interpolate({
    inputRange: [0, travelDistance / 2],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={[sliderStyles.container, { width: normalize(SLIDER_WIDTH), height: normalize(68) }]}>
      <RNAnimated.Text style={[sliderStyles.text, { opacity: textOpacity, fontSize: normalize(15) }]}>
        Swipe to continue
      </RNAnimated.Text>
      <RNAnimated.View
        {...panResponder.panHandlers}
        style={[
          sliderStyles.knob,
          {
            width: normalize(KNOB_SIZE),
            height: normalize(KNOB_SIZE),
            borderRadius: normalize(KNOB_SIZE / 2),
            transform: [{ translateX: pan }],
          },
        ]}
      >
        <Ionicons name="arrow-forward" size={normalize(26)} color={colors.accent} />
      </RNAnimated.View>
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 34,
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  knob: {
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    paddingLeft: 30, // account for knob initial position
    ...typography.body,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },
});

export default function OnboardingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; returnTo?: string }>();
  const { normalize, verticalScale } = useResponsive();
  const auth = useAuth();
  const { configured: subscriptionConfigured, products: subscriptionProducts, showPaywall, loading: subLoading, isPro } = useSubscription();
  const { user } = useUserStore();
  const { setPlan, setupDraft } = usePlanStore();
  const existingPlan = usePlanStore((state) => state.plan);
  const { settings, updateSettings, completeOnboarding, updateOnboardingProfile } = useSettingsStore();

  const isRebuildMode = params.mode === 'rebuild';
  const useWelcomeCopy = !isRebuildMode && (auth.status === 'signedOut' || auth.status === 'guest');
  const steps = useMemo(
    () => (isRebuildMode ? rebuildSteps : useWelcomeCopy ? welcomeSetupSteps : directSetupSteps),
    [isRebuildMode, useWelcomeCopy]
  );
  const returnRoute = params.returnTo === 'settings' ? '/settings' : '/(tabs)';
  const [index, setIndex] = useState(0);
  const [level, setLevel] = useState<PlanLevel | undefined>(setupDraft.level ?? existingPlan?.level);
  const [goal, setGoal] = useState<PlanGoal | undefined>(setupDraft.goal ?? existingPlan?.goal);
  const [showGoalGrid, setShowGoalGrid] = useState(isRebuildMode);
  const [selectedDays, setSelectedDays] = useState<string[]>(
    setupDraft.trainingDays.length ? setupDraft.trainingDays : existingPlan?.trainingDays?.length ? existingPlan.trainingDays : ['mon', 'wed', 'fri']
  );
  const [preferredTime, setPreferredTime] = useState(() => timeFromDraft(setupDraft.preferredTime ?? existingPlan?.preferredTime));
  const [busy, setBusy] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const finishingRef = useRef(false);

  const step = steps[index];
  const isLanding = step.id === 'landing';
  const isLast = index === steps.length - 1;
  const progress = (index + 1) / steps.length;
  const showBack = index > 0;
  const showSkip = !isRebuildMode && !isLanding && !isLast;
  const paywallAvailable = subscriptionConfigured && subscriptionProducts.length > 0;

  const canContinue =
    step.id === 'base' ? (isRebuildMode ? Boolean(level && goal) : Boolean(level)) :
    step.id === 'ritual' ? selectedDays.length > 0 :
    true;

  const persist = () => {
    updateOnboardingProfile({ goal, pains: [], preferences: [], statements: [], trainingSequence: ['baseline', 'volume', 'camera'] });
  };

  const goNext = () => {
    if (step.id === 'base') {
      if (!level) return;
      if (!isRebuildMode && !goal) {
        setShowGoalGrid(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return;
      }
      if (!goal) return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    persist();
    if (isLast) finish();
    else setIndex(i => i + 1);
  };

  const goBack = () => {
    if (step.id === 'base' && showGoalGrid && level) {
      setShowGoalGrid(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }
    setIndex(i => i - 1);
  };

  const toggleDay = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDays(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const finish = async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setFinishing(true);
    setBusy(true);
    try {
      const time = preferredTime instanceof Date ? preferredTime : new Date();
      const hours = time.getHours().toString().padStart(2, '0');
      const minutes = time.getMinutes().toString().padStart(2, '0');
      const normalizedTime = `${hours}:${minutes}`;
      if (isRebuildMode && !isPro) {
        await showPaywall();
        finishingRef.current = false;
        setBusy(false);
        setFinishing(false);
        return;
      }
      const plan = generateTrainingPlan({
        level: level || 'beginner',
        goal: goal || 'first_25',
        trainingDays: selectedDays,
        preferredTime: normalizedTime,
      });
      const notificationsEnabled = isRebuildMode ? settings.notificationsEnabled : false;
      if (isRebuildMode && existingPlan?.notificationIds.length) {
        await cancelPlanNotifications(existingPlan.notificationIds);
      }
      updateSettings({
        defaultWorkoutTime: normalizedTime,
        notificationsEnabled,
      });
      const notificationIds = await syncNotificationsForPlan({
        plan,
        user,
        notificationsEnabled,
        workoutReminderEnabled: isRebuildMode ? settings.workoutReminderEnabled : true,
        missedReminderEnabled: isRebuildMode ? settings.missedReminderEnabled : true,
        habitNudgeEnabled: isRebuildMode ? settings.habitNudgeEnabled : false,
      });
      setPlan({ ...plan, notificationIds });
      persist();
      completeOnboarding();
      router.replace(isRebuildMode ? (returnRoute as any) : auth.status === 'signedOut' ? '/sign-in' : '/(tabs)');
    } catch (error) {
      finishingRef.current = false;
      setBusy(false);
      setFinishing(false);
      Alert.alert('Error', 'Something went wrong while saving your plan.');
    }
  };

  const getButtonLabel = () => {
    if (step.id === 'base') {
      if (isRebuildMode) return 'Next';
      if (!level) return 'Select level';
      return goal ? 'Continue' : 'Select goal';
    }
    if (step.id === 'ritual') return 'Continue';
    if (step.id === 'ready') return finishing ? 'Saving...' : isRebuildMode ? 'Save' : 'Start';
    return 'Continue';
  };

  return (
    <CFEView>
      {/* Header – only after landing */}
      {!isLanding && (
        <Animated.View entering={FadeInDown} style={[styles.header, { paddingTop: normalize(8), paddingHorizontal: normalize(20) }]}>
          {showBack ? (
            <Pressable onPress={goBack} style={[styles.backButton, { width: normalize(44), height: normalize(44), borderRadius: normalize(22) }]}>
              <Ionicons name="chevron-back" size={normalize(22)} color="#fff" />
            </Pressable>
          ) : <View style={{ width: 44 }} />}
          <View style={styles.progressContainer}>
            <View style={[styles.progressTrack, { height: normalize(4) }]}>
              <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: colors.accent }]} />
            </View>
          </View>
          {showSkip ? (
            <Pressable onPress={() => router.replace('/sign-in')} style={styles.skipButton}>
              <Text style={[styles.skipText, { fontSize: normalize(14) }]}>Skip</Text>
            </Pressable>
          ) : <View style={{ width: 44 }} />}
        </Animated.View>
      )}

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: normalize(32),
            paddingTop: isLanding ? verticalScale(100) : normalize(16),
            paddingBottom: normalize(160)
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isLanding && (
          <View
            style={{
              position: 'absolute',
              top: verticalScale(60),
              left: -normalize(40),
              width: normalize(200),
              height: normalize(200),
              borderRadius: normalize(100),
              backgroundColor: colors.accent,
              opacity: 0.15,
              transform: [{ scale: 1.5 }],
            }}
          >
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          </View>
        )}
        <Animated.View key={step.id} entering={FadeInDown.duration(400)} exiting={FadeOut.duration(200)} style={[styles.stepContainer, { gap: normalize(48) }]}>
          <View style={[styles.textBlock, isLanding && styles.textBlockHero]}>
            <Text
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              style={[
                styles.title,
                isLanding && {
                  fontSize: normalize(38),
                  lineHeight: normalize(44),
                  fontStyle: 'italic',
                  fontWeight: '900',
                  letterSpacing: -1,
                },
                !isLanding && { fontSize: normalize(34), lineHeight: normalize(42), fontWeight: '800' }
              ]}
            >
              {isLanding ? (
                <>
                  {useWelcomeCopy ? (
                    <>
                      <Text style={{ color: '#FFF' }}>Transformation</Text>{'\n'}
                      <Text style={{ color: colors.accent }}>is a ritual.</Text>
                    </>
                  ) : (
                    <>
                      <Text style={{ color: '#FFF' }}>Refine</Text>{'\n'}
                      <Text style={{ color: colors.accent }}>your ritual.</Text>
                    </>
                  )}
                </>
              ) : step.title}
            </Text>
          </View>

          {step.id === 'base' && (
            <View style={styles.grid}>
              {(!showGoalGrid || isRebuildMode) && (
                <>
                  {levels.map(item => (
                    <Pressable
                      key={item.id}
                      onPress={() => {
                        setLevel(item.id as PlanLevel);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      style={({ pressed }) => [
                        styles.card,
                        { paddingVertical: normalize(18), paddingHorizontal: normalize(20), borderRadius: normalize(16) },
                        level === item.id && styles.cardSelected,
                        pressed && styles.cardPressed
                      ]}
                    >
                      <Ionicons name={item.icon} size={normalize(20)} color={level === item.id ? '#fff' : 'rgba(255,255,255,0.4)'} />
                      <View style={styles.cardContent}>
                        <Text style={[styles.cardTitle, { fontSize: normalize(17) }]}>{item.title}</Text>
                        <Text style={[styles.cardDetail, { fontSize: normalize(13) }]}>{item.detail}</Text>
                      </View>
                      {level === item.id && <Ionicons name="checkmark" size={normalize(18)} color="#fff" />}
                    </Pressable>
                  ))}
                </>
              )}

              {(showGoalGrid || isRebuildMode) && (
                <Animated.View entering={FadeInDown.duration(300)} style={{ gap: 10 }}>
                  {goals.map(item => (
                    <Pressable
                      key={item.id}
                      onPress={() => {
                        setGoal(item.id as PlanGoal);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      }}
                      style={({ pressed }) => [
                        styles.card,
                        { paddingVertical: normalize(18), paddingHorizontal: normalize(20), borderRadius: normalize(16) },
                        goal === item.id && styles.cardSelected,
                        pressed && styles.cardPressed
                      ]}
                    >
                      <Ionicons name={item.icon} size={normalize(20)} color={goal === item.id ? '#fff' : 'rgba(255,255,255,0.4)'} />
                      <View style={styles.cardContent}>
                        <Text style={[styles.cardTitle, { fontSize: normalize(17) }]}>{item.title}</Text>
                        <Text style={[styles.cardDetail, { fontSize: normalize(13) }]}>{item.detail}</Text>
                      </View>
                      {goal === item.id && <Ionicons name="checkmark" size={normalize(18)} color="#fff" />}
                    </Pressable>
                  ))}
                </Animated.View>
              )}
            </View>
          )}

          {step.id === 'ritual' && (
            <>
              <View style={styles.grid}>
                {daysOfWeek.map(day => {
                  const isActive = selectedDays.includes(day.id);
                  return (
                    <Pressable
                      key={day.id}
                      onPress={() => toggleDay(day.id)}
                      style={({ pressed }) => [
                        styles.card,
                        { paddingVertical: normalize(14), paddingHorizontal: normalize(20), borderRadius: normalize(16) },
                        isActive && styles.cardSelected,
                        pressed && styles.cardPressed
                      ]}
                    >
                      <Text style={[styles.dayLetter, { fontSize: normalize(16), width: normalize(24), textAlign: 'center' }, isActive && styles.dayLetterActive]}>{day.letter}</Text>
                      <View style={styles.cardContent}>
                        <Text style={[styles.cardTitle, { fontSize: normalize(16) }]}>{day.name}</Text>
                      </View>
                      <View style={[styles.checkbox, { width: normalize(22), height: normalize(22), borderRadius: normalize(11) }, isActive && styles.checkboxSelected]}>
                        {isActive && <Ionicons name="checkmark" size={normalize(12)} color="#000" />}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              <View style={[styles.panel, { marginTop: 16, padding: normalize(20), borderRadius: normalize(20) }]}>
                <DateTimePicker
                  value={preferredTime}
                  mode="time"
                  display="spinner"
                  onChange={(event, date) => date && setPreferredTime(date)}
                  textColor="#fff"
                  style={{ height: normalize(180) }}
                />
              </View>
            </>
          )}

          {step.id === 'ready' && (
            <View style={[styles.readyCard, { borderRadius: normalize(20), padding: normalize(20) }]}>
              <View style={[styles.summaryRow, { paddingVertical: normalize(14) }]}>
                <Text style={[styles.summaryLabel, { fontSize: normalize(12) }]}>Level</Text>
                <Text style={[styles.summaryValue, { fontSize: normalize(17) }]}>
                  {levels.find(l => l.id === level)?.title ?? 'Beginner'}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={[styles.summaryRow, { paddingVertical: normalize(14) }]}>
                <Text style={[styles.summaryLabel, { fontSize: normalize(12) }]}>Goal</Text>
                <Text style={[styles.summaryValue, { fontSize: normalize(17) }]}>
                  {goals.find(g => g.id === goal)?.title ?? 'First 25'}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={[styles.summaryRow, { paddingVertical: normalize(14) }]}>
                <Text style={[styles.summaryLabel, { fontSize: normalize(12) }]}>Days</Text>
                <Text style={[styles.summaryValue, { fontSize: normalize(17) }]}>
                  {selectedDays.map(d => daysOfWeek.find(dw => dw.id === d)?.letter).join('  ')}
                </Text>
              </View>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Fixed Footer for Actions */}
      <Animated.View
        entering={FadeInUp}
        style={[
          styles.footer,
          {
            paddingHorizontal: normalize(32),
            paddingBottom: normalize(32),
            paddingTop: normalize(12),
            backgroundColor: isLanding ? 'transparent' : 'rgba(0,0,0,0.5)'
          }
        ]}
      >
        {isLanding ? (
          <View style={{ alignItems: 'center' }}>
            <SwipeSlider onComplete={goNext} />
          </View>
        ) : (
          <NeonButton
            title={getButtonLabel()}
            onPress={step.id === 'ready' ? finish : goNext}
            disabled={!canContinue || busy || finishing}
            style={{ minHeight: normalize(58) }}
          />
        )}
        {step.id === 'ready' && !isRebuildMode && subscriptionConfigured && (
          <Pressable
            onPress={async () => { await showPaywall(); await finish(); }}
            disabled={busy || subLoading || !paywallAvailable}
            style={styles.secondaryButton}
          >
            <Text style={[styles.secondaryText, { fontSize: normalize(15) }]}>
              {paywallAvailable ? 'View Pro →' : 'Pro setup required'}
            </Text>
          </Pressable>
        )}
      </Animated.View>
    </CFEView>
  );
}

function timeFromDraft(value?: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value ?? '');
  const date = new Date();
  date.setSeconds(0, 0);
  if (!match) {
    date.setHours(7, 30, 0, 0);
    return date;
  }
  date.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return date;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  backButton: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  progressContainer: { flex: 1 },
  progressTrack: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  skipButton: { paddingHorizontal: 12, paddingVertical: 8 },
  skipText: { fontWeight: '500', color: 'rgba(255,255,255,0.5)' },
  scrollContent: { flexGrow: 1, paddingTop: 16 },
  stepContainer: { gap: 48 },
  textBlock: { gap: 10 },
  textBlockHero: { marginTop: 40 },
  title: { color: '#fff' },
  grid: { gap: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  cardSelected: { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.15)' },
  cardPressed: { transform: [{ scale: 0.98 }] },
  cardContent: { flex: 1, gap: 2 },
  cardTitle: { fontWeight: '600', color: '#fff', letterSpacing: -0.2 },
  cardDetail: { fontWeight: '400', color: 'rgba(255,255,255,0.4)' },
  checkbox: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { backgroundColor: '#fff', borderColor: '#fff' },
  dayLetter: { fontWeight: '700', color: 'rgba(255,255,255,0.4)' },
  dayLetterActive: { color: '#fff' },
  panel: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  readyCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  summaryRow: {},
  summaryLabel: { fontWeight: '600', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { fontWeight: '700', color: '#fff', marginTop: 4 },
  summaryDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  primaryButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    backgroundColor: '#FFF',
    overflow: 'hidden',
  },
  primaryButtonDisabled: { opacity: 0.3 },
  primaryButtonPressed: { transform: [{ scale: 0.97 }] },
  primaryText: { fontWeight: '700', color: '#000', letterSpacing: 0.2 },
  secondaryButton: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  secondaryText: { fontWeight: '500', color: 'rgba(255,255,255,0.5)' },
});
