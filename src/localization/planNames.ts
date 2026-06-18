import type { TranslationKey } from './translations';

type Translator = (key: TranslationKey, params?: Record<string, string | number>) => string;

const PLAN_NAME_KEYS: Record<string, TranslationKey> = {
  'First 25 Clean Pushups': 'plan.first25CleanPushups',
  'Road to 50 Pushups': 'plan.road50Pushups',
  'Road to 100 Pushups': 'plan.road100Pushups',
};

export function localizePlanName(name: string, t: Translator) {
  const key = PLAN_NAME_KEYS[name];
  return key ? t(key) : name;
}
