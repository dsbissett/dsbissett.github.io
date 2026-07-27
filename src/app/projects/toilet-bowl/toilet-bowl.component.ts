import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { ToiletBlobService } from './services/toilet-blob.service';
import { ToiletBowlFacadeService } from './services/toilet-bowl-facade.service';
import { ToiletCameraService } from './services/toilet-camera.service';
import { ToiletGeometryService } from './services/toilet-geometry.service';
import { ToiletPointerService } from './services/toilet-pointer.service';
import { ToiletProjectilesService } from './services/toilet-projectiles.service';
import { ToiletRendererService } from './services/toilet-renderer.service';
import { ToiletWaterService } from './services/toilet-water.service';

@Component({
  selector: 'app-toilet-bowl',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  providers: [
    ToiletBlobService,
    ToiletBowlFacadeService,
    ToiletCameraService,
    ToiletGeometryService,
    ToiletPointerService,
    ToiletProjectilesService,
    ToiletRendererService,
    ToiletWaterService,
  ],
  templateUrl: './toilet-bowl.component.html',
  styleUrl: './toilet-bowl.component.scss',
})
export class ToiletBowlComponent implements AfterViewInit, OnDestroy {
  private readonly canvasElement = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly facade = inject(ToiletBowlFacadeService);

  protected readonly failed = this.facade.failed;
  protected readonly panelCollapsed = signal(false);

  public ngAfterViewInit(): void {
    this.facade.initialize(this.canvasElement().nativeElement);
  }

  public ngOnDestroy(): void {
    this.facade.destroy();
  }

  protected togglePanel(): void {
    this.panelCollapsed.update((collapsed) => !collapsed);
  }
}
