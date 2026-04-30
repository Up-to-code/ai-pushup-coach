import React from 'react';
import { View, Text, StyleSheet, Pressable, ImageBackground } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../theme';
import { Challenge } from '../data';
import { useResponsive } from '../hooks';

interface ChallengeCardProps {
  challenge: Challenge;
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const ChallengeCard: React.FC<ChallengeCardProps> = ({
  challenge,
  onPress,
}) => {
  const { normalize } = useResponsive();
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  
  const handlePressIn = () => {
    scale.value = withSpring(0.97);
  };
  
  const handlePressOut = () => {
    scale.value = withSpring(1);
  };
  
  const progress = challenge.goal 
    ? Math.min(1, (challenge.progress || 0) / challenge.goal)
    : 0;
  
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.card, animatedStyle]}
    >
      <ImageBackground 
        source={require('../../assets/images/home_bg.png')} 
        style={styles.cardBg}
        imageStyle={{ opacity: 0.25 }}
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="body" size={normalize(20)} color={colors.accent} />
          </View>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{challenge.category.toUpperCase()}</Text>
          </View>
        </View>
        
        <View style={styles.content}>
          <Text style={styles.title}>{challenge.title}</Text>
          <Text style={styles.description} numberOfLines={2}>
            {challenge.description}
          </Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.progressSection}>
            <View style={styles.progressInfo}>
              <Text style={styles.progressLabel}>PROGRESS</Text>
              <Text style={styles.progressValue}>
                {challenge.progress || 0}/{challenge.goal}
              </Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${progress * 100}%` }]} />
            </View>
          </View>
          
          <View style={styles.rewardSection}>
            <Ionicons name="trophy" size={14} color={colors.accent} />
            <Text style={styles.rewardText}>{challenge.rewards[0]}</Text>
          </View>
        </View>
      </ImageBackground>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardSecondary,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardBg: {
    padding: spacing.md,
    minHeight: 160,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(218, 63, 69, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  categoryText: {
    ...typography.captionBold,
    color: colors.textMuted,
    fontSize: 10,
    letterSpacing: 1,
  },
  content: {
    marginVertical: spacing.md,
  },
  title: {
    ...typography.titleMedium,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  description: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.lg,
  },
  progressSection: {
    flex: 1,
    gap: 8,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    ...typography.captionBold,
    color: colors.textMuted,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  progressValue: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 11,
  },
  track: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  rewardSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(218, 63, 69, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rewardText: {
    ...typography.captionBold,
    color: colors.accent,
    fontSize: 12,
  },
});

export default ChallengeCard;
