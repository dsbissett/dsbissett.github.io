import { DoubleFramebuffer } from '../classes/double-framebuffer.class';
import { SingleFramebuffer } from '../classes/single-framebuffer.class';

export interface FluidMotionFramebufferCollection {
  curl: SingleFramebuffer;
  density: DoubleFramebuffer;
  divergence: SingleFramebuffer;
  pressure: DoubleFramebuffer;
  velocity: DoubleFramebuffer;
}
