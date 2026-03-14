import { MessageBase } from './message-base.interface';

export interface TypingMessage extends MessageBase {
  kind: 'typing';
}
