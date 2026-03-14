import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AiChatClipboardImageService {
  extractImageFile(event: ClipboardEvent): File | null {
    const items = event.clipboardData?.items;
    if (!items) {
      return null;
    }

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        return item.getAsFile();
      }
    }

    return null;
  }
}
