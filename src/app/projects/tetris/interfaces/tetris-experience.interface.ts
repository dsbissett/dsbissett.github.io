export interface TetrisExperience {
  features: number[];
  /**
   * Features of the online-net argmax next afterstate, evaluated with the
   * target network at train time (double-DQN). Absent on terminal transitions.
   */
  nextFeatures?: number[];
  reward: number;
  done: boolean;
}
