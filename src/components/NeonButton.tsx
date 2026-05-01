import React from 'react';
import { Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { colors, typography, spacing, borderRadius, layout, shadows } from '../theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'white';

interface NeonButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const NeonButton: React.FC<NeonButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
  testID,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(0.98);
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      testID={testID}
      accessibilityLabel={testID ?? title}
      style={[
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'outline' && styles.buttonOutline,
        variant === 'white' && styles.buttonWhite,
        disabled && styles.buttonDisabled,
        animatedStyle,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          variant === 'primary' && styles.textPrimary,
          variant === 'secondary' && styles.textSecondary,
          variant === 'outline' && styles.textOutline,
          variant === 'white' && styles.textWhite,
          disabled && styles.textDisabled,
        ]}
      >
        {title}
      </Text>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    paddingVertical: spacing.mdSm,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: layout.hairline,
  },
  buttonPrimary: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    ...shadows.accent,
  },
  buttonSecondary: {
    backgroundColor: colors.cardSecondary,
    borderColor: colors.border,
  },
  buttonOutline: {
    backgroundColor: colors.backgroundElevated,
    borderColor: colors.border,
  },
  buttonWhite: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  text: {
    ...typography.bodyBold,
  },
  textPrimary: {
    color: colors.accentContrast,
  },
  textSecondary: {
    color: colors.textPrimary,
  },
  textOutline: {
    color: colors.textPrimary,
  },
  textWhite: {
    color: colors.background,
  },
  textDisabled: {
    color: colors.textMuted,
  },
});

export default NeonButton;
