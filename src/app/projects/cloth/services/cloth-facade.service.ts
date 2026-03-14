import { Injectable, inject } from '@angular/core';

import { CLOTH_SIMULATION_CONFIG } from '../constants/cloth-simulation-config.constant';
import { ClothCanvasSize } from '../interfaces/cloth-canvas-size.interface';
import { ClothAnimationFrameService } from './cloth-animation-frame.service';
import { ClothCanvasService } from './cloth-canvas.service';
import { ClothPointerService } from './cloth-pointer.service';
import { ClothRendererService } from './cloth-renderer.service';
import { ClothSceneBuilderService } from './cloth-scene-builder.service';
import { ClothSimulationService } from './cloth-simulation.service';

@Injectable()
export class ClothFacadeService {
  private readonly animationFrame = inject(ClothAnimationFrameService);
  private readonly canvasService = inject(ClothCanvasService);
  private readonly pointerService = inject(ClothPointerService);
  private readonly renderer = inject(ClothRendererService);
  private readonly sceneBuilder = inject(ClothSceneBuilderService);
  private readonly simulation = inject(ClothSimulationService);

  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private size: ClothCanvasSize | null = null;

  public destroy(): void {
    this.animationFrame.stop();
    this.pointerService.reset();
    this.canvas = null;
    this.context = null;
    this.size = null;
  }

  public handleKeydown(event: KeyboardEvent): void {
    if (event.key !== 'r' && event.key !== 'R') {
      return;
    }

    event.preventDefault();
    this.reset();
  }

  public handlePointerCancel(event: PointerEvent): void {
    if (this.canvas) {
      this.pointerService.cancel(this.canvas, event);
    }
  }

  public handlePointerDown(event: PointerEvent): void {
    if (this.canvas) {
      this.pointerService.start(this.canvas, event);
    }
  }

  public handlePointerMove(event: PointerEvent): void {
    if (this.canvas) {
      this.pointerService.move(this.canvas, event);
    }
  }

  public handlePointerUp(event: PointerEvent): void {
    if (this.canvas) {
      this.pointerService.end(this.canvas, event);
    }
  }

  public handleResize(): void {
    if (!this.canvas || !this.context) {
      return;
    }

    this.size = this.canvasService.resize(this.canvas, this.context);
    this.reset();
  }

  public initialize(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.context = this.canvasService.createContext(canvas);
    this.handleResize();
    this.animationFrame.start((deltaSeconds) => this.renderFrame(deltaSeconds));
  }

  public reset(): void {
    if (!this.size) {
      return;
    }

    const scene = this.sceneBuilder.build(
      CLOTH_SIMULATION_CONFIG.targetText,
      this.size
    );

    this.pointerService.configure(scene.spacing);
    this.simulation.loadScene(scene, this.size);
  }

  private renderFrame(deltaSeconds: number): void {
    if (!this.context || !this.size) {
      return;
    }

    this.simulation.step(deltaSeconds, this.pointerService.getState());
    this.renderer.render(
      this.context,
      this.simulation.getPoints(),
      this.size,
      this.simulation.getStrokeWidth()
    );
  }
}
