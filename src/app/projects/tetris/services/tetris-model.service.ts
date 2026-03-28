import { Injectable, inject } from '@angular/core';
import * as tf from '@tensorflow/tfjs';

import { TETRIS_AI_CONFIG } from '../constants/tetris-ai-config.constant';
import { TetrisSerializedModelArtifacts } from '../interfaces/tetris-serialized-model-artifacts.interface';
import { TetrisAiStatsService } from './tetris-ai-stats.service';

@Injectable()
export class TetrisModelService {
  private readonly stats = inject(TetrisAiStatsService);
  private model!: tf.Sequential;
  private targetModel!: tf.Sequential;

  /** Builds both model and target model from scratch. Disposes previous models if they exist. */
  public buildModels(): void {
    if (this.model) {
      this.model.dispose();
    }
    if (this.targetModel) {
      this.targetModel.dispose();
    }
    this.model = this.createModel();
    this.targetModel = this.createModel();
    this.syncTargetNetwork();
  }

  /**
   * Attempts to load model from localStorage.
   * Returns false if key not found, shape mismatch, or any error.
   */
  public async tryLoadModel(): Promise<boolean> {
    try {
      const key = `localstorage://${TETRIS_AI_CONFIG.modelStorageKey}`;
      const loaded = await tf.loadLayersModel(key);

      const inputSize = this.getLoadedModelInputSize(loaded);
      if (inputSize !== TETRIS_AI_CONFIG.featureCount) {
        loaded.dispose();
        return false;
      }

      this.model = this.createModel();
      this.setModelWeightsFromLoadedModel(loaded);
      this.targetModel = this.createModel();
      this.syncTargetNetwork();
      loaded.dispose();
      return true;
    } catch {
      return false;
    }
  }

  /** Loads a model from serialized artifacts (used during import). */
  public async loadImportedModel(artifacts: TetrisSerializedModelArtifacts): Promise<void> {
    if (this.model) {
      this.model.dispose();
    }
    if (this.targetModel) {
      this.targetModel.dispose();
    }

    const loaded = await tf.loadLayersModel(
      tf.io.fromMemory({
        modelTopology: artifacts.modelTopology,
        weightSpecs: artifacts.weightSpecs,
        weightData: this.base64ToArrayBuffer(artifacts.weightDataBase64),
      }),
    );

    this.model = this.createModel();
    this.setModelWeightsFromLoadedModel(loaded);
    this.targetModel = this.createModel();
    this.syncTargetNetwork();
    loaded.dispose();
  }

  /** Copies weights from model to targetModel. */
  public syncTargetNetwork(): void {
    const clonedWeights = this.model.getWeights().map((weight) => weight.clone());
    this.targetModel.setWeights(clonedWeights);
    clonedWeights.forEach((weight) => weight.dispose());
  }

  /** Saves model to localStorage asynchronously. */
  public persistModel(): void {
    const key = `localstorage://${TETRIS_AI_CONFIG.modelStorageKey}`;
    this.model.save(key).catch(() => undefined);
  }

  /** Captures model artifacts for export (returns raw tf.io.ModelArtifacts). */
  public async captureModelArtifacts(): Promise<tf.io.ModelArtifacts> {
    let artifacts: tf.io.ModelArtifacts | null = null;

    await this.model.save(
      tf.io.withSaveHandler(async (modelArtifacts) => {
        artifacts = modelArtifacts;
        return {
          modelArtifactsInfo: tf.io.getModelArtifactsInfoForJSON(modelArtifacts),
        };
      }),
    );

    if (!artifacts) {
      throw new Error('AI model export failed.');
    }

    return artifacts;
  }

  /** Removes all TF.js localStorage keys for the stored model. */
  public removeStoredModelArtifacts(): void {
    localStorage.removeItem(`tensorflowjs_models/${TETRIS_AI_CONFIG.modelStorageKey}/info`);
    localStorage.removeItem(
      `tensorflowjs_models/${TETRIS_AI_CONFIG.modelStorageKey}/model_topology`,
    );
    localStorage.removeItem(`tensorflowjs_models/${TETRIS_AI_CONFIG.modelStorageKey}/weight_specs`);
    localStorage.removeItem(`tensorflowjs_models/${TETRIS_AI_CONFIG.modelStorageKey}/weight_data`);
    localStorage.removeItem(
      `tensorflowjs_models/${TETRIS_AI_CONFIG.modelStorageKey}/model_metadata`,
    );
  }

