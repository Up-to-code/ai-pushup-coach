export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const formatTimeFull = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const calculateCalories = (reps: number): number => {
  return Math.round(reps * 0.29);
};

export const calculateSpeed = (reps: number, durationSeconds: number): number => {
  if (durationSeconds === 0) return 0;
  return Math.round((reps / durationSeconds) * 60);
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

export const formatDayNumber = (day: number): string => {
  return day.toString();
};

export { generateTrainingPlan, getCurrentPlanDay, formatPreferredTime } from './planGenerator';
export { getCoachMessage } from './coachMessages';
export type { CoachMessageState } from './coachMessages';
