import { I18nManager } from 'react-native';
import * as Localization from 'expo-localization';
import { isRtlLocale, normalizeLocale, translate, type SupportedLocale } from './core';
import type { TranslationKey } from './translations';
import { useSettingsStore } from '../store';

export function getDeviceLocale(): SupportedLocale {
  const locales = Localization.getLocales();
  return normalizeLocale(locales[0]?.languageTag);
}

export function resolveAppLocale(languageLocale?: string | null): SupportedLocale {
  return !languageLocale || languageLocale === 'system'
    ? getDeviceLocale()
    : normalizeLocale(languageLocale);
}

export const t = (key: TranslationKey, params?: Record<string, string | number>) =>
  translate(key, params, getDeviceLocale());

export function useAppLocale() {
  const languageLocale = useSettingsStore((state) => state.settings.languageLocale);
  const locale = resolveAppLocale(languageLocale);
  return {
    locale,
    languageLocale,
    isRTL: isRtlLocale(locale) || I18nManager.isRTL,
    t: (key: TranslationKey, params?: Record<string, string | number>) => translate(key, params, locale),
  };
}

export type { TranslationKey } from './translations';
export { isRtlLocale, normalizeLocale, supportedLanguages, translate } from './core';
export type { SupportedLocale };
