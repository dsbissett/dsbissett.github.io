import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

import { CLOTH_SIMULATION_CONFIG } from '../constants/cloth-simulation-config.constant';
import { ClothCanvasSize } from '../interfaces/cloth-canvas-size.interface';
import { ClothTextLayout } from '../interfaces/cloth-text-layout.interface';
import { ClothTextMask } from '../interfaces/cloth-text-mask.interface';

@Injectable()
export class ClothTextLayoutService {
  private readonly document = inject(DOCUMENT);

  public createMask(text: string, size: ClothCanvasSize): ClothTextMask {
    const canvas = this.document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('A 2D canvas context is required to create the cloth mesh.');
    }

    const layout = this.createLayout(text, size, context);
    canvas.width = layout.canvasWidth;
    canvas.height = layout.canvasHeight;

    context.font = layout.font;
    context.fillStyle = '#000';
    context.textBaseline = 'top';
    context.fillText(text, layout.padding, layout.padding);

    return {
      height: canvas.height,
      imageData: context.getImageData(0, 0, canvas.width, canvas.height),
      offsetX: layout.offsetX,
      offsetY: layout.offsetY,
      spacing: this.getSpacing(layout.fontSize),
      width: canvas.width,
    };
  }

  private createFont(fontSize: number): string {
    return `${CLOTH_SIMULATION_CONFIG.fontWeight} ${fontSize}px ${CLOTH_SIMULATION_CONFIG.fontFamily}`;
  }

  private createLayout(
    text: string,
    size: ClothCanvasSize,
    context: CanvasRenderingContext2D
  ): ClothTextLayout {
    const fontSize = this.getFontSize(text, size, context);
    const font = this.createFont(fontSize);
    const padding = CLOTH_SIMULATION_CONFIG.textPadding;

    context.font = font;
    const metrics = context.measureText(text);
    const canvasWidth = Math.ceil(metrics.width + padding * 2);
    const canvasHeight = Math.ceil(fontSize + padding * 2);

    return {
      canvasHeight,
      canvasWidth,
      font,
      fontSize,
      offsetX: (size.width - canvasWidth) / 2,
      offsetY: Math.max(
        CLOTH_SIMULATION_CONFIG.minTopPadding,
        size.height * CLOTH_SIMULATION_CONFIG.topPaddingRatio
      ),
      padding,
    };
  }

  private getFontSize(
    text: string,
    size: ClothCanvasSize,
    context: CanvasRenderingContext2D
  ): number {
    const maxWidth = size.width * CLOTH_SIMULATION_CONFIG.targetWidthRatio;
    const maxHeight = size.height * CLOTH_SIMULATION_CONFIG.targetHeightRatio;
    let fontSize = Math.floor(
      Math.min(
        CLOTH_SIMULATION_CONFIG.maxFontSize,
        Math.max(
          CLOTH_SIMULATION_CONFIG.minFontSize,
          size.height * CLOTH_SIMULATION_CONFIG.fontScale
        )
      )
    );

    while (fontSize > CLOTH_SIMULATION_CONFIG.minFontSize) {
      context.font = this.createFont(fontSize);
      if (context.measureText(text).width <= maxWidth && fontSize <= maxHeight) {
        return fontSize;
      }

      fontSize = Math.floor(fontSize * 0.95);
    }

    return CLOTH_SIMULATION_CONFIG.minFontSize;
  }

  private getSpacing(fontSize: number): number {
    return Math.max(
      CLOTH_SIMULATION_CONFIG.minSpacing,
      Math.min(
        CLOTH_SIMULATION_CONFIG.maxSpacing,
        Math.floor(fontSize / CLOTH_SIMULATION_CONFIG.spacingDivisor)
      )
    );
  }
}
