import { Injectable } from '@angular/core';

import { TetrisBoardMetrics } from '../interfaces/tetris-board-metrics.interface';

@Injectable()
export class TetrisBoardMetricsService {
  /**
   * Denormalizes a 57-element feature vector to raw board metric values.
   * Constants must stay in lockstep with the normalisers in
   * tetris-board-analyzer.service.ts.
   *
   * Feature indices used:
   *   19: max height (×20)
   *   20: aggregate height (×200)
   *   21: holes (×20)
   *   22: lines cleared (×4)
   *   23: bumpiness (×30)
   *   24: covered cells (×40)
   *   25: pillars (×10)
   *   26: wells (×20)
   *   27: row completeness (×20)
   *   29: low-board density (already [0,1])
   *   30: height variance (×25)
   *   31: near-complete rows (×10)
   *   32: row transitions (×120)
   *   33: column transitions (×60)
   *   34: landing height (×20)
   *   35: eroded piece cells (×16)
   */
  public extractMetrics(features: number[]): TetrisBoardMetrics {
    return {
      holes: features[21] * 20,              // normalized by /20
      coveredCells: features[24] * 40,       // normalized by /40
      aggregateHeight: features[20] * 200,   // normalized by /200
      bumpiness: features[23] * 30,          // normalized by /30
      maxHeight: features[19] * 20,          // normalized by /20
      pillars: features[25] * 10,            // normalized by /10
      wells: features[26] * 20,              // normalized by /20
      rowCompleteness: features[27] * 20,    // normalized by /20
      lowBoardDensity: features[29],         // already [0,1] (fill fraction of bottom 4 rows)
      heightVariance: features[30] * 25,     // normalized by /25
      nearCompleteRows: features[31] * 10,   // normalized by /10
      completedLines: features[22] * 4,      // normalized by /4
      rowTransitions: features[32] * 120,    // normalized by /120
      columnTransitions: features[33] * 60,  // normalized by /60
      landingHeight: features[34] * 20,      // normalized by /gridHeight (20)
      erodedPieceCells: features[35] * 16,   // normalized by /16
    };
  }
}
