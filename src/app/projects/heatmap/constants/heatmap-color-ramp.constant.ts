import { HeatmapColorStop } from '../interfaces/heatmap-color-stop.interface';

export const HEATMAP_COLOR_RAMP: readonly HeatmapColorStop[] = [
  {
    position: 0,
    color: [0, 255, 80],
  },
  {
    position: 0.45,
    color: [255, 255, 0],
  },
  {
    position: 0.72,
    color: [255, 165, 0],
  },
  {
    position: 1,
    color: [180, 0, 0],
  },
];
