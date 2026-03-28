import { Injectable } from '@angular/core';

/**
 * Extracts the 53-element normalised feature vector from a board state and provides
 * all board metric helpers (column heights, holes, bumpiness, etc.).
 *
 * Feature layout:
 *   indices  0–9  : column heights (10), normalised /20
 *   indices 10–18 : height diffs (9), shifted to [0,1] via (d+20)/40
 *   index   19    : max height, normalised /20
 *   index   20    : aggregate height, normalised /200
 *   index   21    : holes, normalised /40
 *   index   22    : lines cleared, normalised /4
 *   index   23    : bumpiness, normalised /100
 *   index   24    : covered cells, normalised /120
 *   index   25    : pillars, normalised /10
 *   index   26    : wells, normalised /100
 *   index   27    : row completeness (sum of (filled/width)^2 per row), normalised /20
 *   index   28    : sqrt-normalised absolute holes
 *   index   29    : low-board density (bottom 4 rows fill fraction)
 *   index   30    : height variance, normalised /100
 *   index   31    : near-complete rows (>=80% filled), normalised /10
 *   indices 32–52 : preview queue — 3 × 7-element one-hot piece encodings
 */
@Injectable()
export class TetrisBoardAnalyzerService {
  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Extracts 53 features from the board state after a simulated placement.
   *
   * @param grid        The board grid (rows × cols of cell values, 0 = empty).
   * @param linesCleared Number of lines cleared by the most-recent placement.
   * @param previewQueue Up to 3 upcoming piece matrices.
   */
  public extractFeatures(grid: number[][], linesCleared: number, previewQueue: number[][][]): number[] {
    const heights = this.getColumnHeights(grid);
    const diffs = this.getHeightDiffs(heights);
    const maxHeight = Math.max(...heights);
    const aggregateHeight = heights.reduce((s, h) => s + h, 0);
    const holes = this.countHoles(grid, heights);
    const coveredCells = this.countCoveredCells(grid, heights);
    const bumpiness = diffs.reduce((s, d) => s + Math.abs(d), 0);
    const pillars = this.countPillars(grid, heights);
    const wells = this.countWells(heights);
    const { rowCompleteness, nearCompleteRows } = this.computeRowMetrics(grid);
    const lowBoardDensity = this.computeLowBoardDensity(grid);
    const heightVariance = this.computeHeightVariance(heights, aggregateHeight);

    return [
      ...heights.map((h) => this.clamp(h / 20)), // indices 0–9
      ...diffs.map((d) => (d + 20) / 40), // indices 10–18 (shift to [0,1])
      this.clamp(maxHeight / 20), // index 19
      this.clamp(aggregateHeight / 200), // index 20
      this.clamp(holes / 40), // index 21
      this.clamp(linesCleared / 4), // index 22
      this.clamp(bumpiness / 100), // index 23
      this.clamp(coveredCells / 120), // index 24
      this.clamp(pillars / 10), // index 25
      this.clamp(wells / 100), // index 26
      this.clamp(rowCompleteness / 20), // index 27: row completeness
      this.clamp(Math.sqrt(holes) / 6.32), // index 28: sqrt-normalised absolute holes
      this.clamp(lowBoardDensity), // index 29: low-board density
      this.clamp(heightVariance / 100), // index 30: height variance (tower detector)
      this.clamp(nearCompleteRows / 10), // index 31: near-complete rows (>=80% filled)
      ...this.encodePreviewQueue(previewQueue), // indices 32–52
    ];
  }

