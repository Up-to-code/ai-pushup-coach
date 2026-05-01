export type SessionFinishKind = 'discardableZero' | 'completed';
export type SetCompletionAction = 'continue' | 'rest' | 'finish';
export type TrackableSessionState = 'waitingForFace' | 'active' | 'resting' | 'completed' | 'saving' | 'failed';

export function getSessionFinishKind(reps: number): SessionFinishKind {
  return reps <= 0 ? 'discardableZero' : 'completed';
}

export function isRepCountAccepted(reps: number) {
  return Number.isFinite(reps) && reps >= 0 && reps <= 1000;
}

export function canProcessFaceMetrics(sessionState: TrackableSessionState, isPaused: boolean) {
  return !isPaused && (sessionState === 'waitingForFace' || sessionState === 'active');
}

export function getSetProgress(input: {
  reps: number;
  sets: number[];
  currentSetIndex: number;
}) {
  const currentSetTarget = input.sets[input.currentSetIndex] ?? 0;
  const repsBeforeCurrentSet = input.sets
    .slice(0, input.currentSetIndex)
    .reduce((sum, value) => sum + value, 0);
  const repsInCurrentSet = Math.max(0, input.reps - repsBeforeCurrentSet);
  const currentSetCompleteAt = repsBeforeCurrentSet + currentSetTarget;

  return {
    currentSetTarget,
    repsBeforeCurrentSet,
    repsInCurrentSet,
    currentSetCompleteAt,
    setComplete: currentSetTarget > 0 && input.reps >= currentSetCompleteAt,
    hasNextSet: input.currentSetIndex < input.sets.length - 1,
  };
}

export function getSetCompletionAction(input: {
  setComplete: boolean;
  hasNextSet: boolean;
}): SetCompletionAction {
  if (!input.setComplete) {
    return 'continue';
  }

  return input.hasNextSet ? 'rest' : 'finish';
}
