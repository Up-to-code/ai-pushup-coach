import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Camera } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSubscription } from '../../src/revenuecat';
import { useSettingsStore, usePlanStore, useUserStore, type PlanLevel, type PlanGoal } from '../../src/store';
import { generateTrainingPlan } from '../../src/utils/planGenerator';
import { syncNotificationsForPlan } from '../../src/services/notifications';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type StepId = 'launch' | 'level' | 'goal' | 'friction' | 'style' | 'days' | 'time' | 'camera' | 'preview' | 'ready';

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
  { id: 'launch', kicker: 'Coach Mode', title: 'Train cleaner.', body: 'Sets, rest, counting, progress.' },
  { id: 'level', kicker: 'Your Starting Point', title: 'What is your level?', body: 'Be honest. The plan adapts as you grow.' },
  { id: 'goal', kicker: 'The Target', title: 'Choose your outcome.', body: 'Pick the win you want first.' },
  { id: 'friction', kicker: 'Obstacles', title: 'What breaks the habit?', body: 'Map the blockers so we can beat them.' },
  { id: 'style', kicker: 'Training Feel', title: 'Set the coaching style.', body: 'Decide how hard the coach should push.' },
  { id: 'days', kicker: 'The Schedule', title: 'Which days are for training?', body: 'Consistency is better than intensity.' },
  { id: 'time', kicker: 'The Ritual', title: 'When do you train?', body: 'Set a time that you can actually keep.' },
  { id: 'camera', kicker: 'AI Support', title: 'Use the camera?', body: 'Auto-count reps live. Manual mode stays ready.' },
  { id: 'preview', kicker: 'Sneak Peek', title: 'Your first session.', body: 'Short ladder. Clean reps. Clear rest.' },
  { id: 'ready', kicker: 'Ready', title: 'Everything is set.', body: 'Generate your personalized plan now.' },
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

