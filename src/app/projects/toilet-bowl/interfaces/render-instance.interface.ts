/** One instanced draw of a clod or decal mesh (mud missile, settled clump, or stain). */
export interface RenderInstance {
  readonly meshIndex: number;
  readonly model: Float32Array;
  readonly color: readonly [number, number, number];
  readonly alpha: number;
  readonly cracks: number;
}
