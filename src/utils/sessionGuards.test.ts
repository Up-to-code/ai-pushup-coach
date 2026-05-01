import { describe, expect, it } from 'vitest';
import {
  canProcessFaceMetrics,
  getSessionFinishKind,
  getSetCompletionAction,
  getSetProgress,
  isRepCountAccepted,
} from './sessionGuards';

describe('sessionGuards', () => {
  it.each([
    [0, 'discardableZero'],
    [1, 'completed'],
    [3, 'completed'],
    [100, 'completed'],
    [1000, 'completed'],
  ] as const)('classifies finish state for %i reps', (reps, expected) => {
    expect(getSessionFinishKind(reps)).toBe(expected);
  });

  it.each([-1, 1001, Number.POSITIVE_INFINITY, Number.NaN])('rejects unsafe rep count %s', (reps) => {
    expect(isRepCountAccepted(reps)).toBe(false);
  });

  it.each([0, 1, 3, 100, 1000])('accepts bounded rep count %i', (reps) => {
    expect(isRepCountAccepted(reps)).toBe(true);
  });

  it.each(['waitingForFace', 'active'] as const)('keeps tracking open while %s and unpaused', (sessionState) => {
    expect(canProcessFaceMetrics(sessionState, false)).toBe(true);
  });

  it.each(['waitingForFace', 'active', 'resting', 'completed', 'saving', 'failed'] as const)(
    'blocks tracking while paused in %s',
    (sessionState) => {
      expect(canProcessFaceMetrics(sessionState, true)).toBe(false);
    }
  );

  it.each(['resting', 'completed', 'saving', 'failed'] as const)(
    'blocks tracking after the session reaches %s',
    (sessionState) => {
      expect(canProcessFaceMetrics(sessionState, false)).toBe(false);
    }
  );

  it('tracks progress through a multi-set plan with rest boundaries', () => {
    expect(getSetProgress({ reps: 3, sets: [3, 4, 5, 1], currentSetIndex: 0 })).toMatchObject({
      currentSetTarget: 3,
      repsInCurrentSet: 3,
      setComplete: true,
      hasNextSet: true,
    });
    expect(getSetProgress({ reps: 7, sets: [3, 4, 5, 1], currentSetIndex: 1 })).toMatchObject({
      currentSetTarget: 4,
      repsBeforeCurrentSet: 3,
      repsInCurrentSet: 4,
      setComplete: true,
      hasNextSet: true,
    });
    expect(getSetProgress({ reps: 13, sets: [3, 4, 5, 1], currentSetIndex: 3 })).toMatchObject({
      currentSetTarget: 1,
      setComplete: true,
      hasNextSet: false,
    });
  });

  it.each([
    [{ setComplete: false, hasNextSet: true }, 'continue'],
    [{ setComplete: false, hasNextSet: false }, 'continue'],
    [{ setComplete: true, hasNextSet: true }, 'rest'],
    [{ setComplete: true, hasNextSet: false }, 'finish'],
  ] as const)('decides set completion action %#', (input, expected) => {
    expect(getSetCompletionAction(input)).toBe(expected);
  });
});