const daysOfWeek = [
  { id: 'sun', name: 'Sunday', letter: 'S' },
  { id: 'mon', name: 'Monday', letter: 'M' },
  { id: 'tue', name: 'Tuesday', letter: 'T' },
  { id: 'wed', name: 'Wednesday', letter: 'W' },
  { id: 'thu', name: 'Thursday', letter: 'T' },
  { id: 'fri', name: 'Friday', letter: 'F' },
  { id: 'sat', name: 'Saturday', letter: 'S' },
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
  const { user } = useUserStore();
  const { setPlan } = usePlanStore();
  const { settings, updateSettings, completeOnboarding, updateOnboardingProfile, setNotificationsEnabled } = useSettingsStore();

  const [index, setIndex] = useState(0);
  const [level, setLevel] = useState<PlanLevel>();
  const [goal, setGoal] = useState<PlanGoal>();
  const [selectedFrictions, setSelectedFrictions] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedDays, setSelectedDays] = useState<string[]>(['mon', 'wed', 'fri']);
  const [preferredTime, setPreferredTime] = useState(new Date(new Date().setHours(7, 30, 0, 0)));
  
  const [busy, setBusy] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const finishingRef = useRef(false);

  const step = steps[index];
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;
  const progress = (index + 1) / steps.length;

  const canContinue =
    step.id === 'level' ? Boolean(level) :
    step.id === 'goal' ? Boolean(goal) :
    step.id === 'friction' ? selectedFrictions.length > 0 :
    step.id === 'style' ? selectedStyles.length > 0 :
    step.id === 'days' ? selectedDays.length > 0 : true;

  const persist = () => {
    updateOnboardingProfile({
      goal,
      pains: selectedFrictions,
      preferences: selectedStyles,
      statements: [],
      trainingSequence: ['baseline', 'volume', 'camera'],
    });
  };

  const goNext = () => {
    persist();
    if (isLast) finish();
    else setIndex(i => i + 1);
  };

  const goBack = () => setIndex(i => i - 1);

  const toggleValue = (value: string, current: string[], setValue: (next: string[]) => void) => {
    setValue(current.includes(value) ? current.filter(v => v !== value) : [...current, value]);
  };

  const requestCameraAndContinue = async () => {
    setBusy(true);
    try {
      await Camera.requestCameraPermissionsAsync();
      updateOnboardingProfile({ cameraPrimed: true });
      goNext();
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    if (finishingRef.current) return;
    if (!level || !goal || selectedDays.length === 0) {
      Alert.alert('Incomplete details', 'Please make sure all steps are completed.');
      return;
    }

    finishingRef.current = true;
    setFinishing(true);
    setBusy(true);

    try {
      // Ensure we have a valid Date object
      const time = preferredTime instanceof Date ? preferredTime : new Date();
      const hours = time.getHours().toString().padStart(2, '0');
      const minutes = time.getMinutes().toString().padStart(2, '0');
      const normalizedTime = `${hours}:${minutes}`;

      const plan = generateTrainingPlan({
        level: level || 'beginner',
        goal: goal || 'first_25',
        trainingDays: selectedDays.length ? selectedDays : ['mon', 'wed', 'fri'],
        preferredTime: normalizedTime,
      });

      updateSettings({
        ...settings,
        defaultWorkoutTime: normalizedTime,
        notificationsEnabled: false,
      });

      const notificationIds = await syncNotificationsForPlan({
        plan,
        user,
        notificationsEnabled: false,
        workoutReminderEnabled: true,
        missedReminderEnabled: true,
      });

      setPlan({ ...plan, notificationIds });
      
      persist();
      setNotificationsEnabled(false);
      updateOnboardingProfile({ notificationsPrimed: false });
      completeOnboarding();
      
      router.replace('/(tabs)');
    } catch (error) {
      finishingRef.current = false;
      setBusy(false);
      setFinishing(false);
      Alert.alert('Error', 'Something went wrong while generating your plan.');
    }
  };

  const unlockAndFinish = async () => {
    setBusy(true);
    try {
      await showPaywall();
      await finish();
    } finally {
      setBusy(false);
    }
  };

  const getButtonLabel = () => {
    if (step.id === 'launch') return 'Start';
    if (step.id === 'level') return level ? 'Continue' : 'Choose level';
    if (step.id === 'goal') return goal ? 'Continue' : 'Choose goal';
    if (step.id === 'friction') return selectedFrictions.length > 0 ? 'Continue' : 'Choose one';
    if (step.id === 'style') return selectedStyles.length > 0 ? 'Continue' : 'Choose style';
    if (step.id === 'ready') return finishing ? 'Generating...' : 'Generate My Plan';
    return 'Continue';
  };

  return (
    <View style={styles.root}>
      <ImageBackground source={launchBackground} resizeMode="cover" style={StyleSheet.absoluteFill}>
        <View style={styles.overlay} />
        {step.id === 'launch' && (
          <LinearGradient 
            colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.5)', '#000']} 
            locations={[0, 0.5, 1]} 
            style={StyleSheet.absoluteFill} 
          />
        )}
        
        <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={goBack} disabled={isFirst} style={[styles.backButton, isFirst && styles.backButtonHidden]}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>

          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>{index + 1}/{steps.length}</Text>
          </View>

          <Pressable onPress={finish} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>

        {/* Content */}
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View key={step.id} entering={FadeInDown.duration(280)} exiting={FadeOut.duration(140)} style={styles.stepContainer}>
            <View style={[styles.textBlock, step.id === 'launch' && styles.textBlockCentered]}>
              {step.id !== 'launch' && <Text style={styles.kicker}>{step.kicker}</Text>}
              <Text style={[styles.title, step.id === 'launch' && styles.titleLarge]}>{step.title}</Text>
              <Text style={[styles.body, step.id === 'launch' && styles.bodyCentered]}>{step.body}</Text>
            </View>

            {step.id === 'level' && (
              <SelectionGrid items={levels} selected={level ? [level] : []} onPress={(id) => setLevel(id as PlanLevel)} mode="single" />
            )}
            {step.id === 'goal' && (
              <SelectionGrid items={goals} selected={goal ? [goal] : []} onPress={(id) => setGoal(id as PlanGoal)} mode="single" />
            )}
            {step.id === 'friction' && (
              <SelectionGrid items={frictions} selected={selectedFrictions} onPress={(id) => toggleValue(id, selectedFrictions, setSelectedFrictions)} mode="multi" />
            )}
            {step.id === 'style' && (
              <SelectionGrid items={stylesForTraining} selected={selectedStyles} onPress={(id) => toggleValue(id, selectedStyles, setSelectedStyles)} mode="multi" />
            )}
            {step.id === 'days' && (
              <View style={styles.grid}>
                {daysOfWeek.map(day => {
                  const isActive = selectedDays.includes(day.id);
                  return (
                    <Pressable key={day.id} onPress={() => toggleValue(day.id, selectedDays, setSelectedDays)} style={({ pressed }) => [styles.card, isActive && styles.cardSelected, pressed && styles.cardPressed]}>
                      <BlurView intensity={isActive ? 40 : 15} tint="dark" style={StyleSheet.absoluteFill} />
                      <View style={[styles.cardIcon, isActive && styles.cardIconSelected]}>
                        <Text style={[styles.dayLetter, isActive && styles.dayLetterActive]}>{day.letter}</Text>
                      </View>
                      <View style={styles.cardContent}>
                        <Text style={styles.cardTitle}>{day.name}</Text>
                        <Text style={styles.cardDetail}>{isActive ? 'Workout day' : 'Recovery day'}</Text>
                      </View>
                      <View style={[styles.checkbox, isActive && styles.checkboxSelected]}>{isActive && <Ionicons name="checkmark" size={12} color="#000" />}</View>
                    </Pressable>
                  );
                })}
              </View>
            )}
            {step.id === 'time' && (
              <View style={styles.panel}>
                <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                <DateTimePicker
                  value={preferredTime}
                  mode="time"
                  display="spinner"
                  onChange={(event, date) => date && setPreferredTime(date)}
                  textColor="#fff"
                  style={{ height: 200 }}
                />
                <Text style={styles.panelText}>We'll send a gentle reminder to keep the streak alive.</Text>
              </View>
            )}
            {step.id === 'camera' && <CameraPanel />}
            {step.id === 'preview' && <SessionPreview />}
            {step.id === 'ready' && (
              <ReadyPanel 
                goal={goals.find(g => g.id === goal)?.title ?? 'Adaptive'} 
                frictionCount={selectedFrictions.length} 
                styleCount={selectedStyles.length} 
                level={levels.find(l => l.id === level)?.title ?? 'Beginner'}
              />
            )}
          </Animated.View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          {step.id === 'camera' ? (
            <>
              <PrimaryButton label={busy ? 'Opening...' : 'Allow Camera'} icon="camera-outline" onPress={requestCameraAndContinue} loading={busy} />
              <Pressable onPress={goNext} style={styles.secondaryButton}>
                <Text style={styles.secondaryText}>Skip for now</Text>
              </Pressable>
            </>
          ) : step.id === 'ready' ? (
            <>
              <PrimaryButton label={getButtonLabel()} icon="sparkles-outline" onPress={finish} loading={busy || loading || finishing} />
              <Pressable onPress={unlockAndFinish} disabled={busy || loading} style={styles.secondaryButton}>
                <Text style={styles.secondaryText}>View Pro →</Text>
              </Pressable>
            </>
          ) : (
            <PrimaryButton label={getButtonLabel()} icon="arrow-forward" onPress={goNext} disabled={!canContinue || busy} />
          )}
        </View>
      </SafeAreaView>
    </ImageBackground>
    </View>
  );
}

