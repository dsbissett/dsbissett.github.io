/**
 * Raw geometry buffers for a single indexed mesh, expressed in world space.
 * Positions/normals/colors are flat triples; indices are 32-bit (WebGL2).
 */
export interface MeshData {
  readonly positions: readonly number[];
  readonly normals: readonly number[];
  readonly colors: readonly number[];
  readonly indices: readonly number[];
}
