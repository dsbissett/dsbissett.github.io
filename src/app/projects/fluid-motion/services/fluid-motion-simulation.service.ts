import { Injectable, inject } from '@angular/core';

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
  private readonly framebufferService = inject(FluidMotionFramebufferService);
  private blit: FluidMotionBlit | null = null;
  private ambientPhase = Math.random() * Math.PI * 2;
  private canvas: HTMLCanvasElement | null = null;
  private extensions: FluidMotionExtensions | null = null;
  private framebuffers: FluidMotionFramebufferCollection | null = null;
  private gl: FluidMotionGlContext | null = null;
  private lastTime = Date.now();
  private nextAmbientBurstAt = 0;
  private pointers: FluidMotionPointer[] = [];
  private programs: FluidMotionProgramCollection | null = null;
  private splatStack: number[] = [];

  public initialize(
    canvas: HTMLCanvasElement,
    gl: FluidMotionGlContext,
    ext: FluidMotionExtensions,
    programs: FluidMotionProgramCollection,
    framebuffers: FluidMotionFramebufferCollection,
    blit: FluidMotionBlit,
    pointers: FluidMotionPointer[],
  ): void {
    this.canvas = canvas;
    this.gl = gl;
    this.extensions = ext;
    this.programs = programs;
    this.framebuffers = framebuffers;
    this.blit = blit;
    this.pointers = pointers;
    this.lastTime = Date.now();
    this.ambientPhase = Math.random() * Math.PI * 2;
    this.nextAmbientBurstAt = this.lastTime + 1600;
  }

  public multipleSplats(amount: number): void {
    const canvas = this.requireCanvas();

    for (let index = 0; index < amount; index += 2) {
      const phase = this.ambientPhase + index * 0.33 + Math.random() * 0.24;
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const dx = 620 * (Math.random() - 0.5);
      const dy = 620 * (Math.random() - 0.5);

      this.splat(x, y, dx, dy, this.createSpectralColor(phase, 0.98 + Math.random() * 0.12));

      if (index + 1 < amount) {
        this.splat(
          canvas.width - x,
          canvas.height - y,
          -dx,
          -dy,
          this.createSpectralColor(phase + 0.17, 0.98 + Math.random() * 0.12),
        );
      }
    }

    this.ambientPhase += amount * 0.08;
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
    this.nextAmbientBurstAt = 0;
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
      FLUID_MOTION_CONFIG.VELOCITY_DISSIPATION,
    );
    this.requireBlit()(framebuffers.velocity.write.framebuffer);
    framebuffers.velocity.swap();

    gl.uniform1i(programs.advection.uniforms['uVelocity'], framebuffers.velocity.read.textureUnit);
    gl.uniform1i(programs.advection.uniforms['uSource'], framebuffers.density.read.textureUnit);
    gl.uniform1f(
      programs.advection.uniforms['dissipation'],
      FLUID_MOTION_CONFIG.DENSITY_DISSIPATION,
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
      1 / this.framebufferService.getTextureHeight(gl),
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
      1 / this.framebufferService.getTextureHeight(gl),
    );
    gl.uniform1i(programs.divergence.uniforms['uVelocity'], framebuffers.velocity.read.textureUnit);
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
      1 / this.framebufferService.getTextureHeight(gl),
    );
    gl.uniform1i(
      programs.gradientSubtract.uniforms['uPressure'],
      framebuffers.pressure.read.textureUnit,
    );
    gl.uniform1i(
      programs.gradientSubtract.uniforms['uVelocity'],
      framebuffers.velocity.read.textureUnit,
    );
    this.requireBlit()(framebuffers.velocity.write.framebuffer);
    framebuffers.velocity.swap();
  }

  private applyPointerSplats(): void {
    let applied = false;

    for (const pointer of this.pointers) {
      if (!pointer.moved) {
        continue;
      }

      this.splat(pointer.x, pointer.y, pointer.dx, pointer.dy, pointer.color);
      pointer.moved = false;
      applied = true;
    }

    if (applied) {
      this.nextAmbientBurstAt = Date.now() + 2200;
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
      1 / this.framebufferService.getTextureHeight(gl),
    );
    gl.uniform1i(programs.pressure.uniforms['uDivergence'], framebuffers.divergence.textureUnit);
    gl.uniform1i(programs.pressure.uniforms['uPressure'], framebuffers.pressure.read.textureUnit);
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
    gl.uniform1i(programs.clear.uniforms['uTexture'], framebuffers.pressure.read.textureUnit);
    gl.uniform1f(programs.clear.uniforms['value'], FLUID_MOTION_CONFIG.PRESSURE_DISSIPATION);
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
      1 / this.framebufferService.getTextureHeight(gl),
    );
    gl.uniform1i(programs.vorticity.uniforms['uVelocity'], framebuffers.velocity.read.textureUnit);
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
    gl.uniform2f(
      programs.display.uniforms['uResolution'],
      gl.drawingBufferWidth,
      gl.drawingBufferHeight,
    );
    gl.uniform1f(programs.display.uniforms['uTime'], this.lastTime * 0.001);
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
      this.requireExtensions(),
    );
  }

  private runSimulation(): void {
    const gl = this.requireGl();
    const now = Date.now();
    gl.viewport(
      0,
      0,
      this.framebufferService.getTextureWidth(gl),
      this.framebufferService.getTextureHeight(gl),
    );

    if (this.splatStack.length > 0) {
      const splatCount = this.splatStack.pop();
      if (splatCount) {
        this.multipleSplats(splatCount);
      }
    }

    this.maybeApplyAmbientBurst(now);

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

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  private createAmbientBurst(): void {
    const canvas = this.requireCanvas();
    const burstCount = 4;
    const centerX = canvas.width * 0.5;
    const centerY = canvas.height * 0.5;
    const radiusX = canvas.width * 0.16;
    const radiusY = canvas.height * 0.13;
    const swirlVelocity = 220;

    for (let index = 0; index < burstCount; index += 1) {
      const angle = this.ambientPhase + (index * Math.PI * 2) / burstCount;
      const x = centerX + Math.cos(angle) * radiusX;
      const y = centerY + Math.sin(angle) * radiusY;

      this.splat(
        x,
        y,
        Math.cos(angle + Math.PI * 0.5) * swirlVelocity,
        Math.sin(angle + Math.PI * 0.5) * swirlVelocity,
        this.createSpectralColor(angle, 0.94),
      );
    }

    this.ambientPhase += 0.42;
  }

  private createSpectralColor(phase: number, intensity: number): [number, number, number] {
    const hue = this.getWrappedUnit(phase / (Math.PI * 2));
    const saturation = 0.8 + 0.14 * this.getWave01(phase * 0.73);
    const value = (8 + 2.8 * this.getWave01(phase * 1.11 + 0.8)) * intensity;
    const [red, green, blue] = this.hsvToRgb(hue, saturation, 1);

    return [red * value, green * value, blue * value];
  }

  private getWave01(phase: number): number {
    return 0.5 + 0.5 * Math.cos(phase);
  }

  private getWrappedUnit(value: number): number {
    return value - Math.floor(value);
  }

  private hsvToRgb(hue: number, saturation: number, value: number): [number, number, number] {
    const wrappedHue = this.getWrappedUnit(hue) * 6;
    const chroma = value * saturation;
    const x = chroma * (1 - Math.abs((wrappedHue % 2) - 1));
    const match = value - chroma;

    if (wrappedHue < 1) {
      return [chroma + match, x + match, match];
    }

    if (wrappedHue < 2) {
      return [x + match, chroma + match, match];
    }

    if (wrappedHue < 3) {
      return [match, chroma + match, x + match];
    }

    if (wrappedHue < 4) {
      return [match, x + match, chroma + match];
    }

    if (wrappedHue < 5) {
      return [x + match, match, chroma + match];
    }

    return [chroma + match, match, x + match];
  }

  private maybeApplyAmbientBurst(now: number): void {
    if (now < this.nextAmbientBurstAt || this.pointers.some((pointer) => pointer.down)) {
      return;
    }

    this.createAmbientBurst();
    this.nextAmbientBurstAt = now + 2800 + Math.random() * 1600;
  }

  private splat(x: number, y: number, dx: number, dy: number, color: number[]): void {
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
      color[0] * 0.016,
      color[1] * 0.016,
      color[2] * 0.016,
    );
    this.requireBlit()(framebuffers.density.write.framebuffer);
    framebuffers.density.swap();
  }
}