// ========== Reusable Components ==========

const PrimaryButton = ({ label, icon, onPress, disabled, loading }: { label: string; icon: IconName; onPress: () => void; disabled?: boolean; loading?: boolean }) => (
  <Pressable onPress={onPress} disabled={disabled || loading} style={({ pressed }) => [styles.primaryButton, disabled && styles.primaryButtonDisabled, pressed && styles.primaryButtonPressed]}>
    <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
    {loading ? <ActivityIndicator color="#fff" /> : (
      <>
        <Text style={styles.primaryText}>{label}</Text>
        <Ionicons name={icon} size={18} color="#fff" />
      </>
    )}
  </Pressable>
);

const SelectionGrid = ({ items, selected, onPress, mode }: { items: SelectableItem[]; selected: string[]; onPress: (id: string) => void; mode: 'single' | 'multi' }) => (
  <View style={styles.grid}>
    {items.map(item => {
      const isSelected = selected.includes(item.id);
      return (
        <Pressable key={item.id} onPress={() => onPress(item.id)} style={({ pressed }) => [styles.card, isSelected && styles.cardSelected, pressed && styles.cardPressed]}>
          <BlurView intensity={isSelected ? 40 : 15} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[styles.cardIcon, isSelected && styles.cardIconSelected]}>
            <Ionicons name={item.icon} size={22} color="#fff" />
          </View>
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              {item.meta && <Text style={styles.cardMeta}>{item.meta}</Text>}
            </View>
            <Text style={styles.cardDetail}>{item.detail}</Text>
          </View>
          {mode === 'multi' && <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>{isSelected && <Ionicons name="checkmark" size={12} color="#000" />}</View>}
          {mode === 'single' && isSelected && <Ionicons name="checkmark-circle" size={22} color="#fff" />}
        </Pressable>
      );
    })}
  </View>
);

const CameraPanel = () => (
  <View style={styles.panel}>
    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
    <View style={styles.panelIcon}>
      <Ionicons name="camera-outline" size={28} color="#fff" />
    </View>
    <Text style={styles.panelTitle}>Live counting. Cleaner sessions.</Text>
    <Text style={styles.panelText}>Skip anytime. Manual mode still works.</Text>
    <View style={styles.featureList}>
      {['scan-outline', 'timer-outline', 'shield-checkmark-outline'].map((icon, i) => (
        <View key={i} style={styles.featureRow}>
          <Ionicons name={icon as IconName} size={16} color="#f43f5e" />
          <Text style={styles.featureText}>{['Counts reps', 'Times rest', 'Fallback ready'][i]}</Text>
        </View>
      ))}
    </View>
  </View>
);

