import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  viewChild,
} from '@angular/core';

import { ThreadId } from './models/thread-id.type';
import { AiChatClipboardImageService } from './services/ai-chat-clipboard-image.service';
import { AiChatFacadeService } from './services/ai-chat-facade.service';
import { AiChatAttachmentService } from './services/ai-chat-attachment.service';
import { AiChatConversationStateService } from './services/ai-chat-conversation-state.service';
import { AiChatMessageFactoryService } from './services/ai-chat-message-factory.service';
import { AiChatReplySchedulerService } from './services/ai-chat-reply-scheduler.service';
import { AiChatViewService } from './services/ai-chat-view.service';

@Component({
  selector: 'app-ai-chat',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    AiChatAttachmentService,
    AiChatConversationStateService,
    AiChatFacadeService,
    AiChatMessageFactoryService,
    AiChatReplySchedulerService,
  ],
  templateUrl: './ai-chat.component.html',
  styleUrl: './ai-chat.component.scss',
})
export class AiChatComponent {
  private readonly chatLogRef = viewChild<ElementRef<HTMLElement>>('chatLog');
  private readonly messageInputRef =
    viewChild<ElementRef<HTMLTextAreaElement>>('messageInput');
  private readonly clipboardImageService = inject(AiChatClipboardImageService);
  private readonly facade = inject(AiChatFacadeService);
  private readonly viewService = inject(AiChatViewService);

  protected readonly canSend = this.facade.canSend;
  protected readonly currentMessages = this.facade.currentMessages;
  protected readonly draft = this.facade.draft;
  protected readonly pastedImageUrl = this.facade.pastedImageUrl;
  protected readonly threads = this.facade.threads;

  constructor() {
    effect(() => {
      this.currentMessages();
      queueMicrotask(() => {
        this.viewService.scrollToBottom(this.chatLogRef()?.nativeElement);
      });
    });

    effect(() => {
      this.draft();
      queueMicrotask(() => {
        this.viewService.resizeTextarea(this.messageInputRef()?.nativeElement);
      });
    });
  }

  protected selectThread(threadId: ThreadId): void {
    this.facade.selectThread(threadId);
  }

  protected updateDraft(value: string): void {
    this.facade.updateDraft(value);
  }

  protected handleComposerKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }

    event.preventDefault();
    this.submitMessage();
  }

  protected handlePaste(event: ClipboardEvent): void {
    const file = this.clipboardImageService.extractImageFile(event);
    if (file) {
      this.facade.attachImage(file);
    }
  }

  protected removePastedImage(): void {
    this.facade.clearImage();
  }

  protected submitMessage(): void {
    this.facade.submitMessage();
  }

  protected isThreadActive(threadId: ThreadId): boolean {
    return this.facade.isThreadActive(threadId);
  }
}
