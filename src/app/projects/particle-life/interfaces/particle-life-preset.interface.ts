export interface ParticleLifePreset {
  readonly name: string;
  readonly speciesCount: number;
  readonly particleCount: number;
  readonly friction: number;
  readonly forceScale: number;
  readonly interactionRadius: number;
  readonly wrapEdges: boolean;
  readonly attractionMatrix: readonly (readonly number[])[];
}