const SessionPreview = () => (
  <View style={styles.preview}>
    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
    {sessionPreview.map((item, i) => (
      <View key={i} style={styles.previewRow}>
        <View style={styles.previewNumber}>
          <Text style={styles.previewNumberText}>{i + 1}</Text>
        </View>
        <View style={styles.previewInfo}>
          <Text style={styles.previewLabel}>{item.label}</Text>
          <Text style={styles.previewDetail}>{item.detail}</Text>
        </View>
        <Text style={styles.previewValue}>{item.value}</Text>
      </View>
    ))}
  </View>
);

const ReadyPanel = ({ goal, frictionCount, styleCount, level }: { goal: string; frictionCount: number; styleCount: number; level: string }) => (
  <View style={styles.readyCard}>
    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
    <View style={styles.readyHeader}>
      <Text style={styles.readyTitle}>Your Plan</Text>
      <View style={styles.readyBadge}>
        <Text style={styles.readyBadgeText}>Ready</Text>
      </View>
    </View>
    <View style={styles.summary}>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Experience</Text>
        <Text style={styles.summaryValue}>{level}</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Goal</Text>
        <Text style={styles.summaryValue}>{goal}</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Personalization</Text>
        <Text style={styles.summaryValue}>{frictionCount + styleCount} Signals</Text>
      </View>
    </View>
  </View>
);

// ========== Modern & Clean Styles ==========

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  backButtonHidden: { opacity: 0 },
  progressContainer: { flex: 1, gap: 6 },
  progressTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#f43f5e', borderRadius: 2 },
  progressText: { fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.4)', textAlign: 'center' },
  skipButton: { paddingHorizontal: 12, paddingVertical: 8 },
  skipText: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.5)' },

  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 130 },
  stepContainer: { gap: 32 },

  textBlock: { gap: 10 },
  textBlockCentered: { alignItems: 'center' },
  kicker: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(244,63,94,0.12)',
    borderRadius: 30,
    fontSize: 12,
    fontWeight: '600',
    color: '#fda4af',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  title: { fontSize: 34, fontWeight: '800', color: '#fff', lineHeight: 42, letterSpacing: -0.5 },
  titleLarge: { fontSize: 44, lineHeight: 50, textAlign: 'center', maxWidth: 300 },
  body: { fontSize: 16, fontWeight: '500', color: 'rgba(255,255,255,0.6)', lineHeight: 24, maxWidth: 320 },
  bodyCentered: { textAlign: 'center', maxWidth: 260 },

  grid: { gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  cardSelected: { backgroundColor: 'rgba(244,63,94,0.1)', borderColor: 'rgba(244,63,94,0.4)' },
  cardPressed: { transform: [{ scale: 0.98 }] },
  cardIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)' },
  cardIconSelected: { backgroundColor: '#f43f5e' },
  cardContent: { flex: 1, gap: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 17, fontWeight: '600', color: '#fff', letterSpacing: -0.2 },
  cardMeta: { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  cardDetail: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.5)', lineHeight: 18 },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { backgroundColor: '#fff', borderColor: '#fff' },
  dayLetter: { fontSize: 18, fontWeight: '700', color: '#fff' },
  dayLetterActive: { color: '#fff' },

  panel: { gap: 16, padding: 24, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  panelIcon: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f43f5e', borderRadius: 20 },
  panelTitle: { fontSize: 20, fontWeight: '700', color: '#fff', letterSpacing: -0.3 },
  panelText: { fontSize: 15, fontWeight: '500', color: 'rgba(255,255,255,0.5)', lineHeight: 22, textAlign: 'center' },
  featureList: { gap: 12, marginTop: 6 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureText: { fontSize: 15, fontWeight: '500', color: 'rgba(255,255,255,0.75)' },

  preview: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 18, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  previewNumber: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12 },
  previewNumberText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  previewInfo: { flex: 1 },
  previewLabel: { fontSize: 16, fontWeight: '600', color: '#fff' },
  previewDetail: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  previewValue: { fontSize: 24, fontWeight: '800', color: '#f43f5e', letterSpacing: -0.5 },

  readyCard: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 28, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  readyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  readyTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  readyBadge: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(34,197,94,0.12)', borderRadius: 30 },
  readyBadgeText: { fontSize: 12, fontWeight: '700', color: '#bbf7d0', textTransform: 'uppercase' },
  summary: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20, overflow: 'hidden' },
  summaryRow: { paddingVertical: 14, paddingHorizontal: 18 },
  summaryLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { fontSize: 17, fontWeight: '700', color: '#fff', marginTop: 4 },
  summaryDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 28,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    minHeight: 56,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  primaryButtonDisabled: { opacity: 0.2 },
  primaryButtonPressed: { transform: [{ scale: 0.97 }] },
  primaryText: { fontSize: 17, fontWeight: '600', color: '#fff', letterSpacing: 0.2 },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 28,
  },
  secondaryText: { fontSize: 15, fontWeight: '500', color: 'rgba(255,255,255,0.5)' },
});
