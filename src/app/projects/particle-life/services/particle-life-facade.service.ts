import { Injectable, inject } from '@angular/core';

import { PARTICLE_LIFE_CONFIG } from '../constants/particle-life-config.constant';
import { PARTICLE_LIFE_PRESETS } from '../constants/particle-life-presets.constant';
import { ParticleLifeCanvasSize } from '../interfaces/particle-life-canvas-size.interface';
import { ParticleLifeAnimationFrameService } from './particle-life-animation-frame.service';
import { ParticleLifeCanvasService } from './particle-life-canvas.service';
import { ParticleLifeMatrixService } from './particle-life-matrix.service';
import { ParticleLifePointerService } from './particle-life-pointer.service';
import { ParticleLifeRendererService } from './particle-life-renderer.service';
import { ParticleLifeSimulationService } from './particle-life-simulation.service';
import { ParticleLifeStateService } from './particle-life-state.service';

const CLICK_THRESHOLD = 6;

@Injectable()
export class ParticleLifeFacadeService {
  private readonly animationFrame = inject(ParticleLifeAnimationFrameService);
  private readonly canvasService = inject(ParticleLifeCanvasService);
  private readonly matrixService = inject(ParticleLifeMatrixService);
  private readonly pointerService = inject(ParticleLifePointerService);
  private readonly renderer = inject(ParticleLifeRendererService);
  private readonly simulation = inject(ParticleLifeSimulationService);
  private readonly state = inject(ParticleLifeStateService);

  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private size: ParticleLifeCanvasSize | null = null;
  private worldWidth = 0;
  private worldHeight = 0;
  private pointerDownScreenX = 0;
  private pointerDownScreenY = 0;

  public readonly running = this.state.running;
  public readonly particleCount = this.state.particleCount;
  public readonly speciesCount = this.state.speciesCount;
  public readonly attractionMatrix = this.state.attractionMatrix;
  public readonly friction = this.state.friction;
  public readonly interactionRadius = this.state.interactionRadius;
  public readonly forceScale = this.state.forceScale;
  public readonly wrapEdges = this.state.wrapEdges;
  public readonly presetName = this.state.presetName;
  public readonly zoom = this.state.zoom;

  public initialize(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.context = this.canvasService.createContext(canvas);
    this.size = this.canvasService.resize(canvas, this.context);
    this.worldWidth = this.size.width;
    this.worldHeight = this.size.height;

    this.state.setCameraX(this.worldWidth / 2);
    this.state.setCameraY(this.worldHeight / 2);

    const matrix = this.matrixService.generateRandomMatrix(
      this.state.speciesCount()
    );
    this.state.setAttractionMatrix(matrix);

    this.simulation.initialize(
      this.state.particleCount(),
      this.state.speciesCount(),
      this.worldWidth,
      this.worldHeight,
      this.state.interactionRadius()
    );

    this.animationFrame.start((dt) => this.renderFrame(dt));
  }

  public destroy(): void {
    this.animationFrame.stop();
    this.pointerService.reset();
    this.canvas = null;
    this.context = null;
    this.size = null;
  }

