import { PianoConfig } from '../interfaces/piano-config.interface';

export const PIANO_CONFIG: PianoConfig = {
  noteNames: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
  startKey: 1,
  endKey: 88,
  midiOffset: 20,
  rollLeadInMs: 2600,
};
