import { FluidMotionExtensions } from './fluid-motion-extensions.interface';
import { FluidMotionGlContext } from '../types/fluid-motion-gl-context.type';

export interface FluidMotionWebGlContext {
  ext: FluidMotionExtensions;
  gl: FluidMotionGlContext;
}
