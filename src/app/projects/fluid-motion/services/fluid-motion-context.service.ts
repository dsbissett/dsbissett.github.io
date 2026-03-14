import { Injectable } from '@angular/core';

import { FluidMotionExtensions } from '../interfaces/fluid-motion-extensions.interface';
import { FluidMotionFormatInfo } from '../interfaces/fluid-motion-format-info.interface';
import { FluidMotionWebGlContext } from '../interfaces/fluid-motion-webgl-context.interface';
import { FluidMotionGlContext } from '../types/fluid-motion-gl-context.type';

@Injectable()
export class FluidMotionContextService {
  private readonly R16F = 0x822d;
  private readonly RG = 0x8227;
  private readonly RG16F = 0x822f;
  private readonly RGBA16F = 0x881a;

  public createContext(canvas: HTMLCanvasElement): FluidMotionWebGlContext {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    const gl = this.getGlContext(canvas);
    const isWebGl2 = this.isWebGl2(gl);
    const halfFloat = this.getHalfFloatExtension(gl, isWebGl2);
    const ext = this.createExtensions(gl, isWebGl2, halfFloat);

    gl.clearColor(0, 0, 0, 1);
    return { ext, gl };
  }

  private createExtensions(
    gl: FluidMotionGlContext,
    isWebGl2: boolean,
    halfFloat: { HALF_FLOAT_OES: number } | null
  ): FluidMotionExtensions {
    const halfFloatTexType = isWebGl2 ? 0x140b : halfFloat?.HALF_FLOAT_OES ?? gl.FLOAT;
    const rgba16f = isWebGl2 ? this.RGBA16F : gl.RGBA;
    const rg16f = isWebGl2 ? this.RG16F : gl.RGBA;
    const r16f = isWebGl2 ? this.R16F : gl.RGBA;
    const red = isWebGl2 ? 0x1903 : gl.RGBA;
    const rg = isWebGl2 ? this.RG : gl.RGBA;

    return {
      formatR: this.getSupportedFormat(gl, r16f, red, halfFloatTexType),
      formatRG: this.getSupportedFormat(gl, rg16f, rg, halfFloatTexType),
      formatRGBA: this.getSupportedFormat(gl, rgba16f, gl.RGBA, halfFloatTexType),
      halfFloatTexType,
      supportLinearFiltering: !!gl.getExtension(
        isWebGl2 ? 'OES_texture_float_linear' : 'OES_texture_half_float_linear'
      ),
    };
  }

  private getGlContext(canvas: HTMLCanvasElement): FluidMotionGlContext {
    const params = {
      alpha: false,
      antialias: false,
      depth: false,
      powerPreference: 'high-performance' as const,
      preserveDrawingBuffer: false,
      stencil: false,
    };
    const webGl2 = canvas.getContext('webgl2', params);
    const gl =
      webGl2 ??
      canvas.getContext('webgl', params) ??
      canvas.getContext('experimental-webgl', params);

    if (!gl) {
      throw new Error('WebGL is not available.');
    }

    return gl as FluidMotionGlContext;
  }

  private getHalfFloatExtension(
    gl: FluidMotionGlContext,
    isWebGl2: boolean
  ): { HALF_FLOAT_OES: number } | null {
    if (isWebGl2) {
      gl.getExtension('EXT_color_buffer_float');
      return { HALF_FLOAT_OES: 0x140b };
    }

    return gl.getExtension('OES_texture_half_float') as {
      HALF_FLOAT_OES: number;
    } | null;
  }

  private getSupportedFormat(
    gl: FluidMotionGlContext,
    internalFormat: number,
    format: number,
    type: number
  ): FluidMotionFormatInfo {
    if (this.supportRenderTextureFormat(gl, internalFormat, format, type)) {
      return { format, internalFormat };
    }

    if (internalFormat === this.R16F) {
      return this.getSupportedFormat(gl, this.RG16F, this.RG, type);
    }

    if (internalFormat === this.RG16F) {
      return this.getSupportedFormat(gl, this.RGBA16F, gl.RGBA, type);
    }

    throw new Error('No supported fluid texture format was found.');
  }

  private isWebGl2(gl: FluidMotionGlContext): boolean {
    return typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
  }

  private supportRenderTextureFormat(
    gl: FluidMotionGlContext,
    internalFormat: number,
    format: number,
    type: number
  ): boolean {
    const texture = gl.createTexture();
    const framebuffer = gl.createFramebuffer();

    if (!texture || !framebuffer) {
      return false;
    }

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0
    );

    return gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  }
}
