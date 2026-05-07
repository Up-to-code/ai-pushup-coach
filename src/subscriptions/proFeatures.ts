import type { TrainingCameraMode } from '../store';

export type ProStatus = 'free' | 'pro';
export type ProfileRangePeriod = 'W' | 'M' | 'Y' | 'ALL';

export const FREE_PROFILE_PERIOD: ProfileRangePeriod = 'W';
export const FREE_PROFILE_OFFSET = 0;

export function hasProAccess(status: ProStatus | null | undefined): boolean {
  return status === 'pro';
}

export function resolveCameraModeForAccess(
  mode: TrainingCameraMode,
  isPro: boolean
): TrainingCameraMode {
  return isPro ? mode : 'faceFocus';
}

export function canUseFullSceneCamera(isPro: boolean): boolean {
  return isPro;
}

export function canUseProfileRange(
  period: ProfileRangePeriod,
  offset: number,
  isPro: boolean
): boolean {
  return isPro || (period === FREE_PROFILE_PERIOD && offset === FREE_PROFILE_OFFSET);
}

export function resolveProfileRangeForAccess(
  period: ProfileRangePeriod,
  offset: number,
  isPro: boolean
): { period: ProfileRangePeriod; offset: number; locked: boolean } {
  if (canUseProfileRange(period, offset, isPro)) {
    return { period, offset, locked: false };
  }

  return {
    period: FREE_PROFILE_PERIOD,
    offset: FREE_PROFILE_OFFSET,
    locked: true,
  };
}
