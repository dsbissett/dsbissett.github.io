import { Injectable } from '@angular/core';

import { FLAPPY_BIRD_GAME_CONFIG } from '../constants/flappy-bird-game-config.constant';
import { FlappyBirdGapBounds } from '../interfaces/flappy-bird-gap-bounds.interface';
import { FlappyBirdPipeSettings } from '../interfaces/flappy-bird-pipe-settings.interface';

@Injectable()
export class FlappyBirdSpawnPolicyService {
  public chooseGapCenter(
    score: number,
    lastGapCenter: number,
    gap: number,
    minTop: number,
    maxTop: number
  ): number {
    const bounds = this.createGapBounds(gap, minTop, maxTop);

    if (score >= 2000) {
      return this.chooseLateGameCenter(lastGapCenter, bounds);
    }

    return this.chooseStandardCenter(lastGapCenter, bounds);
  }

  public getPipeSettings(score: number): FlappyBirdPipeSettings {
    const delays = this.createDelayProfile(score);

    if (score < 1000) {
      return {
        delay: Math.round(delays.baseDelay),
        gap: FLAPPY_BIRD_GAME_CONFIG.pipeNormalGap,
      };
    }

    if (score >= 2000) {
      return this.createLateGameSettings(score, delays.closeDelay, delays.farDelay);
    }

    return this.createAlternatingSettings(score, delays.closeDelay, delays.farDelay);
  }

  public getSpeedFactor(score: number): number {
    return 1 + Math.floor(score / 500) * 0.15;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private createAlternatingSettings(
    score: number,
    closeDelay: number,
    farDelay: number
  ): FlappyBirdPipeSettings {
    if (Math.floor(score / 1000) % 2 === 1) {
      return {
        delay: Math.round(closeDelay),
        gap: FLAPPY_BIRD_GAME_CONFIG.pipeNormalGap,
      };
    }

    return {
      delay: Math.round(farDelay),
      gap: FLAPPY_BIRD_GAME_CONFIG.pipeNarrowGap,
    };
  }

  private createDelayProfile(score: number): {
    baseDelay: number;
    closeDelay: number;
    farDelay: number;
  } {
    const speedScale = this.getSpeedFactor(score);
    const minDelay = 850;
    const baseDelay = Math.max(2000 / speedScale, minDelay);

    return {
      baseDelay,
      closeDelay: Math.max(baseDelay * 0.85, minDelay),
      farDelay: Math.max(baseDelay * 1.15, minDelay + 120),
    };
  }

  private createGapBounds(
    gap: number,
    minTop: number,
    maxTop: number
  ): FlappyBirdGapBounds {
    const minCenter = minTop + gap / 2;
    const maxCenter = maxTop + gap / 2;
    const third = (maxCenter - minCenter) / 3;

    return {
      maxCenter,
      middleEnd: minCenter + third * 2,
      middleStart: minCenter + third,
      midPoint: (minCenter + maxCenter) / 2,
      minCenter,
      topMax: minCenter + third,
    };
  }

  private createLateGameSettings(
    score: number,
    closeDelay: number,
    farDelay: number
  ): FlappyBirdPipeSettings {
    const level = Math.floor((score - 2000) / 1000);
    const narrowChance = Math.min(0.75 + level * 0.05, 0.9);

    if (Math.random() < narrowChance) {
      return {
        delay: Math.round(farDelay),
        gap: FLAPPY_BIRD_GAME_CONFIG.pipeNarrowGap,
      };
    }

    return {
      delay: Math.round(closeDelay),
      gap: FLAPPY_BIRD_GAME_CONFIG.pipeNormalGap,
    };
  }

  private chooseLateGameCenter(
    lastGapCenter: number,
    bounds: FlappyBirdGapBounds
  ): number {
    const bottomMin = bounds.middleEnd;

    if (lastGapCenter >= bottomMin) {
      return this.randomInRange(bounds.minCenter, bounds.topMax);
    }

    if (lastGapCenter <= bounds.topMax) {
      return this.randomInRange(bottomMin, bounds.maxCenter);
    }

    if (Math.random() < 0.5) {
      return this.randomInRange(bounds.minCenter, bounds.topMax);
    }

    return this.randomInRange(bottomMin, bounds.maxCenter);
  }

  private chooseLowerHalfCenter(
    lastGapCenter: number,
    bounds: FlappyBirdGapBounds
  ): number {
    const roll = Math.random();

    if (roll < 0.45) {
      return this.randomInRange(bounds.middleStart, bounds.middleEnd);
    }

    if (roll < 0.8) {
      return this.randomInRange(bounds.middleEnd, bounds.maxCenter);
    }

    return this.clamp(
      lastGapCenter - Math.random() * 0.1 * FLAPPY_BIRD_GAME_CONFIG.gameHeight,
      bounds.minCenter,
      bounds.maxCenter
    );
  }

  private chooseStandardCenter(
    lastGapCenter: number,
    bounds: FlappyBirdGapBounds
  ): number {
    if (lastGapCenter > bounds.midPoint) {
      return this.chooseUpperHalfCenter(lastGapCenter, bounds);
    }

    return this.chooseLowerHalfCenter(lastGapCenter, bounds);
  }

  private chooseUpperHalfCenter(
    lastGapCenter: number,
    bounds: FlappyBirdGapBounds
  ): number {
    const roll = Math.random();

    if (roll < 0.45) {
      return this.randomInRange(bounds.middleStart, bounds.middleEnd);
    }

    if (roll < 0.8) {
      return this.randomInRange(bounds.minCenter, bounds.topMax);
    }

    return this.clamp(
      lastGapCenter + Math.random() * 0.1 * FLAPPY_BIRD_GAME_CONFIG.gameHeight,
      bounds.minCenter,
      bounds.maxCenter
    );
  }

  private randomInRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }
}
