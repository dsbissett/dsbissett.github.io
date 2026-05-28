import { Injectable } from '@angular/core';

import { VolumetricTexturesProgram } from '../interfaces/volumetric-textures-program.interface';

@Injectable()
export class VolumetricTexturesProgramService {
  public create(
    gl: WebGL2RenderingContext,
    vertexSource: string,
    fragmentSource: string,
  ): VolumetricTexturesProgram {
    const vertex = this.compile(gl, gl.VERTEX_SHADER, vertexSource);
    const fragment = this.compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = this.link(gl, vertex, fragment);

    gl.deleteShader(vertex);
    gl.deleteShader(fragment);

    return {
      program,
      positionAttribute: gl.getAttribLocation(program, 'a_pos'),
      uniforms: {
        volume: this.requireUniform(gl, program, 'u_vol'),
        resolution: this.requireUniform(gl, program, 'u_resolution'),
        mouse: this.requireUniform(gl, program, 'u_mouse'),
        time: this.requireUniform(gl, program, 'u_time'),
      },
    };
  }

  private compile(gl: WebGL2RenderingContext, type: GLenum, source: string): WebGLShader {
    const shader = gl.createShader(type);
    if (!shader) {
      throw new Error('Failed to allocate shader.');
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader) ?? 'unknown error';
      gl.deleteShader(shader);
      throw new Error(`Shader compile failed: ${log}`);
    }

    return shader;
  }

  private link(
    gl: WebGL2RenderingContext,
    vertex: WebGLShader,
    fragment: WebGLShader,
  ): WebGLProgram {
    const program = gl.createProgram();
    if (!program) {
      throw new Error('Failed to allocate program.');
    }

    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program) ?? 'unknown error';
      gl.deleteProgram(program);
      throw new Error(`Program link failed: ${log}`);
    }

    return program;
  }

  private requireUniform(
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
    name: string,
  ): WebGLUniformLocation {
    const location = gl.getUniformLocation(program, name);
    if (!location) {
      throw new Error(`Uniform '${name}' is not active in the program.`);
    }
    return location;
  }
}
