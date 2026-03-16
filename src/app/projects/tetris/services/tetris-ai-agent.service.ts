import { Injectable } from '@angular/core';
import * as tf from '@tensorflow/tfjs';

import { TETRIS_AI_CONFIG } from '../constants/tetris-ai-config.constant';
import { TetrisAiStats } from '../interfaces/tetris-ai-stats.interface';

interface Experience {
  features: number[];
  reward: number;
  nextFeatures: number[];
  done: boolean;
}

interface DemonstrationExample {
  features: number[];
  target: number;
}

interface SerializedModelArtifacts {
  modelTopology: tf.io.ModelArtifacts['modelTopology'];
  weightSpecs: tf.io.WeightsManifestEntry[];
  weightDataBase64: string;
}

interface TetrisAiTrainingExport {
  version: 1;
  exportedAt: string;
  stats: TetrisAiStats;
  replayBuffer: Experience[];
  demonstrations: DemonstrationExample[];
  model: SerializedModelArtifacts;
}

@Injectable()
export class TetrisAiAgentService {
  private model!: tf.Sequential;
  private targetModel!: tf.Sequential;
  private replayBuffer: Experience[] = [];
  private demonstrations: DemonstrationExample[] = [];
  private stepCount = 0;
  private isTraining = false;
  private demonstrationsSinceLastTraining = 0;
  private stats: TetrisAiStats = this.defaultStats();

  public async initialize(): Promise<void> {
    await tf.ready();
    this.loadStats();
    this.loadReplayBuffer();
    this.loadDemonstrations();
    this.stepCount = this.stats.totalSteps;
    const loaded = await this.tryLoadModel();
    if (!loaded) {
      this.buildModels();
    }
  }

  /**
   * Extracts 24 heuristic features from the board state after a simulated placement.
   * Features: column heights (10), height diffs (9), max height (1),
   *           aggregate height (1), holes (1), lines cleared (1), bumpiness (1)
   */
  public extractFeatures(grid: number[][], linesCleared: number): number[] {
    const heights = this.getColumnHeights(grid);
    const diffs = this.getHeightDiffs(heights);
    const maxHeight = Math.max(...heights);
    const aggregateHeight = heights.reduce((s, h) => s + h, 0);
    const holes = this.countHoles(grid, heights);
    const bumpiness = diffs.reduce((s, d) => s + Math.abs(d), 0);

    return [
      ...heights.map((h) => h / 20),
      ...diffs.map((d) => d / 20),
      maxHeight / 20,
      aggregateHeight / 200,
      holes / 40,
      linesCleared / 4,
      bumpiness / 100,
    ];
  }

  /** Returns predicted value for each set of placement features (batch). */
  public evaluatePlacements(featuresBatch: number[][]): number[] {
    return tf.tidy(() => {
      const input = tf.tensor2d(featuresBatch);
      const output = this.model.predict(input) as tf.Tensor;
      return Array.from(output.dataSync());
    });
  }

  /** Epsilon-greedy selection over candidate placements. Returns the selected index. */
  public selectPlacement(featuresBatch: number[][]): number {
    if (Math.random() < this.stats.epsilon) {
      return Math.floor(Math.random() * featuresBatch.length);
    }
    const values = this.evaluatePlacements(featuresBatch);
    return values.indexOf(Math.max(...values));
  }

  public remember(features: number[], reward: number, nextFeatures: number[], done: boolean): void {
    if (this.replayBuffer.length >= TETRIS_AI_CONFIG.replayBufferSize) {
      this.replayBuffer.shift();
    }
    this.replayBuffer.push({ features, reward, nextFeatures, done });
    this.stepCount++;
    this.stats.totalSteps++;
    this.persistStats();
    this.persistReplayBuffer();
  }

  public recordDemonstrations(
    preferredFeatures: number[],
    rejectedFeaturesBatch: number[][],
  ): void {
    const examples: DemonstrationExample[] = [
      {
        features: preferredFeatures,
        target: TETRIS_AI_CONFIG.humanChosenTarget,
      },
      ...rejectedFeaturesBatch.map((features) => ({
        features,
        target: TETRIS_AI_CONFIG.humanRejectedTarget,
      })),
    ];

    this.appendDemonstrations(examples);
  }

