import { useEffect, useMemo } from 'react';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useBetterAuth } from '../auth';
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
  const { isLoaded, isSignedIn, userId } = useBetterAuth();
  const { isAuthenticated: isConvexAuthenticated } = useConvexAuth();
  const user = useUserStore((state) => state.user);
  const settings = useSettingsStore((state) => state.settings);
  const workouts = useWorkoutStore((state) => state.workouts);
  const markWorkoutSynced = useWorkoutStore((state) => state.markWorkoutSynced);

  const upsertProfile = useMutation(api.users.upsertProfile);
  const upsertSettings = useMutation(api.settings.upsertSettings);
  const submitWorkout = useMutation(api.workouts.submitWorkout);
  const logWorkoutEvent = useMutation(api.telemetry.logWorkoutEvent);
  const deletionState = useQuery(
    api.users.deletionStatus,
    isLoaded && isSignedIn && isConvexAuthenticated && userId ? { clientUserId: userId } : 'skip'
  );

  const unsyncedWorkouts = useMemo(
    () => workouts.filter((workout) => workout.completed && !workout.synced),
    [workouts]
  );

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !isConvexAuthenticated || !userId || !deletionState) {
      return;
    }

    if (deletionState.status === 'pendingDeletion') {
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
          createdAt: user.createdAt,
          // Stats (streak, energy, reps) and Subscriptions are backend-managed.
          // We exclude them here to prevent accidental overwrites from local state.
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
          habitNudgeEnabled: settings.habitNudgeEnabled,
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
  }, [deletionState, isConvexAuthenticated, isLoaded, isSignedIn, settings, upsertProfile, upsertSettings, user, userId]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !isConvexAuthenticated || !userId || !deletionState) {
      return;
    }

    if (deletionState.status === 'pendingDeletion') {
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
  }, [unsyncedWorkouts, deletionState, isConvexAuthenticated, isLoaded, isSignedIn, logWorkoutEvent, submitWorkout, userId, markWorkoutSynced]);

  return null;
}
