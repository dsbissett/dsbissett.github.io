import { Injectable } from '@angular/core';

import { FluidMotionFramebufferCollection } from '../interfaces/fluid-motion-framebuffer-collection.interface';
import { FluidMotionPointer } from '../interfaces/fluid-motion-pointer.interface';
import { FluidMotionProgramCollection } from '../interfaces/fluid-motion-program-collection.interface';
import { FluidMotionBlit } from '../types/fluid-motion-blit.type';
import { FluidMotionGlContext } from '../types/fluid-motion-gl-context.type';
import { FLUID_MOTION_CONFIG } from '../constants/fluid-motion-config.constant';
import { FluidMotionFramebufferService } from './fluid-motion-framebuffer.service';
import { FluidMotionExtensions } from '../interfaces/fluid-motion-extensions.interface';

@Injectable()
export class FluidMotionSimulationService {
  private blit: FluidMotionBlit | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private extensions: FluidMotionExtensions | null = null;
  private framebuffers: FluidMotionFramebufferCollection | null = null;
  private gl: FluidMotionGlContext | null = null;
  private lastTime = Date.now();
  private pointers: FluidMotionPointer[] = [];
  private programs: FluidMotionProgramCollection | null = null;
  private splatStack: number[] = [];

  public constructor(
    private readonly framebufferService: FluidMotionFramebufferService
  ) {}

  public initialize(
    canvas: HTMLCanvasElement,
    gl: FluidMotionGlContext,
    ext: FluidMotionExtensions,
    programs: FluidMotionProgramCollection,
    framebuffers: FluidMotionFramebufferCollection,
    blit: FluidMotionBlit,
    pointers: FluidMotionPointer[]
  ): void {
    this.canvas = canvas;
    this.gl = gl;
    this.extensions = ext;
    this.programs = programs;
    this.framebuffers = framebuffers;
    this.blit = blit;
    this.pointers = pointers;
    this.lastTime = Date.now();
  }

  public multipleSplats(amount: number): void {
    for (let index = 0; index < amount; index += 1) {
      this.splat(
        Math.random() * this.requireCanvas().width,
        Math.random() * this.requireCanvas().height,
        1000 * (Math.random() - 0.5),
        1000 * (Math.random() - 0.5),
        [Math.random() * 10, Math.random() * 10, Math.random() * 10]
      );
    }
  }

  public queueRandomSplats(amount: number): void {
    this.splatStack.push(amount);
  }

  public reset(): void {
    this.canvas = null;
    this.extensions = null;
    this.framebuffers = null;
    this.gl = null;
    this.programs = null;
    this.blit = null;
    this.pointers = [];
    this.splatStack = [];
  }

  public step(): void {
    this.resizeCanvasIfNeeded();
    this.runSimulation();
  }

  private applyAdvection(dt: number): void {
    const gl = this.requireGl();
    const programs = this.requirePrograms();
    const framebuffers = this.requireFramebuffers();
    const texelSizeX = 1 / this.framebufferService.getTextureWidth(gl);
    const texelSizeY = 1 / this.framebufferService.getTextureHeight(gl);

    programs.advection.bind();
    gl.uniform2f(programs.advection.uniforms['texelSize'], texelSizeX, texelSizeY);
    gl.uniform1i(programs.advection.uniforms['uVelocity'], framebuffers.velocity.read.textureUnit);
    gl.uniform1i(programs.advection.uniforms['uSource'], framebuffers.velocity.read.textureUnit);
    gl.uniform1f(programs.advection.uniforms['dt'], dt);
    gl.uniform1f(
      programs.advection.uniforms['dissipation'],
      FLUID_MOTION_CONFIG.VELOCITY_DISSIPATION
    );
    this.requireBlit()(framebuffers.velocity.write.framebuffer);
    framebuffers.velocity.swap();

    gl.uniform1i(programs.advection.uniforms['uVelocity'], framebuffers.velocity.read.textureUnit);
    gl.uniform1i(programs.advection.uniforms['uSource'], framebuffers.density.read.textureUnit);
    gl.uniform1f(
      programs.advection.uniforms['dissipation'],
      FLUID_MOTION_CONFIG.DENSITY_DISSIPATION
    );
    this.requireBlit()(framebuffers.density.write.framebuffer);
    framebuffers.density.swap();
  }

