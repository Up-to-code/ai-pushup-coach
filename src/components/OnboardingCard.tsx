import React from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingCardProps {
  title: string;
  description: string;
  image?: string;
  index: number;
  total: number;
}

export const OnboardingCard: React.FC<OnboardingCardProps> = ({
  title,
  description,
  image,
  index,
  total,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.imageContainer}>
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imageIcon}>{image || '📱'}</Text>
        </View>
      </View>
      
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      
      <View style={styles.pagination}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === index && styles.dotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: SCREEN_WIDTH,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    marginBottom: spacing.xl,
  },
  imagePlaceholder: {
    width: 200,
    height: 280,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageIcon: {
    fontSize: 80,
  },
  title: {
    ...typography.titleLarge,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  pagination: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textMuted,
  },
  dotActive: {
    backgroundColor: colors.accent,
    width: 24,
  },
});

export default OnboardingCard;