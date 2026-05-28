import { VolumetricTexturesUniforms } from './volumetric-textures-uniforms.interface';

export interface VolumetricTexturesProgram {
  readonly program: WebGLProgram;
  readonly uniforms: VolumetricTexturesUniforms;
  readonly positionAttribute: number;
}
