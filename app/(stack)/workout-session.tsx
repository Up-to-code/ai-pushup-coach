import React, { useEffect, useRef, useState } from 'react';
import { Alert, NativeModules, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@clerk/clerk-expo';
import * as Haptics from 'expo-haptics';
import { Camera } from 'expo-camera/legacy';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { PushupCameraView, pushupCameraAvailable, type FaceMetricsEvent } from '../../src/components/PushupCameraView';
import {
  useSettingsStore,
  useUserStore,
  useWorkoutStore,
  type CameraPresentationState,
  type FormFeedbackState,
} from '../../src/store';
import { borderRadius, colors, spacing, typography } from '../../src/theme';

const REP_DEBOUNCE_MS = 260;
const DETECTION_STALE_MS = 1600;
const NATIVE_PREVIEW_TIMEOUT_MS = 2200;
const CALIBRATION_SAMPLE_COUNT = 6;
const FACE_CENTER_TOLERANCE = 0.4;
const DOWN_HOLD_MS = 60;
const MIN_FACE_HEIGHT = 0.05;
type TrackingPhase = 'calibrating' | 'ready' | 'down' | 'recenter';
type TrackingProblem = 'none' | 'dark' | 'offCenter' | 'tooFar' | 'unavailable';

const PushupSpeech = NativeModules.PushupSpeech as
  | { speak: (count: number) => void }
  | undefined;

export default function WorkoutSessionScreen() {
  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const trackingPhaseRef = useRef<TrackingPhase>('calibrating');
  const lastRepAtRef = useRef(0);
  const lastMetricsAtRef = useRef(0);
  const lastTrackingSyncAtRef = useRef(0);
  const lastDownFaceHeightRef = useRef(0);
  const lastDownAtRef = useRef(0);
  const sessionStartedSyncedRef = useRef(false);
  const calibrationSamplesRef = useRef<number[]>([]);

  const [duration, setDuration] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceHeight, setFaceHeight] = useState(0);
  const [faceCenterX, setFaceCenterX] = useState(0.5);
  const [faceCenterY, setFaceCenterY] = useState(0.5);
  const [trackingPhase, setTrackingPhase] = useState<TrackingPhase>('calibrating');
  const [trackingProblem, setTrackingProblem] = useState<TrackingProblem>('none');
  const [upFaceHeightBaseline, setUpFaceHeightBaseline] = useState<number | null>(null);
  const [formFeedback, setFormFeedback] = useState<FormFeedbackState>('good');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [guardArmed, setGuardArmed] = useState(false);
  const [nativeEventReceived, setNativeEventReceived] = useState(false);
  const [nativeFallbackActive, setNativeFallbackActive] = useState(false);
  const [expoCameraFailed, setExpoCameraFailed] = useState(false);
  const { userId } = useAuth();
  const user = useUserStore((state) => state.user);
  const convexUserId = userId ?? user.id;

  const {
    currentWorkout,
    isPaused,
    incrementReps,
    pauseWorkout,
    resumeWorkout,
    updateDuration,
    updateCurrentWorkout,
  } = useWorkoutStore();

  const reps = currentWorkout?.reps || 0;
  const goal = currentWorkout?.goal || 50;
  const submitWorkout = useMutation(api.workouts.submitWorkout);
  const logWorkoutEvent = useMutation(api.telemetry.logWorkoutEvent);
  const logFaceTrackingSample = useMutation(api.telemetry.logFaceTrackingSample);

  useEffect(() => {
    const timer = setTimeout(() => setGuardArmed(true), 250);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (guardArmed && !currentWorkout?.id) {
      router.replace('/(tabs)/practice' as any);
    }
  }, [currentWorkout?.id, guardArmed, router]);

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
    if (!currentWorkout?.id) {
      return;
    }

    if (!isPaused) {
      timerRef.current = setInterval(() => {
        setDuration((value) => value + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentWorkout?.id, isPaused]);

  useEffect(() => {
    const staleTimer = setInterval(() => {
      if (!pushupCameraAvailable || isPaused || lastMetricsAtRef.current === 0) {
        return;
      }

      if (Date.now() - lastMetricsAtRef.current > DETECTION_STALE_MS) {
        setFaceDetected(false);
        setFormFeedback('incomplete');
        setTrackingProblem('dark');
        trackingPhaseRef.current = 'recenter';
        setTrackingPhase('recenter');
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

  const getThresholds = (baseline: number) => {
    const downThreshold = Math.min(
      0.86,
      baseline + Math.max(0.035, baseline * 0.22)
    );
    const upReturnThreshold = Math.max(
      MIN_FACE_HEIGHT,
      Math.min(downThreshold - 0.025, baseline + Math.max(0.018, baseline * 0.1))
    );

    return { downThreshold, upReturnThreshold };
  };

  const setTrackingPhaseState = (nextPhase: TrackingPhase) => {
    trackingPhaseRef.current = nextPhase;
    setTrackingPhase(nextPhase);
  };

  const triggerRep = async () => {
    const nextRep = reps + 1;
    incrementReps();
    const interval = lastRepAtRef.current ? Date.now() - lastRepAtRef.current : null;
    lastRepAtRef.current = Date.now();

    let nextFeedback: FormFeedbackState = 'good';
    if (interval !== null && interval < 420) {
      nextFeedback = 'tooFast';
    } else if (lastDownFaceHeightRef.current - faceHeight < 0.06) {
      nextFeedback = 'incomplete';
    } else if (Math.abs(faceCenterX - 0.5) > 0.24) {
      nextFeedback = 'badForm';
    }

    setFormFeedback(nextFeedback);
    updateCurrentWorkout({
      formFeedbackState: nextFeedback,
      cameraPresentationState,
      qualityScore:
        nextFeedback === 'good'
          ? 92
          : nextFeedback === 'tooFast'
            ? 74
            : nextFeedback === 'badForm'
              ? 68
              : 62,
    });

    if (useSettingsStore.getState().settings.hapticsEnabled) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (useSettingsStore.getState().settings.soundEnabled) {
      PushupSpeech?.speak(nextRep);
    }

    if (currentWorkout?.id) {
      void logWorkoutEvent({
        clientUserId: convexUserId,
        clientWorkoutId: currentWorkout.id,
        type: 'repCounted',
        rep: nextRep,
        phase: trackingPhaseRef.current,
        formFeedbackState: nextFeedback,
        cameraPresentationState,
      }).catch((error) => {
        console.warn('Convex rep event sync failed', error);
      });
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

    if (currentWorkout?.id && now - lastTrackingSyncAtRef.current > 1000) {
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
        brightnessState: payload.faceDetected ? 'ok' : 'dark',
      }).catch(() => {
        // Draft workout sync may still be catching up; the next sample can retry.
      });
    }

    if (payload.status === 'searching' && cameraReady) {
      setFormFeedback('incomplete');
      setTrackingProblem('dark');
    }

    if (
      isPaused ||
      !payload.cameraReady ||
      !payload.faceDetected ||
      payload.status === 'denied' ||
      payload.status === 'unavailable'
    ) {
      if (!payload.faceDetected) {
        setTrackingProblem('dark');
      }
      return;
    }

    if (Math.abs(payload.centerX - 0.5) > FACE_CENTER_TOLERANCE) {
      setFormFeedback('badForm');
      setTrackingProblem('offCenter');
      setTrackingPhaseState('recenter');
      return;
    }

    if (payload.faceHeight < MIN_FACE_HEIGHT) {
      setFormFeedback('incomplete');
      setTrackingProblem('tooFar');
      setTrackingPhaseState('recenter');
      return;
    }

    setTrackingProblem('none');

    if (upFaceHeightBaseline === null) {
      calibrationSamplesRef.current = [
        ...calibrationSamplesRef.current.slice(-(CALIBRATION_SAMPLE_COUNT - 1)),
        payload.faceHeight,
      ];

      setTrackingPhaseState('calibrating');
      setFormFeedback('incomplete');

      if (calibrationSamplesRef.current.length >= CALIBRATION_SAMPLE_COUNT) {
        const average =
          calibrationSamplesRef.current.reduce((sum, sample) => sum + sample, 0) /
          calibrationSamplesRef.current.length;
        setUpFaceHeightBaseline(average);
        setTrackingPhaseState('ready');
        setFormFeedback('good');
      }

      return;
    }

    const { downThreshold, upReturnThreshold } = getThresholds(upFaceHeightBaseline);

    if (trackingPhaseRef.current === 'ready' && payload.faceHeight < upReturnThreshold) {
      setUpFaceHeightBaseline((currentBaseline) => {
        if (currentBaseline === null) {
          return payload.faceHeight;
        }

        return currentBaseline * 0.94 + payload.faceHeight * 0.06;
      });
    }

    if (payload.faceHeight >= downThreshold && trackingPhaseRef.current !== 'down') {
      lastDownFaceHeightRef.current = payload.faceHeight;
      lastDownAtRef.current = now;
      setTrackingPhaseState('down');
      setFormFeedback('good');
      return;
    }

    if (trackingPhaseRef.current === 'down') {
      lastDownFaceHeightRef.current = Math.max(lastDownFaceHeightRef.current, payload.faceHeight);

      if (payload.faceHeight <= upReturnThreshold) {
        const heldDownLongEnough = now - lastDownAtRef.current >= DOWN_HOLD_MS;
        const debouncePassed = now - lastRepAtRef.current > REP_DEBOUNCE_MS;
        setTrackingPhaseState('ready');

        if (heldDownLongEnough && debouncePassed) {
          void triggerRep();
        } else {
          setFormFeedback('tooFast');
        }
      }

      return;
    }

    setTrackingPhaseState('ready');
  };

  const handleEnd = () => {
    Alert.alert('Finish workout?', 'Your results will be saved.', [
      { text: 'Keep going', style: 'cancel' },
      {
        text: 'Finish',
        style: 'destructive',
        onPress: () => {
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          updateDuration(duration);
          updateCurrentWorkout({
            duration,
            formFeedbackState: formFeedback,
            cameraPresentationState,
          });
          router.replace('/(stack)/workout-complete');
        },
      },
    ]);
  };

  useEffect(() => {
    if (currentWorkout?.id) {
      updateCurrentWorkout({ cameraPresentationState });
    }
  }, [cameraPresentationState, currentWorkout?.id, updateCurrentWorkout]);

  useEffect(() => {
    if (!currentWorkout?.id || sessionStartedSyncedRef.current) {
      return;
    }

    sessionStartedSyncedRef.current = true;

    async function syncWorkoutStart() {
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

        await logWorkoutEvent({
          clientUserId: convexUserId,
          clientWorkoutId: currentWorkout!.id!,
          type: 'sessionStarted',
          cameraPresentationState,
          message: `Started ${currentWorkout!.trainingCameraMode || 'faceFocus'} workout`,
        });
      } catch (error) {
        sessionStartedSyncedRef.current = false;
        console.warn('Convex workout start sync failed', error);
      }
    }

    void syncWorkoutStart();
  }, [cameraPresentationState, convexUserId, currentWorkout, logWorkoutEvent, submitWorkout]);

  const statusLabel = {
    permission: 'Permission needed',
    preparing: 'Preparing camera',
    tracking: 'Live tracking',
    manualFallback: 'Tracking unavailable',
    unavailable: 'Real camera required',
  }[cameraPresentationState];

  const stateMessage = {
    permission: 'Enable camera access to let the live session preview appear.',
    preparing: 'Opening the camera and warming up tracking.',
    tracking: faceDetected
      ? 'Tracking your face distance.'
      : 'Center your face above the phone.',
    manualFallback: 'Face tracking is not available on this camera path.',
    unavailable:
      'The app could not open a usable camera preview in this environment. Reopen the session or try a real iPhone.',
  }[cameraPresentationState];

  const phaseLabel = {
    calibrating: 'Calibrating',
    ready: 'Ready',
    down: 'Down',
    recenter: 'Re-center',
  }[trackingPhase];

  const trackingProblemLabel = {
    none: phaseLabel,
    dark: 'More light',
    offCenter: 'Center face',
    tooFar: 'Move closer',
    unavailable: 'No tracking',
  }[trackingProblem];

  return (
    <View style={styles.container}>
      {cameraPresentationState === 'tracking' || cameraPresentationState === 'preparing' ? (
        <PushupCameraView
          style={StyleSheet.absoluteFillObject}
          paused={isPaused}
          onFaceMetrics={handleFaceMetrics}
        />
      ) : null}

      {cameraPresentationState === 'manualFallback' ? (
        <Camera
          style={StyleSheet.absoluteFillObject}
          type={'front' as any}
          ratio="16:9"
          onMountError={() => setExpoCameraFailed(true)}
        />
      ) : null}

      {(cameraPresentationState === 'permission' || cameraPresentationState === 'unavailable') && (
        <View style={styles.stateOverlay}>
          <Text style={styles.stateTitle}>{statusLabel}</Text>
          <Text style={styles.stateBody}>{stateMessage}</Text>
        </View>
      )}

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
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

        <View style={styles.centerArea}>
          <Text style={styles.modeCopy}>
            {cameraPresentationState === 'tracking' ? trackingProblemLabel : statusLabel}
          </Text>
          <View style={styles.repWrap}>
            <Text style={styles.repCount}>{reps}</Text>
            <Text style={styles.repLabel}>PUSHUPS</Text>
          </View>

          <View style={styles.progressInfo}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(100, (reps / goal) * 100)}%` }]} />
            </View>
            <Text style={styles.goalText}>{goal - reps > 0 ? `${goal - reps} to goal` : 'Goal reached'}</Text>
          </View>
        </View>

        <View style={styles.bottomArea}>
          <Pressable
            style={styles.endBtn}
            onPress={handleEnd}
            testID="session-end"
            accessibilityLabel="session-end"
          >
            <Ionicons name="stop" size={24} color={colors.textPrimary} />
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
  stateOverlay: {
    position: 'absolute',
    top: '30%',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 3,
    backgroundColor: 'rgba(9, 11, 16, 0.92)',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  stateTitle: {
    ...typography.headline,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  stateBody: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  safeArea: {
    flex: 1,
    zIndex: 2,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  timer: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  topButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  repWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 188,
  },
  repCount: {
    fontSize: 152,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 0,
    lineHeight: 164,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 16,
  },
  repLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginTop: -spacing.sm,
    letterSpacing: 2,
  },
  modeCopy: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    minHeight: 28,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.24)',
    overflow: 'hidden',
  },
  progressInfo: {
    width: '76%',
    marginTop: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.accent,
  },
  goalText: {
    ...typography.captionBold,
    color: colors.textPrimary,
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
    backgroundColor: 'rgba(0,0,0,0.32)',
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
