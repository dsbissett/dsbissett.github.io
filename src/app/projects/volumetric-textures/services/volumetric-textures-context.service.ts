import { Injectable } from '@angular/core';

import { VOLUMETRIC_TEXTURES_CONFIG } from '../constants/volumetric-textures-config.constant';

@Injectable()
export class VolumetricTexturesContextService {
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGL2RenderingContext | null = null;

  public initialize(canvas: HTMLCanvasElement): WebGL2RenderingContext {
    const gl = canvas.getContext('webgl2', {
      antialias: false,
      preserveDrawingBuffer: false,
      premultipliedAlpha: true,
    });

    if (!gl) {
      throw new Error('WebGL2 is required for 3D textures.');
    }

    this.canvas = canvas;
    this.gl = gl;
    this.resize();
    return gl;
  }

  public resize(): void {
    const canvas = this.canvas;
    const gl = this.gl;
    if (!canvas || !gl) {
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, VOLUMETRIC_TEXTURES_CONFIG.devicePixelRatioCap);
    const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
  }

  public getResolution(): readonly [number, number] {
    const canvas = this.canvas;
    return canvas ? [canvas.width, canvas.height] : [1, 1];
  }
}
