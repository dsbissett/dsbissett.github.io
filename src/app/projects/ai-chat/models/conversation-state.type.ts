import { ChatMessage } from './chat-message.type';
import { ThreadId } from './thread-id.type';

export type ConversationState = Record<ThreadId, ChatMessage[]>;
