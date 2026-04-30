export interface MonthlyStat {
  month: string;
  pushups: number;
  workouts: number;
}

export const mockStats = {
  monthlyData: [
    { month: 'Jan', pushups: 450, workouts: 12 },
    { month: 'Feb', pushups: 520, workouts: 14 },
    { month: 'Mar', pushups: 680, workouts: 18 },
    { month: 'Apr', pushups: 720, workouts: 20 },
    { month: 'May', pushups: 890, workouts: 22 },
    { month: 'Jun', pushups: 1050, workouts: 25 },
  ] as MonthlyStat[],
  totals: {
    totalPushups: 4310,
    totalDuration: 15840, // seconds
    totalCalories: 1250,
    practiceDays: 111,
    currentStreak: 5,
    bestStreak: 14,
  },
};

export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};