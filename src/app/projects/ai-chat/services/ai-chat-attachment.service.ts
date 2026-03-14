import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';

@Injectable()
export class AiChatAttachmentService {
  readonly previewUrl = signal<string | null>(null);
  readonly hasPreview = computed(() => this.previewUrl() !== null);

  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.clear();
    });
  }

  attach(file: File): void {
    this.clear();
    this.previewUrl.set(URL.createObjectURL(file));
  }

  clear(): void {
    const currentUrl = this.previewUrl();
    if (!currentUrl) {
      return;
    }

    URL.revokeObjectURL(currentUrl);
    this.previewUrl.set(null);
  }
}
