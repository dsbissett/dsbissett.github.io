import { PianoHand } from '../types/piano-hand.type';

export interface PianoRollNote {
  midi: number;
  startMs: number;
  endMs: number;
  hand: PianoHand;
}
