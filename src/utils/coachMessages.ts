import type { Plan, User, Workout } from '../store';
import { getCurrentPlanDay } from './planGenerator';

export type CoachMessageState =
  | 'preWorkout'
  | 'dueNow'
  | 'missed30'
  | 'restDay'
  | 'workoutComplete'
  | 'streakRecovery'
  | 'comeback';

type CoachTone = User['coachTone'];

const messages: Record<CoachMessageState, Record<CoachTone, string[]>> = {
  preWorkout: {
    balanced: [
      '{name}, your session is lined up. Small start, strong finish.',
      'Today is already easier once you press start, {name}.',
      'Your plan is ready. Keep it clean, steady, and honest.',
    ],
    jokey: [
      '{name}, the floor asked about you. Seems serious.',
      'Your pushups are waiting politely. For now.',
      '{nickname}, time to make gravity file a complaint.',
    ],
    strict: [
      '{name}, show up on time and finish the assigned sets.',
      'No drama. Start the session and complete the work.',
      'Your standard is consistency. Begin when scheduled.',
    ],
  },
  dueNow: {
    balanced: [
      'It is workout time, {name}. One focused set at a time.',
      'Your training window is open. Start before the day gets noisy.',
    ],
    jokey: [
      '{nickname}, it is go time. The reps did not schedule themselves.',
      'Workout time. Your future chest sent a calendar invite.',
    ],
    strict: [
      'Start now. The schedule works only when you honor it.',
      '{name}, begin the planned session.',
    ],
  },
  missed30: {
    balanced: [
      'Thirty minutes slipped by. Start now or mark today as recovery and return tomorrow.',
      '{name}, the window is still open. A short session counts.',
    ],
    jokey: [
      'Thirty minutes later, the floor is still available. Very loyal floor.',
      '{nickname}, even a tiny session beats negotiating with the couch.',
    ],
    strict: [
      'You missed the start window. Complete a short session now or protect recovery.',
      'Do not let a late start become a missed day. Begin.',
    ],
  },
  restDay: {
    balanced: [
      'Rest day. Recover well so the next session has somewhere to land.',
      'No pushups today. Sleep, hydrate, and let the progress settle.',
    ],
    jokey: [
      'Rest day, {name}. Your arms are off-duty, not retired.',
      'Recovery day. Heroic lounging is acceptable if hydration is involved.',
    ],
    strict: [
      'Rest is part of training. Do not add junk volume today.',
      'Recover today. Return sharper next session.',
    ],
  },
  workoutComplete: {
    balanced: [
      'Clean work, {name}. The next session is already easier because you finished this one.',
      'That is another promise kept. Log it and recover.',
    ],
    jokey: [
      '{nickname}, gravity lost that round.',
      'Session saved. Your arms may submit feedback later.',
    ],
    strict: [
      'Session complete. Recover and be ready for the next scheduled day.',
      'Good. Completed work is the only score that matters.',
    ],
  },
  streakRecovery: {
    balanced: [
      'One missed day is feedback, not failure. Restart with the next small action.',
      '{name}, protect the habit. Make the next session easy to begin.',
    ],
    jokey: [
      'The streak took a coffee break. Bring it back gently.',
      '{nickname}, comeback arc unlocked.',
    ],
    strict: [
      'Reset the streak by showing up today.',
      'Do not negotiate with missed days. Resume the plan.',
    ],
  },
  comeback: {
    balanced: [
      'Welcome back, {name}. Start lighter, finish proud.',
      'The best comeback is a simple completed session.',
    ],
    jokey: [
      '{nickname}, the app kept your spot warm.',
      'Back again. The reps tried to hide, but we found them.',
    ],
    strict: [
      'Return to the plan. Start with today only.',
      'Comeback session: controlled reps, no excuses.',
    ],
  },
};

function stableIndex(parts: Array<string | number | undefined>, length: number) {
  const seed = parts.join('|');
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 9973;
  }
  return hash % length;
}

export function getCoachMessage(
  state: CoachMessageState,
  user: User,
  plan: Plan | null,
  workouts: Workout[] = []
) {
  const tone = user.coachTone ?? 'balanced';
  const bank = messages[state][tone] ?? messages[state].balanced;
  const currentDay = getCurrentPlanDay(plan);
  const template = bank[stableIndex([state, user.id, currentDay?.day, workouts.length], bank.length)];
  const name = user.displayName || user.name || 'Coach';
  const nickname = user.nickname || name;

  return template.replaceAll('{name}', name).replaceAll('{nickname}', nickname);
}
