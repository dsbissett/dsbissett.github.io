export interface TetrisAiStats {
  totalEpisodes: number;
  totalSteps: number;
  bestScore: number;
  epsilon: number;
  averageScore: number;
  recentScores: number[];
  demonstrationSamples: number;
}
