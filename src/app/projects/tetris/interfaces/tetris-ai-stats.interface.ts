export interface TetrisAiStats {
  totalEpisodes: number;
  totalSteps: number;
  bestScore: number;
  epsilon: number;
  averageScore: number;
  lifetimeAverageScore: number;
  averageLinesClearedPerEpisode: number;
  averagePiecesPerEpisode: number;
  totalScore: number;
  totalLinesCleared: number;
  totalPiecesPlaced: number;
  recentScores: number[];
  recentLinesCleared: number[];
  recentPiecesPlaced: number[];
  demonstrationSamples: number;
}
