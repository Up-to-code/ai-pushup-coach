import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@clerk/clerk-expo';
import * as Haptics from 'expo-haptics';
import { Camera } from 'expo-camera/legacy';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { PushupCameraView, pushupCameraAvailable, type FaceMetricsEvent } from '../../src/components/PushupCameraView';
import {
  useSettingsStore,
  usePlanStore,
  useUserStore,
  useWorkoutStore,
  type CameraPresentationState,
  type FormFeedbackState,
} from '../../src/store';
import { borderRadius, colors, spacing, typography } from '../../src/theme';
import {
  createFacePushupTrackerState,
  defaultFacePushupTrackerConfig,
  processFacePushupMetric,
  type FaceTrackingPhase,
  type FaceTrackingProblem,
  type FacePushupMetric,
  type FacePushupTrackerState,
} from '../../src/utils/facePushupTracker';
import { canProcessFaceMetrics, getSessionFinishKind, getSetCompletionAction, getSetProgress, type TrackableSessionState } from '../../src/utils';

const DETECTION_STALE_MS = 1600;
const NATIVE_PREVIEW_TIMEOUT_MS = 2200;
const BAD_TRACKING_HAPTIC_MS = 2500;
const TRACKING_GUIDANCE_DELAY_MS = 10000;

type SessionState = TrackableSessionState;
type CoachCueTone = 'good' | 'warning' | 'danger' | 'neutral';
type IconName = React.ComponentProps<typeof Ionicons>['name'];
type CoachCue = {
  icon: IconName;
  title: string;
  body: string;
  tone: CoachCueTone;
};
type CameraRingState = 'ready' | 'waiting' | 'bad';
type VisibleTrackingProblem = FaceTrackingProblem | 'none';
type SpeechModule = typeof import('expo-speech');

let cachedSpeech: SpeechModule | null | undefined;

function getSpeech() {
  if (cachedSpeech !== undefined) {
    return cachedSpeech;
  }

  try {
    // Speech is optional in dev clients until the native app has been rebuilt.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    cachedSpeech = require('expo-speech') as SpeechModule;
  } catch (error) {
    cachedSpeech = null;
    console.warn('Speech cues are unavailable in this build. Rebuild the native app to enable them.', error);
  }

  return cachedSpeech;
}

function speakCue(text: string) {
  if (!useSettingsStore.getState().settings.soundEnabled) {
    return;
  }

  const Speech = getSpeech();
  if (!Speech) {
    return;
  }

  try {
    Speech.stop();
    Speech.speak(text, {
      language: 'en-US',
      pitch: 1,
      rate: 0.54,
    });
  } catch (error) {
    console.warn('Speech cue failed', error);
  }
}

