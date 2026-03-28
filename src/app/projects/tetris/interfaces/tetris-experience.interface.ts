export interface TetrisExperience {
  features: number[];
  reward: number;
  nextStateValue?: number;
  nextFeatures?: number[];
  done: boolean;
}
