export class TetrisMatrix {
  public static rotate(matrix: number[][]): number[][] {
    return matrix[0].map((_, i) => matrix.map((row) => row[i])).reverse();
  }

  public static deepCopy(matrix: number[][]): number[][] {
    return matrix.map((row) => [...row]);
  }
}
