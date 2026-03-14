import { Injectable, inject } from '@angular/core';

import { GlProgram } from '../classes/gl-program.class';
import { FluidMotionProgramCollection } from '../interfaces/fluid-motion-program-collection.interface';
import { FluidMotionShaderSourceService } from './fluid-motion-shader-source.service';
import { FluidMotionBlit } from '../types/fluid-motion-blit.type';
import { FluidMotionGlContext } from '../types/fluid-motion-gl-context.type';

@Injectable()
export class FluidMotionProgramService {
  private readonly shaderSourceService = inject(FluidMotionShaderSourceService);

  public createBlit(gl: FluidMotionGlContext): FluidMotionBlit {
    const vertexBuffer = gl.createBuffer();
    const indexBuffer = gl.createBuffer();

    if (!vertexBuffer || !indexBuffer) {
      throw new Error('Unable to create fluid draw buffers.');
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]),
      gl.STATIC_DRAW
    );
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array([0, 1, 2, 0, 2, 3]),
      gl.STATIC_DRAW
    );
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    return (destination: WebGLFramebuffer | null) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, destination);
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    };
  }

  public createPrograms(gl: FluidMotionGlContext): FluidMotionProgramCollection {
    const sources = this.shaderSourceService.getSources();
    const baseVertexShader = this.compileShader(gl, gl.VERTEX_SHADER, sources.baseVertex);

    return {
      advection: new GlProgram(
        gl,
        baseVertexShader,
        this.compileShader(gl, gl.FRAGMENT_SHADER, sources.advection)
      ),
      clear: new GlProgram(
        gl,
        baseVertexShader,
        this.compileShader(gl, gl.FRAGMENT_SHADER, sources.clear)
      ),
      curl: new GlProgram(
        gl,
        baseVertexShader,
        this.compileShader(gl, gl.FRAGMENT_SHADER, sources.curl)
      ),
      display: new GlProgram(
        gl,
        baseVertexShader,
        this.compileShader(gl, gl.FRAGMENT_SHADER, sources.display)
      ),
      divergence: new GlProgram(
        gl,
        baseVertexShader,
        this.compileShader(gl, gl.FRAGMENT_SHADER, sources.divergence)
      ),
      gradientSubtract: new GlProgram(
        gl,
        baseVertexShader,
        this.compileShader(gl, gl.FRAGMENT_SHADER, sources.gradientSubtract)
      ),
      pressure: new GlProgram(
        gl,
        baseVertexShader,
        this.compileShader(gl, gl.FRAGMENT_SHADER, sources.pressure)
      ),
      splat: new GlProgram(
        gl,
        baseVertexShader,
        this.compileShader(gl, gl.FRAGMENT_SHADER, sources.splat)
      ),
      vorticity: new GlProgram(
        gl,
        baseVertexShader,
        this.compileShader(gl, gl.FRAGMENT_SHADER, sources.vorticity)
      ),
    };
  }

  private compileShader(
    gl: FluidMotionGlContext,
    type: number,
    source: string
  ): WebGLShader {
    const shader = gl.createShader(type);
    if (!shader) {
      throw new Error('Unable to create fluid shader.');
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader) ?? 'Fluid shader compilation failed.');
    }

    return shader;
  }
}
