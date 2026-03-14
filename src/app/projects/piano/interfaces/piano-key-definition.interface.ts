export interface PianoKeyDefinition {
  keyIndex: number;
  midi: number;
  noteName: string;
  octave: number;
  isBlack: boolean;
  label: string;
  precedingWhiteKeys: number;
}
