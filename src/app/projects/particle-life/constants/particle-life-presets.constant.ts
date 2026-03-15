import { ParticleLifePreset } from '../interfaces/particle-life-preset.interface';

export const PARTICLE_LIFE_PRESETS: readonly ParticleLifePreset[] = [
  {
    name: 'Predator Prey',
    speciesCount: 4,
    particleCount: 1200,
    friction: 0.78,
    forceScale: 8,
    interactionRadius: 100,
    wrapEdges: true,
    attractionMatrix: [
      // R chases G, flees Y  (cyclic: R→G→B→Y→R)
      [ 0.1,  0.8, -0.1, -0.8],
      [-0.8,  0.1,  0.8, -0.1],
      [-0.1, -0.8,  0.1,  0.8],
      [ 0.8, -0.1, -0.8,  0.1],
    ],
  },
  {
    name: 'Symbiosis',
    speciesCount: 4,
    particleCount: 1000,
    friction: 0.85,
    forceScale: 6,
    interactionRadius: 90,
    wrapEdges: true,
    attractionMatrix: [
      // Pairs (0,1) and (2,3) mutually attract; cross-pair repulsion
      [ 0.2,  0.7, -0.4, -0.4],
      [ 0.7,  0.2, -0.4, -0.4],
      [-0.4, -0.4,  0.2,  0.7],
      [-0.4, -0.4,  0.7,  0.2],
    ],
  },
  {
    name: 'Cells',
    speciesCount: 5,
    particleCount: 1500,
    friction: 0.88,
    forceScale: 5,
    interactionRadius: 80,
    wrapEdges: true,
    attractionMatrix: [
      // Strong self-attraction, mild mutual repulsion → distinct clusters
      [ 0.9, -0.3, -0.3, -0.3, -0.3],
      [-0.3,  0.9, -0.3, -0.3, -0.3],
      [-0.3, -0.3,  0.9, -0.3, -0.3],
      [-0.3, -0.3, -0.3,  0.9, -0.3],
      [-0.3, -0.3, -0.3, -0.3,  0.9],
    ],
  },
  {
    name: 'Chaos',
    speciesCount: 6,
    particleCount: 1500,
    friction: 0.65,
    forceScale: 10,
    interactionRadius: 70,
    wrapEdges: true,
    attractionMatrix: [
      // Strong opposing forces, low friction → turbulent motion
      [ 0.3,  0.9, -0.7,  0.5, -0.9,  0.2],
      [-0.6,  0.3,  0.8, -0.9,  0.4, -0.7],
      [ 0.8, -0.5,  0.3,  0.7, -0.6,  0.9],
      [-0.9,  0.7, -0.4,  0.3,  0.8, -0.5],
      [ 0.4, -0.8,  0.6, -0.3,  0.3,  0.7],
      [-0.7,  0.5, -0.9,  0.8, -0.4,  0.3],
    ],
  },
  {
    name: 'Swarm',
    speciesCount: 3,
    particleCount: 1200,
    friction: 0.9,
    forceScale: 4,
    interactionRadius: 120,
    wrapEdges: true,
    attractionMatrix: [
      // Universal mild attraction → one giant flock
      [ 0.35, 0.25, 0.25],
      [ 0.25, 0.35, 0.25],
      [ 0.25, 0.25, 0.35],
    ],
  },
  {
    name: 'Snakes',
    speciesCount: 3,
    particleCount: 800,
    friction: 0.82,
    forceScale: 7,
    interactionRadius: 90,
    wrapEdges: true,
    attractionMatrix: [
      // Asymmetric cyclic + strong self-attraction → chain-like structures
      [ 1.0,  0.4, -0.6],
      [-0.6,  1.0,  0.4],
      [ 0.4, -0.6,  1.0],
    ],
  },
  {
    name: 'Orbits',
    speciesCount: 4,
    particleCount: 1000,
    friction: 0.75,
    forceScale: 6,
    interactionRadius: 110,
    wrapEdges: true,
    attractionMatrix: [
      // Rotational asymmetry → swirling galaxy-like patterns
      [ 0.1,  0.6, -0.3, -0.6],
      [-0.6,  0.1,  0.6, -0.3],
      [-0.3, -0.6,  0.1,  0.6],
      [ 0.6, -0.3, -0.6,  0.1],
    ],
  },
  {
    name: 'Tribes',
    speciesCount: 2,
    particleCount: 1200,
    friction: 0.85,
    forceScale: 6,
    interactionRadius: 80,
    wrapEdges: true,
    attractionMatrix: [
      // Two factions: self-attract, mutual repel
      [ 0.8, -1.0],
      [-1.0,  0.8],
    ],
  },
  {
    name: 'Ecosystem',
    speciesCount: 5,
    particleCount: 1500,
    friction: 0.82,
    forceScale: 7,
    interactionRadius: 95,
    wrapEdges: true,
    attractionMatrix: [
      // Complex food web: producers (0), herbivores (1,2), predators (3,4)
      [ 0.5, -0.3, -0.3,  0.0,  0.0],
      [ 0.7,  0.3,  0.0, -0.8, -0.2],
      [ 0.7,  0.0,  0.3, -0.2, -0.8],
      [ 0.0,  0.9,  0.2,  0.1, -0.5],
      [ 0.0,  0.2,  0.9, -0.5,  0.1],
    ],
  },
  {
    name: 'Raindrops',
    speciesCount: 5,
    particleCount: 2000,
    friction: 0.95,
    forceScale: 3,
    interactionRadius: 60,
    wrapEdges: true,
    attractionMatrix: [
      // Very mild forces, high friction → slow condensation and drift
      [ 0.4,  0.1, -0.05, 0.05, -0.1],
      [ 0.1,  0.4,  0.1, -0.05, 0.05],
      [-0.05, 0.1,  0.4,  0.1, -0.05],
      [ 0.05,-0.05, 0.1,  0.4,  0.1],
      [-0.1,  0.05,-0.05, 0.1,  0.4],
    ],
  },
] as const;
