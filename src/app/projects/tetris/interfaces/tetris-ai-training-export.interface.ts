import { TetrisAiStats } from './tetris-ai-stats.interface';
import { TetrisExperience } from './tetris-experience.interface';
import { TetrisDemonstrationExample } from './tetris-demonstration-example.interface';
import { TetrisSerializedModelArtifacts } from './tetris-serialized-model-artifacts.interface';

export interface TetrisAiTrainingExport {
  version: 1;
  exportedAt: string;
  stats: TetrisAiStats;
  replayBuffer: TetrisExperience[];
  demonstrations: TetrisDemonstrationExample[];
  model: TetrisSerializedModelArtifacts;
}
