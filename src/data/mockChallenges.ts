export interface Challenge {
  id: string;
  title: string;
  description: string;
  image?: string;
  category: string;
  rewards: string[];
  started?: boolean;
  completed?: boolean;
  progress?: number;
  goal?: number;
}

export const mockChallenges: Challenge[] = [
  {
    id: 'challenge-1',
    title: 'MAX PUSHUPS IN ONE MINUTE',
    description: 'Push yourself to the limit and beat your personal record in just 60 seconds!',
    category: 'Speed',
    rewards: ['🔥 Fire Badge', '+50 XP'],
    progress: 0,
    goal: 50,
  },
  {
    id: 'challenge-2',
    title: 'ROAD TO 100 PUSHUPS',
    description: 'Complete our 4-week program to achieve 100 pushups in a row.',
    category: 'Endurance',
    rewards: ['🏆 Champion Badge', '+200 XP'],
    started: true,
    progress: 13,
    goal: 17,
  },
  {
    id: 'challenge-3',
    title: '7 DAY STREAK',
    description: 'Work out for 7 consecutive days to build a strong habit.',
    category: 'Consistency',
    rewards: ['⚡ Streak Badge', '+100 XP'],
    progress: 3,
    goal: 7,
  },
  {
    id: 'challenge-4',
    title: 'CALORIE CRUSHER',
    description: 'Burn 500 calories doing push-ups this week.',
    category: 'Calories',
    rewards: ['🔥 Calorie Crusher', '+150 XP'],
    progress: 250,
    goal: 500,
  },
];