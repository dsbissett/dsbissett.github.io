import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

@Injectable()
export class FlappyBirdFontService {
  private readonly document = inject(DOCUMENT);
  private readonly loadedFamilies = new Set<string>();

  public async ensureLoaded(family: string, url: string): Promise<void> {
    if (this.loadedFamilies.has(family)) {
      return;
    }

    if (!this.supportsFontLoading()) {
      this.loadedFamilies.add(family);
      return;
    }

    try {
      const font = new FontFace(family, `url(${url})`);
      const loadedFont = await font.load();
      this.document.fonts.add(loadedFont);
    } finally {
      this.loadedFamilies.add(family);
    }
  }

  private supportsFontLoading(): boolean {
    return typeof FontFace !== 'undefined' && !!this.document.fonts;
  }
}
