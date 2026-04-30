import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, layout } from '../theme';

interface MetricRowProps {
  label: string;
  value: string | number;
  icon?: string;
}

export const MetricRow: React.FC<MetricRowProps> = ({ label, value, icon }) => {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {icon && <Text style={styles.icon}>{icon}</Text>}
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: layout.hairline,
    borderBottomColor: colors.borderLight,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: {
    fontSize: 20,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  value: {
    ...typography.headlineMedium,
    color: colors.textPrimary,
  },
});

export default MetricRow;
