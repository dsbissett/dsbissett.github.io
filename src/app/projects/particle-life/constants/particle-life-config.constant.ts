import { ParticleLifeConfig } from '../interfaces/particle-life-config.interface';

export const PARTICLE_LIFE_CONFIG: ParticleLifeConfig = {
  defaultParticleCount: 800,
  defaultSpeciesCount: 5,
  maxParticleCount: 10000,
  maxSpeciesCount: 8,
  minSpeciesCount: 2,
  interactionRadius: 80,
  friction: 0.85,
  forceScale: 5,
  particleRadius: 2.5,
  maxDpr: 2,
  wrapEdges: true,
  beta: 0.3,
  explodeRadius: 400,
  explodeStrength: 360,
  minZoom: 0.1,
  maxZoom: 8,
  zoomSensitivity: 0.001,
};
