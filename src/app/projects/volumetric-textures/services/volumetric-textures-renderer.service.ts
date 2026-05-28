import { Injectable, inject } from '@angular/core';

import { VolumetricTexturesProgram } from '../interfaces/volumetric-textures-program.interface';
import { VolumetricTexturesContextService } from './volumetric-textures-context.service';
import { VolumetricTexturesPointerService } from './volumetric-textures-pointer.service';

@Injectable()
export class VolumetricTexturesRendererService {
  private readonly context = inject(VolumetricTexturesContextService);
  private readonly pointer = inject(VolumetricTexturesPointerService);

  private gl: WebGL2RenderingContext | null = null;
  private program: VolumetricTexturesProgram | null = null;
  private volumeTexture: WebGLTexture | null = null;
  private quadBuffer: WebGLBuffer | null = null;
  private vertexArray: WebGLVertexArrayObject | null = null;
  private frameId: number | null = null;
  private startTime = 0;

  public initialize(
    gl: WebGL2RenderingContext,
    program: VolumetricTexturesProgram,
    volumeTexture: WebGLTexture,
  ): void {
    this.gl = gl;
    this.program = program;
    this.volumeTexture = volumeTexture;
    this.quadBuffer = this.createFullscreenTriangle(gl);
    this.vertexArray = this.createVertexArray(gl, program, this.quadBuffer);
    this.startTime = performance.now();
  }

  public start(): void {
    if (this.frameId !== null) {
      return;
    }
    const tick = (): void => {
      this.render();
      this.frameId = requestAnimationFrame(tick);
    };
    this.frameId = requestAnimationFrame(tick);
  }

  public stop(): void {
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }

  public swapVolume(nextTexture: WebGLTexture): void {
    const gl = this.gl;
    const previous = this.volumeTexture;
    if (gl && previous) {
      gl.deleteTexture(previous);
    }
    this.volumeTexture = nextTexture;
  }

  public destroy(): void {
    this.stop();
    const gl = this.gl;
    if (!gl) {
      return;
    }
    if (this.vertexArray) {
      gl.deleteVertexArray(this.vertexArray);
    }
    if (this.quadBuffer) {
      gl.deleteBuffer(this.quadBuffer);
    }
    if (this.volumeTexture) {
      gl.deleteTexture(this.volumeTexture);
    }
    if (this.program) {
      gl.deleteProgram(this.program.program);
    }
    this.gl = null;
    this.program = null;
    this.volumeTexture = null;
    this.quadBuffer = null;
    this.vertexArray = null;
  }

  private render(): void {
    const gl = this.gl;
    const program = this.program;
    const texture = this.volumeTexture;
    const vao = this.vertexArray;
    if (!gl || !program || !texture || !vao) {
      return;
    }

    const [width, height] = this.context.getResolution();
    const [mouseX, mouseY] = this.pointer.position();
    const elapsedSeconds = (performance.now() - this.startTime) * 0.001;

    gl.useProgram(program.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_3D, texture);
    gl.uniform1i(program.uniforms.volume, 0);
    gl.uniform2f(program.uniforms.resolution, width, height);
    gl.uniform2f(program.uniforms.mouse, mouseX, mouseY);
    gl.uniform1f(program.uniforms.time, elapsedSeconds);

    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }

  private createFullscreenTriangle(gl: WebGL2RenderingContext): WebGLBuffer {
    const buffer = gl.createBuffer();
    if (!buffer) {
      throw new Error('Failed to allocate quad buffer.');
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    return buffer;
  }

  private createVertexArray(
    gl: WebGL2RenderingContext,
    program: VolumetricTexturesProgram,
    buffer: WebGLBuffer,
  ): WebGLVertexArrayObject {
    const vao = gl.createVertexArray();
    if (!vao) {
      throw new Error('Failed to allocate vertex array.');
    }
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(program.positionAttribute);
    gl.vertexAttribPointer(program.positionAttribute, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    return vao;
  }
}
