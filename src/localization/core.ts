import { en, translations, type TranslationKey } from './translations';

export type SupportedLocale = keyof typeof translations;

export type LanguageOption = {
  locale: SupportedLocale;
  nativeName: string;
  labelKey: TranslationKey;
};

export const supportedLanguages: LanguageOption[] = [
  { locale: 'en', nativeName: 'English', labelKey: 'language.english' },
  { locale: 'ar', nativeName: 'العربية', labelKey: 'language.arabic' },
  { locale: 'fr', nativeName: 'Français', labelKey: 'language.french' },
  { locale: 'fr-CH', nativeName: 'Français (Suisse)', labelKey: 'language.frenchSwitzerland' },
  { locale: 'de', nativeName: 'Deutsch', labelKey: 'language.german' },
  { locale: 'de-CH', nativeName: 'Deutsch (Schweiz)', labelKey: 'language.germanSwitzerland' },
  { locale: 'it', nativeName: 'Italiano', labelKey: 'language.italian' },
  { locale: 'it-CH', nativeName: 'Italiano (Svizzera)', labelKey: 'language.italianSwitzerland' },
  { locale: 'es', nativeName: 'Español', labelKey: 'language.spanish' },
  { locale: 'pt-BR', nativeName: 'Português (Brasil)', labelKey: 'language.portugueseBrazil' },
  { locale: 'pt-PT', nativeName: 'Português (Portugal)', labelKey: 'language.portuguesePortugal' },
  { locale: 'ja', nativeName: '日本語', labelKey: 'language.japanese' },
  { locale: 'ko', nativeName: '한국어', labelKey: 'language.korean' },
  { locale: 'zh-Hant', nativeName: '繁體中文', labelKey: 'language.chineseTraditional' },
  { locale: 'nl', nativeName: 'Nederlands', labelKey: 'language.dutch' },
  { locale: 'da', nativeName: 'Dansk', labelKey: 'language.danish' },
  { locale: 'nb', nativeName: 'Norsk', labelKey: 'language.norwegian' },
  { locale: 'fi', nativeName: 'Suomi', labelKey: 'language.finnish' },
  { locale: 'pl', nativeName: 'Polski', labelKey: 'language.polish' },
  { locale: 'sv', nativeName: 'Svenska', labelKey: 'language.swedish' },
];

const aliases: Record<string, SupportedLocale> = {
  pt: 'pt-BR',
  'pt-BR': 'pt-BR',
  'pt-PT': 'pt-PT',
  'de-CH': 'de',
  'fr-CH': 'fr',
  'it-CH': 'it',
  'es-419': 'es',
  ja: 'ja',
  jp: 'ja',
  ko: 'ko',
  kr: 'ko',
  zh: 'zh-Hant',
  'zh-HK': 'zh-Hant',
  'zh-MO': 'zh-Hant',
  'zh-TW': 'zh-Hant',
  no: 'nb',
  'nb-NO': 'nb',
  da: 'da',
  'da-DK': 'da',
  fi: 'fi',
  'fi-FI': 'fi',
};

export function normalizeLocale(locale?: string | null): SupportedLocale {
  if (!locale) return 'en';
  const normalized = locale.replace('_', '-');
  if (normalized in aliases) return aliases[normalized];
  if (normalized in translations) return normalized as SupportedLocale;
  const base = normalized.split('-')[0];
  if (base in aliases) return aliases[base];
  if (base in translations) return base as SupportedLocale;
  return 'en';
}

export function isRtlLocale(locale: SupportedLocale) {
  return locale === 'ar';
}

export function interpolate(template: string, params?: Record<string, string | number>) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => String(params[key] ?? match));
}

export function translate(
  key: TranslationKey,
  params?: Record<string, string | number>,
  locale: SupportedLocale = 'en'
) {
  const value = translations[locale]?.[key] ?? en[key] ?? key;
  return interpolate(value, params);
}
