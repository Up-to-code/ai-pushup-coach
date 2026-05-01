import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSocialInbox } from '../../src/features/notifications/hooks';
import { borderRadius, colors, spacing, typography } from '../../src/theme';

export default function NotificationsScreen() {
  const router = useRouter();
  const { inbox, loading, markRead, markAllRead, followBack } = useSocialInbox(75);
  const followRequests = inbox?.items.filter((item) => item.actorFollowsYou && !item.youFollowActor) ?? [];
  const friendships = inbox?.items.filter((item) => item.isFriend) ?? [];
  const updates =
    inbox?.items.filter((item) => !(item.actorFollowsYou && !item.youFollowActor) && !item.isFriend) ?? [];
  const hasItems = followRequests.length + friendships.length + updates.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable style={styles.iconButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>{inbox?.unreadCount ?? 0} unread</Text>
        </View>
        <Pressable style={styles.markButton} onPress={() => markAllRead().catch(() => undefined)}>
          <Text style={styles.markText}>Read all</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.stateText}>Loading your inbox...</Text>
          </View>
        ) : hasItems ? (
          <>
            {followRequests.length > 0 ? (
              <NotificationSection title="Follow Requests" count={followRequests.length}>
                {followRequests.map((item) => (
                  <NotificationRow
                    key={item._id}
                    item={item}
                    onOpen={() => {
                      void markRead(item._id).catch(() => undefined);
                      if (item.actor?.clientUserId) {
                        router.push(`/(stack)/user/${item.actor.clientUserId}` as any);
                      }
                    }}
                    onFollowBack={() => followBack(item._id).catch((error) => console.warn('Follow back failed', error))}
                  />
                ))}
              </NotificationSection>
            ) : null}

            {friendships.length > 0 ? (
              <NotificationSection title="Friends" count={friendships.length}>
                {friendships.map((item) => (
                  <NotificationRow
                    key={item._id}
                    item={item}
                    onOpen={() => {
                      void markRead(item._id).catch(() => undefined);
                      if (item.actor?.clientUserId) {
                        router.push(`/(stack)/user/${item.actor.clientUserId}` as any);
                      }
                    }}
                    onFollowBack={() => followBack(item._id).catch((error) => console.warn('Follow back failed', error))}
                  />
                ))}
              </NotificationSection>
            ) : null}

            {updates.length > 0 ? (
              <NotificationSection title="Updates" count={updates.length}>
                {updates.map((item) => (
                  <NotificationRow
                    key={item._id}
                    item={item}
                    onOpen={() => {
                      void markRead(item._id).catch(() => undefined);
                      if (item.actor?.clientUserId) {
                        router.push(`/(stack)/user/${item.actor.clientUserId}` as any);
                      }
                    }}
                    onFollowBack={() => followBack(item._id).catch((error) => console.warn('Follow back failed', error))}
                  />
                ))}
              </NotificationSection>
            ) : null}
          </>
        ) : (
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>Quiet for now</Text>
            <Text style={styles.stateText}>Follows, challenges, and comparison moments will land here.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function NotificationSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionCount}>{count}</Text>
      </View>
      <View style={styles.sectionRows}>{children}</View>
    </View>
  );
}

function NotificationRow({
  item,
  onOpen,
  onFollowBack,
}: {
  item: NonNullable<ReturnType<typeof useSocialInbox>['inbox']>['items'][number];
  onOpen: () => void;
  onFollowBack: () => void;
}) {
  const actorId = item.actor?.clientUserId ?? '';
  const unread = !item.readAt;
  const canFollowBack = item.actorFollowsYou && !item.youFollowActor && Boolean(actorId);
  const isFriendship = item.isFriend;
  const iconName = isFriendship ? 'people' : item.actorFollowsYou ? 'person-add' : 'notifications-outline';
  const title = isFriendship ? 'Friends' : item.title;
  const body = isFriendship && item.actor?.name
    ? `${item.actor.name} and you follow each other.`
    : item.body;

  return (
    <Pressable style={({ pressed }) => [styles.row, unread && styles.rowUnread, pressed && styles.rowPressed]} onPress={onOpen}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{(item.actor?.name ?? title).slice(0, 1).toUpperCase()}</Text>
        <View style={[styles.avatarBadge, isFriendship && styles.avatarBadgeSuccess]}>
          <Ionicons name={iconName} size={10} color={colors.textInverse} />
        </View>
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowBody}>{body}</Text>
      </View>
      {canFollowBack ? (
        <Pressable
          style={styles.followBackButton}
          onPress={onFollowBack}
        >
          <Text style={styles.followBackText}>Follow back</Text>
        </Pressable>
      ) : isFriendship ? (
        <View style={styles.friendsPill}>
          <Ionicons name="people" size={14} color={colors.textInverse} />
          <Text style={styles.friendsPillText}>Friends</Text>
        </View>
      ) : (
        <Ionicons name={unread ? 'ellipse' : 'chevron-forward'} size={unread ? 9 : 18} color={colors.accent} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1 },
  title: { ...typography.titleMedium, color: colors.textPrimary },
  subtitle: { ...typography.caption, color: colors.textSecondary },
  markButton: {
    minHeight: 34,
    borderRadius: 17,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  markText: { ...typography.captionBold, color: colors.textPrimary },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  section: { gap: spacing.sm },
  sectionHeader: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { ...typography.label, color: colors.textSecondary },
  sectionCount: {
    ...typography.captionBold,
    color: colors.textPrimary,
    minWidth: 24,
    minHeight: 24,
    borderRadius: 12,
    backgroundColor: colors.cardSecondary,
    textAlign: 'center',
    lineHeight: 24,
    overflow: 'hidden',
  },
  sectionRows: { gap: spacing.sm },
  row: {
    minHeight: 76,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowUnread: { borderColor: colors.borderAccent, backgroundColor: colors.cardSecondary },
  rowPressed: { opacity: 0.72 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...typography.bodyBold, color: colors.textPrimary },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadgeSuccess: { backgroundColor: colors.success },
  rowCopy: { flex: 1, minWidth: 0, gap: 2 },
  rowTitle: { ...typography.bodyBold, color: colors.textPrimary },
  rowBody: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
  followBackButton: {
    minHeight: 32,
    borderRadius: 16,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followBackText: { ...typography.captionBold, color: colors.textInverse },
  friendsPill: {
    minHeight: 32,
    borderRadius: 16,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  friendsPillText: { ...typography.captionBold, color: colors.textInverse },
  stateBox: {
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  stateTitle: { ...typography.bodyBold, color: colors.textPrimary },
  stateText: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', lineHeight: 18 },
});
