export type FaceTrackingPhase = 'waiting' | 'calibratingTop' | 'ready' | 'down' | 'returning';

export type FaceTrackingProblem = 'none' | 'dark' | 'offCenter' | 'tooFar' | 'unavailable';

export type FaceTrackingStatus = 'ready' | 'tracking' | 'searching' | 'denied' | 'unavailable';

export type FacePushupEvent =
  | 'sessionStarted'
  | 'repCounted'
  | 'badTracking'
  | 'calibrated';

export interface FacePushupMetric {
  status: FaceTrackingStatus;
  cameraReady: boolean;
  faceDetected: boolean;
  faceHeight: number;
  centerX: number;
  centerY: number;
  timestamp: number;
}

export interface FacePushupTrackerConfig {
  calibrationSampleCount: number;
  centerToleranceX: number;
  centerToleranceY: number;
  debounceMs: number;
  downHoldMs: number;
  minDepthDelta: number;
  minFaceHeight: number;
  stableStartMs: number;
}

export interface FacePushupTrackerState {
  baseline: number | null;
  calibrationSamples: number[];
  events: FacePushupEvent[];
  lastDownAt: number;
  lastDownFaceHeight: number;
  lastGoodFaceAt: number;
  lastRepAt: number;
  phase: FaceTrackingPhase;
  problem: FaceTrackingProblem;
  reps: number;
  sessionStarted: boolean;
  stableFaceSince: number | null;
}

export const defaultFacePushupTrackerConfig: FacePushupTrackerConfig = {
  calibrationSampleCount: 6,
  centerToleranceX: 0.4,
  centerToleranceY: 0.42,
  debounceMs: 260,
  downHoldMs: 80,
  minDepthDelta: 0.045,
  minFaceHeight: 0.05,
  stableStartMs: 500,
};

export function createFacePushupTrackerState(): FacePushupTrackerState {
  return {
    baseline: null,
    calibrationSamples: [],
    events: [],
    lastDownAt: 0,
    lastDownFaceHeight: 0,
    lastGoodFaceAt: 0,
    lastRepAt: 0,
    phase: 'waiting',
    problem: 'dark',
    reps: 0,
    sessionStarted: false,
    stableFaceSince: null,
  };
}

export function getFacePushupThresholds(
  baseline: number,
  config: FacePushupTrackerConfig = defaultFacePushupTrackerConfig
) {
  const downThreshold = Math.min(
    0.86,
    baseline + Math.max(config.minDepthDelta, baseline * 0.22)
  );
  const upReturnThreshold = Math.max(
    config.minFaceHeight,
    Math.min(downThreshold - 0.025, baseline + Math.max(0.018, baseline * 0.1))
  );

  return { downThreshold, upReturnThreshold };
}

function getMetricProblem(
  metric: FacePushupMetric,
  config: FacePushupTrackerConfig
): FaceTrackingProblem {
  if (metric.status === 'denied' || metric.status === 'unavailable') {
    return 'unavailable';
  }

  if (!metric.cameraReady || !metric.faceDetected || metric.status === 'searching') {
    return 'dark';
  }

  if (
    Math.abs(metric.centerX - 0.5) > config.centerToleranceX ||
    Math.abs(metric.centerY - 0.5) > config.centerToleranceY
  ) {
    return 'offCenter';
  }

  if (metric.faceHeight < config.minFaceHeight) {
    return 'tooFar';
  }

  return 'none';
}

export function processFacePushupMetric(
  previous: FacePushupTrackerState,
  metric: FacePushupMetric,
  config: FacePushupTrackerConfig = defaultFacePushupTrackerConfig
): FacePushupTrackerState {
  const events: FacePushupEvent[] = [];
  const problem = getMetricProblem(metric, config);
  const now = metric.timestamp;

  if (problem !== 'none') {
    return {
      ...previous,
      events: ['badTracking'],
      phase: previous.sessionStarted ? previous.phase : 'waiting',
      problem,
      stableFaceSince: null,
    };
  }

  const stableFaceSince = previous.stableFaceSince ?? now;
  const hasStableFace = now - stableFaceSince >= config.stableStartMs;
  const sessionStarted = previous.sessionStarted || hasStableFace;

  if (!sessionStarted) {
    return {
      ...previous,
      events,
      lastGoodFaceAt: now,
      phase: 'waiting',
      problem: 'none',
      stableFaceSince,
    };
  }

  if (!previous.sessionStarted) {
    events.push('sessionStarted');
  }

  if (previous.baseline === null) {
    const calibrationSamples = [
      ...previous.calibrationSamples.slice(-(config.calibrationSampleCount - 1)),
      metric.faceHeight,
    ];

    if (calibrationSamples.length >= config.calibrationSampleCount) {
      const baseline =
        calibrationSamples.reduce((sum, sample) => sum + sample, 0) /
        calibrationSamples.length;
      events.push('calibrated');
      return {
        ...previous,
        baseline,
        calibrationSamples,
        events,
        lastGoodFaceAt: now,
        phase: 'ready',
        problem: 'none',
        sessionStarted: true,
        stableFaceSince,
      };
    }

    return {
      ...previous,
      calibrationSamples,
      events,
      lastGoodFaceAt: now,
      phase: 'calibratingTop',
      problem: 'none',
      sessionStarted: true,
      stableFaceSince,
    };
  }

  const { downThreshold, upReturnThreshold } = getFacePushupThresholds(previous.baseline, config);
  let baseline = previous.baseline;
  let phase = previous.phase;
  let lastDownAt = previous.lastDownAt;
  let lastDownFaceHeight = previous.lastDownFaceHeight;
  let lastRepAt = previous.lastRepAt;
  let reps = previous.reps;

  if (phase === 'ready' && metric.faceHeight < upReturnThreshold) {
    baseline = baseline * 0.94 + metric.faceHeight * 0.06;
  }

  if (phase !== 'down' && phase !== 'returning' && metric.faceHeight >= downThreshold) {
    phase = 'down';
    lastDownAt = now;
    lastDownFaceHeight = metric.faceHeight;
  } else if (phase === 'down' || phase === 'returning') {
    lastDownFaceHeight = Math.max(lastDownFaceHeight, metric.faceHeight);

    if (metric.faceHeight < lastDownFaceHeight - 0.02 && metric.faceHeight > upReturnThreshold) {
      phase = 'returning';
    }

    if (metric.faceHeight <= upReturnThreshold) {
      const heldDownLongEnough = now - lastDownAt >= config.downHoldMs;
      const debouncePassed = now - lastRepAt > config.debounceMs;
      const depthPassed = lastDownFaceHeight - baseline >= config.minDepthDelta;
      phase = 'ready';

      if (heldDownLongEnough && debouncePassed && depthPassed) {
        reps += 1;
        lastRepAt = now;
        events.push('repCounted');
      } else {
        events.push('badTracking');
      }
    }
  } else {
    phase = 'ready';
  }

  return {
    ...previous,
    baseline,
    events,
    lastDownAt,
    lastDownFaceHeight,
    lastGoodFaceAt: now,
    lastRepAt,
    phase,
    problem: 'none',
    reps,
    sessionStarted: true,
    stableFaceSince,
  };
}
