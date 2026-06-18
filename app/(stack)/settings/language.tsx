import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppLocale, supportedLanguages, type SupportedLocale } from '../../../src/localization';
import { useSettingsStore } from '../../../src/store';
import { borderRadius, colors, layout, spacing, typography } from '../../../src/theme';

type LanguageValue = 'system' | SupportedLocale;

export default function LanguageSettingsScreen() {
  const router = useRouter();
  const { t, languageLocale } = useAppLocale();
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const selected = (languageLocale || 'system') as LanguageValue;

  const selectLanguage = (languageLocale: LanguageValue) => {
    updateSettings({ languageLocale });
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{t('language.title')}</Text>
          <Text style={styles.subtitle}>{t('settings.languageSubtitle')}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LanguageRow
          active={selected === 'system'}
          icon="phone-portrait-outline"
          title={t('language.systemTitle')}
          subtitle={t('language.systemSubtitle')}
          onPress={() => selectLanguage('system')}
        />
        <View style={styles.divider} />
        {supportedLanguages.map((language, index) => (
          <React.Fragment key={language.locale}>
            <LanguageRow
              active={selected === language.locale}
              icon="language-outline"
              title={language.nativeName}
              subtitle={t(language.labelKey)}
              onPress={() => selectLanguage(language.locale)}
            />
            {index < supportedLanguages.length - 1 ? <View style={styles.divider} /> : null}
          </React.Fragment>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function LanguageRow({
  active,
  icon,
  title,
  subtitle,
  onPress,
}: {
  active: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={onPress}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={20} color={active ? colors.accent : colors.textSecondary} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={active ? colors.accent : colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    borderBottomWidth: layout.hairline,
    borderBottomColor: colors.borderLight,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { ...typography.titleMedium, color: colors.textPrimary },
  subtitle: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  row: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.mdSm,
  },
  rowPressed: { opacity: 0.7 },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundElevated,
  },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { ...typography.bodyBold, color: colors.textPrimary },
  rowSubtitle: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
  divider: {
    height: layout.hairline,
    backgroundColor: colors.borderLight,
    marginLeft: 58,
  },
});
