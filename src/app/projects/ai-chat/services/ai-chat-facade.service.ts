import { Injectable, computed, inject } from '@angular/core';

import { AI_CHAT_THREAD_SUMMARIES } from '../constants/ai-chat-thread-summaries.constant';
import { ThreadId } from '../models/thread-id.type';
import { AiChatAttachmentService } from './ai-chat-attachment.service';
import { AiChatConversationStateService } from './ai-chat-conversation-state.service';
import { AiChatReplySchedulerService } from './ai-chat-reply-scheduler.service';

@Injectable()
export class AiChatFacadeService {
  private readonly attachmentService = inject(AiChatAttachmentService);
  private readonly conversationState = inject(AiChatConversationStateService);
  private readonly replyScheduler = inject(AiChatReplySchedulerService);

  readonly threads = AI_CHAT_THREAD_SUMMARIES;
  readonly activeThreadId = this.conversationState.activeThreadId;
  readonly currentMessages = this.conversationState.currentMessages;
  readonly draft = this.conversationState.draft;
  readonly pastedImageUrl = this.attachmentService.previewUrl;
  readonly canSend = computed(
    () =>
      this.conversationState.draft().trim().length > 0 ||
      this.attachmentService.hasPreview()
  );

  attachImage(file: File): void {
    this.attachmentService.attach(file);
  }

  clearImage(): void {
    this.attachmentService.clear();
  }

  isThreadActive(threadId: ThreadId): boolean {
    return this.conversationState.isThreadActive(threadId);
  }

  selectThread(threadId: ThreadId): void {
    this.conversationState.selectThread(threadId);
  }

  submitMessage(): void {
    this.replyScheduler.submit();
  }

  updateDraft(value: string): void {
    this.conversationState.updateDraft(value);
  }
}
