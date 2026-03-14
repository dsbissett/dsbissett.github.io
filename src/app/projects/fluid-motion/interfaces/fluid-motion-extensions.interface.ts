import { FluidMotionFormatInfo } from './fluid-motion-format-info.interface';

export interface FluidMotionExtensions {
  formatR: FluidMotionFormatInfo;
  formatRG: FluidMotionFormatInfo;
  formatRGBA: FluidMotionFormatInfo;
  halfFloatTexType: number;
  supportLinearFiltering: boolean;
}