  public trainStep(): void {
    if (
      this.isTraining ||
      this.replayBuffer.length < TETRIS_AI_CONFIG.batchSize ||
      this.stepCount % TETRIS_AI_CONFIG.trainEveryNSteps !== 0
    ) {
      return;
    }

    this.isTraining = true;
    this.runTraining().finally(() => {
      this.isTraining = false;
    });
  }

  public decayEpsilon(): void {
    this.stats.epsilon = Math.max(
      TETRIS_AI_CONFIG.epsilonMin,
      this.stats.epsilon * TETRIS_AI_CONFIG.epsilonDecay,
    );
  }

  public onEpisodeEnd(score: number): void {
    this.stats.totalEpisodes++;
    if (score > this.stats.bestScore) {
      this.stats.bestScore = score;
    }
    this.stats.recentScores.push(score);
    if (this.stats.recentScores.length > 20) {
      this.stats.recentScores.shift();
    }
    this.stats.averageScore =
      this.stats.recentScores.reduce((s, x) => s + x, 0) / this.stats.recentScores.length;

    this.persistStats();
    this.persistModel();
  }

  public getStats(): Readonly<TetrisAiStats> {
    return this.stats;
  }

  public trainOnDemonstrations(): void {
    if (
      this.isTraining ||
      this.demonstrations.length < TETRIS_AI_CONFIG.demonstrationBatchSize ||
      this.demonstrationsSinceLastTraining < TETRIS_AI_CONFIG.demonstrationTrainEveryNSamples
    ) {
      return;
    }

    this.isTraining = true;
    this.runDemonstrationTraining().finally(() => {
      this.isTraining = false;
    });
  }

  public reset(): void {
    this.stats = this.defaultStats();
    this.replayBuffer = [];
    this.demonstrations = [];
    this.stepCount = 0;
    this.demonstrationsSinceLastTraining = 0;
    this.persistStats();
    this.clearReplayBuffer();
    this.clearDemonstrations();
    this.buildModels();
    void tf.io.removeModel(`localstorage://${TETRIS_AI_CONFIG.modelStorageKey}`).catch(() => {
      this.removeStoredModelArtifacts();
    });
  }

  public async exportTrainingData(): Promise<string> {
    const modelArtifacts = await this.captureModelArtifacts();

    const payload: TetrisAiTrainingExport = {
      version: 1,
      exportedAt: new Date().toISOString(),
      stats: structuredClone(this.stats),
      replayBuffer: structuredClone(this.replayBuffer),
      demonstrations: structuredClone(this.demonstrations),
      model: {
        modelTopology: modelArtifacts.modelTopology ?? {},
        weightSpecs: modelArtifacts.weightSpecs ?? [],
        weightDataBase64: this.arrayBufferToBase64(
          this.normalizeWeightData(modelArtifacts.weightData),
        ),
      },
    };

    return JSON.stringify(payload, null, 2);
  }

  public async importTrainingData(json: string): Promise<void> {
    const payload = this.parseTrainingExport(json);

    this.stats = {
      ...this.defaultStats(),
      ...payload.stats,
      demonstrationSamples: payload.demonstrations.length,
    };
    this.replayBuffer = payload.replayBuffer.slice(-TETRIS_AI_CONFIG.replayBufferSize);
    this.demonstrations = payload.demonstrations.slice(-TETRIS_AI_CONFIG.demonstrationBufferSize);
    this.stepCount = this.stats.totalSteps;
    this.demonstrationsSinceLastTraining = 0;

    this.persistStats();
    this.persistReplayBuffer();
    this.persistDemonstrations();
    await this.loadImportedModel(payload.model);
    this.persistModel();
  }

  private defaultStats(): TetrisAiStats {
    return {
      totalEpisodes: 0,
      totalSteps: 0,
      bestScore: 0,
      epsilon: TETRIS_AI_CONFIG.epsilonStart,
      averageScore: 0,
      recentScores: [],
      demonstrationSamples: 0,
    };
  }

