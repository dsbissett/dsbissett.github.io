import { Injectable } from '@angular/core';

import { FlappyBirdAssetPaths } from '../interfaces/flappy-bird-asset-paths.interface';
import { FlappyBirdAssets } from '../interfaces/flappy-bird-assets.interface';

@Injectable()
export class FlappyBirdAssetLoaderService {
  public async loadAll(paths: FlappyBirdAssetPaths): Promise<FlappyBirdAssets> {
    const [background, bird, bottomPipe, spriteMap, topPipe] = await Promise.all([
      this.loadImage(paths.background),
      this.loadImage(paths.bird),
      this.loadImage(paths.bottomPipe),
      this.loadImage(paths.spriteMap),
      this.loadImage(paths.topPipe),
    ]);

    return {
      background,
      bird,
      bottomPipe,
      spriteMap,
      topPipe,
    };
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Unable to load image: ${url}`));
      image.src = url;
    });
  }
}
