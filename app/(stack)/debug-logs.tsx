import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useCurrentUser } from '../../src/auth';
import { useClientUserId } from '../../src/features/shared/currentUser';
import { useUserStore } from '../../src/store';
import { hasPosthogConfig, posthogHost } from '../../src/analytics';
import { fallbackConvexUrl } from '../../src/config/links';
import { FORCE_PRO_FOR_TESTING, IS_ADAPTY_CONFIGURED, PAYWALL_PLACEMENT_ID, PRO_ACCESS_LEVEL_ID } from '../../src/subscriptions/config';
import { colors, spacing, typography } from '../../src/theme';

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL ?? fallbackConvexUrl;

const goalMap = [
  { route: 'My Plan', purpose: 'Show current plan and next workout.', action: 'Start or inspect plan day', exit: 'Practice or workout setup', status: 'pass' },
  { route: 'Challenges', purpose: 'Join active rep challenges.', action: 'Join or leave challenge', exit: 'Challenge membership updates in Convex', status: 'pass' },
  { route: 'Practice', purpose: 'Pick training mode.', action: 'Choose mode', exit: 'Training setup', status: 'pass' },
  { route: 'Rank', purpose: 'Compare global, country, and friends progress.', action: 'Switch scope or period', exit: 'Public profile view', status: 'pass' },
  { route: 'Profile', purpose: 'Inspect stats, history, and account actions.', action: 'Edit profile or open stats', exit: 'Settings/profile edit', status: 'pass' },
  { route: 'Settings', purpose: 'Manage profile, country, notifications, support, and debug.', action: 'Open setting row', exit: 'Specific settings screen', status: 'pass' },
  { route: 'Feature requests', purpose: 'Submit feature ideas and bugs.', action: 'Send request or vote', exit: 'Feedback list updates', status: 'pass' },
  { route: 'Paywall', purpose: 'Upgrade or restore Pro.', action: 'Purchase or restore', exit: 'Subscription state syncs', status: 'pass' },
] as const;

