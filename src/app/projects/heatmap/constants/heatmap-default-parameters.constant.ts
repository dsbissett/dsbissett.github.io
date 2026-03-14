import { HeatmapRenderParameters } from '../interfaces/heatmap-render-parameters.interface';

export const HEATMAP_DEFAULT_PARAMETERS: HeatmapRenderParameters = {
  gridStep: 8,
  felonyWeight: 12,
  misdemeanorWeight: 4,
  felonySigma: 95,
  misdemeanorSigma: 65,
  opacity: 0.92,
};