  /** Returns the height of each column (number of filled rows from the bottom). */
  public getColumnHeights(grid: number[][]): number[] {
    const rows = grid.length;
    const cols = grid[0].length;
    const heights: number[] = Array(cols).fill(0);
    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        if (grid[y][x] !== 0) {
          heights[x] = rows - y;
          break;
        }
      }
    }
    return heights;
  }

  /** Returns the signed difference between each adjacent pair of column heights. */
  public getHeightDiffs(heights: number[]): number[] {
    const diffs: number[] = [];
    for (let i = 0; i < heights.length - 1; i++) {
      diffs.push(heights[i + 1] - heights[i]);
    }
    return diffs;
  }

  /** Counts empty cells that are covered by at least one filled cell above them. */
  public countHoles(grid: number[][], heights: number[]): number {
    const rows = grid.length;
    let holes = 0;
    for (let x = 0; x < grid[0].length; x++) {
      const topY = rows - heights[x];
      for (let y = topY; y < rows; y++) {
        if (grid[y][x] === 0) holes++;
      }
    }
    return holes;
  }

  /**
   * Counts filled cells that sit above holes (blockades).
   * A higher count means holes are more deeply buried and harder to clear.
   */
  public countCoveredCells(grid: number[][], heights: number[]): number {
    const rows = grid.length;
    let covered = 0;
    for (let x = 0; x < grid[0].length; x++) {
      const topY = rows - heights[x];
      let filledAbove = 0;
      for (let y = topY; y < rows; y++) {
        if (grid[y][x] !== 0) {
          filledAbove++;
        } else {
          // This is a hole — all filled cells above it are blockades.
          covered += filledAbove;
        }
      }
    }
    return covered;
  }

  /**
   * Counts runs of 2+ consecutive empty cells within the occupied portion
   * of each column (pillar gaps that are hard to fill).
   */
  public countPillars(grid: number[][], heights: number[]): number {
    const rows = grid.length;
    let pillars = 0;
    for (let x = 0; x < grid[0].length; x++) {
      const topY = rows - heights[x];
      let consecutiveEmpty = 0;
      for (let y = topY; y < rows; y++) {
        if (grid[y][x] === 0) {
          consecutiveEmpty++;
        } else {
          if (consecutiveEmpty >= 2) pillars++;
          consecutiveEmpty = 0;
        }
      }
      if (consecutiveEmpty >= 2) pillars++;
    }
    return pillars;
  }

  /**
   * Sums up well depths across all columns.
   * A well is a column lower than both its neighbours.
   * Well depth = min(leftHeight, rightHeight) − columnHeight.
   * Targets the "island" pattern where isolated clusters leave gaps.
   */
  public countWells(heights: number[]): number {
    let wells = 0;
    for (let i = 0; i < heights.length; i++) {
      const left = i > 0 ? heights[i - 1] : heights[i];
      const right = i < heights.length - 1 ? heights[i + 1] : heights[i];
      const minNeighbor = Math.min(left, right);
      if (heights[i] < minNeighbor) {
        wells += minNeighbor - heights[i];
      }
    }
    return wells;
  }

  /**
   * Encodes the preview queue as 3 × 7 one-hot vectors (21 values total).
   * Piece identity is determined by the non-zero cell value in the matrix:
   * 1=I, 2=O, 3=T, 4=L, 5=J, 6=S, 7=Z.
   */
  public encodePreviewQueue(previewQueue: number[][][]): number[] {
    const encoded: number[] = [];
    for (let i = 0; i < 3; i++) {
      const oneHot = [0, 0, 0, 0, 0, 0, 0];
      const matrix = previewQueue[i];
      if (matrix) {
        const pieceId = this.getPieceId(matrix);
        if (pieceId >= 1 && pieceId <= 7) {
          oneHot[pieceId - 1] = 1;
        }
      }
      encoded.push(...oneHot);
    }
    return encoded;
  }

  /** Returns the non-zero cell value from a piece matrix (1–7), or 0 if not found. */
  public getPieceId(matrix: number[][]): number {
    for (const row of matrix) {
      for (const cell of row) {
        if (cell !== 0) return cell;
      }
    }
    return 0;
  }

  // ---------------------------------------------------------------------------
  // Private helpers (extracted to keep extractFeatures complexity ≤ 5)
  // ---------------------------------------------------------------------------

  /** Computes row completeness and near-complete rows from the grid. */
  private computeRowMetrics(grid: number[][]): { rowCompleteness: number; nearCompleteRows: number } {
    const gridWidth = grid[0]?.length ?? 10;
    let rowCompleteness = 0;
    let nearCompleteRows = 0;
    for (const row of grid) {
      let filled = 0;
      for (let col = 0; col < gridWidth; col++) {
        if (row[col] !== 0) filled++;
      }
      if (filled > 0) {
        const ratio = filled / gridWidth;
        rowCompleteness += ratio * ratio;
        if (ratio >= 0.8) nearCompleteRows++;
      }
    }
    return { rowCompleteness, nearCompleteRows };
  }

  /** Computes the fill fraction of the bottom 4 rows. */
  private computeLowBoardDensity(grid: number[][]): number {
    const gridWidth = grid[0]?.length ?? 10;
    const gridHeight = grid.length;
    const lowBoardRows = 4;
    const lowBoardStart = Math.max(0, gridHeight - lowBoardRows);
    let lowBoardFilled = 0;
    for (let y = lowBoardStart; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        if (grid[y][x] !== 0) lowBoardFilled++;
      }
    }
    return lowBoardFilled / (lowBoardRows * gridWidth);
  }

  /**
   * Computes variance of column heights, normalised by the number of columns.
   * Low variance = flat surface (good). High variance = towers (bad).
   */
  private computeHeightVariance(heights: number[], aggregateHeight: number): number {
    const meanHeight = aggregateHeight / heights.length;
    let variance = 0;
    for (const h of heights) {
      const diff = h - meanHeight;
      variance += diff * diff;
    }
    return variance / heights.length;
  }

  /** Clamps a value to the range [0, 1]. */
  private clamp(value: number): number {
    return Math.max(0, Math.min(1, value));
  }
}