  private buildModels(): void {
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

  private async loadImportedModel(model: SerializedModelArtifacts): Promise<void> {
    if (this.model) {
      this.model.dispose();
    }
    if (this.targetModel) {
      this.targetModel.dispose();
    }

    this.model = (await tf.loadLayersModel(
      tf.io.fromMemory({
        modelTopology: model.modelTopology,
        weightSpecs: model.weightSpecs,
        weightData: this.base64ToArrayBuffer(model.weightDataBase64),
      }),
    )) as tf.Sequential;
    this.model.compile({
      optimizer: tf.train.adam(TETRIS_AI_CONFIG.learningRate),
      loss: 'meanSquaredError',
    });
    this.targetModel = this.createModel();
    this.syncTargetNetwork();
  }

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
    model.compile({
      optimizer: tf.train.adam(TETRIS_AI_CONFIG.learningRate),
      loss: 'meanSquaredError',
    });
    return model;
  }

  private async tryLoadModel(): Promise<boolean> {
    try {
      const key = `localstorage://${TETRIS_AI_CONFIG.modelStorageKey}`;
      this.model = (await tf.loadLayersModel(key)) as tf.Sequential;
      this.model.compile({
        optimizer: tf.train.adam(TETRIS_AI_CONFIG.learningRate),
        loss: 'meanSquaredError',
      });
      this.targetModel = this.createModel();
      this.syncTargetNetwork();
      return true;
    } catch {
      return false;
    }
  }

  private async captureModelArtifacts(): Promise<tf.io.ModelArtifacts> {
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

  private persistModel(): void {
    const key = `localstorage://${TETRIS_AI_CONFIG.modelStorageKey}`;
    this.model.save(key).catch((e) => console.warn('AI model save failed:', e));
  }

  private loadStats(): void {
    try {
      const raw = localStorage.getItem(TETRIS_AI_CONFIG.statsStorageKey);
      if (raw) {
        this.stats = {
          ...this.defaultStats(),
          ...JSON.parse(raw),
        };
      }
    } catch {
      // ignore corrupt data
    }
  }

  private persistStats(): void {
    localStorage.setItem(TETRIS_AI_CONFIG.statsStorageKey, JSON.stringify(this.stats));
  }

  private loadReplayBuffer(): void {
    try {
      const raw = localStorage.getItem(TETRIS_AI_CONFIG.replayBufferStorageKey);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return;
      }

      this.replayBuffer = parsed
        .filter((item): item is Experience => this.isExperience(item))
        .slice(-TETRIS_AI_CONFIG.replayBufferSize);
    } catch {
      this.replayBuffer = [];
    }
  }

  private persistReplayBuffer(): void {
    if (this.replayBuffer.length === 0) {
      this.clearReplayBuffer();
      return;
    }

    let bufferToStore = this.replayBuffer;

    while (bufferToStore.length > 0) {
      try {
        localStorage.setItem(
          TETRIS_AI_CONFIG.replayBufferStorageKey,
          JSON.stringify(bufferToStore),
        );

        if (bufferToStore.length !== this.replayBuffer.length) {
          this.replayBuffer = bufferToStore;
        }

        return;
      } catch {
        bufferToStore = bufferToStore.slice(Math.ceil(bufferToStore.length / 2));
      }
    }

    this.replayBuffer = [];
    this.clearReplayBuffer();
    console.warn('AI replay buffer persistence failed: localStorage quota exceeded.');
  }