  public handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'r' || event.key === 'R') {
      event.preventDefault();
      this.randomize();
    } else if (event.key === ' ') {
      event.preventDefault();
      this.toggleRunning();
    }
  }

  public handlePointerCancel(event: PointerEvent): void {
    if (this.canvas) {
      this.pointerService.cancel(this.canvas, event);
    }
  }

  public handlePointerDown(event: PointerEvent): void {
    if (this.canvas) {
      this.pointerService.start(this.canvas, event);
      this.pointerDownScreenX = event.clientX;
      this.pointerDownScreenY = event.clientY;
    }
  }

  public handlePointerMove(event: PointerEvent): void {
    if (!this.canvas) {
      return;
    }

    this.pointerService.move(this.canvas, event);

    const pointerState = this.pointerService.getState();

    if (pointerState.isDown) {
      const zoom = this.state.zoom();
      const dx = (pointerState.x - pointerState.previousX) / zoom;
      const dy = (pointerState.y - pointerState.previousY) / zoom;
      this.state.setCameraX(this.state.cameraX() - dx);
      this.state.setCameraY(this.state.cameraY() - dy);
    }
  }

  public handlePointerUp(event: PointerEvent): void {
    if (!this.canvas || !this.size) {
      return;
    }

    const dx = event.clientX - this.pointerDownScreenX;
    const dy = event.clientY - this.pointerDownScreenY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < CLICK_THRESHOLD) {
      const rect = this.canvas.getBoundingClientRect();
      const screenX = event.clientX - rect.left;
      const screenY = event.clientY - rect.top;
      const [worldX, worldY] = this.screenToWorld(screenX, screenY);

      this.simulation.explode(
        worldX,
        worldY,
        PARTICLE_LIFE_CONFIG.explodeRadius,
        PARTICLE_LIFE_CONFIG.explodeStrength
      );
    }

    this.pointerService.end(this.canvas, event);
  }

  public handleWheel(event: WheelEvent): void {
    if (!this.canvas || !this.size) {
      return;
    }

    event.preventDefault();

    const rect = this.canvas.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;

    const oldZoom = this.state.zoom();
    const [worldX, worldY] = this.screenToWorld(screenX, screenY);

    const zoomDelta = -event.deltaY * PARTICLE_LIFE_CONFIG.zoomSensitivity;
    const newZoom = Math.min(
      PARTICLE_LIFE_CONFIG.maxZoom,
      Math.max(PARTICLE_LIFE_CONFIG.minZoom, oldZoom * Math.exp(zoomDelta))
    );

    const newCameraX =
      worldX - (screenX - this.size.width / 2) / newZoom;
    const newCameraY =
      worldY - (screenY - this.size.height / 2) / newZoom;

    this.state.setZoom(newZoom);
    this.state.setCameraX(newCameraX);
    this.state.setCameraY(newCameraY);
  }

  public handleResize(): void {
    if (!this.canvas || !this.context) {
      return;
    }

    this.size = this.canvasService.resize(this.canvas, this.context);
    this.worldWidth = this.size.width;
    this.worldHeight = this.size.height;
    this.reinitializeSimulation();
  }

  public toggleRunning(): void {
    this.state.toggleRunning();
  }

  public randomize(): void {
    const matrix = this.matrixService.generateRandomMatrix(
      this.state.speciesCount()
    );
    this.state.setAttractionMatrix(matrix);
    this.state.setPresetName('');
    this.reinitializeSimulation();
  }

  public applyPreset(presetName: string): void {
    const preset = PARTICLE_LIFE_PRESETS.find((p) => p.name === presetName);

    if (!preset) {
      return;
    }

    this.state.setPresetName(preset.name);
    this.state.setParticleCount(preset.particleCount);
    this.state.setSpeciesCount(preset.speciesCount);
    this.state.setFriction(preset.friction);
    this.state.setForceScale(preset.forceScale);
    this.state.setInteractionRadius(preset.interactionRadius);
    this.state.setWrapEdges(preset.wrapEdges);
    this.state.setAttractionMatrix(
      preset.attractionMatrix.map((row) => [...row])
    );
    this.reinitializeSimulation();
  }

  public updateParticleCount(value: number): void {
    const clamped = Math.min(
      PARTICLE_LIFE_CONFIG.maxParticleCount,
      Math.max(50, value)
    );
    this.state.setParticleCount(clamped);
    this.state.setPresetName('');
    this.reinitializeSimulation();
  }

  public updateSpeciesCount(value: number): void {
    const clamped = Math.min(
      PARTICLE_LIFE_CONFIG.maxSpeciesCount,
      Math.max(PARTICLE_LIFE_CONFIG.minSpeciesCount, value)
    );
    this.state.setSpeciesCount(clamped);
    this.state.setPresetName('');

    const matrix = this.matrixService.generateRandomMatrix(clamped);
    this.state.setAttractionMatrix(matrix);
    this.reinitializeSimulation();
  }

  public updateAttractionCell(
    from: number,
    to: number,
    value: number
  ): void {
    const updated = this.matrixService.setAttraction(
      this.state.attractionMatrix(),
      from,
      to,
      value
    );
    this.state.setAttractionMatrix(updated);
    this.state.setPresetName('');
  }

  public updateFriction(value: number): void {
    this.state.setFriction(value);
    this.state.setPresetName('');
  }

  public updateInteractionRadius(value: number): void {
    this.state.setInteractionRadius(value);
    this.state.setPresetName('');
    this.reinitializeSimulation();
  }

  public updateForceScale(value: number): void {
    this.state.setForceScale(value);
    this.state.setPresetName('');
  }

  public toggleWrapEdges(checked: boolean): void {
    this.state.setWrapEdges(checked);
    this.state.setPresetName('');
  }

  public resetZoom(): void {
    this.state.setZoom(1);
    this.state.setCameraX(this.worldWidth / 2);
    this.state.setCameraY(this.worldHeight / 2);
  }

  private screenToWorld(screenX: number, screenY: number): [number, number] {
    if (!this.size) {
      return [screenX, screenY];
    }

    const zoom = this.state.zoom();
    const cameraX = this.state.cameraX();
    const cameraY = this.state.cameraY();
    const worldX = (screenX - this.size.width / 2) / zoom + cameraX;
    const worldY = (screenY - this.size.height / 2) / zoom + cameraY;
    return [worldX, worldY];
  }

  private reinitializeSimulation(): void {
    if (!this.size) {
      return;
    }

    this.simulation.initialize(
      this.state.particleCount(),
      this.state.speciesCount(),
      this.worldWidth,
      this.worldHeight,
      this.state.interactionRadius()
    );
  }

  private renderFrame(_dt: number): void {
    if (!this.context || !this.size) {
      return;
    }

    if (this.state.running()) {
      this.simulation.step(
        this.state.attractionMatrix(),
        this.state.interactionRadius(),
        this.state.friction(),
        this.state.forceScale(),
        PARTICLE_LIFE_CONFIG.beta,
        this.state.wrapEdges(),
        this.worldWidth,
        this.worldHeight
      );
    }

    const colors = this.matrixService.getColors(this.state.speciesCount());

    this.renderer.render(
      this.context,
      this.simulation.getParticles(),
      this.size,
      colors,
      PARTICLE_LIFE_CONFIG.particleRadius,
      this.state.zoom(),
      this.state.cameraX(),
      this.state.cameraY(),
      this.state.wrapEdges(),
      this.worldWidth,
      this.worldHeight
    );
  }
}
