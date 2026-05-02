import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSocialInbox } from '../../src/features/notifications/hooks';
import { borderRadius, colors, spacing, typography } from '../../src/theme';

export default function NotificationsScreen() {
  const router = useRouter();
  const { inbox, loading, markRead, markAllRead, followBack } =
    useSocialInbox(75);

  const followRequests =
    inbox?.items.filter(
      (item) => item.actorFollowsYou && !item.youFollowActor
    ) ?? [];
  const friendships =
    inbox?.items.filter((item) => item.isFriend) ?? [];
  const updates =
    inbox?.items.filter(
      (item) => !(item.actorFollowsYou && !item.youFollowActor) && !item.isFriend
    ) ?? [];
  const hasItems =
    followRequests.length + friendships.length + updates.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>

        <View style={styles.headerCopy}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>
            {inbox?.unreadCount ?? 0} unread
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.markButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => markAllRead().catch(() => undefined)}
        >
          <Text style={styles.markText}>Read all</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.stateText}>Loading your inbox…</Text>
          </View>
        ) : hasItems ? (
          <>
            {followRequests.length > 0 && (
              <NotificationSection
                title="Follow Requests"
                count={followRequests.length}
              >
                {followRequests.map((item) => (
                  <NotificationRow
                    key={item._id}
                    item={item}
                    onOpen={() => {
                      void markRead(item._id).catch(() => undefined);
                      if (item.actor?.clientUserId) {
                        router.push(
                          `/user/${item.actor.clientUserId}` as any
                        );
                      }
                    }}
                    onFollowBack={() =>
                      followBack(item._id).catch((error) =>
                        console.warn('Follow back failed', error)
                      )
                    }
                  />
                ))}
              </NotificationSection>
            )}

            {friendships.length > 0 && (
              <NotificationSection
                title="Friends"
                count={friendships.length}
              >
                {friendships.map((item) => (
                  <NotificationRow
                    key={item._id}
                    item={item}
                    onOpen={() => {
                      void markRead(item._id).catch(() => undefined);
                      if (item.actor?.clientUserId) {
                        router.push(
                          `/user/${item.actor.clientUserId}` as any
                        );
                      }
                    }}
                    onFollowBack={() =>
                      followBack(item._id).catch((error) =>
                        console.warn('Follow back failed', error)
                      )
                    }
                  />
                ))}
              </NotificationSection>
            )}

            {updates.length > 0 && (
              <NotificationSection title="Updates" count={updates.length}>
                {updates.map((item) => (
                  <NotificationRow
                    key={item._id}
                    item={item}
                    onOpen={() => {
                      void markRead(item._id).catch(() => undefined);
                      if (item.actor?.clientUserId) {
                        router.push(
                          `/user/${item.actor.clientUserId}` as any
                        );
                      }
                    }}
                    onFollowBack={() =>
                      followBack(item._id).catch((error) =>
                        console.warn('Follow back failed', error)
                      )
                    }
                  />
                ))}
              </NotificationSection>
            )}
          </>
        ) : (
          <View style={styles.stateBox}>
            <Ionicons
              name="notifications-off-outline"
              size={48}
              color={colors.textSecondary}
            />
            <Text style={styles.stateTitle}>Quiet for now</Text>
            <Text style={styles.stateText}>
              Follows, challenges, and comparison moments will land here.
            </Text>
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
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{count}</Text>
        </View>
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
  item: NonNullable<
    ReturnType<typeof useSocialInbox>['inbox']
  >['items'][number];
  onOpen: () => void;
  onFollowBack: () => void;
}) {
  const actorId = item.actor?.clientUserId ?? '';
  const unread = !item.readAt;
  const canFollowBack =
    item.actorFollowsYou && !item.youFollowActor && Boolean(actorId);
  const isFriendship = item.isFriend;
  const iconName = isFriendship
    ? 'people'
    : item.actorFollowsYou
    ? 'person-add'
    : 'notifications-outline';
  const title = isFriendship ? 'Friends' : item.title;
  const body =
    isFriendship && item.actor?.name
      ? `${item.actor.name} and you follow each other.`
      : item.body;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        unread && styles.rowUnread,
        pressed && styles.rowPressed,
      ]}
      onPress={onOpen}
    >
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(item.actor?.name ?? title).slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View
          style={[
            styles.avatarBadge,
            isFriendship && styles.avatarBadgeSuccess,
          ]}
        >
          <Ionicons name={iconName} size={10} color="#fff" />
        </View>
      </View>

      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.rowBody} numberOfLines={2}>
          {body}
        </Text>
      </View>

      {canFollowBack ? (
        <Pressable
          style={({ pressed }) => [
            styles.followBackButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={onFollowBack}
        >
          <Text style={styles.followBackText}>Follow back</Text>
        </Pressable>
      ) : isFriendship ? (
        <View style={styles.friendsPill}>
          <Ionicons name="people" size={14} color="#fff" />
          <Text style={styles.friendsPillText}>Friends</Text>
        </View>
      ) : (
        <View style={styles.unreadIndicator}>
          {unread && <View style={styles.unreadDot} />}
          {!unread && (
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textSecondary}
            />
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  buttonPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.8,
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 2,
  },
  markButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  markText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 48,
    gap: 28,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  countBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.cardSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  countText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sectionRows: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  rowUnread: {
    backgroundColor: '#F8F9FF', // subtle accent tint
    shadowOpacity: 0.06,
  },
  rowPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.92,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.backgroundElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.card,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  avatarBadge: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    borderWidth: 2.5,
    borderColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadgeSuccess: {
    backgroundColor: colors.success,
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  rowBody: {
    fontSize: 14,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  followBackButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  followBackText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  friendsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  friendsPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  unreadIndicator: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  stateBox: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 8,
  },
  stateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});