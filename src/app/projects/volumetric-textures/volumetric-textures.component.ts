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

import { VolumetricTexturesContextService } from './services/volumetric-textures-context.service';
import { VolumetricTexturesFacadeService } from './services/volumetric-textures-facade.service';
import { VolumetricTexturesPointerService } from './services/volumetric-textures-pointer.service';
import { VolumetricTexturesProgramService } from './services/volumetric-textures-program.service';
import { VolumetricTexturesRendererService } from './services/volumetric-textures-renderer.service';
import { VolumetricTexturesVolumeService } from './services/volumetric-textures-volume.service';

@Component({
  selector: 'app-volumetric-textures',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  providers: [
    VolumetricTexturesContextService,
    VolumetricTexturesFacadeService,
    VolumetricTexturesPointerService,
    VolumetricTexturesProgramService,
    VolumetricTexturesRendererService,
    VolumetricTexturesVolumeService,
  ],
  templateUrl: './volumetric-textures.component.html',
  styleUrl: './volumetric-textures.component.scss',
})
export class VolumetricTexturesComponent implements AfterViewInit, OnDestroy {
  private readonly canvasElement = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly facade = inject(VolumetricTexturesFacadeService);

  protected readonly failed = this.facade.failed;

  public ngAfterViewInit(): void {
    this.facade.initialize(this.canvasElement().nativeElement);
  }

  public ngOnDestroy(): void {
    this.facade.destroy();
  }

  protected regenerate(): void {
    this.facade.regenerate();
  }
}
