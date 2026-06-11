import { TetrisAiStats } from './tetris-ai-stats.interface';
import { TetrisExperience } from './tetris-experience.interface';
import { TetrisDemonstrationExample } from './tetris-demonstration-example.interface';
import { TetrisSerializedModelArtifacts } from './tetris-serialized-model-artifacts.interface';

export interface TetrisAiTrainingExport {
  // Version 2 (v8 training run): experiences carry nextFeatures and rewards use
  // the R6 scale. Version 1 exports are rejected — their frozen nextStateValue
  // bootstraps and clip-35 rewards would silently poison v8 training.
  version: 2;
  exportedAt: string;
  stats: TetrisAiStats;
  replayBuffer: TetrisExperience[];
  demonstrations: TetrisDemonstrationExample[];
  model: TetrisSerializedModelArtifacts;
}
