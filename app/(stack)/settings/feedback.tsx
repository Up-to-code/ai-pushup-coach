import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { useAuthenticatedBackendState, useClientUserId } from '../../../src/features/shared/currentUser';
import { colors, spacing, typography } from '../../../src/theme';

type FeedbackKind = 'feature' | 'bug';

type FeedbackRow = {
  _id: Id<'feedbackRequests'>;
  kind: FeedbackKind;
  title: string;
  details?: string;
  status: 'open' | 'planned' | 'done' | 'closed';
  voteCount: number;
  createdAt: number;
  voted: boolean;
  isMine: boolean;
};

export default function FeedbackScreen() {
  const router = useRouter();
  const clientUserId = useClientUserId();
  const { authLoading, canUseAuthenticatedBackend } = useAuthenticatedBackendState();
  const rows = useQuery(
    api.feedback.list,
    canUseAuthenticatedBackend ? { clientUserId, limit: 50 } : 'skip'
  );
  const submitFeedback = useMutation(api.feedback.submit);
  const setVote = useMutation(api.feedback.setVote);

  const [kind, setKind] = useState<FeedbackKind>('feature');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [busyVoteId, setBusyVoteId] = useState<string | null>(null);

  const feedbackRows = useMemo(
    () => [...((rows as FeedbackRow[] | undefined) ?? [])].sort((a, b) => b.voteCount - a.voteCount || b.createdAt - a.createdAt),
    [rows]
  );
  const loading = authLoading || (canUseAuthenticatedBackend && rows === undefined);

  const submit = async () => {
    const nextTitle = title.trim();
    const nextDetails = details.trim();
    if (!canUseAuthenticatedBackend) {
      Alert.alert('Sign in required', 'Sign in before sending a feature request or bug report.');
      return;
    }
    if (nextTitle.length < 6) {
      Alert.alert('Add a title', 'Use at least 6 characters so the request is clear.');
      return;
    }

    setSubmitting(true);
    try {
      await submitFeedback({
        clientUserId,
        kind,
        title: nextTitle,
        details: nextDetails || undefined,
      });
      setTitle('');
      setDetails('');
    } catch (error) {
      console.warn('Feedback submit failed', error);
      Alert.alert('Could not send feedback', error instanceof Error ? error.message : 'Please try again shortly.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleVote = async (request: FeedbackRow) => {
    if (!canUseAuthenticatedBackend || busyVoteId) return;
    setBusyVoteId(request._id);
    try {
      await setVote({
        clientUserId,
        requestId: request._id,
        voted: !request.voted,
      });
    } catch (error) {
      console.warn('Feedback vote failed', error);
      Alert.alert('Could not update vote', error instanceof Error ? error.message : 'Please try again shortly.');
    } finally {
      setBusyVoteId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Feature requests</Text>
          <Text style={styles.subtitle}>Report bugs and vote on what matters.</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {!canUseAuthenticatedBackend && !authLoading ? (
          <View style={styles.emptyPanel}>
            <Ionicons name="lock-closed-outline" size={28} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>Sign in to send feedback</Text>
            <Text style={styles.emptyBody}>Votes and requests are tied to your account so each person gets one vote per request.</Text>
          </View>
        ) : (
          <View style={styles.form}>
            <View style={styles.kindSwitch}>
              <KindButton active={kind === 'feature'} label="Feature" icon="sparkles-outline" onPress={() => setKind('feature')} />
              <KindButton active={kind === 'bug'} label="Bug" icon="bug-outline" onPress={() => setKind('bug')} />
            </View>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={kind === 'feature' ? 'What should be added?' : 'What is broken?'}
              placeholderTextColor={colors.textMuted}
              style={styles.titleInput}
              maxLength={120}
              editable={!submitting}
            />
            <TextInput
              value={details}
              onChangeText={setDetails}
              placeholder="Add useful details, steps, or expected behavior"
              placeholderTextColor={colors.textMuted}
              style={styles.detailsInput}
              maxLength={1200}
              editable={!submitting}
              multiline
              textAlignVertical="top"
            />
            <Pressable
              style={({ pressed }) => [styles.submitButton, pressed && styles.buttonPressed, submitting && styles.disabled]}
              onPress={submit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.accentContrast} />
              ) : (
                <>
                  <Ionicons name="send-outline" size={17} color={colors.accentContrast} />
                  <Text style={styles.submitText}>Send</Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        <View style={styles.sectionTitleRow}>
          <Ionicons name="chatbubbles-outline" size={17} color={colors.textSecondary} />
          <Text style={styles.sectionTitle}>Community asks</Text>
        </View>

        {loading ? (
          <View style={styles.emptyPanel}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.emptyBody}>Loading requests...</Text>
          </View>
        ) : feedbackRows.length ? (
          <View style={styles.requestList}>
            {feedbackRows.map((request) => (
              <FeedbackCard
                key={request._id}
                request={request}
                busy={busyVoteId === request._id}
                onVote={() => toggleVote(request)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyPanel}>
            <Ionicons name="chatbox-ellipses-outline" size={28} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No requests yet</Text>
            <Text style={styles.emptyBody}>Start with one focused idea or bug report.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function KindButton({
  active,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.kindButton, active && styles.kindButtonActive]} onPress={onPress}>
      <Ionicons name={icon} size={16} color={active ? colors.accentContrast : colors.textSecondary} />
      <Text style={[styles.kindText, active && styles.kindTextActive]}>{label}</Text>
    </Pressable>
  );
}

function FeedbackCard({
  request,
  busy,
  onVote,
}: {
  request: FeedbackRow;
  busy: boolean;
  onVote: () => void;
}) {
  const statusColor = request.status === 'done'
    ? colors.success
    : request.status === 'planned'
    ? colors.info
    : request.status === 'closed'
    ? colors.textMuted
    : colors.accent;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardCopy}>
          <View style={styles.metaRow}>
            <Text style={styles.kindLabel}>{request.kind === 'feature' ? 'Feature' : 'Bug'}</Text>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={styles.statusLabel}>{request.status}</Text>
            {request.isMine ? <Text style={styles.mineLabel}>Mine</Text> : null}
          </View>
          <Text style={styles.requestTitle}>{request.title}</Text>
        </View>
        <Pressable
          style={[styles.voteButton, request.voted && styles.voteButtonActive]}
          disabled={busy}
          onPress={onVote}
        >
          {busy ? (
            <ActivityIndicator size="small" color={request.voted ? colors.accentContrast : colors.accent} />
          ) : (
            <Ionicons
              name={request.voted ? 'arrow-up-circle' : 'arrow-up-circle-outline'}
              size={18}
              color={request.voted ? colors.accentContrast : colors.accent}
            />
          )}
          <Text style={[styles.voteText, request.voted && styles.voteTextActive]}>{request.voteCount}</Text>
        </Pressable>
      </View>
      {request.details ? <Text style={styles.detailsText}>{request.details}</Text> : null}
    </View>
  );
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
  form: {
    gap: spacing.sm,
  },
  kindSwitch: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: 4,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  kindButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  kindButtonActive: {
    backgroundColor: colors.accent,
  },
  kindText: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  kindTextActive: {
    color: colors.accentContrast,
  },
  titleInput: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  detailsInput: {
    minHeight: 112,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.card,
    padding: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  submitButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  submitText: {
    ...typography.bodyBold,
    color: colors.accentContrast,
  },
  buttonPressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.55,
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
  requestList: {
    gap: spacing.sm,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.card,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTop: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  cardCopy: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 7,
  },
  kindLabel: {
    ...typography.captionBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  mineLabel: {
    ...typography.captionBold,
    color: colors.accent,
  },
  requestTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  detailsText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  voteButton: {
    minWidth: 58,
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderAccent,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  voteButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  voteText: {
    ...typography.captionBold,
    color: colors.accent,
  },
  voteTextActive: {
    color: colors.accentContrast,
  },
  emptyPanel: {
    minHeight: 124,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.xs,
  },
  emptyTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptyBody: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
