import { useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { useConvexAuth, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useSettingsStore, useUserStore, useWorkoutStore, type Workout } from '../store';

function toWorkoutPayload(clientUserId: string, workout: Workout) {
  return {
    clientUserId,
    clientWorkoutId: workout.id,
    date: workout.date,
    type: workout.type,
    trainingCameraMode: workout.trainingCameraMode,
    reps: workout.reps,
    duration: workout.duration,
    calories: workout.calories,
    completed: workout.completed,
    goal: workout.goal,
    sets: workout.sets,
    restTime: workout.restTime,
    formFeedbackState: workout.formFeedbackState,
    cameraPresentationState: workout.cameraPresentationState,
    qualityScore: workout.qualityScore,
  };
}

export function BackendSync() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { isAuthenticated: isConvexAuthenticated } = useConvexAuth();
  const user = useUserStore((state) => state.user);
  const settings = useSettingsStore((state) => state.settings);
  const workouts = useWorkoutStore((state) => state.workouts);
  const markWorkoutSynced = useWorkoutStore((state) => state.markWorkoutSynced);

  const upsertProfile = useMutation(api.users.upsertProfile);
  const upsertSettings = useMutation(api.settings.upsertSettings);
  const submitWorkout = useMutation(api.workouts.submitWorkout);
  const logWorkoutEvent = useMutation(api.telemetry.logWorkoutEvent);

  const unsyncedWorkouts = useMemo(
    () => workouts.filter((workout) => workout.completed && !workout.synced),
    [workouts]
  );

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !isConvexAuthenticated || !userId) {
      return;
    }

    const authenticatedUserId = userId;
    let cancelled = false;

    async function syncIdentity() {
      try {
        await upsertProfile({
          clientUserId: authenticatedUserId,
          name: user.name,
          displayName: user.displayName,
          nickname: user.nickname,
          bio: user.bio,
          coachTone: user.coachTone,
          personalityTags: user.personalityTags,
          countryCode: user.countryCode,
          countryName: user.countryName,
          avatar: user.avatar,
          proStatus: user.proStatus,
          createdAt: user.createdAt,
          streak: user.streak,
          energy: user.energy,
          totalReps: user.totalReps,
          bestReps: user.bestReps,
        });

        if (cancelled) return;

        await upsertSettings({
          clientUserId: authenticatedUserId,
          soundEnabled: settings.soundEnabled,
          hapticsEnabled: settings.hapticsEnabled,
          theme: settings.theme,
          accentColor: settings.accentColor,
          notificationsEnabled: settings.notificationsEnabled,
          workoutReminderEnabled: settings.workoutReminderEnabled,
          missedReminderEnabled: settings.missedReminderEnabled,
          defaultWorkoutTime: settings.defaultWorkoutTime,
          defaultCameraMode: settings.defaultCameraMode,
        });
      } catch (error) {
        console.warn('Convex identity sync failed', error);
      }
    }

    void syncIdentity();

    return () => {
      cancelled = true;
    };
  }, [isConvexAuthenticated, isLoaded, isSignedIn, settings, upsertProfile, upsertSettings, user, userId]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !isConvexAuthenticated || !userId) {
      return;
    }

    const authenticatedUserId = userId;

    async function syncWorkouts() {
      for (const workout of unsyncedWorkouts) {
        try {
          await submitWorkout(toWorkoutPayload(authenticatedUserId, workout));
          
          await logWorkoutEvent({
            clientUserId: authenticatedUserId,
            clientWorkoutId: workout.id,
            type: 'sessionEnded',
            rep: workout.reps,
            formFeedbackState: workout.formFeedbackState,
            cameraPresentationState: workout.cameraPresentationState,
            message: `Completed ${workout.reps} reps in ${workout.duration}s`,
          });
          
          // Mark as synced locally so we don't try to sync it again on next reload
          markWorkoutSynced(workout.id);
        } catch (error) {
          console.warn('Convex workout sync failed', error);
          break; // Stop syncing on error (e.g. rate limit, network failure)
        }
      }
    }

    void syncWorkouts();
  }, [unsyncedWorkouts, isConvexAuthenticated, isLoaded, isSignedIn, logWorkoutEvent, submitWorkout, userId, markWorkoutSynced]);

  return null;
}