  private applyCurl(): void {
    const gl = this.requireGl();
    const programs = this.requirePrograms();
    const framebuffers = this.requireFramebuffers();
    programs.curl.bind();
    gl.uniform2f(
      programs.curl.uniforms['texelSize'],
      1 / this.framebufferService.getTextureWidth(gl),
      1 / this.framebufferService.getTextureHeight(gl)
    );
    gl.uniform1i(programs.curl.uniforms['uVelocity'], framebuffers.velocity.read.textureUnit);
    this.requireBlit()(framebuffers.curl.framebuffer);
  }

  private applyDivergence(): void {
    const gl = this.requireGl();
    const programs = this.requirePrograms();
    const framebuffers = this.requireFramebuffers();
    programs.divergence.bind();
    gl.uniform2f(
      programs.divergence.uniforms['texelSize'],
      1 / this.framebufferService.getTextureWidth(gl),
      1 / this.framebufferService.getTextureHeight(gl)
    );
    gl.uniform1i(
      programs.divergence.uniforms['uVelocity'],
      framebuffers.velocity.read.textureUnit
    );
    this.requireBlit()(framebuffers.divergence.framebuffer);
  }

  private applyGradientSubtract(): void {
    const gl = this.requireGl();
    const programs = this.requirePrograms();
    const framebuffers = this.requireFramebuffers();
    programs.gradientSubtract.bind();
    gl.uniform2f(
      programs.gradientSubtract.uniforms['texelSize'],
      1 / this.framebufferService.getTextureWidth(gl),
      1 / this.framebufferService.getTextureHeight(gl)
    );
    gl.uniform1i(
      programs.gradientSubtract.uniforms['uPressure'],
      framebuffers.pressure.read.textureUnit
    );
    gl.uniform1i(
      programs.gradientSubtract.uniforms['uVelocity'],
      framebuffers.velocity.read.textureUnit
    );
    this.requireBlit()(framebuffers.velocity.write.framebuffer);
    framebuffers.velocity.swap();
  }

  private applyPointerSplats(): void {
    for (const pointer of this.pointers) {
      if (!pointer.moved) {
        continue;
      }

      this.splat(pointer.x, pointer.y, pointer.dx, pointer.dy, pointer.color);
      pointer.moved = false;
    }
  }

  private applyPressure(): void {
    const gl = this.requireGl();
    const programs = this.requirePrograms();
    const framebuffers = this.requireFramebuffers();
    programs.pressure.bind();
    gl.uniform2f(
      programs.pressure.uniforms['texelSize'],
      1 / this.framebufferService.getTextureWidth(gl),
      1 / this.framebufferService.getTextureHeight(gl)
    );
    gl.uniform1i(
      programs.pressure.uniforms['uDivergence'],
      framebuffers.divergence.textureUnit
    );
    gl.uniform1i(
      programs.pressure.uniforms['uPressure'],
      framebuffers.pressure.read.textureUnit
    );
    gl.activeTexture(gl.TEXTURE0 + framebuffers.pressure.read.textureUnit);

    for (let index = 0; index < FLUID_MOTION_CONFIG.PRESSURE_ITERATIONS; index += 1) {
      gl.bindTexture(gl.TEXTURE_2D, framebuffers.pressure.read.texture);
      this.requireBlit()(framebuffers.pressure.write.framebuffer);
      framebuffers.pressure.swap();
    }
  }

  private applyPressureClear(): void {
    const gl = this.requireGl();
    const programs = this.requirePrograms();
    const framebuffers = this.requireFramebuffers();
    programs.clear.bind();
    gl.activeTexture(gl.TEXTURE0 + framebuffers.pressure.read.textureUnit);
    gl.bindTexture(gl.TEXTURE_2D, framebuffers.pressure.read.texture);
    gl.uniform1i(
      programs.clear.uniforms['uTexture'],
      framebuffers.pressure.read.textureUnit
    );
    gl.uniform1f(
      programs.clear.uniforms['value'],
      FLUID_MOTION_CONFIG.PRESSURE_DISSIPATION
    );
    this.requireBlit()(framebuffers.pressure.write.framebuffer);
    framebuffers.pressure.swap();
  }