  private loadDemonstrations(): void {
    try {
      const raw = localStorage.getItem(TETRIS_AI_CONFIG.demonstrationStorageKey);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return;
      }

      this.demonstrations = parsed
        .filter((item): item is DemonstrationExample => this.isDemonstrationExample(item))
        .slice(-TETRIS_AI_CONFIG.demonstrationBufferSize);
      this.stats.demonstrationSamples = this.demonstrations.length;
    } catch {
      this.demonstrations = [];
      this.stats.demonstrationSamples = 0;
    }
  }

  private appendDemonstrations(examples: DemonstrationExample[]): void {
    if (examples.length === 0) {
      return;
    }

    this.demonstrations.push(...examples);
    if (this.demonstrations.length > TETRIS_AI_CONFIG.demonstrationBufferSize) {
      this.demonstrations = this.demonstrations.slice(-TETRIS_AI_CONFIG.demonstrationBufferSize);
    }

    this.demonstrationsSinceLastTraining += examples.length;
    this.stats.demonstrationSamples = this.demonstrations.length;
    this.persistStats();
    this.persistDemonstrations();
  }

  private persistDemonstrations(): void {
    if (this.demonstrations.length === 0) {
      this.clearDemonstrations();
      return;
    }

    let bufferToStore = this.demonstrations;

    while (bufferToStore.length > 0) {
      try {
        localStorage.setItem(
          TETRIS_AI_CONFIG.demonstrationStorageKey,
          JSON.stringify(bufferToStore),
        );

        if (bufferToStore.length !== this.demonstrations.length) {
          this.demonstrations = bufferToStore;
          this.stats.demonstrationSamples = bufferToStore.length;
          this.persistStats();
        }

        return;
      } catch {
        bufferToStore = bufferToStore.slice(Math.ceil(bufferToStore.length / 2));
      }
    }

    this.demonstrations = [];
    this.stats.demonstrationSamples = 0;
    this.persistStats();
    this.clearDemonstrations();
    console.warn('AI demonstration persistence failed: localStorage quota exceeded.');
  }

  private sampleBatch(): Experience[] {
    const buf = this.replayBuffer;
    const batch: Experience[] = [];
    for (let i = 0; i < TETRIS_AI_CONFIG.batchSize; i++) {
      batch.push(buf[Math.floor(Math.random() * buf.length)]);
    }
    return batch;
  }

  private sampleDemonstrationBatch(): DemonstrationExample[] {
    const dataset = this.demonstrations;
    const batch: DemonstrationExample[] = [];
    for (let i = 0; i < TETRIS_AI_CONFIG.demonstrationBatchSize; i++) {
      batch.push(dataset[Math.floor(Math.random() * dataset.length)]);
    }
    return batch;
  }

  private async runTraining(): Promise<void> {
    const batch = this.sampleBatch();

    // Compute target values using target network
    const nextValues: number[] = tf.tidy(() => {
      const nextInput = tf.tensor2d(batch.map((e) => e.nextFeatures));
      return Array.from((this.targetModel.predict(nextInput) as tf.Tensor).dataSync());
    });

    const targets = batch.map((e, i) =>
      e.done ? e.reward : e.reward + TETRIS_AI_CONFIG.gamma * nextValues[i],
    );

    const xs = tf.tensor2d(batch.map((e) => e.features));
    const ys = tf.tensor2d(targets, [targets.length, 1]);

    await this.model.fit(xs, ys, { epochs: 1, verbose: 0 });

    xs.dispose();
    ys.dispose();

    if (this.stepCount % TETRIS_AI_CONFIG.targetNetworkUpdateFrequency === 0) {
      this.syncTargetNetwork();
    }

    this.decayEpsilon();
    this.persistStats();
  }

  private async runDemonstrationTraining(): Promise<void> {
    const batch = this.sampleDemonstrationBatch();
    const xs = tf.tensor2d(batch.map((example) => example.features));
    const ys = tf.tensor2d(
      batch.map((example) => example.target),
      [batch.length, 1],
    );

    await this.model.fit(xs, ys, {
      epochs: TETRIS_AI_CONFIG.demonstrationEpochs,
      verbose: 0,
      shuffle: true,
    });

    xs.dispose();
    ys.dispose();
    this.demonstrationsSinceLastTraining = 0;
    this.syncTargetNetwork();
    this.persistModel();
  }

  private syncTargetNetwork(): void {
    const clonedWeights = this.model.getWeights().map((weight) => weight.clone());
    this.targetModel.setWeights(clonedWeights);
    clonedWeights.forEach((weight) => weight.dispose());
  }

  private getColumnHeights(grid: number[][]): number[] {
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

  private getHeightDiffs(heights: number[]): number[] {
    const diffs: number[] = [];
    for (let i = 0; i < heights.length - 1; i++) {
      diffs.push(heights[i + 1] - heights[i]);
    }
    return diffs;
  }

  private countHoles(grid: number[][], heights: number[]): number {
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

  private removeStoredModelArtifacts(): void {
    localStorage.removeItem(`tensorflowjs_models/${TETRIS_AI_CONFIG.modelStorageKey}/info`);
    localStorage.removeItem(
      `tensorflowjs_models/${TETRIS_AI_CONFIG.modelStorageKey}/model_topology`,
    );
    localStorage.removeItem(`tensorflowjs_models/${TETRIS_AI_CONFIG.modelStorageKey}/weight_specs`);
    localStorage.removeItem(`tensorflowjs_models/${TETRIS_AI_CONFIG.modelStorageKey}/weight_data`);
  }

  private clearReplayBuffer(): void {
    localStorage.removeItem(TETRIS_AI_CONFIG.replayBufferStorageKey);
  }

  private clearDemonstrations(): void {
    localStorage.removeItem(TETRIS_AI_CONFIG.demonstrationStorageKey);
  }

  private parseTrainingExport(json: string): TetrisAiTrainingExport {
    let parsed: unknown;

    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error('Training data import failed: invalid JSON.');
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Training data import failed: JSON payload is invalid.');
    }

    const candidate = parsed as Partial<TetrisAiTrainingExport>;
    const replayBuffer = Array.isArray(candidate.replayBuffer)
      ? candidate.replayBuffer.filter((item): item is Experience => this.isExperience(item))
      : [];
    const demonstrations = Array.isArray(candidate.demonstrations)
      ? candidate.demonstrations.filter((item): item is DemonstrationExample =>
          this.isDemonstrationExample(item),
        )
      : [];

    if (
      candidate.version !== 1 ||
      !this.isStats(candidate.stats) ||
      !this.isSerializedModelArtifacts(candidate.model)
    ) {
      throw new Error('Training data import failed: unsupported training data format.');
    }

    return {
      version: 1,
      exportedAt:
        typeof candidate.exportedAt === 'string' ? candidate.exportedAt : new Date().toISOString(),
      stats: candidate.stats,
      replayBuffer,
      demonstrations,
      model: candidate.model,
    };
  }

  private isStats(value: unknown): value is TetrisAiStats {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Partial<TetrisAiStats>;

    return (
      typeof candidate.totalEpisodes === 'number' &&
      typeof candidate.totalSteps === 'number' &&
      typeof candidate.bestScore === 'number' &&
      typeof candidate.epsilon === 'number' &&
      typeof candidate.averageScore === 'number' &&
      Array.isArray(candidate.recentScores) &&
      candidate.recentScores.every((item) => typeof item === 'number') &&
      typeof candidate.demonstrationSamples === 'number'
    );
  }

  private isSerializedModelArtifacts(value: unknown): value is SerializedModelArtifacts {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Partial<SerializedModelArtifacts>;

    return (
      typeof candidate.weightDataBase64 === 'string' &&
      Array.isArray(candidate.weightSpecs) &&
      candidate.weightSpecs.every((entry) => !!entry && typeof entry.name === 'string')
    );
  }

  private arrayBufferToBase64(buffer?: ArrayBuffer): string {
    if (!buffer) {
      return '';
    }

    const bytes = new Uint8Array(buffer);
    let binary = '';

    for (let i = 0; i < bytes.length; i += 0x8000) {
      const chunk = bytes.subarray(i, i + 0x8000);
      binary += String.fromCharCode(...chunk);
    }

    return btoa(binary);
  }

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

  private normalizeWeightData(weightData?: tf.io.WeightData): ArrayBuffer | undefined {
    if (!weightData) {
      return undefined;
    }

    return Array.isArray(weightData) ? tf.io.concatenateArrayBuffers(weightData) : weightData;
  }

  private isExperience(value: unknown): value is Experience {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Partial<Experience>;

    return (
      Array.isArray(candidate.features) &&
      candidate.features.every((item) => typeof item === 'number') &&
      Array.isArray(candidate.nextFeatures) &&
      candidate.nextFeatures.every((item) => typeof item === 'number') &&
      typeof candidate.reward === 'number' &&
      typeof candidate.done === 'boolean'
    );
  }

  private isDemonstrationExample(value: unknown): value is DemonstrationExample {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Partial<DemonstrationExample>;

    return (
      Array.isArray(candidate.features) &&
      candidate.features.every((item) => typeof item === 'number') &&
      typeof candidate.target === 'number'
    );
  }
}