function getCoachCue({
  cameraPresentationState,
  faceCenterX,
  faceCenterY,
  faceDetected,
  isPaused,
  nextSetTarget,
  restRemaining,
  sessionState,
  trackingPhase,
  trackingProblem,
}: {
  cameraPresentationState: CameraPresentationState;
  faceCenterX: number;
  faceCenterY: number;
  faceDetected: boolean;
  isPaused: boolean;
  nextSetTarget?: number;
  restRemaining: number;
  sessionState: SessionState;
  trackingPhase: FaceTrackingPhase;
  trackingProblem: FaceTrackingProblem;
}): CoachCue {
  if (isPaused) {
    return {
      icon: 'pause-circle-outline',
      title: 'Paused',
      body: 'Resume when your face is centered.',
      tone: 'neutral',
    };
  }

  if (sessionState === 'resting') {
    return {
      icon: 'timer-outline',
      title: `Rest ${restRemaining}s`,
      body: nextSetTarget ? `Next target: ${nextSetTarget} clean reps.` : 'Last set is complete.',
      tone: 'neutral',
    };
  }

  if (cameraPresentationState === 'permission') {
    return {
      icon: 'camera-outline',
      title: 'Camera needed',
      body: 'Enable camera access so counting can start.',
      tone: 'danger',
    };
  }

  if (cameraPresentationState === 'preparing') {
    return {
      icon: 'scan-circle-outline',
      title: 'Opening camera',
      body: 'Set the phone down and face the circle.',
      tone: 'neutral',
    };
  }

  if (cameraPresentationState === 'manualFallback') {
    return {
      icon: 'phone-portrait-outline',
      title: 'Face tracking unavailable',
      body: 'Use a real iPhone camera path for automatic counting.',
      tone: 'warning',
    };
  }

  if (cameraPresentationState === 'unavailable') {
    return {
      icon: 'warning-outline',
      title: 'Camera unavailable',
      body: 'Close this session and reopen it on a real iPhone.',
      tone: 'danger',
    };
  }

  if (trackingProblem === 'dark' || !faceDetected) {
    return {
      icon: 'sunny-outline',
      title: 'Need face in frame',
      body: 'Add light and bring your face into the circle.',
      tone: 'warning',
    };
  }

  if (trackingProblem === 'offCenter') {
    const horizontalHint = faceCenterX < 0.5 ? 'Move a little right.' : 'Move a little left.';
    const verticalHint = faceCenterY < 0.5 ? ' Lower the phone slightly.' : ' Raise the phone slightly.';
    return {
      icon: 'locate-outline',
      title: 'Center your face',
      body: `${horizontalHint}${Math.abs(faceCenterY - 0.5) > 0.24 ? verticalHint : ''}`,
      tone: 'warning',
    };
  }

  if (trackingProblem === 'tooFar') {
    return {
      icon: 'resize-outline',
      title: 'Move closer',
      body: 'Your face is too small for clean counting.',
      tone: 'warning',
    };
  }

  if (sessionState === 'waitingForFace' || trackingPhase === 'waiting') {
    return {
      icon: 'scan-outline',
      title: 'Find your face',
      body: 'Timer starts when your face is stable.',
      tone: 'neutral',
    };
  }

  if (trackingPhase === 'calibratingTop') {
    return {
      icon: 'scan-outline',
      title: 'Hold top',
      body: 'Stay still for one moment. Then start reps.',
      tone: 'neutral',
    };
  }

  if (trackingPhase === 'down') {
    return {
      icon: 'arrow-up-circle-outline',
      title: 'Drive up',
      body: 'Return to the top position to count.',
      tone: 'good',
    };
  }

  if (trackingPhase === 'returning') {
    return {
      icon: 'arrow-up-outline',
      title: 'Finish the rep',
      body: 'Come back to the top cleanly.',
      tone: 'good',
    };
  }

  return {
    icon: 'checkmark-circle-outline',
    title: 'Ready',
    body: 'Go down. Come up. Clean reps count.',
    tone: 'good',
  };
}

