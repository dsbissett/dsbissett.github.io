import { Injectable } from '@angular/core';

import { DoubleFramebuffer } from '../classes/double-framebuffer.class';
import { SingleFramebuffer } from '../classes/single-framebuffer.class';
import { FLUID_MOTION_CONFIG } from '../constants/fluid-motion-config.constant';
import { FluidMotionExtensions } from '../interfaces/fluid-motion-extensions.interface';
import { FluidMotionFramebufferCollection } from '../interfaces/fluid-motion-framebuffer-collection.interface';
import { FluidMotionGlContext } from '../types/fluid-motion-gl-context.type';

@Injectable()
export class FluidMotionFramebufferService {
  public initialize(
    gl: FluidMotionGlContext,
    ext: FluidMotionExtensions
  ): FluidMotionFramebufferCollection {
    const textureWidth = gl.drawingBufferWidth >> FLUID_MOTION_CONFIG.TEXTURE_DOWNSAMPLE;
    const textureHeight =
      gl.drawingBufferHeight >> FLUID_MOTION_CONFIG.TEXTURE_DOWNSAMPLE;
    const filter = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    return {
      curl: this.createSingle(
        gl,
        5,
        textureWidth,
        textureHeight,
        ext.formatR.internalFormat,
        ext.formatR.format,
        ext.halfFloatTexType,
        gl.NEAREST
      ),
      density: this.createDouble(
        gl,
        2,
        textureWidth,
        textureHeight,
        ext.formatRGBA.internalFormat,
        ext.formatRGBA.format,
        ext.halfFloatTexType,
        filter
      ),
      divergence: this.createSingle(
        gl,
        4,
        textureWidth,
        textureHeight,
        ext.formatR.internalFormat,
        ext.formatR.format,
        ext.halfFloatTexType,
        gl.NEAREST
      ),
      pressure: this.createDouble(
        gl,
        6,
        textureWidth,
        textureHeight,
        ext.formatR.internalFormat,
        ext.formatR.format,
        ext.halfFloatTexType,
        gl.NEAREST
      ),
      velocity: this.createDouble(
        gl,
        0,
        textureWidth,
        textureHeight,
        ext.formatRG.internalFormat,
        ext.formatRG.format,
        ext.halfFloatTexType,
        filter
      ),
    };
  }

  public getTextureHeight(gl: FluidMotionGlContext): number {
    return gl.drawingBufferHeight >> FLUID_MOTION_CONFIG.TEXTURE_DOWNSAMPLE;
  }

  public getTextureWidth(gl: FluidMotionGlContext): number {
    return gl.drawingBufferWidth >> FLUID_MOTION_CONFIG.TEXTURE_DOWNSAMPLE;
  }

  private createDouble(
    gl: FluidMotionGlContext,
    textureUnit: number,
    width: number,
    height: number,
    internalFormat: number,
    format: number,
    type: number,
    filter: number
  ): DoubleFramebuffer {
    return new DoubleFramebuffer(
      this.createSingle(
        gl,
        textureUnit,
        width,
        height,
        internalFormat,
        format,
        type,
        filter
      ),
      this.createSingle(
        gl,
        textureUnit + 1,
        width,
        height,
        internalFormat,
        format,
        type,
        filter
      )
    );
  }

  private createSingle(
    gl: FluidMotionGlContext,
    textureUnit: number,
    width: number,
    height: number,
    internalFormat: number,
    format: number,
    type: number,
    filter: number
  ): SingleFramebuffer {
    const texture = gl.createTexture();
    const framebuffer = gl.createFramebuffer();

    if (!texture || !framebuffer) {
      throw new Error('Unable to create a fluid framebuffer.');
    }

    gl.activeTexture(gl.TEXTURE0 + textureUnit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, null);

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0
    );
    gl.viewport(0, 0, width, height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    return new SingleFramebuffer(texture, framebuffer, textureUnit);
  }
}
