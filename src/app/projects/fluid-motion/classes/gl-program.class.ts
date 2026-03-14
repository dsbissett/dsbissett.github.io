import { FluidMotionGlContext } from '../types/fluid-motion-gl-context.type';

export class GlProgram {
  public readonly uniforms: Record<string, WebGLUniformLocation> = {};
  private readonly program: WebGLProgram;

  public constructor(
    private readonly gl: FluidMotionGlContext,
    vertexShader: WebGLShader,
    fragmentShader: WebGLShader
  ) {
    const program = gl.createProgram();
    if (!program) {
      throw new Error('Unable to create WebGL program.');
    }

    this.program = program;
    gl.attachShader(this.program, vertexShader);
    gl.attachShader(this.program, fragmentShader);
    gl.linkProgram(this.program);
    this.validateProgram();
    this.loadUniforms();
  }

  public bind(): void {
    this.gl.useProgram(this.program);
  }

  private loadUniforms(): void {
    const uniformCount = this.gl.getProgramParameter(
      this.program,
      this.gl.ACTIVE_UNIFORMS
    ) as number;

    for (let index = 0; index < uniformCount; index += 1) {
      const activeUniform = this.gl.getActiveUniform(this.program, index);
      if (!activeUniform) {
        continue;
      }

      const location = this.gl.getUniformLocation(this.program, activeUniform.name);
      if (location) {
        this.uniforms[activeUniform.name] = location;
      }
    }
  }

  private validateProgram(): void {
    const isLinked = this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS);
    if (!isLinked) {
      throw new Error(this.gl.getProgramInfoLog(this.program) ?? 'Program linking failed.');
    }
  }
}
