export interface ParticleLifeConfig {
  readonly defaultParticleCount: number;
  readonly defaultSpeciesCount: number;
  readonly maxParticleCount: number;
  readonly maxSpeciesCount: number;
  readonly minSpeciesCount: number;
  readonly interactionRadius: number;
  readonly friction: number;
  readonly forceScale: number;
  readonly particleRadius: number;
  readonly maxDpr: number;
  readonly wrapEdges: boolean;
  readonly beta: number;
  readonly explodeRadius: number;
  readonly explodeStrength: number;
  readonly minZoom: number;
  readonly maxZoom: number;
  readonly zoomSensitivity: number;
}
