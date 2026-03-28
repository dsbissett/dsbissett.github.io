import { Injectable, inject } from '@angular/core';
import * as tf from '@tensorflow/tfjs';

import { TetrisAiStats } from '../interfaces/tetris-ai-stats.interface';
import { TetrisExperience } from '../interfaces/tetris-experience.interface';
import { TetrisDemonstrationExample } from '../interfaces/tetris-demonstration-example.interface';
import { TetrisAiTrainingExport } from '../interfaces/tetris-ai-training-export.interface';
import { TetrisSerializedModelArtifacts } from '../interfaces/tetris-serialized-model-artifacts.interface';
import { TetrisModelService } from './tetris-model.service';

/** Local alias to keep internal validation readable. */
type SerializedModelArtifacts = TetrisSerializedModelArtifacts;

@Injectable()
export class TetrisAiSerializerService {
  private readonly modelService = inject(TetrisModelService);

  /**
   * Exports all training state as a JSON string.
   * Captures model artifacts then serializes stats, replay buffer, and demonstrations.
   */
  public async exportTrainingData(
    stats: TetrisAiStats,
    replayBuffer: TetrisExperience[],
    demonstrations: TetrisDemonstrationExample[],
  ): Promise<string> {
    const modelArtifacts = await this.modelService.captureModelArtifacts();

    const payload: TetrisAiTrainingExport = {
      version: 1,
      exportedAt: new Date().toISOString(),
      stats: structuredClone(stats),
      replayBuffer: structuredClone(replayBuffer),
      demonstrations: structuredClone(demonstrations),
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

  /**
   * Parses and validates a JSON string into a TetrisAiTrainingExport.
   * Throws if the format is invalid.
   */
  public parseTrainingExport(json: string): TetrisAiTrainingExport {
    const parsed = this.parseJson(json);
    const candidate = parsed as Partial<TetrisAiTrainingExport>;

    const replayBuffer = Array.isArray(candidate.replayBuffer)
      ? candidate.replayBuffer.filter((item): item is TetrisExperience => this.isExperience(item))
      : [];

    const demonstrations = Array.isArray(candidate.demonstrations)
      ? candidate.demonstrations.filter((item): item is TetrisDemonstrationExample =>
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

  /** Parses raw JSON string, throwing a descriptive error on failure. */
  private parseJson(json: string): unknown {
    let parsed: unknown;

    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error('Training data import failed: invalid JSON.');
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Training data import failed: JSON payload is invalid.');
    }

    return parsed;
  }

  /** Encodes an ArrayBuffer (or undefined) to a base64 string. */
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

  /** Normalizes TF.js WeightData (single buffer or array) into a single ArrayBuffer. */
  private normalizeWeightData(weightData?: tf.io.WeightData): ArrayBuffer | undefined {
    if (!weightData) {
      return undefined;
    }

    return Array.isArray(weightData) ? tf.io.concatenateArrayBuffers(weightData) : weightData;
  }

  /** Type guard: checks if value conforms to TetrisAiStats. */
  private isStats(value: unknown): value is TetrisAiStats {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Partial<TetrisAiStats>;

    return (
      typeof candidate.totalEpisodes === 'number' &&
      typeof candidate.totalSteps === 'number' &&
      typeof candidate.bestScore === 'number' &&
      this.isOptionalNumber(candidate.bestTeacherScore) &&
      this.isOptionalNumber(candidate.bestAiScore) &&
      typeof candidate.epsilon === 'number' &&
      typeof candidate.averageScore === 'number' &&
      this.isOptionalNumber(candidate.averageTeacherScore) &&
      this.isOptionalNumber(candidate.averageAiScore) &&
      this.isOptionalNumber(candidate.lifetimeAverageScore) &&
      this.isOptionalNumber(candidate.averageLinesClearedPerEpisode) &&
      this.isOptionalNumber(candidate.averagePiecesPerEpisode) &&
      this.isOptionalNumber(candidate.totalScore) &&
      this.isOptionalNumber(candidate.totalTeacherScore) &&
      this.isOptionalNumber(candidate.totalAiScore) &&
      this.isOptionalNumber(candidate.totalLinesCleared) &&
      this.isOptionalNumber(candidate.totalPiecesPlaced) &&
      this.isOptionalNumber(candidate.teacherEpisodes) &&
      this.isOptionalNumber(candidate.aiEpisodes) &&
      Array.isArray(candidate.recentScores) &&
      candidate.recentScores.every((item) => typeof item === 'number') &&
      this.isOptionalNumberArray(candidate.recentLinesCleared) &&
      this.isOptionalNumberArray(candidate.recentPiecesPlaced) &&
      typeof candidate.demonstrationSamples === 'number'
    );
  }

  private isOptionalNumber(value: unknown): boolean {
    return value === undefined || typeof value === 'number';
  }

  private isOptionalNumberArray(value: unknown): boolean {
    return (
      value === undefined ||
      (Array.isArray(value) && value.every((item) => typeof item === 'number'))
    );
  }

  /** Type guard: checks if value conforms to SerializedModelArtifacts. */
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

  /**
   * Type guard: checks if value conforms to TetrisExperience.
   * Accepts legacy `nextFeatures` array as a fallback for `nextStateValue`.
   */
  private isExperience(value: unknown): value is TetrisExperience {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Partial<TetrisExperience>;
    const hasNextStateValue = typeof candidate.nextStateValue === 'number';
    const hasLegacyNextFeatures =
      Array.isArray(candidate.nextFeatures) &&
      candidate.nextFeatures.every((item) => typeof item === 'number');

    return (
      Array.isArray(candidate.features) &&
      candidate.features.every((item) => typeof item === 'number') &&
      typeof candidate.reward === 'number' &&
      (hasNextStateValue || hasLegacyNextFeatures) &&
      typeof candidate.done === 'boolean'
    );
  }

  /** Type guard: checks if value conforms to TetrisDemonstrationExample. */
  private isDemonstrationExample(value: unknown): value is TetrisDemonstrationExample {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Partial<TetrisDemonstrationExample>;

    return (
      Array.isArray(candidate.features) &&
      candidate.features.every((item) => typeof item === 'number') &&
      typeof candidate.target === 'number'
    );
  }
}
