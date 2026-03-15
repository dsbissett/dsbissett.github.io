import { Injectable, signal } from '@angular/core';

import { PARTICLE_LIFE_CONFIG } from '../constants/particle-life-config.constant';

@Injectable()
export class ParticleLifeStateService {
  private readonly runningState = signal(true);
  private readonly particleCountState = signal(
    PARTICLE_LIFE_CONFIG.defaultParticleCount
  );
  private readonly speciesCountState = signal(
    PARTICLE_LIFE_CONFIG.defaultSpeciesCount
  );
  private readonly attractionMatrixState = signal<number[][]>([]);
  private readonly frictionState = signal(PARTICLE_LIFE_CONFIG.friction);
  private readonly interactionRadiusState = signal(
    PARTICLE_LIFE_CONFIG.interactionRadius
  );
  private readonly forceScaleState = signal(PARTICLE_LIFE_CONFIG.forceScale);
  private readonly wrapEdgesState = signal(PARTICLE_LIFE_CONFIG.wrapEdges);
  private readonly presetNameState = signal('');
  private readonly zoomState = signal(1);
  private readonly cameraXState = signal(0);
  private readonly cameraYState = signal(0);

  public readonly running = this.runningState.asReadonly();
  public readonly particleCount = this.particleCountState.asReadonly();
  public readonly speciesCount = this.speciesCountState.asReadonly();
  public readonly attractionMatrix = this.attractionMatrixState.asReadonly();
  public readonly friction = this.frictionState.asReadonly();
  public readonly interactionRadius = this.interactionRadiusState.asReadonly();
  public readonly forceScale = this.forceScaleState.asReadonly();
  public readonly wrapEdges = this.wrapEdgesState.asReadonly();
  public readonly presetName = this.presetNameState.asReadonly();
  public readonly zoom = this.zoomState.asReadonly();
  public readonly cameraX = this.cameraXState.asReadonly();
  public readonly cameraY = this.cameraYState.asReadonly();

  public setRunning(value: boolean): void {
    this.runningState.set(value);
  }

  public toggleRunning(): void {
    this.runningState.update((v) => !v);
  }

  public setParticleCount(value: number): void {
    this.particleCountState.set(value);
  }

  public setSpeciesCount(value: number): void {
    this.speciesCountState.set(value);
  }

  public setAttractionMatrix(matrix: number[][]): void {
    this.attractionMatrixState.set(matrix);
  }

  public setFriction(value: number): void {
    this.frictionState.set(value);
  }

  public setInteractionRadius(value: number): void {
    this.interactionRadiusState.set(value);
  }

  public setForceScale(value: number): void {
    this.forceScaleState.set(value);
  }

  public setWrapEdges(value: boolean): void {
    this.wrapEdgesState.set(value);
  }

  public setPresetName(value: string): void {
    this.presetNameState.set(value);
  }

  public setZoom(value: number): void {
    this.zoomState.set(value);
  }

  public setCameraX(value: number): void {
    this.cameraXState.set(value);
  }

  public setCameraY(value: number): void {
    this.cameraYState.set(value);
  }
}
