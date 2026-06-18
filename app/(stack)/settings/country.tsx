import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COUNTRY_OPTIONS, getFlagEmoji, type CountryOption } from '../../../src/data/countries';
import { useSaveBackendProfile } from '../../../src/backend';
import { useAppLocale } from '../../../src/localization';
import { useUserStore } from '../../../src/store';
import { borderRadius, colors, layout, spacing, typography } from '../../../src/theme';

export default function CountrySettingsScreen() {
  const router = useRouter();
  const { locale, t } = useAppLocale();
  const { user, updateUser } = useUserStore();
  const saveBackendProfile = useSaveBackendProfile();
  const [query, setQuery] = useState('');
  const [savingCode, setSavingCode] = useState<string | null>(null);

  const filteredCountries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return COUNTRY_OPTIONS;
    return COUNTRY_OPTIONS.filter((country) => {
      const localizedName = getLocalizedCountryName(country, locale, t('country.globalEarth'));
      return (
        country.name.toLowerCase().includes(normalizedQuery) ||
        localizedName.toLowerCase().includes(normalizedQuery) ||
        country.code.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [locale, query, t]);

  const selectCountry = async (country: CountryOption) => {
    if (savingCode) return;
    const nextUser = {
      ...user,
      countryCode: country.code,
      countryName: country.name,
    };
    updateUser(nextUser);
    setSavingCode(country.code);
    try {
      await saveBackendProfile(nextUser);
      router.back();
    } catch (error) {
      console.warn('Country profile save failed', error);
    } finally {
      setSavingCode(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>{t('country.title')}</Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={t('country.search')}
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
        />
        {query ? (
          <Pressable style={styles.clearButton} onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <FlatList
        data={filteredCountries}
        keyExtractor={(item) => item.code}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
        renderItem={({ item }) => {
          const active = user.countryCode === item.code;
          const countryName = getLocalizedCountryName(item, locale, t('country.globalEarth'));
          return (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => void selectCountry(item)}
              disabled={Boolean(savingCode)}
            >
              <View style={styles.countryCopy}>
                <Text style={styles.flagIcon}>{getFlagEmoji(item.code)}</Text>
                <View style={styles.countryText}>
                  <Text style={styles.countryName}>{countryName}</Text>
                </View>
              </View>
              {savingCode === item.code ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <Ionicons
                  name={active ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={active ? colors.accent : colors.textMuted}
                />
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{t('country.emptyTitle')}</Text>
            <Text style={styles.emptyText}>{t('country.emptyBody')}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function getLocalizedCountryName(country: CountryOption, locale: string, globalLabel: string) {
  if (country.code === 'GLOBAL') return globalLabel;
  try {
    const DisplayNames = (Intl as typeof Intl & {
      DisplayNames?: new (locales: string[], options: { type: 'region' }) => { of: (code: string) => string | undefined };
    }).DisplayNames;
    return DisplayNames ? new DisplayNames([locale], { type: 'region' }).of(country.code) ?? country.name : country.name;
  } catch {
    return country.name;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    minHeight: 50,
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
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.titleMedium, color: colors.textPrimary },
  searchWrap: {
    minHeight: 46,
    margin: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    minHeight: 44,
    ...typography.body,
    color: colors.textPrimary,
    padding: 0,
  },
  clearButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    marginHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  row: {
    minHeight: 58,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  rowPressed: { backgroundColor: colors.cardSecondary },
  countryCopy: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  flagIcon: {
    fontSize: 26,
    width: 38,
    textAlign: 'center',
  },
  countryText: { flex: 1, minWidth: 0 },
  countryName: { ...typography.body, color: colors.textPrimary },
  divider: { height: 1, backgroundColor: colors.borderLight, marginLeft: spacing.md },
  empty: { padding: spacing.xl, alignItems: 'center', gap: spacing.xs },
  emptyTitle: { ...typography.bodyBold, color: colors.textPrimary },
  emptyText: { ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center' },
});
