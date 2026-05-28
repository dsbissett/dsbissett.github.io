import { Injectable, inject, signal } from '@angular/core';

import { VOLUMETRIC_TEXTURES_CONFIG } from '../constants/volumetric-textures-config.constant';
import {
  VOLUMETRIC_TEXTURES_FRAGMENT_SHADER,
  VOLUMETRIC_TEXTURES_VERTEX_SHADER,
} from '../constants/volumetric-textures-shaders.constant';
import { VolumetricTexturesContextService } from './volumetric-textures-context.service';
import { VolumetricTexturesPointerService } from './volumetric-textures-pointer.service';
import { VolumetricTexturesProgramService } from './volumetric-textures-program.service';
import { VolumetricTexturesRendererService } from './volumetric-textures-renderer.service';
import { VolumetricTexturesVolumeService } from './volumetric-textures-volume.service';

@Injectable()
export class VolumetricTexturesFacadeService {
  private readonly context = inject(VolumetricTexturesContextService);
  private readonly pointer = inject(VolumetricTexturesPointerService);
  private readonly programService = inject(VolumetricTexturesProgramService);
  private readonly renderer = inject(VolumetricTexturesRendererService);
  private readonly volumeService = inject(VolumetricTexturesVolumeService);

  private gl: WebGL2RenderingContext | null = null;
  private seed: number = VOLUMETRIC_TEXTURES_CONFIG.volumeSeed;
  private readonly internalFailed = signal<boolean>(false);
  public readonly failed = this.internalFailed.asReadonly();

  private readonly resizeHandler = (): void => {
    this.context.resize();
    this.pointer.recenter();
  };

  public initialize(canvas: HTMLCanvasElement): void {
    try {
      const gl = this.context.initialize(canvas);
      const program = this.programService.create(
        gl,
        VOLUMETRIC_TEXTURES_VERTEX_SHADER,
        VOLUMETRIC_TEXTURES_FRAGMENT_SHADER,
      );
      const texture = this.buildVolume(gl);

      this.pointer.attach(canvas);
      this.renderer.initialize(gl, program, texture);
      this.renderer.start();

      this.gl = gl;
      window.addEventListener('resize', this.resizeHandler);
    } catch (error) {
      console.error('Volumetric Textures failed to initialize.', error);
      this.internalFailed.set(true);
    }
  }

  public regenerate(): void {
    const gl = this.gl;
    if (!gl) {
      return;
    }
    this.seed = (this.seed + 1) >>> 0;
    this.renderer.swapVolume(this.buildVolume(gl));
  }

  public destroy(): void {
    window.removeEventListener('resize', this.resizeHandler);
    this.renderer.destroy();
    this.pointer.detach();
    this.gl = null;
  }

  private buildVolume(gl: WebGL2RenderingContext): WebGLTexture {
    return this.volumeService.create(
      gl,
      VOLUMETRIC_TEXTURES_CONFIG.volumeSize,
      VOLUMETRIC_TEXTURES_CONFIG.volumePointCount,
      this.seed,
    );
  }
}
