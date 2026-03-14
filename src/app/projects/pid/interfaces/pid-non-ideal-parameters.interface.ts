export interface PidNonIdealParameters {
  saturationEnabled: boolean;
  actuatorLimit: number;
  antiWindupEnabled: boolean;
  noiseEnabled: boolean;
  noiseSigma: number;
  delayEnabled: boolean;
  delayMs: number;
  derivativeFilterEnabled: boolean;
  derivativeTau: number;
}
