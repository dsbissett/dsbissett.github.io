import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  inject,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { FluidMotionContextService } from './services/fluid-motion-context.service';
import { FluidMotionFacadeService } from './services/fluid-motion-facade.service';
import { FluidMotionFramebufferService } from './services/fluid-motion-framebuffer.service';
import { FluidMotionPointerService } from './services/fluid-motion-pointer.service';
import { FluidMotionProgramService } from './services/fluid-motion-program.service';
import { FluidMotionShaderSourceService } from './services/fluid-motion-shader-source.service';
import { FluidMotionSimulationService } from './services/fluid-motion-simulation.service';

@Component({
  selector: 'app-fluid-motion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  providers: [
    FluidMotionContextService,
    FluidMotionFacadeService,
    FluidMotionFramebufferService,
    FluidMotionPointerService,
    FluidMotionProgramService,
    FluidMotionShaderSourceService,
    FluidMotionSimulationService,
  ],
  templateUrl: './fluid-motion.component.html',
  styleUrl: './fluid-motion.component.scss',
})
export class FluidMotionComponent implements AfterViewInit, OnDestroy {
  private readonly canvasElement = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly facade = inject(FluidMotionFacadeService);

  protected readonly initializationFailed = this.facade.initializationFailed;

  public ngAfterViewInit(): void {
    this.facade.initialize(this.canvasElement().nativeElement);
  }

  public ngOnDestroy(): void {
    this.facade.destroy();
  }

  protected pulseBurst(): void {
    this.facade.queueShowcaseBurst();
  }
}
