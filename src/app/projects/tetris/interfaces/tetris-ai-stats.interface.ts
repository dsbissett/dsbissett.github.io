export interface TetrisAiStats {
  totalEpisodes: number;
  totalSteps: number;
  bestScore: number;
  bestTeacherScore: number;
  bestAiScore: number;
  epsilon: number;
  averageScore: number;
  averageTeacherScore: number;
  averageAiScore: number;
  lifetimeAverageScore: number;
  averageLinesClearedPerEpisode: number;
  averagePiecesPerEpisode: number;
  totalScore: number;
  totalTeacherScore: number;
  totalAiScore: number;
  totalLinesCleared: number;
  totalPiecesPlaced: number;
  teacherEpisodes: number;
  aiEpisodes: number;
  recentScores: number[];
  recentLinesCleared: number[];
  recentPiecesPlaced: number[];
  demonstrationSamples: number;
}
