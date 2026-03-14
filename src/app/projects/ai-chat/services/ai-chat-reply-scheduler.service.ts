import { DestroyRef, Injectable, inject } from '@angular/core';

import { ChatSubmission } from '../models/chat-submission.interface';
import { ThreadId } from '../models/thread-id.type';
import { AiChatAttachmentService } from './ai-chat-attachment.service';
import { AiChatConversationStateService } from './ai-chat-conversation-state.service';
import { AiChatMessageFactoryService } from './ai-chat-message-factory.service';
import { AiChatResponsePolicyService } from './ai-chat-response-policy.service';

@Injectable()
export class AiChatReplySchedulerService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly timers = new Set<number>();

  constructor(
    private readonly attachmentService: AiChatAttachmentService,
    private readonly conversationState: AiChatConversationStateService,
    private readonly messageFactory: AiChatMessageFactoryService,
    private readonly responsePolicy: AiChatResponsePolicyService
  ) {
    this.destroyRef.onDestroy(() => {
      this.clearTimers();
    });
  }

  submit(): void {
    const submission = this.createSubmission();
    if (!submission) {
      return;
    }

    this.appendUserMessage(submission);
    this.resetComposerState();
    this.scheduleAssistantReply(submission);
  }

  private appendUserMessage(submission: ChatSubmission): void {
    const userMessage = this.messageFactory.createTextMessage(
      'user',
      submission.messageText
    );

    this.conversationState.appendMessage(submission.threadId, userMessage);
  }

  private createSubmission(): ChatSubmission | null {
    const draft = this.conversationState.draft().trim();
    const hasImage = this.attachmentService.hasPreview();

    if (!draft && !hasImage) {
      return null;
    }

    return {
      hasImage,
      messageText: draft || 'Sent an image',
      requiresImageFlow: hasImage || this.responsePolicy.isImageRequest(draft),
      threadId: this.conversationState.activeThreadId(),
    };
  }

  private clearTimers(): void {
    this.timers.forEach((timerId) => window.clearTimeout(timerId));
    this.timers.clear();
  }

  private replacePlaceholderWithFailure(threadId: ThreadId): void {
    const placeholderMessage = this.conversationState.findLastMessageByKind(
      threadId,
      'image-placeholder'
    );

    if (!placeholderMessage) {
      return;
    }

    const failureMessage = this.messageFactory.createTextMessage(
      'assistant',
      this.responsePolicy.imageFailureMessage,
      true
    );

    this.conversationState.replaceMessage(
      threadId,
      placeholderMessage.id,
      failureMessage
    );
  }

  private replaceTypingWithImagePlaceholder(
    threadId: ThreadId,
    typingMessageId: number
  ): void {
    const placeholderMessage =
      this.messageFactory.createImagePlaceholderMessage();

    this.conversationState.replaceMessage(
      threadId,
      typingMessageId,
      placeholderMessage
    );
  }

  private replaceTypingWithReply(
    threadId: ThreadId,
    typingMessageId: number
  ): void {
    const assistantReply = this.messageFactory.createTextMessage(
      'assistant',
      this.responsePolicy.createReply(threadId),
      true
    );

    this.conversationState.replaceMessage(
      threadId,
      typingMessageId,
      assistantReply
    );
  }

  private resetComposerState(): void {
    this.conversationState.clearDraft();
    this.attachmentService.clear();
  }

  private scheduleAssistantReply(submission: ChatSubmission): void {
    const typingMessage = this.messageFactory.createTypingMessage();
    this.conversationState.appendMessage(submission.threadId, typingMessage);

    if (submission.requiresImageFlow) {
      this.scheduleImageFlow(submission.threadId, typingMessage.id);
      return;
    }

    this.scheduleTextFlow(submission.threadId, typingMessage.id);
  }

  private scheduleImageFlow(threadId: ThreadId, typingMessageId: number): void {
    const placeholderDelay = this.responsePolicy.getPlaceholderDelay();
    const placeholderTimer = window.setTimeout(() => {
      this.replaceTypingWithImagePlaceholder(threadId, typingMessageId);
      this.scheduleImageFailure(threadId);
    }, placeholderDelay);

    this.timers.add(placeholderTimer);
  }

  private scheduleImageFailure(threadId: ThreadId): void {
    const failureDelay = this.responsePolicy.getImageFailureDelay();
    const failureTimer = window.setTimeout(() => {
      this.replacePlaceholderWithFailure(threadId);
    }, failureDelay);

    this.timers.add(failureTimer);
  }

  private scheduleTextFlow(threadId: ThreadId, typingMessageId: number): void {
    const warningDelay = this.responsePolicy.getWarningDelay();
    const responseTimer = window.setTimeout(() => {
      this.replaceTypingWithReply(threadId, typingMessageId);
    }, warningDelay);

    this.timers.add(responseTimer);
  }
}
