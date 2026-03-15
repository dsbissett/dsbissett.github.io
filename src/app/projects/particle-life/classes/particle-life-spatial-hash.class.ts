export class ParticleLifeSpatialHash {
  private readonly cellSize: number;
  private readonly inverseCellSize: number;
  private cols = 0;
  private rows = 0;
  private cells: number[][] = [];

  constructor(cellSize: number) {
    this.cellSize = cellSize;
    this.inverseCellSize = 1 / cellSize;
  }

  public resize(width: number, height: number): void {
    this.cols = Math.ceil(width * this.inverseCellSize);
    this.rows = Math.ceil(height * this.inverseCellSize);
    const totalCells = this.cols * this.rows;

    if (this.cells.length < totalCells) {
      const oldLength = this.cells.length;
      this.cells.length = totalCells;

      for (let i = oldLength; i < totalCells; i++) {
        this.cells[i] = [];
      }
    }
  }

  public clear(): void {
    const totalCells = this.cols * this.rows;

    for (let i = 0; i < totalCells; i++) {
      this.cells[i].length = 0;
    }
  }

  public insert(index: number, x: number, y: number): void {
    const col = Math.min(Math.max(0, Math.floor(x * this.inverseCellSize)), this.cols - 1);
    const row = Math.min(Math.max(0, Math.floor(y * this.inverseCellSize)), this.rows - 1);
    this.cells[row * this.cols + col].push(index);
  }

  public forEachNeighbor(
    x: number,
    y: number,
    wrap: boolean,
    wrapWidth: number,
    wrapHeight: number,
    callback: (index: number) => void
  ): void {
    const col = Math.floor(x * this.inverseCellSize);
    const row = Math.floor(y * this.inverseCellSize);

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        let c = col + dc;
        let r = row + dr;

        if (wrap) {
          c = ((c % this.cols) + this.cols) % this.cols;
          r = ((r % this.rows) + this.rows) % this.rows;
        } else {
          if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) {
            continue;
          }
        }

        const cell = this.cells[r * this.cols + c];

        for (let k = 0; k < cell.length; k++) {
          callback(cell[k]);
        }
      }
    }
  }
}
