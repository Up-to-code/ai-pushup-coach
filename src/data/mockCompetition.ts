export interface LeaderboardEntry {
  id: string;
  rank: number;
  name: string;
  countryCode: string;
  score: number;
  isCurrentUser?: boolean;
}

export interface CountryCompetitionSnapshot {
  countryCode: string;
  countryName: string;
  userReps: number;
  countryAverage: number;
  deltaToBeat: number;
}

export const mockLeaderboard: LeaderboardEntry[] = [
  { id: '1', rank: 1, name: 'Omar H.', countryCode: 'EG', score: 120 },
  { id: '2', rank: 2, name: 'Ahmed Flex', countryCode: 'EG', score: 95, isCurrentUser: true },
  { id: '3', rank: 3, name: 'Youssef M.', countryCode: 'EG', score: 80 },
  { id: '4', rank: 4, name: 'Karim D.', countryCode: 'EG', score: 72 },
  { id: '5', rank: 5, name: 'Mostafa A.', countryCode: 'EG', score: 60 },
];

export const mockCountryCompetition: CountryCompetitionSnapshot = {
  countryCode: 'EG',
  countryName: 'Egypt',
  userReps: 36,
  countryAverage: 42,
  deltaToBeat: 12,
};
