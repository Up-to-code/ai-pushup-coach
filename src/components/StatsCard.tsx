import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { colors, typography, spacing, borderRadius, layout, shadows } from '../theme';
import { MonthlyStat } from '../data';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  showChart?: boolean;
  chartData?: MonthlyStat[];
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  showChart = false,
  chartData = [],
}) => {
  const chartHeight = 80;
  const chartWidth = 200;
  
  const maxValue = chartData.length > 0 
    ? Math.max(...chartData.map(d => d.pushups)) 
    : 1;
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {icon && <Text style={styles.icon}>{icon}</Text>}
      </View>
      <Text style={styles.value}>{value}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      
      {showChart && chartData.length > 0 && (
        <View style={styles.chartContainer}>
          <Svg width={chartWidth} height={chartHeight}>
            {chartData.map((item, index) => {
              const barHeight = (item.pushups / maxValue) * (chartHeight - 20);
              const barWidth = (chartWidth - 40) / chartData.length - 8;
              const x = 20 + index * ((chartWidth - 40) / chartData.length);
              const y = chartHeight - barHeight - 20;
              
              return (
                <React.Fragment key={item.month}>
                  <Rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    fill={colors.accent}
                    rx={4}
                  />
                  <SvgText
                    x={x + barWidth / 2}
                    y={chartHeight - 4}
                    fill={colors.textMuted}
                    fontSize={10}
                    textAnchor="middle"
                  >
                    {item.month}
                  </SvgText>
                </React.Fragment>
              );
            })}
          </Svg>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...typography.label,
    color: colors.textMuted,
  },
  icon: {
    fontSize: 16,
  },
  value: {
    ...typography.title,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  chartContainer: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
});

export default StatsCard;