  /**
   * Runs batch inference on the main model.
   * Returns one value per feature set.
   */
  public evaluatePlacements(featuresBatch: number[][]): number[] {
    return tf.tidy(() => {
      const input = tf.tensor2d(featuresBatch);
      const output = this.model.predict(input) as tf.Tensor;
      return Array.from(output.dataSync());
    });
  }

  /**
   * Returns the maximum Q-value across all feature sets using the target model.
   * Returns 0 if the batch is empty.
   */
  public estimateBestFutureValue(featuresBatch: number[][]): number {
    if (featuresBatch.length === 0) {
      return 0;
    }

    return tf.tidy(() => {
      const input = tf.tensor2d(featuresBatch);
      const output = this.targetModel.predict(input) as tf.Tensor;
      return output.max().dataSync()[0] ?? 0;
    });
  }

  /**
   * Epsilon-greedy placement selection.
   * Returns the index of the selected placement from the values array.
   */
  public selectPlacement(values: number[]): number {
    if (Math.random() < this.stats.getEpsilon()) {
      return Math.floor(Math.random() * values.length);
    }
    return values.indexOf(Math.max(...values));
  }

  /** Returns the currently loaded model (for training). */
  public getModel(): tf.Sequential {
    return this.model;
  }

  /** Returns the target model (for use in syncTargetNetwork callers). */
  public getTargetModel(): tf.Sequential {
    return this.targetModel;
  }

  /** Creates a compiled Sequential model with the architecture from TETRIS_AI_CONFIG. */
  private createModel(): tf.Sequential {
    const model = tf.sequential();
    model.add(
      tf.layers.dense({
        inputShape: [TETRIS_AI_CONFIG.featureCount],
        units: TETRIS_AI_CONFIG.hiddenLayer1,
        activation: 'relu',
        kernelInitializer: 'heNormal',
      }),
    );
    model.add(
      tf.layers.dense({
        units: TETRIS_AI_CONFIG.hiddenLayer2,
        activation: 'relu',
        kernelInitializer: 'heNormal',
      }),
    );
    model.add(tf.layers.dense({ units: 1, activation: 'linear' }));
    this.compileModel(model);
    return model;
  }

  /** Applies adam optimizer and huberLoss to a model. */
  private compileModel(model: tf.Sequential): void {
    model.compile({
      optimizer: tf.train.adam(TETRIS_AI_CONFIG.learningRate),
      loss: tf.losses.huberLoss,
    });
  }

  /** Copies weights from a loaded model topology onto the current architecture. */
  private setModelWeightsFromLoadedModel(loadedModel: tf.LayersModel): void {
    const clonedWeights = loadedModel.getWeights().map((weight) => weight.clone());
    this.model.setWeights(clonedWeights);
    clonedWeights.forEach((weight) => weight.dispose());
  }

  /** Returns the input feature count from a loaded model, or null if it cannot be determined. */
  private getLoadedModelInputSize(model: tf.LayersModel): number | null {
    const primaryShape = model.inputs[0]?.shape;
    if (Array.isArray(primaryShape)) {
      const last = primaryShape[primaryShape.length - 1];
      if (typeof last === 'number') {
        return last;
      }
    }

    const firstLayer = model.layers[0] as
      | {
          batchInputShape?: Array<number | null>;
        }
      | undefined;
    const layerShape = firstLayer?.batchInputShape;
    if (Array.isArray(layerShape)) {
      const last = layerShape[layerShape.length - 1];
      if (typeof last === 'number') {
        return last;
      }
    }

    return null;
  }

  /** Decodes a base64 string into an ArrayBuffer. */
  private base64ToArrayBuffer(value: string): ArrayBuffer {
    if (!value) {
      return new ArrayBuffer(0);
    }

    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    return bytes.buffer;
  }
}
