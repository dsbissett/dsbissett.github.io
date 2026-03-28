import { Injectable } from '@angular/core';

import { TetrisBoardMetrics } from '../interfaces/tetris-board-metrics.interface';

@Injectable()
export class TetrisBoardMetricsService {
  /**
   * Denormalizes a 53-element feature vector to raw board metric values.
   *
   * Feature indices used:
   *   19: max height (×20)
   *   20: aggregate height (×200)
   *   21: holes (×40)
   *   23: bumpiness (×100)
   *   24: covered cells (×120)
   *   25: pillars (×10)
   *   26: wells (×100)
   *   27: row completeness (×20)
   *   29: low-board density (already [0,1])
   *   30: height variance (×100)
   *   31: near-complete rows (×10)
   */
  public extractMetrics(features: number[]): TetrisBoardMetrics {
    return {
      holes: features[21] * 40,            // normalized by /40
      coveredCells: features[24] * 120,    // normalized by /120
      aggregateHeight: features[20] * 200, // normalized by /200
      bumpiness: features[23] * 100,       // normalized by /100
      maxHeight: features[19] * 20,        // normalized by /20
      pillars: features[25] * 10,          // normalized by /10
      wells: features[26] * 100,           // normalized by /100
      rowCompleteness: features[27] * 20,  // normalized by /20
      lowBoardDensity: features[29],       // already [0,1] (fill fraction of bottom 4 rows)
      heightVariance: features[30] * 100,  // normalized by /100
      nearCompleteRows: features[31] * 10, // normalized by /10
    };
  }
}
