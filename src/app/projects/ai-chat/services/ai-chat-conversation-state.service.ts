import { Injectable, computed, inject, signal } from '@angular/core';

import { ChatMessage } from '../models/chat-message.type';
import { ConversationState } from '../models/conversation-state.type';
import { ThreadId } from '../models/thread-id.type';
import { AiChatMessageFactoryService } from './ai-chat-message-factory.service';

@Injectable()
export class AiChatConversationStateService {
  private readonly messageFactory = inject(AiChatMessageFactoryService);

  readonly activeThreadId = signal<ThreadId>('new-chat');
  readonly conversations = signal<ConversationState>(
    this.messageFactory.createInitialConversationState()
  );
  readonly currentMessages = computed(
    () => this.conversations()[this.activeThreadId()]
  );
  readonly draft = signal('');

  appendMessage(threadId: ThreadId, message: ChatMessage): void {
    this.conversations.update((state) => ({
      ...state,
      [threadId]: [...state[threadId], message],
    }));
  }

  clearDraft(): void {
    this.draft.set('');
  }

  findLastMessageByKind(
    threadId: ThreadId,
    kind: ChatMessage['kind']
  ): ChatMessage | undefined {
    return this.conversations()[threadId]
      .slice()
      .reverse()
      .find((message) => message.kind === kind);
  }

  isThreadActive(threadId: ThreadId): boolean {
    return this.activeThreadId() === threadId;
  }

  replaceMessage(
    threadId: ThreadId,
    messageId: number,
    replacement: ChatMessage
  ): void {
    this.conversations.update((state) => ({
      ...state,
      [threadId]: state[threadId].map((message) =>
        message.id === messageId ? replacement : message
      ),
    }));
  }

  selectThread(threadId: ThreadId): void {
    this.activeThreadId.set(threadId);
  }

  updateDraft(value: string): void {
    this.draft.set(value);
  }
}
