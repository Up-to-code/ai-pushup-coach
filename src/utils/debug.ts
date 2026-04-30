const DEBUG_ENABLED = __DEV__;

export function debugPlanSetup(event: string, data?: Record<string, unknown>) {
  if (!DEBUG_ENABLED) return;

  console.log(`[plan-setup] ${event}`, data ?? {});
}
