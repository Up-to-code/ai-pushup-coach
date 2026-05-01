import { describe, expect, it } from 'vitest';
import {
  createFacePushupTrackerState,
  defaultFacePushupTrackerConfig,
  processFacePushupMetric,
  type FacePushupMetric,
} from './facePushupTracker';

const config = {
  ...defaultFacePushupTrackerConfig,
  calibrationSampleCount: 3,
  stableStartMs: 200,
};

function metric(timestamp: number, faceHeight: number, overrides: Partial<FacePushupMetric> = {}): FacePushupMetric {
  return {
    status: 'tracking',
    cameraReady: true,
    faceDetected: true,
    faceHeight,
    centerX: 0.5,
    centerY: 0.5,
    timestamp,
    ...overrides,
  };
}

function readyState() {
  let state = createFacePushupTrackerState();
  for (const sample of [
    metric(0, 0.18),
    metric(220, 0.18),
    metric(260, 0.18),
    metric(300, 0.18),
    metric(340, 0.18),
  ]) {
    state = processFacePushupMetric(state, sample, config);
  }
  return state;
}

describe('facePushupTracker', () => {
  it('starts the session only after a stable centered face', () => {
    let state = createFacePushupTrackerState();

    state = processFacePushupMetric(state, metric(0, 0.18), config);
    expect(state.sessionStarted).toBe(false);
    expect(state.events).not.toContain('sessionStarted');

    state = processFacePushupMetric(state, metric(220, 0.18), config);
    expect(state.sessionStarted).toBe(true);
    expect(state.events).toContain('sessionStarted');
  });

  it('counts one full down and up cycle', () => {
    let state = readyState();

    state = processFacePushupMetric(state, metric(420, 0.24), config);
    expect(state.phase).toBe('down');

    state = processFacePushupMetric(state, metric(560, 0.18), config);
    expect(state.reps).toBe(1);
    expect(state.events).toContain('repCounted');
  });

  it('does not count half reps', () => {
    let state = readyState();

    state = processFacePushupMetric(state, metric(420, 0.205), config);
    state = processFacePushupMetric(state, metric(560, 0.18), config);

    expect(state.reps).toBe(0);
  });

  it('does not double count fast bounce cycles', () => {
    let state = readyState();

    state = processFacePushupMetric(state, metric(420, 0.24), config);
    state = processFacePushupMetric(state, metric(560, 0.18), config);
    state = processFacePushupMetric(state, metric(610, 0.24), config);
    state = processFacePushupMetric(state, metric(650, 0.18), config);

    expect(state.reps).toBe(1);
  });

  it('does not count when face is missing or off center', () => {
    let state = readyState();

    state = processFacePushupMetric(state, metric(420, 0.24, { faceDetected: false }), config);
    expect(state.problem).toBe('dark');
    expect(state.reps).toBe(0);

    state = processFacePushupMetric(state, metric(560, 0.24, { centerX: 0.02 }), config);
    expect(state.problem).toBe('offCenter');
    expect(state.reps).toBe(0);
  });
});
