export interface PianoConfig {
  readonly noteNames: readonly string[];
  readonly startKey: number;
  readonly endKey: number;
  readonly midiOffset: number;
  readonly rollLeadInMs: number;
}
