import { Injectable } from '@angular/core';

import { ConversationState } from '../models/conversation-state.type';
import { ImagePlaceholderMessage } from '../models/image-placeholder-message.interface';
import { MessageRole } from '../models/message-role.type';
import { TextMessage } from '../models/text-message.interface';
import { TypingMessage } from '../models/typing-message.interface';

@Injectable()
export class AiChatMessageFactoryService {
  private messageId = 0;

  createInitialConversationState(): ConversationState {
    return {
      'new-chat': [
        this.createTextMessage(
          'assistant',
          'Welcome back!  What can I help you with today?'
        ),
      ],
      'device-pairing': [
        this.createTextMessage(
          'user',
          'How do I pair my iPhone with Bluetooth speakers?'
        ),
        this.createTextMessage(
          'assistant',
          'Sure! Turn on your Bluetooth speaker and put it in pairing mode (usually a button with a Bluetooth icon). On your iPhone, go to Settings -> Bluetooth, make sure Bluetooth is on, then tap your speaker name under Other Devices. Once it connects, it will show under My Devices and you should hear a confirmation tone.'
        ),
      ],
      'travel-concierge': [
        this.createTextMessage(
          'assistant',
          'This thread is archived. Start a new chat to continue.'
        ),
      ],
    };
  }

  createImagePlaceholderMessage(): ImagePlaceholderMessage {
    return {
      id: this.nextId(),
      kind: 'image-placeholder',
      role: 'assistant',
      status: 'Creating image',
      timestamp: this.createTimestamp(),
    };
  }

  createTextMessage(
    role: MessageRole,
    text: string,
    warning = false
  ): TextMessage {
    return {
      id: this.nextId(),
      kind: 'text',
      role,
      text,
      timestamp: this.createTimestamp(),
      warning,
    };
  }

  createTypingMessage(): TypingMessage {
    return {
      id: this.nextId(),
      kind: 'typing',
      role: 'assistant',
      timestamp: 'typing',
    };
  }

  private createTimestamp(): string {
    return new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private nextId(): number {
    this.messageId += 1;
    return this.messageId;
  }
}
