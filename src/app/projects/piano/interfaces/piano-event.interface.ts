import { PianoEventType } from '../types/piano-event-type.type';
import { PianoHand } from '../types/piano-hand.type';

export interface PianoEvent {
  tMs: number;
  type: PianoEventType;
  midi: number;
  vel?: number;
  hand: PianoHand | null;
}
