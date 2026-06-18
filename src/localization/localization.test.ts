import { describe, expect, it } from 'vitest';
import { en, translations } from './translations';
import { normalizeLocale, supportedLanguages, translate } from './core';

describe('localization', () => {
  it('normalizes locale variants with safe fallbacks', () => {
    expect(normalizeLocale('pt-BR')).toBe('pt-BR');
    expect(normalizeLocale('pt-PT')).toBe('pt-PT');
    expect(normalizeLocale('de-CH')).toBe('de');
    expect(normalizeLocale('fr-CH')).toBe('fr');
    expect(normalizeLocale('ja-JP')).toBe('ja');
    expect(normalizeLocale('zh-TW')).toBe('zh-Hant');
    expect(normalizeLocale('nb-NO')).toBe('nb');
    expect(normalizeLocale('zz-ZZ')).toBe('en');
  });

  it('falls back to English text for unsupported locales and missing keys', () => {
    expect(translate('tabs.plan', undefined, normalizeLocale('zz-ZZ'))).toBe(en['tabs.plan']);
    expect(translate('settings.title', undefined, 'ar')).toBe(translations.ar['settings.title']);
  });

  it('keeps every locale complete against English keys', () => {
    const englishKeys = Object.keys(en).sort();
    for (const [locale, map] of Object.entries(translations)) {
      expect(Object.keys(map).sort(), locale).toEqual(englishKeys);
    }
  });

  it('offers requested country and high-income market languages in settings', () => {
    const locales = supportedLanguages.map((language) => language.locale);

    expect(locales).toEqual(expect.arrayContaining([
      'pt-BR',
      'pt-PT',
      'fr',
      'fr-CH',
      'de',
      'de-CH',
      'it-CH',
      'ja',
      'ko',
      'zh-Hant',
      'da',
      'nb',
      'fi',
      'nl',
      'sv',
    ]));
  });

  it('localizes first-time onboarding guide copy for supported locales', () => {
    const guideKeys = [
      'onboarding.guide.planTitle',
      'onboarding.guide.cameraTitle',
      'onboarding.guide.startTitle',
      'onboarding.guide.progressTitle',
    ] as const;

    for (const [locale, map] of Object.entries(translations)) {
      for (const key of guideKeys) {
        expect(map[key], `${locale}:${key}`).toBeTruthy();
      }
    }
    expect(translations.ar['onboarding.guide.planTitle']).not.toBe(en['onboarding.guide.planTitle']);
    expect(translations.fr['onboarding.guide.planTitle']).not.toBe(en['onboarding.guide.planTitle']);
    expect(translations.es['onboarding.guide.planTitle']).not.toBe(en['onboarding.guide.planTitle']);
  });

  it('interpolates translated params', () => {
    expect(translate('workout.setGuide', { current: 1, total: 3 }, 'en')).toBe('Set 1 of 3');
  });
});
