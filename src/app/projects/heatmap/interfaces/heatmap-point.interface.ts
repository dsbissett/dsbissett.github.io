import { HeatmapSeverity } from '../types/heatmap-severity.type';

export interface HeatmapPoint {
  x: number;
  y: number;
  severity: HeatmapSeverity;
}
