import { describe, expect, it } from 'vitest';
import { buildOnboardingStepIds, firstTimeGuideStepIds } from './steps';

describe('onboarding step order', () => {
  it('includes first-time guide steps before plan setup', () => {
    expect(buildOnboardingStepIds({ isRebuildMode: false })).toEqual([
      'landing',
      ...firstTimeGuideStepIds,
      'base',
      'ritual',
      'ready',
    ]);
  });

  it('skips first-time guide steps in rebuild mode', () => {
    expect(buildOnboardingStepIds({ isRebuildMode: true })).toEqual(['base', 'ritual', 'ready']);
  });
});
