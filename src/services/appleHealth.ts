import { Platform } from 'react-native';
import type { Workout } from '../store';

export type AppleHealthStatus = 'unavailable' | 'notConnected' | 'connected' | 'permissionNeeded';

export type AppleHealthWorkoutPayload = {
  type: 'FunctionalStrengthTraining';
  startDate: string;
  endDate: string;
  duration: number;
  energyBurned: number;
  energyBurnedUnit: 'calorie';
};

type HealthKitModule = {
  Constants: {
    Permissions: {
      Workout: string;
      ActiveEnergyBurned: string;
    };
  };
  initHealthKit: (
    permissions: { permissions: { read: string[]; write: string[] } },
    callback: (error?: string | null) => void
  ) => void;
  saveWorkout: (
    payload: AppleHealthWorkoutPayload,
    callback: (error: string | null, result?: unknown) => void
  ) => void;
};

let healthKit: HealthKitModule | null | undefined;
let permissionReady = false;

function getHealthKit() {
  if (Platform.OS !== 'ios') {
    return null;
  }

  if (healthKit !== undefined) {
    return healthKit;
  }

  try {
    // Native-only dependency. Keep the require lazy so tests, web, and Android can load this module.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const module = require('react-native-health');
    const candidate = (module.default ?? module) as Partial<HealthKitModule>;
    healthKit =
      typeof candidate.initHealthKit === 'function' && typeof candidate.saveWorkout === 'function'
        ? (candidate as HealthKitModule)
        : null;
  } catch {
    healthKit = null;
  }

  return healthKit;
}

export function isAppleHealthAvailable() {
  return Boolean(getHealthKit());
}

export function shouldExportWorkoutToAppleHealth(workout: Pick<Workout, 'completed' | 'reps' | 'appleHealthSyncedAt'> | null | undefined) {
  return Boolean(workout?.completed && (workout.reps ?? 0) > 0 && !workout.appleHealthSyncedAt);
}

export function buildAppleHealthWorkoutPayload(workout: Pick<Workout, 'date' | 'duration' | 'calories' | 'startTime'>): AppleHealthWorkoutPayload {
  const duration = Math.max(1, Math.round(workout.duration || 1));
  const endDate = workout.date ? new Date(workout.date) : new Date();
  const startDate =
    typeof workout.startTime === 'number'
      ? new Date(workout.startTime)
      : new Date(endDate.getTime() - duration * 1000);

  return {
    type: 'FunctionalStrengthTraining',
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    duration,
    energyBurned: Math.max(0, Math.round(workout.calories || 0)),
    energyBurnedUnit: 'calorie',
  };
}

export async function requestAppleHealthWorkoutPermission(): Promise<AppleHealthStatus> {
  const AppleHealthKit = getHealthKit();
  if (!AppleHealthKit) {
    return 'unavailable';
  }

  const permissions = {
    permissions: {
      read: [],
      write: [
        AppleHealthKit.Constants.Permissions.Workout,
        AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
      ],
    },
  };

  return new Promise((resolve) => {
    AppleHealthKit.initHealthKit(permissions, (error) => {
      permissionReady = !error;
      resolve(error ? 'permissionNeeded' : 'connected');
    });
  });
}

export async function savePushupWorkoutToAppleHealth(workout: Workout) {
  if (!shouldExportWorkoutToAppleHealth(workout)) {
    return { ok: false as const, status: 'skipped' as const };
  }

  const AppleHealthKit = getHealthKit();
  if (!AppleHealthKit) {
    return { ok: false as const, status: 'unavailable' as const };
  }

  if (!permissionReady) {
    const status = await requestAppleHealthWorkoutPermission();
    if (status !== 'connected') {
      return { ok: false as const, status };
    }
  }

  const payload = buildAppleHealthWorkoutPayload(workout);
  return new Promise<{ ok: true; status: 'saved'; result?: unknown } | { ok: false; status: 'failed'; error: string }>((resolve) => {
    AppleHealthKit.saveWorkout(payload, (error, result) => {
      if (error) {
        resolve({ ok: false, status: 'failed', error });
        return;
      }
      resolve({ ok: true, status: 'saved', result });
    });
  });
}
