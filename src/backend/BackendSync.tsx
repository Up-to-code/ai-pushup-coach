import { useEffect, useMemo } from 'react';
import { useConvexAuth, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useBetterAuth } from '../auth';
import { useWorkoutStore, type Workout } from '../store';

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
  const workouts = useWorkoutStore((state) => state.workouts);
  const markWorkoutSynced = useWorkoutStore((state) => state.markWorkoutSynced);

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
