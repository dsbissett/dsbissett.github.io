import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AiChatViewService {
  resizeTextarea(textarea: HTMLTextAreaElement | undefined): void {
    if (!textarea) {
      return;
    }

    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  scrollToBottom(container: HTMLElement | undefined): void {
    if (!container) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }
}