  private applyVorticity(dt: number): void {
    const gl = this.requireGl();
    const programs = this.requirePrograms();
    const framebuffers = this.requireFramebuffers();
    programs.vorticity.bind();
    gl.uniform2f(
      programs.vorticity.uniforms['texelSize'],
      1 / this.framebufferService.getTextureWidth(gl),
      1 / this.framebufferService.getTextureHeight(gl)
    );
    gl.uniform1i(
      programs.vorticity.uniforms['uVelocity'],
      framebuffers.velocity.read.textureUnit
    );
    gl.uniform1i(programs.vorticity.uniforms['uCurl'], framebuffers.curl.textureUnit);
    gl.uniform1f(programs.vorticity.uniforms['curl'], FLUID_MOTION_CONFIG.CURL);
    gl.uniform1f(programs.vorticity.uniforms['dt'], dt);
    this.requireBlit()(framebuffers.velocity.write.framebuffer);
    framebuffers.velocity.swap();
  }

  private display(): void {
    const gl = this.requireGl();
    const programs = this.requirePrograms();
    const framebuffers = this.requireFramebuffers();
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    programs.display.bind();
    gl.uniform1i(programs.display.uniforms['uTexture'], framebuffers.density.read.textureUnit);
    this.requireBlit()(null);
  }

  private getDeltaTime(): number {
    const now = Date.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.016);
    this.lastTime = now;
    return dt;
  }

  private requireBlit(): FluidMotionBlit {
    if (!this.blit) {
      throw new Error('Fluid blit is not initialized.');
    }

    return this.blit;
  }

  private requireCanvas(): HTMLCanvasElement {
    if (!this.canvas) {
      throw new Error('Fluid canvas is not initialized.');
    }

    return this.canvas;
  }

  private requireExtensions(): FluidMotionExtensions {
    if (!this.extensions) {
      throw new Error('Fluid extensions are not initialized.');
    }

    return this.extensions;
  }

  private requireFramebuffers(): FluidMotionFramebufferCollection {
    if (!this.framebuffers) {
      throw new Error('Fluid framebuffers are not initialized.');
    }

    return this.framebuffers;
  }

  private requireGl(): FluidMotionGlContext {
    if (!this.gl) {
      throw new Error('Fluid WebGL context is not initialized.');
    }

    return this.gl;
  }

  private requirePrograms(): FluidMotionProgramCollection {
    if (!this.programs) {
      throw new Error('Fluid programs are not initialized.');
    }

    return this.programs;
  }

  private resizeCanvasIfNeeded(): void {
    const canvas = this.requireCanvas();
    if (canvas.width === canvas.clientWidth && canvas.height === canvas.clientHeight) {
      return;
    }

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    this.framebuffers = this.framebufferService.initialize(
      this.requireGl(),
      this.requireExtensions()
    );
  }

  private runSimulation(): void {
    const gl = this.requireGl();
    gl.viewport(
      0,
      0,
      this.framebufferService.getTextureWidth(gl),
      this.framebufferService.getTextureHeight(gl)
    );

    if (this.splatStack.length > 0) {
      const splatCount = this.splatStack.pop();
      if (splatCount) {
        this.multipleSplats(splatCount);
      }
    }

    const dt = this.getDeltaTime();
    this.applyAdvection(dt);
    this.applyPointerSplats();
    this.applyCurl();
    this.applyVorticity(dt);
    this.applyDivergence();
    this.applyPressureClear();
    this.applyPressure();
    this.applyGradientSubtract();
    this.display();
  }

  private splat(
    x: number,
    y: number,
    dx: number,
    dy: number,
    color: number[]
  ): void {
    const gl = this.requireGl();
    const programs = this.requirePrograms();
    const framebuffers = this.requireFramebuffers();
    const canvas = this.requireCanvas();

    programs.splat.bind();
    gl.uniform1i(programs.splat.uniforms['uTarget'], framebuffers.velocity.read.textureUnit);
    gl.uniform1f(programs.splat.uniforms['aspectRatio'], canvas.width / canvas.height);
    gl.uniform2f(programs.splat.uniforms['point'], x / canvas.width, 1 - y / canvas.height);
    gl.uniform3f(programs.splat.uniforms['color'], dx, -dy, 1);
    gl.uniform1f(programs.splat.uniforms['radius'], FLUID_MOTION_CONFIG.SPLAT_RADIUS);
    this.requireBlit()(framebuffers.velocity.write.framebuffer);
    framebuffers.velocity.swap();

    gl.uniform1i(programs.splat.uniforms['uTarget'], framebuffers.density.read.textureUnit);
    gl.uniform3f(
      programs.splat.uniforms['color'],
      color[0] * 0.02,
      color[1] * 0.02,
      color[2] * 0.02
    );
    this.requireBlit()(framebuffers.density.write.framebuffer);
    framebuffers.density.swap();
  }
}
