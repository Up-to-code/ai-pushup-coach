import React from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { NeonButton } from '../../src/components';
import { useWorkoutStore, type TrainingCameraMode, type WorkoutType } from '../../src/store';
import { borderRadius, colors, spacing, typography } from '../../src/theme';

function parseNumberParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parseSetsParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(Number) : undefined;
  } catch {
    return undefined;
  }
}

const modes: Array<{
  mode: TrainingCameraMode;
  title: string;
  subtitle: string;
  icon: string;
}> = [
  {
    mode: 'faceFocus',
    title: 'Face Focus',
    subtitle: 'Tracks your face height to count reps automatically.',
    icon: 'scan',
  },
  {
    mode: 'fullScene',
    title: 'Full Scene',
    subtitle: 'Wider view with more body visibility during sets.',
    icon: 'expand',
  },
];

export default function TrainingSetupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const startWorkout = useWorkoutStore((state) => state.startWorkout);
  const [selectedMode, setSelectedMode] = React.useState<TrainingCameraMode>('faceFocus');

  const type = (Array.isArray(params.type) ? params.type[0] : params.type || 'open') as WorkoutType;
  const title = (Array.isArray(params.title) ? params.title[0] : params.title) || 'Start session';
  const subtitle =
    (Array.isArray(params.subtitle) ? params.subtitle[0] : params.subtitle) ||
    'Choose your camera mode.';
  const goal = parseNumberParam(params.goal);
  const restTime = parseNumberParam(params.restTime);
  const sets = parseSetsParam(params.sets);

  return (
    <ImageBackground 
      source={require('../../assets/images/home_bg.png')} 
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </Pressable>

          <View style={styles.header}>
            <Text style={styles.eyebrow}>CAMERA SETUP</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          <View style={styles.summaryCard}>
            <Ionicons name="information-circle" size={20} color={colors.accent} />
            <Text style={styles.summaryValue}>
              {type.toUpperCase()}
              {goal ? ` • Goal ${goal}` : ''}
              {sets?.length ? ` • ${sets.join('-')} reps` : ''}
              {restTime ? ` • Rest ${restTime}s` : ''}
            </Text>
          </View>

          {modes.map((item) => {
            const active = selectedMode === item.mode;
            return (
              <Pressable
                key={item.mode}
                style={[styles.modeCard, active && styles.modeCardActive]}
                onPress={() => setSelectedMode(item.mode)}
              >
                <View style={[styles.modeIcon, active && styles.modeIconActive]}>
                  <Ionicons 
                    name={item.icon as any} 
                    size={24} 
                    color={active ? colors.textPrimary : colors.textSecondary} 
                  />
                </View>
                <View style={styles.modeCopy}>
                  <Text style={styles.modeTitle}>{item.title}</Text>
                  <Text style={styles.modeBody}>{item.subtitle}</Text>
                </View>
                <View style={[styles.radioOuter, active && styles.radioOuterActive]}>
                  {active && <View style={styles.radioInner} />}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.footer}>
          <NeonButton
            title="Start live session"
            onPress={() => {
              startWorkout(type, selectedMode, goal, sets, restTime);
              router.replace('/(stack)/workout-session');
            }}
          />
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 32 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(32, 37, 50, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  header: {
    gap: spacing.xs,
  },
  eyebrow: { ...typography.label, color: colors.accentStrong },
  title: { ...typography.titleLarge, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(32, 37, 50, 0.4)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderAccent,
    padding: spacing.md,
  },
  summaryValue: { ...typography.bodyBold, color: colors.textPrimary, flex: 1 },
  modeCard: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  modeCardActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentAlpha,
  },
  modeIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.backgroundElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeIconActive: {
    backgroundColor: colors.accent,
  },
  modeCopy: { flex: 1, gap: 4 },
  modeTitle: { ...typography.bodyBold, color: colors.textPrimary },
  modeBody: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: colors.accent,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
