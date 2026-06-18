import React, { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Camera, CameraView } from 'expo-camera';
import { useConvexAuth, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../../src/auth';
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
import { useAppLocale } from '../../src/localization';

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
  t,
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
  t: ReturnType<typeof useAppLocale>['t'];
}): CoachCue {
  if (isPaused) {
    return {
      icon: 'pause-circle-outline',
      title: t('workout.pausedTitle'),
      body: t('workout.pausedBody'),
      tone: 'neutral',
    };
  }

  if (sessionState === 'resting') {
    return {
      icon: 'timer-outline',
      title: t('workout.restTitle', { count: restRemaining }),
      body: nextSetTarget ? t('workout.nextTarget', { count: nextSetTarget }) : t('workout.lastSetComplete'),
      tone: 'neutral',
    };
  }

  if (cameraPresentationState === 'permission') {
    return {
      icon: 'camera-outline',
      title: t('workout.cameraNeededTitle'),
      body: t('workout.cameraNeededBody'),
      tone: 'danger',
    };
  }

  if (cameraPresentationState === 'preparing') {
    return {
      icon: 'scan-circle-outline',
      title: t('workout.openingCamera'),
      body: t('workout.openingCameraBody'),
      tone: 'neutral',
    };
  }

  if (cameraPresentationState === 'manualFallback') {
    return {
      icon: 'phone-portrait-outline',
      title: t('workout.trackingUnavailableTitle'),
      body: t('workout.trackingUnavailableBody'),
      tone: 'warning',
    };
  }

  if (cameraPresentationState === 'unavailable') {
    return {
      icon: 'warning-outline',
      title: t('workout.cameraUnavailableTitle'),
      body: t('workout.cameraUnavailableBody'),
      tone: 'danger',
    };
  }

  if (trackingProblem === 'dark') {
    return {
      icon: 'sunny-outline',
      title: t('workout.needLightTitle'),
      body: t('workout.needLightBody'),
      tone: 'warning',
    };
  }

  if (trackingProblem === 'noFace' || !faceDetected) {
    return {
      icon: 'scan-circle-outline',
      title: t('workout.needFaceTitle'),
      body: t('workout.needFaceBody'),
      tone: 'warning',
    };
  }

  if (trackingProblem === 'offCenter') {
    const horizontalHint = faceCenterX < 0.5 ? t('workout.moveRight') : t('workout.moveLeft');
    const verticalHint = faceCenterY < 0.5 ? t('workout.lowerPhone') : t('workout.raisePhone');
    return {
      icon: 'locate-outline',
      title: t('workout.centerFaceTitle'),
      body: `${horizontalHint}${Math.abs(faceCenterY - 0.5) > 0.24 ? verticalHint : ''}`,
      tone: 'warning',
    };
  }

  if (trackingProblem === 'tooFar') {
    return {
      icon: 'resize-outline',
      title: t('workout.moveCloserTitle'),
      body: t('workout.moveCloserBody'),
      tone: 'warning',
    };
  }

  if (sessionState === 'waitingForFace' || trackingPhase === 'waiting') {
    return {
      icon: 'scan-outline',
      title: t('workout.findFaceTitle'),
      body: t('workout.findFaceBody'),
      tone: 'neutral',
    };
  }

  if (trackingPhase === 'calibratingTop') {
    return {
      icon: 'scan-outline',
      title: t('workout.holdTopTitle'),
      body: t('workout.holdTopBody'),
      tone: 'neutral',
    };
  }

  if (trackingPhase === 'down') {
    return {
      icon: 'arrow-up-circle-outline',
      title: t('workout.driveUpTitle'),
      body: t('workout.driveUpBody'),
      tone: 'good',
    };
  }

  if (trackingPhase === 'returning') {
    return {
      icon: 'arrow-up-outline',
      title: t('workout.finishRepTitle'),
      body: t('workout.finishRepBody'),
      tone: 'good',
    };
  }

  return {
    icon: 'checkmark-circle-outline',
    title: t('workout.readyTitle'),
    body: t('workout.readyBody'),
    tone: 'good',
  };
}

