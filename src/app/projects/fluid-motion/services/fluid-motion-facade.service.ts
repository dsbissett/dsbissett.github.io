import { Injectable, inject, signal } from '@angular/core';

import { FluidMotionContextService } from './fluid-motion-context.service';
import { FluidMotionFramebufferService } from './fluid-motion-framebuffer.service';
import { FluidMotionPointerService } from './fluid-motion-pointer.service';
import { FluidMotionProgramService } from './fluid-motion-program.service';
import { FluidMotionSimulationService } from './fluid-motion-simulation.service';

@Injectable()
export class FluidMotionFacadeService {
  private readonly contextService = inject(FluidMotionContextService);
  private readonly framebufferService = inject(FluidMotionFramebufferService);
  private readonly pointerService = inject(FluidMotionPointerService);
  private readonly programService = inject(FluidMotionProgramService);
  private readonly simulationService = inject(FluidMotionSimulationService);

  private animationFrameId: number | null = null;
  private detachListeners: VoidFunction | null = null;

  public readonly initializationFailed = signal(false);

  public initialize(canvas: HTMLCanvasElement): void {
    this.initializationFailed.set(false);

    try {
      const contextInfo = this.contextService.createContext(canvas);
      const programs = this.programService.createPrograms(contextInfo.gl);
      const framebuffers = this.framebufferService.initialize(contextInfo.gl, contextInfo.ext);
      const pointers = this.pointerService.createInitialPointers();
      const blit = this.programService.createBlit(contextInfo.gl);

      this.detachListeners = this.pointerService.attach(canvas, pointers);
      this.simulationService.initialize(
        canvas,
        contextInfo.gl,
        contextInfo.ext,
        programs,
        framebuffers,
        blit,
        pointers,
      );
      this.simulationService.queueRandomSplats(Math.floor(Math.random() * 8) + 10);
      this.startLoop();
    } catch {
      this.initializationFailed.set(true);
    }
  }

  public queueShowcaseBurst(): void {
    this.simulationService.queueRandomSplats(12);
  }

  public destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.detachListeners?.();
    this.detachListeners = null;
    this.simulationService.reset();
  }

  private startLoop(): void {
    const tick = () => {
      this.simulationService.step();
      this.animationFrameId = requestAnimationFrame(tick);
    };

    this.animationFrameId = requestAnimationFrame(tick);
  }
}
