import { PianoEvent } from './piano-event.interface';

export interface PianoLoadedPiece {
  events: PianoEvent[];
  sourceName: string;
}