export default function DebugLogsScreen() {
  const router = useRouter();
  const clientUserId = useClientUserId();
  const localUser = useUserStore((state) => state.user);
  const { remoteUser, auth } = useCurrentUser();
  const events = useQuery(api.telemetry.recentWorkoutEvents, { clientUserId, limit: 100 });
  const tracking = useQuery(api.telemetry.recentFaceTrackingIssues, { clientUserId, limit: 100 });
  const appHealth = useQuery(
    api.telemetry.appHealthSnapshot,
    auth.status === 'signedIn' ? { clientUserId } : 'skip'
  );
  const leaderboardDebug = useQuery(
    api.leaderboard.debugSnapshot,
    auth.status === 'signedIn' ? { clientUserId, countryCode: remoteUser?.countryCode ?? localUser.countryCode } : 'skip'
  );
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

        <SectionTitle icon="pulse-outline" title="App health" />
        {auth.status !== 'signedIn' ? (
          <EmptyState title="Sign in required" body="Full app health checks require an authenticated backend user." />
        ) : appHealth === undefined ? (
          <EmptyState title="Loading app health" body="Checking feature state across Convex." />
        ) : (
          <View style={styles.healthList}>
            {appHealth.features.map((row) => (
              <HealthRow key={row.feature} feature={row.feature} status={row.status} detail={row.detail} />
            ))}
          </View>
        )}

        <SectionTitle icon="git-branch-outline" title="Goal flow map" />
        <View style={styles.goalList}>
          {goalMap.map((item) => (
            <GoalRow
              key={item.route}
              route={item.route}
              purpose={item.purpose}
              action={item.action}
              exit={item.exit}
              status={item.status}
            />
          ))}
        </View>

        <SectionTitle icon="server-outline" title="Runtime configuration" />
        <View style={styles.diagnosticsPanel}>
          <DiagnosticRow label="convex" value={convexUrl} />
          <DiagnosticRow label="posthog" value={hasPosthogConfig() ? posthogHost : 'not configured'} />
          <DiagnosticRow label="adapty" value={IS_ADAPTY_CONFIGURED ? 'configured' : 'not configured'} />
          <DiagnosticRow label="pro access" value={PRO_ACCESS_LEVEL_ID} />
          <DiagnosticRow label="paywall" value={PAYWALL_PLACEMENT_ID} />
          <DiagnosticRow label="force pro" value={FORCE_PRO_FOR_TESTING ? 'enabled' : 'disabled'} />
        </View>

        <SectionTitle icon="podium-outline" title="Rank profile diagnostics" />
        {auth.status !== 'signedIn' ? (
          <EmptyState title="Sign in required" body="Rank diagnostics require an authenticated backend user." />
        ) : leaderboardDebug === undefined ? (
          <EmptyState title="Loading rank diagnostics" body="Reading profile, country, and leaderboard state from Convex." />
        ) : (
          <View style={styles.diagnosticsPanel}>
            <DiagnosticRow label="client user" value={clientUserId} />
            <DiagnosticRow label="local country" value={`${localUser.countryCode} · ${localUser.countryName}`} />
            <DiagnosticRow
              label="backend country"
              value={remoteUser ? `${remoteUser.countryCode} · ${remoteUser.countryName}` : 'missing'}
            />
            <DiagnosticRow label="query country" value={leaderboardDebug.selectedCountryCode} />
            <DiagnosticRow label="app user" value={leaderboardDebug.appUserFound ? 'found' : 'missing'} />
            <DiagnosticRow label="country users" value={String(leaderboardDebug.selectedCountryProfilesCount)} />
            <DiagnosticRow label="auth profiles" value={String(leaderboardDebug.authProfilesCount)} />
            <DiagnosticRow
              label="you in country"
              value={leaderboardDebug.currentUserInSelectedCountry ? 'yes' : 'no'}
            />
          </View>
        )}

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

function HealthRow({ feature, status, detail }: { feature: string; status: string; detail: string }) {
  return (
    <View style={styles.healthRow}>
      <View style={[styles.statusDot, { backgroundColor: statusColor(status) }]} />
      <View style={styles.healthCopy}>
        <View style={styles.healthTitleRow}>
          <Text style={styles.healthTitle}>{feature}</Text>
          <Text style={[styles.healthStatus, { color: statusColor(status) }]}>{status.toUpperCase()}</Text>
        </View>
        <Text style={styles.healthDetail}>{detail}</Text>
      </View>
    </View>
  );
}

function GoalRow({
  route,
  purpose,
  action,
  exit,
  status,
}: {
  route: string;
  purpose: string;
  action: string;
  exit: string;
  status: string;
}) {
  return (
    <View style={styles.goalRow}>
      <View style={styles.healthTitleRow}>
        <Text style={styles.healthTitle}>{route}</Text>
        <Text style={[styles.healthStatus, { color: statusColor(status) }]}>{status.toUpperCase()}</Text>
      </View>
      <Text style={styles.healthDetail}>{purpose}</Text>
      <Text style={styles.goalMeta}>Action: {action}</Text>
      <Text style={styles.goalMeta}>Exit: {exit}</Text>
    </View>
  );
}

function DiagnosticRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.diagnosticRow}>
      <Text style={styles.diagnosticLabel}>{label}</Text>
      <Text style={styles.diagnosticValue} numberOfLines={2}>{value}</Text>
    </View>
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

function statusColor(status: string) {
  if (status === 'pass') return '#3DDC97';
  if (status === 'broken') return '#FF4D6D';
  return '#FFD166';
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
  healthList: {
    gap: spacing.sm,
  },
  healthRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing.md,
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginTop: 5,
  },
  healthCopy: {
    flex: 1,
    minWidth: 0,
  },
  healthTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  healthTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    flex: 1,
  },
  healthStatus: {
    ...typography.captionBold,
    fontSize: 10,
  },
  healthDetail: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  goalList: {
    gap: spacing.sm,
  },
  goalRow: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing.md,
  },
  goalMeta: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },
  diagnosticsPanel: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: spacing.md,
  },
  diagnosticRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  diagnosticLabel: {
    ...typography.captionBold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontSize: 10,
  },
  diagnosticValue: {
    ...typography.caption,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'right',
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
