import { ImagePlaceholderMessage } from './image-placeholder-message.interface';
import { TextMessage } from './text-message.interface';
import { TypingMessage } from './typing-message.interface';

export type ChatMessage =
  | TextMessage
  | TypingMessage
  | ImagePlaceholderMessage;
