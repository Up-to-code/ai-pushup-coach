import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackHeader } from '../../../src/components';
import { useAppLocale, type TranslationKey } from '../../../src/localization';
import { colors, spacing, typography } from '../../../src/theme';

const sections: Array<{ title: TranslationKey; body: TranslationKey }> = [
  {
    title: 'legal.cameraAccessTitle',
    body: 'legal.cameraAccessBody',
  },
  {
    title: 'legal.workoutTelemetryTitle',
    body: 'legal.workoutTelemetryBody',
  },
  {
    title: 'legal.localRemindersTitle',
    body: 'legal.localRemindersBody',
  },
  {
    title: 'legal.releaseChecklistTitle',
    body: 'legal.releaseChecklistBody',
  },
];

export default function DataCameraScreen() {
  const router = useRouter();
  const { t } = useAppLocale();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <StackHeader
          eyebrow={t('legal.productSafety')}
          title={t('legal.cameraTitle')}
          subtitle={t('legal.cameraSubtitle')}
          onBack={() => router.back()}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section, index) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.title}>{t(section.title)}</Text>
            <Text style={styles.body}>{t(section.body)}</Text>
            {index < sections.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  section: {
    gap: spacing.xs,
  },
  title: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
    fontSize: 15,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginTop: spacing.md,
  },
});