export default function WorkoutSessionScreen() {
  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastMetricsAtRef = useRef(0);
  const lastTrackingSyncAtRef = useRef(0);
  const lastBadTrackingHapticAtRef = useRef(0);
  const trackingIssueSinceRef = useRef<number | null>(null);
  const draftWorkoutSyncedRef = useRef(false);
  const finishStartedRef = useRef(false);
  const trackerRef = useRef<FacePushupTrackerState>(createFacePushupTrackerState());

  const [duration, setDuration] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceHeight, setFaceHeight] = useState(0);
  const [faceCenterX, setFaceCenterX] = useState(0.5);
  const [faceCenterY, setFaceCenterY] = useState(0.5);
  const [trackingPhase, setTrackingPhase] = useState<FaceTrackingPhase>('waiting');
  const [trackingProblem, setTrackingProblem] = useState<FaceTrackingProblem>('dark');
  const [formFeedback, setFormFeedback] = useState<FormFeedbackState>('good');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [guardArmed, setGuardArmed] = useState(false);
  const [nativeEventReceived, setNativeEventReceived] = useState(false);
  const [nativeFallbackActive, setNativeFallbackActive] = useState(false);
  const [expoCameraFailed, setExpoCameraFailed] = useState(false);
  const [sessionState, setSessionState] = useState<SessionState>('waitingForFace');
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [restRemaining, setRestRemaining] = useState(0);
  const [visibleTrackingProblem, setVisibleTrackingProblem] = useState<VisibleTrackingProblem>('none');
  const { isSignedIn, userId } = useAuth();
  const { isAuthenticated: isConvexAuthenticated } = useConvexAuth();
  const user = useUserStore((state) => state.user);
  const updateUser = useUserStore((state) => state.updateUser);
  const markCurrentDayCompleted = usePlanStore((state) => state.markCurrentDayCompleted);
  const convexUserId = userId ?? user.id;

  const deletionState = useQuery(
    api.users.deletionStatus,
    isSignedIn && userId ? { clientUserId: userId } : 'skip'
  );

  const canSyncConvex = Boolean(
    isSignedIn && 
    isConvexAuthenticated && 
    userId && 
    deletionState?.status !== 'pendingDeletion'
  );

  useEffect(() => {
    if (isSignedIn && deletionState?.status === 'pendingDeletion') {
      router.replace('/restore-account' as any);
    }
  }, [isSignedIn, deletionState, router]);

  const {
    currentWorkout,
    isPaused,
    discardWorkout,
    finishWorkout,
    incrementReps,
    pauseWorkout,
    resumeWorkout,
    updateCurrentWorkout,
  } = useWorkoutStore();

  const reps = currentWorkout?.reps || 0;
  const cameraLayout = currentWorkout?.trainingCameraMode === 'fullScene' ? 'fullMirror' : 'centerCircle';
  const goal = currentWorkout?.goal || 50;
  const sets = currentWorkout?.sets ?? [];
  const hasSetPlan = currentWorkout?.type === 'sets' && sets.length > 0;
  const currentSetTarget = hasSetPlan ? sets[currentSetIndex] ?? sets[sets.length - 1] : goal;
  const setProgress = getSetProgress({ reps, sets, currentSetIndex });
  const repsBeforeCurrentSet = hasSetPlan ? setProgress.repsBeforeCurrentSet : 0;
  const repsInCurrentSet = hasSetPlan ? setProgress.repsInCurrentSet : reps;
  const nextSetTarget = hasSetPlan ? sets[currentSetIndex + 1] : undefined;
  const submitWorkout = useMutation(api.workouts.submitWorkout);
  const logWorkoutEvent = useMutation(api.telemetry.logWorkoutEvent);
  const logFaceTrackingSample = useMutation(api.telemetry.logFaceTrackingSample);

  useEffect(() => {
    const timer = setTimeout(() => setGuardArmed(true), 250);
    return () => clearTimeout(timer);
  }, []);

  const hasCompletedOnboarding = useSettingsStore((state) => state.hasCompletedOnboarding);

  useEffect(() => {
    if (!hasCompletedOnboarding) {
      router.replace('/onboarding' as any);
    }
  }, [hasCompletedOnboarding, router]);

  useEffect(() => {
    if (guardArmed && !currentWorkout?.id && !finishStartedRef.current && hasCompletedOnboarding) {
      router.replace('/practice' as any);
    }
  }, [currentWorkout?.id, guardArmed, router, hasCompletedOnboarding]);

  useEffect(() => {
    if (!currentWorkout?.id) {
      return;
    }

    trackerRef.current = createFacePushupTrackerState();
    setDuration(0);
    setCurrentSetIndex(0);
    setRestRemaining(0);
    setTrackingPhase('waiting');
    setTrackingProblem('dark');
    setSessionState('waitingForFace');
    setVisibleTrackingProblem('none');
    trackingIssueSinceRef.current = null;
  }, [currentWorkout?.id]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      if (mounted) {
        setHasPermission(status === 'granted');
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!currentWorkout?.id || isPaused || sessionState !== 'active') {
      return;
    }

    timerRef.current = setInterval(() => {
      setDuration((value) => value + 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentWorkout?.id, isPaused, sessionState]);

  useEffect(() => {
    if (sessionState !== 'resting' || restRemaining <= 0) {
      return;
    }

    const restTimer = setTimeout(() => {
      setRestRemaining((value) => Math.max(0, value - 1));
    }, 1000);

    return () => clearTimeout(restTimer);
  }, [restRemaining, sessionState]);

  useEffect(() => {
    if (sessionState !== 'resting' || restRemaining !== 0) {
      return;
    }

    const nextSetIndex = Math.min(currentSetIndex + 1, Math.max(0, sets.length - 1));
    setCurrentSetIndex(nextSetIndex);
    setSessionState('active');
    resumeWorkout();
    speakCue(`Next set. ${sets[nextSetIndex] ?? currentSetTarget} reps.`);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [currentSetIndex, currentSetTarget, restRemaining, resumeWorkout, sessionState, sets]);

  useEffect(() => {
    const staleTimer = setInterval(() => {
      if (!pushupCameraAvailable || isPaused || lastMetricsAtRef.current === 0) {
        return;
      }

      if (Date.now() - lastMetricsAtRef.current > DETECTION_STALE_MS) {
        setFaceDetected(false);
        setFormFeedback('incomplete');
        setTrackingProblem('dark');
      }
    }, 400);

    return () => clearInterval(staleTimer);
  }, [isPaused]);

  useEffect(() => {
    if (hasPermission !== true || !pushupCameraAvailable || cameraReady || nativeEventReceived) {
      return;
    }

    const timeout = setTimeout(() => {
      setNativeFallbackActive(true);
      setFormFeedback('incomplete');
    }, NATIVE_PREVIEW_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, [cameraReady, hasPermission, nativeEventReceived]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  let cameraPresentationState: CameraPresentationState = 'preparing';
  if (hasPermission === false) {
    cameraPresentationState = 'permission';
  } else if (expoCameraFailed) {
    cameraPresentationState = 'unavailable';
  } else if (pushupCameraAvailable && !nativeFallbackActive) {
    cameraPresentationState = cameraReady ? 'tracking' : 'preparing';
  } else if (hasPermission === true) {
    cameraPresentationState = 'manualFallback';
  }

  useEffect(() => {
    const hasBlockingCameraProblem =
      cameraPresentationState === 'permission' ||
      cameraPresentationState === 'manualFallback' ||
      cameraPresentationState === 'unavailable';
    const hasDelayedTrackingProblem =
      cameraPresentationState === 'tracking' &&
      trackingProblem !== 'none' &&
      sessionState !== 'resting' &&
      !isPaused;
    const hasPreparingProblem = cameraPresentationState === 'preparing' && sessionState === 'waitingForFace';

    if (!hasBlockingCameraProblem && !hasDelayedTrackingProblem && !hasPreparingProblem) {
      trackingIssueSinceRef.current = null;
      setVisibleTrackingProblem('none');
      return;
    }

    if (hasBlockingCameraProblem) {
      trackingIssueSinceRef.current = null;
      setVisibleTrackingProblem(trackingProblem === 'none' ? 'unavailable' : trackingProblem);
      return;
    }

    if (trackingIssueSinceRef.current === null) {
      trackingIssueSinceRef.current = Date.now();
      setVisibleTrackingProblem('none');
      return;
    }

    const delay = hasPreparingProblem ? NATIVE_PREVIEW_TIMEOUT_MS : TRACKING_GUIDANCE_DELAY_MS;
    const remainingDelay = Math.max(0, delay - (Date.now() - trackingIssueSinceRef.current));
    const timer = setTimeout(() => {
      const stillProblem =
        cameraPresentationState === 'preparing' ||
        (cameraPresentationState === 'tracking' && trackingProblem !== 'none');
      if (stillProblem && trackingIssueSinceRef.current !== null) {
        setVisibleTrackingProblem(trackingProblem === 'none' ? 'dark' : trackingProblem);
      }
    }, remainingDelay);

    return () => clearTimeout(timer);
  }, [cameraPresentationState, isPaused, sessionState, trackingProblem]);

  const hapticImpact = (style: Haptics.ImpactFeedbackStyle) => {
    if (useSettingsStore.getState().settings.hapticsEnabled) {
      void Haptics.impactAsync(style);
    }
  };

  const hapticNotification = (type: Haptics.NotificationFeedbackType) => {
    if (useSettingsStore.getState().settings.hapticsEnabled) {
      void Haptics.notificationAsync(type);
    }
  };

  const finishSession = (completed = reps > 0) => {
    if (sessionState === 'saving') {
      return;
    }

    finishStartedRef.current = true;
    setSessionState('saving');
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const finishedWorkout = finishWorkout(completed, {
      duration,
      formFeedbackState: formFeedback,
      cameraPresentationState,
    });
    if (!finishedWorkout) {
      finishStartedRef.current = false;
      setSessionState('failed');
      Alert.alert('Could not finish session', 'The workout was already closed. Go back to Practice and start a fresh session.');
      return;
    }

    if (finishedWorkout.completed && finishedWorkout.reps > 0) {
      updateUser({
        totalReps: user.totalReps + finishedWorkout.reps,
        bestReps: Math.max(user.bestReps, finishedWorkout.reps),
        streak: user.streak + 1,
        energy: Math.max(15, user.energy - 8),
      });
      markCurrentDayCompleted();
    }
    router.replace(`/workout-complete?workoutId=${finishedWorkout.id}` as any);
  };

  const handleRepCounted = (nextRep: number) => {
    incrementReps();
    setFormFeedback('good');
    updateCurrentWorkout({
      formFeedbackState: 'good',
      cameraPresentationState,
      qualityScore: 92,
    });

    hapticImpact(Haptics.ImpactFeedbackStyle.Light);
    speakCue(String(nextRep));

    if (currentWorkout?.id && canSyncConvex) {
      void logWorkoutEvent({
        clientUserId: convexUserId,
        clientWorkoutId: currentWorkout.id,
        type: 'repCounted',
        rep: nextRep,
        phase: trackerRef.current.phase,
        formFeedbackState: 'good',
        cameraPresentationState,
      }).catch((error) => {
        console.warn('Convex rep event sync failed', error);
      });
    }

    if (hasSetPlan) {
      const currentSetCompleteAt = repsBeforeCurrentSet + currentSetTarget;
      const hasNextSet = currentSetIndex < sets.length - 1;
      const setCompletionAction = getSetCompletionAction({
        setComplete: nextRep >= currentSetCompleteAt,
        hasNextSet,
      });

      if (setCompletionAction === 'rest') {
        setRestRemaining(currentWorkout?.restTime ?? 60);
        setSessionState('resting');
        pauseWorkout();
        speakCue('Rest');
        hapticNotification(Haptics.NotificationFeedbackType.Success);
      } else if (setCompletionAction === 'finish') {
        setSessionState('completed');
        pauseWorkout();
        speakCue('Finished');
        hapticNotification(Haptics.NotificationFeedbackType.Success);
        finishSession(true);
      }
    }
  };

  const handleFaceMetrics = (event: FaceMetricsEvent) => {
    const payload = event.nativeEvent;
    const now = Date.now();

    lastMetricsAtRef.current = now;
    setNativeEventReceived(true);
    setCameraReady(payload.cameraReady);
    setFaceDetected(payload.faceDetected);
    setFaceHeight(payload.faceHeight);
    setFaceCenterX(payload.centerX);
    setFaceCenterY(payload.centerY);
    setNativeFallbackActive(false);

    if (finishStartedRef.current || !canProcessFaceMetrics(sessionState, isPaused)) {
      return;
    }

    if (currentWorkout?.id && canSyncConvex && now - lastTrackingSyncAtRef.current > 1000) {
      lastTrackingSyncAtRef.current = now;
      void logFaceTrackingSample({
        clientUserId: convexUserId,
        clientWorkoutId: currentWorkout.id,
        timestamp: now,
        faceDetected: payload.faceDetected,
        faceHeight: payload.faceHeight,
        centerX: payload.centerX,
        centerY: payload.centerY,
        trackingPhase,
        trackingProblem,
        brightnessState: payload.brightnessState ?? (payload.faceDetected ? 'ok' : 'dark'),
      }).catch(() => {
        // Draft workout sync may still be catching up; the next sample can retry.
      });
    }

    const metric: FacePushupMetric = {
      status: payload.status,
      cameraReady: payload.cameraReady,
      faceDetected: payload.faceDetected,
      faceHeight: payload.faceHeight,
      centerX: payload.centerX,
      centerY: payload.centerY,
      timestamp: payload.timestamp || now,
    };
    const nextTracker = processFacePushupMetric(
      trackerRef.current,
      metric,
      defaultFacePushupTrackerConfig
    );
    trackerRef.current = nextTracker;
    setTrackingPhase(nextTracker.phase);
    setTrackingProblem(nextTracker.problem);

    if (nextTracker.problem !== 'none') {
      setFormFeedback(nextTracker.problem === 'offCenter' ? 'badForm' : 'incomplete');
      if (now - lastBadTrackingHapticAtRef.current > BAD_TRACKING_HAPTIC_MS) {
        lastBadTrackingHapticAtRef.current = now;
        hapticNotification(Haptics.NotificationFeedbackType.Warning);
      }
      return;
    }

    if (nextTracker.events.includes('sessionStarted')) {
      setSessionState('active');
      setFormFeedback('incomplete');
      speakCue('Start');
      hapticNotification(Haptics.NotificationFeedbackType.Success);

      if (currentWorkout?.id && canSyncConvex) {
        void logWorkoutEvent({
          clientUserId: convexUserId,
          clientWorkoutId: currentWorkout.id,
          type: 'sessionStarted',
          cameraPresentationState,
          message: 'Face detected. Timer started.',
        }).catch(() => {
          // Draft workout sync may still be catching up; rep telemetry can retry later.
        });
      }
    }

    if (nextTracker.events.includes('calibrated')) {
      setFormFeedback('good');
      hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (nextTracker.events.includes('badTracking')) {
      setFormFeedback('tooFast');
    }

    if (nextTracker.events.includes('repCounted')) {
      handleRepCounted(nextTracker.reps);
    }
  };

  const handleEnd = () => {
    if (finishStartedRef.current || sessionState === 'saving') {
      return;
    }
    finishStartedRef.current = true;

    if (getSessionFinishKind(reps) === 'discardableZero') {
      Alert.alert('No reps counted', 'Do you want to discard this session or save it as an incomplete attempt?', [
        { text: 'Keep going', style: 'cancel', onPress: () => { finishStartedRef.current = false; } },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            discardWorkout();
            router.replace('/practice' as any);
          },
        },
        {
          text: 'Save incomplete',
          onPress: () => { finishSession(false); },
        },
      ]);
      return;
    }

    Alert.alert('Finish workout?', 'Your results will be saved.', [
      { text: 'Keep going', style: 'cancel', onPress: () => { finishStartedRef.current = false; } },
      {
        text: 'Finish',
        style: 'destructive',
        onPress: () => { finishSession(true); },
      },
    ]);
  };

  useEffect(() => {
    if (currentWorkout?.id) {
      updateCurrentWorkout({ cameraPresentationState });
    }
  }, [cameraPresentationState, currentWorkout?.id, updateCurrentWorkout]);

  useEffect(() => {
    if (!currentWorkout?.id || draftWorkoutSyncedRef.current || !canSyncConvex) {
      return;
    }

    draftWorkoutSyncedRef.current = true;

    async function syncWorkoutDraft() {
      try {
        await submitWorkout({
          clientUserId: convexUserId,
          clientWorkoutId: currentWorkout!.id!,
          date: currentWorkout!.date || new Date().toISOString(),
          type: currentWorkout!.type || 'open',
          trainingCameraMode: currentWorkout!.trainingCameraMode || 'faceFocus',
          reps: currentWorkout!.reps || 0,
          duration: currentWorkout!.duration || 0,
          calories: currentWorkout!.calories || 0,
          completed: false,
          goal: currentWorkout!.goal,
          sets: currentWorkout!.sets,
          restTime: currentWorkout!.restTime,
          formFeedbackState: currentWorkout!.formFeedbackState,
          cameraPresentationState,
          qualityScore: currentWorkout!.qualityScore,
        });
      } catch (error) {
        draftWorkoutSyncedRef.current = false;
        console.warn('Convex workout draft sync failed', error);
      }
    }

    void syncWorkoutDraft();
  }, [cameraPresentationState, canSyncConvex, convexUserId, currentWorkout, submitWorkout]);

  const statusLabel = {
    permission: 'Permission needed',
    preparing: 'Preparing camera',
    tracking: 'Live tracking',
    manualFallback: 'Tracking unavailable',
    unavailable: 'Real camera required',
  }[cameraPresentationState];

  const phaseLabel = {
    waiting: 'Find face',
    calibratingTop: 'Hold top',
    ready: 'Ready',
    down: 'Down',
    returning: 'Up',
  }[trackingPhase];

  const trackingProblemLabel = {
    none: phaseLabel,
    dark: 'More light',
    offCenter: 'Center face',
    tooFar: 'Move closer',
    unavailable: 'No tracking',
  }[trackingProblem];
  const visibleTrackingProblemLabel = {
    none: '',
    dark: 'More light',
    offCenter: 'Center face',
    tooFar: 'Move closer',
    unavailable: 'No tracking',
  }[visibleTrackingProblem];

  const immediateCue = isPaused || sessionState === 'resting';
  const delayedCueProblem = visibleTrackingProblem === 'none' ? trackingProblem : visibleTrackingProblem;
  const coachCue = immediateCue || visibleTrackingProblem !== 'none' ? getCoachCue({
    cameraPresentationState,
    faceCenterX,
    faceCenterY,
    faceDetected,
    isPaused,
    nextSetTarget,
    restRemaining,
    sessionState,
    trackingPhase,
    trackingProblem: delayedCueProblem,
  }) : null;

  const cameraRingState: CameraRingState =
    trackingProblem === 'none' && sessionState !== 'waitingForFace'
      ? 'ready'
      : cameraPresentationState === 'permission' ||
          cameraPresentationState === 'unavailable' ||
          trackingProblem === 'dark' ||
          trackingProblem === 'offCenter' ||
          trackingProblem === 'tooFar'
        ? 'bad'
        : 'waiting';
  const cameraCircleStateStyle =
    cameraRingState === 'ready'
      ? styles.cameraCircleReady
      : cameraRingState === 'bad'
        ? styles.cameraCircleBad
        : styles.cameraCircleWaiting;
  const shouldRenderNativeCamera =
    currentWorkout?.id &&
    sessionState !== 'completed' &&
    sessionState !== 'saving' &&
    sessionState !== 'failed';
  const isFullMirror = cameraLayout === 'fullMirror';
  const cameraSurface = (
    <View
      style={[
        styles.cameraFrame,
        isFullMirror ? styles.fullMirrorCameraFrame : styles.cameraCircle,
        !isFullMirror && cameraCircleStateStyle,
      ]}
    >
      {shouldRenderNativeCamera && (cameraPresentationState === 'tracking' || cameraPresentationState === 'preparing') ? (
        <PushupCameraView
          style={StyleSheet.absoluteFillObject}
          paused={isPaused}
          onFaceMetrics={handleFaceMetrics}
        />
      ) : null}

      {shouldRenderNativeCamera && cameraPresentationState === 'manualFallback' ? (
        <Camera
          style={StyleSheet.absoluteFillObject}
          type={'front' as any}
          {...(!isFullMirror ? { ratio: '1:1' } : {})}
          onMountError={() => setExpoCameraFailed(true)}
        />
      ) : null}

      {(cameraPresentationState === 'permission' || cameraPresentationState === 'unavailable') ? (
        <View style={[styles.cameraEmpty, isFullMirror && styles.fullMirrorCameraEmpty]}>
          <Ionicons name={cameraPresentationState === 'permission' ? 'camera-outline' : 'warning-outline'} size={42} color={colors.textPrimary} />
          <Text style={styles.cameraEmptyText}>
            {cameraPresentationState === 'permission' ? 'Camera permission needed' : 'Camera unavailable'}
          </Text>
        </View>
      ) : null}
      {cameraPresentationState === 'preparing' ? (
        <View style={[styles.cameraEmpty, isFullMirror && styles.fullMirrorCameraEmpty]}>
          <Ionicons name="scan-circle-outline" size={42} color={colors.textPrimary} />
          <Text style={styles.cameraEmptyText}>Opening camera</Text>
        </View>
      ) : null}
      {visibleTrackingProblem !== 'none' ? (
        <View style={styles.cameraStatusBadge}>
          <Text style={styles.cameraStatusText}>{visibleTrackingProblemLabel}</Text>
        </View>
      ) : null}
      <View style={styles.faceTarget}>
        <View style={styles.faceTargetDot} />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {isFullMirror ? <View style={styles.fullMirrorCameraLayer}>{cameraSurface}</View> : null}
      <SafeAreaView style={[styles.safeArea, isFullMirror && styles.safeAreaFullMirror]} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <View style={styles.timerPill}>
            <Ionicons name="time-outline" size={17} color={colors.textSecondary} />
            <Text style={styles.timer}>{formatTime(duration)}</Text>
          </View>

          <Pressable
            style={styles.topButton}
            onPress={() => (isPaused ? resumeWorkout() : pauseWorkout())}
            testID="session-pause-toggle"
            accessibilityLabel="session-pause-toggle"
          >
            <Ionicons
              name={isPaused ? 'play' : 'pause'}
              size={20}
              color={colors.textPrimary}
            />
          </Pressable>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricBlock}>
            <Text style={styles.metricValue}>{reps}</Text>
            <Text style={styles.metricLabel}>REPS</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricBlock}>
            <Text style={styles.metricValueSmall}>{sessionState === 'resting' ? restRemaining : Math.max(0, goal - reps)}</Text>
            <Text style={styles.metricLabel}>{sessionState === 'resting' ? 'REST' : 'LEFT'}</Text>
          </View>
        </View>

        <View style={[styles.centerArea, isFullMirror && styles.centerAreaFullMirror]}>
          {isFullMirror ? null : cameraSurface}

          {hasSetPlan ? (
            <View style={styles.setGuide}>
              <Text style={styles.setGuideTitle}>Set {Math.min(currentSetIndex + 1, sets.length)} of {sets.length}</Text>
              <Text style={styles.setGuideBody}>
                {sessionState === 'resting'
                  ? nextSetTarget
                    ? `Next set: ${nextSetTarget} reps`
                    : 'Final set complete'
                  : `${Math.min(repsInCurrentSet, currentSetTarget)} / ${currentSetTarget} reps`}
              </Text>
            </View>
          ) : null}

          {coachCue ? (
            <View style={styles.inlineCue}>
              <Ionicons name={coachCue.icon} size={18} color={colors.textSecondary} />
              <Text style={styles.inlineCueText}>{coachCue.title}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.bottomArea}>
          <Pressable
            style={styles.endBtn}
            onPress={handleEnd}
            testID="session-end"
            accessibilityLabel="session-end"
          >
            <Ionicons name="stop" size={22} color={colors.textPrimary} />
            <Text style={styles.endText}>End</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeAreaFullMirror: {
    backgroundColor: 'transparent',
  },
  fullMirrorCameraLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  timer: {
    ...typography.body,
    color: colors.textPrimary,
    letterSpacing: 0,
  },
  topButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingTop: spacing.md,
  },
  metricBlock: {
    minWidth: 92,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: 38,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  metricValue: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0,
  },
  metricValueSmall: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0,
  },
  metricLabel: {
    ...typography.label,
    color: colors.textSecondary,
    letterSpacing: 2,
  },
  centerArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  cameraCircle: {
    width: '80%',
    maxWidth: 340,
    aspectRatio: 1,
    borderRadius: 999,
  },
  cameraFrame: {
    overflow: 'hidden',
    backgroundColor: '#050505',
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullMirrorCameraFrame: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: '#000',
  },
  centerAreaFullMirror: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  cameraCircleReady: {
    borderColor: 'rgba(35, 197, 118, 0.72)',
  },
  cameraCircleWaiting: {
    borderColor: 'rgba(245, 158, 11, 0.72)',
  },
  cameraCircleBad: {
    borderColor: 'rgba(255, 77, 109, 0.82)',
  },
  cameraEmpty: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: '#050505',
  },
  fullMirrorCameraEmpty: {
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  cameraEmptyText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  cameraStatusBadge: {
    position: 'absolute',
    bottom: spacing.lg,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  cameraStatusText: {
    ...typography.captionBold,
    color: colors.textPrimary,
  },
  faceTarget: {
    position: 'absolute',
    width: '44%',
    aspectRatio: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceTargetDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.66)',
  },
  setGuide: {
    minWidth: 180,
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.sm,
  },
  setGuideTitle: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  setGuideBody: {
    ...typography.bodySmall,
    color: colors.textPrimary,
  },
  inlineCue: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  inlineCueText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  coachCue: {
    width: '88%',
    minHeight: 66,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  coachCueGood: {
    backgroundColor: 'rgba(35, 197, 118, 0.16)',
    borderColor: 'rgba(35, 197, 118, 0.34)',
  },
  coachCueWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    borderColor: 'rgba(245, 158, 11, 0.38)',
  },
  coachCueDanger: {
    backgroundColor: 'rgba(255, 77, 109, 0.18)',
    borderColor: 'rgba(255, 77, 109, 0.42)',
  },
  coachCueNeutral: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  coachCueCopy: {
    flex: 1,
    gap: 2,
  },
  coachCueTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  coachCueBody: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  bottomArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  endBtn: {
    minWidth: 116,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
});
