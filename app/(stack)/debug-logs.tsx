import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useClientUserId } from '../../src/features/shared/currentUser';
import { colors, spacing, typography } from '../../src/theme';

export default function DebugLogsScreen() {
  const router = useRouter();
  const clientUserId = useClientUserId();
  const events = useQuery(api.telemetry.recentWorkoutEvents, { clientUserId, limit: 100 });
  const tracking = useQuery(api.telemetry.recentFaceTrackingIssues, { clientUserId, limit: 100 });
  const loading = events === undefined || tracking === undefined;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Debug logs</Text>
          <Text style={styles.subtitle}>Workout events and tracking issues</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summary}>
          <SummaryMetric label="samples" value={tracking?.totalSamples ?? 0} />
          <SummaryMetric label="issues" value={tracking?.issueSamples ?? 0} />
          <SummaryMetric label="no face" value={tracking?.noFaceSamples ?? 0} />
          <SummaryMetric label="dark" value={tracking?.darkSamples ?? 0} />
        </View>

        <SectionTitle icon="scan-outline" title="Face tracking summary" />
        {loading ? (
          <EmptyState title="Loading logs" body="Reading the latest telemetry from Convex." />
        ) : tracking?.byProblem.length ? (
          <View style={styles.issueList}>
            {tracking.byProblem.map((item) => (
              <View key={item.problem} style={styles.issueRow}>
                <Text style={styles.issueName}>{formatProblem(item.problem)}</Text>
                <Text style={styles.issueCount}>{item.count}</Text>
              </View>
            ))}
          </View>
        ) : (
          <EmptyState title="No tracking issues" body="Recent samples did not include compact camera problems." />
        )}

        <SectionTitle icon="terminal-outline" title="Workout events" />
        {events && events.length > 0 ? (
          <View style={styles.eventList}>
            {events.map((event) => (
              <View key={event.id} style={styles.eventRow}>
                <View style={styles.eventIcon}>
                  <Ionicons name={iconForEvent(event.type)} size={16} color={colors.accent} />
                </View>
                <View style={styles.eventCopy}>
                  <Text style={styles.eventTitle}>{formatProblem(event.type)}</Text>
                  <Text style={styles.eventMeta}>
                    {new Date(event.timestamp).toLocaleString()}
                    {event.rep !== undefined ? ` · rep ${event.rep}` : ''}
                    {event.phase ? ` · ${event.phase}` : ''}
                  </Text>
                  {event.message ? <Text style={styles.eventMessage}>{event.message}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <EmptyState title="No workout events" body="Session telemetry will show here after a workout is synced." />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.summaryMetric}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function SectionTitle({ icon, title }: { icon: keyof typeof Ionicons.glyphMap; title: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Ionicons name={icon} size={17} color={colors.textSecondary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.emptyPanel}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

function formatProblem(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function iconForEvent(type: string): keyof typeof Ionicons.glyphMap {
  if (type === 'repCounted') return 'checkmark-circle-outline';
  if (type === 'cameraState') return 'camera-outline';
  if (type === 'formFeedback') return 'pulse-outline';
  if (type === 'sessionEnded') return 'flag-outline';
  return 'radio-button-on-outline';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...typography.titleMedium,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 48,
    gap: spacing.md,
  },
  summary: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  summaryMetric: {
    flex: 1,
    minHeight: 70,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  summaryValue: {
    ...typography.titleMedium,
    color: colors.textPrimary,
    fontSize: 18,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    ...typography.captionBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  issueList: {
    gap: 1,
  },
  issueRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  issueName: {
    ...typography.body,
    color: colors.textPrimary,
  },
  issueCount: {
    ...typography.captionBold,
    color: colors.accent,
  },
  eventList: {
    gap: spacing.sm,
  },
  eventRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  eventIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentAlpha,
  },
  eventCopy: {
    flex: 1,
    minWidth: 0,
  },
  eventTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  eventMeta: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  eventMessage: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  emptyPanel: {
    minHeight: 104,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.xs,
  },
  emptyTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  emptyBody: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
