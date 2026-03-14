import { GlProgram } from '../classes/gl-program.class';

export interface FluidMotionProgramCollection {
  advection: GlProgram;
  clear: GlProgram;
  curl: GlProgram;
  display: GlProgram;
  divergence: GlProgram;
  gradientSubtract: GlProgram;
  pressure: GlProgram;
  splat: GlProgram;
  vorticity: GlProgram;
}