export default function WorkoutSessionScreen() {
  const router = useRouter();
  const { t } = useAppLocale();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMetricsAtRef = useRef(0);
  const lastTrackingSyncAtRef = useRef(0);
  const lastBadTrackingHapticAtRef = useRef(0);
  const trackingIssueSinceRef = useRef<number | null>(null);
  const finishStartedRef = useRef(false);
  const trackerRef = useRef<FacePushupTrackerState>(createFacePushupTrackerState());

  const [duration, setDuration] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceHeight, setFaceHeight] = useState(0);
  const [faceCenterX, setFaceCenterX] = useState(0.5);
  const [faceCenterY, setFaceCenterY] = useState(0.5);
  const [trackingPhase, setTrackingPhase] = useState<FaceTrackingPhase>('waiting');
  const [trackingProblem, setTrackingProblem] = useState<FaceTrackingProblem>('noFace');
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
  const auth = useAuth();
  const { isAuthenticated: isConvexAuthenticated } = useConvexAuth();
  const user = useUserStore((state) => state.user);
  const updateUser = useUserStore((state) => state.updateUser);
  const markCurrentDayCompleted = usePlanStore((state) => state.markCurrentDayCompleted);
  const convexUserId = auth.clientUserId ?? user.id;

  const canSyncConvex = Boolean(
    auth.status === 'signedIn' && 
    isConvexAuthenticated && 
    auth.clientUserId
  );

  useEffect(() => {
    if (auth.status === 'pendingDeletion') {
      router.replace('/restore-account' as any);
    }
  }, [auth.status, router]);

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
    setTrackingProblem('noFace');
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
    speakCue(t('workout.nextSet', { count: sets[nextSetIndex] ?? currentSetTarget }));
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [currentSetIndex, currentSetTarget, restRemaining, resumeWorkout, sessionState, sets, t]);

  useEffect(() => {
    const staleTimer = setInterval(() => {
      if (!pushupCameraAvailable || isPaused || lastMetricsAtRef.current === 0) {
        return;
      }

      if (Date.now() - lastMetricsAtRef.current > DETECTION_STALE_MS) {
        setFaceDetected(false);
        setFormFeedback('incomplete');
        setTrackingProblem('noFace');
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
        setVisibleTrackingProblem(trackingProblem === 'none' ? 'noFace' : trackingProblem);
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
      Alert.alert(t('workout.alertCouldNotFinishTitle'), t('workout.alertCouldNotFinishBody'));
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
        speakCue(t('workout.rest'));
        hapticNotification(Haptics.NotificationFeedbackType.Success);
      } else if (setCompletionAction === 'finish') {
        setSessionState('completed');
        pauseWorkout();
        speakCue(t('common.finish'));
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
        brightnessState: payload.brightnessState ?? (payload.faceDetected ? 'ok' : 'unknown'),
      }).catch(() => {
        // Draft workout sync may still be catching up; the next sample can retry.
      });
    }

    const metric: FacePushupMetric = {
      status: payload.status,
      brightnessState: payload.brightnessState,
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
      speakCue(t('workout.startCue'));
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
      Alert.alert(t('workout.noRepsTitle'), t('workout.noRepsBody'), [
        { text: t('workout.keepGoing'), style: 'cancel', onPress: () => { finishStartedRef.current = false; } },
        {
          text: t('common.discard'),
          style: 'destructive',
          onPress: () => {
            discardWorkout();
            router.replace('/practice' as any);
          },
        },
        {
          text: t('workout.saveIncomplete'),
          onPress: () => { finishSession(false); },
        },
      ]);
      return;
    }

    Alert.alert(t('workout.alertFinishTitle'), t('workout.alertFinishBody'), [
      { text: t('workout.keepGoing'), style: 'cancel', onPress: () => { finishStartedRef.current = false; } },
      {
        text: t('common.finish'),
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

  const statusLabel = {
    permission: t('workout.permissionNeeded'),
    preparing: t('workout.preparingCamera'),
    tracking: t('workout.liveTracking'),
    manualFallback: t('workout.noTracking'),
    unavailable: t('workout.realCameraRequired'),
  }[cameraPresentationState];

  const phaseLabel = {
    waiting: t('workout.findFaceTitle'),
    calibratingTop: t('workout.holdTopTitle'),
    ready: t('workout.readyTitle'),
    down: t('workout.down'),
    returning: t('workout.up'),
  }[trackingPhase];

  const trackingProblemLabel = {
    none: phaseLabel,
    noFace: t('workout.findFaceTitle'),
    dark: t('workout.moreLight'),
    offCenter: t('workout.centerFace'),
    tooFar: t('workout.moveCloserTitle'),
    unavailable: t('workout.noTracking'),
  }[trackingProblem];
  const visibleTrackingProblemLabel = {
    none: '',
    noFace: t('workout.findFaceTitle'),
    dark: t('workout.moreLight'),
    offCenter: t('workout.centerFace'),
    tooFar: t('workout.moveCloserTitle'),
    unavailable: t('workout.noTracking'),
  }[visibleTrackingProblem];
  const liveStatusBadgeLabel =
    visibleTrackingProblem !== 'none'
      ? visibleTrackingProblemLabel
      : cameraPresentationState === 'tracking'
        ? trackingProblemLabel
        : statusLabel;

  const openCameraSettings = () => {
    void Linking.openSettings().catch((error) => {
      console.warn('Could not open settings for camera permission', error);
      Alert.alert(t('workout.openSettings'), t('workout.openSettingsBody'));
    });
  };

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
    t,
  }) : null;

  const cameraRingState: CameraRingState =
    trackingProblem === 'none' && sessionState !== 'waitingForFace'
      ? 'ready'
      : cameraPresentationState === 'permission' ||
          cameraPresentationState === 'unavailable' ||
          trackingProblem === 'noFace' ||
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
          style={StyleSheet.absoluteFill}
          paused={isPaused}
          onFaceMetrics={handleFaceMetrics}
        />
      ) : null}

      {shouldRenderNativeCamera && cameraPresentationState === 'manualFallback' ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="front"
          {...(!isFullMirror ? { ratio: '1:1' } : {})}
          onMountError={() => setExpoCameraFailed(true)}
        />
      ) : null}

      {(cameraPresentationState === 'permission' || cameraPresentationState === 'unavailable') ? (
        <View style={[styles.cameraEmpty, isFullMirror && styles.fullMirrorCameraEmpty]}>
          <Ionicons name={cameraPresentationState === 'permission' ? 'camera-outline' : 'warning-outline'} size={42} color={colors.textPrimary} />
          <Text style={styles.cameraEmptyText}>
            {cameraPresentationState === 'permission' ? t('workout.cameraPermissionNeeded') : t('workout.cameraUnavailableTitle')}
          </Text>
          {cameraPresentationState === 'permission' ? (
            <Pressable
              accessibilityRole="button"
              onPress={openCameraSettings}
              style={styles.settingsButton}
            >
              <Ionicons name="settings-outline" size={16} color="#050505" />
              <Text style={styles.settingsButtonText}>{t('workout.openSettings')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {cameraPresentationState === 'preparing' ? (
        <View style={[styles.cameraEmpty, isFullMirror && styles.fullMirrorCameraEmpty]}>
          <Ionicons name="scan-circle-outline" size={42} color={colors.textPrimary} />
          <Text style={styles.cameraEmptyText}>{t('workout.openingCamera')}</Text>
        </View>
      ) : null}
      <View style={styles.cameraStatusBadge}>
        <View
          style={[
            styles.cameraStatusDot,
            cameraRingState === 'ready'
              ? styles.cameraStatusDotReady
              : cameraRingState === 'bad'
                ? styles.cameraStatusDotBad
                : styles.cameraStatusDotWaiting,
          ]}
        />
        <Text style={styles.cameraStatusText}>{liveStatusBadgeLabel}</Text>
      </View>
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
            <Text style={styles.metricLabel}>{t('workout.reps')}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricBlock}>
            <Text style={styles.metricValueSmall}>{sessionState === 'resting' ? restRemaining : Math.max(0, goal - reps)}</Text>
            <Text style={styles.metricLabel}>{sessionState === 'resting' ? t('workout.rest') : t('workout.left')}</Text>
          </View>
        </View>

        <View style={[styles.centerArea, isFullMirror && styles.centerAreaFullMirror]}>
          {isFullMirror ? null : cameraSurface}

          {hasSetPlan ? (
            <View style={styles.setGuide}>
              <Text style={styles.setGuideTitle}>
                {t('workout.setGuide', { current: Math.min(currentSetIndex + 1, sets.length), total: sets.length })}
              </Text>
              <Text style={styles.setGuideBody}>
                {sessionState === 'resting'
                  ? nextSetTarget
                    ? t('workout.nextSet', { count: nextSetTarget })
                    : t('workout.finalSetComplete')
                  : `${Math.min(repsInCurrentSet, currentSetTarget)} / ${currentSetTarget} ${t('profile.repsUnit').toLowerCase()}`}
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
            <Text style={styles.endText}>{t('workout.end')}</Text>
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
    ...StyleSheet.absoluteFill,
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
    ...StyleSheet.absoluteFill,
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
    ...StyleSheet.absoluteFill,
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
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.textPrimary,
  },
  settingsButtonText: {
    ...typography.captionBold,
    color: '#050505',
  },
  cameraStatusBadge: {
    position: 'absolute',
    bottom: spacing.lg,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.96)',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  cameraStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cameraStatusDotReady: {
    backgroundColor: colors.success,
  },
  cameraStatusDotWaiting: {
    backgroundColor: '#F59E0B',
  },
  cameraStatusDotBad: {
    backgroundColor: colors.accent,
  },
  cameraStatusText: {
    ...typography.captionBold,
    color: '#050505',
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
