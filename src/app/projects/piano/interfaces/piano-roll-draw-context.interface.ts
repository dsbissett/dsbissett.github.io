import { PianoRollPalette } from './piano-roll-palette.interface';

export interface PianoRollDrawContext {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  hitY: number;
  pxPerMs: number;
  currentMs: number;
  palette: PianoRollPalette;
  gradient: CanvasGradient;
}
