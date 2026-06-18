export type OnboardingStepId = 'landing' | 'guidePlan' | 'guideCamera' | 'guideStart' | 'guideProgress' | 'base' | 'ritual' | 'ready';

export const firstTimeGuideStepIds: OnboardingStepId[] = ['guidePlan', 'guideCamera', 'guideStart', 'guideProgress'];

const welcomeSetupStepIds: OnboardingStepId[] = ['landing', 'base', 'ritual', 'ready'];
const rebuildStepIds: OnboardingStepId[] = ['base', 'ritual', 'ready'];

export function buildOnboardingStepIds({ isRebuildMode }: { isRebuildMode: boolean }) {
  if (isRebuildMode) return rebuildStepIds;
  const [landingStep, ...planSteps] = welcomeSetupStepIds;
  return [landingStep, ...firstTimeGuideStepIds, ...planSteps];
}
