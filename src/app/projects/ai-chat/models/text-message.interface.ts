import { MessageBase } from './message-base.interface';

export interface TextMessage extends MessageBase {
  kind: 'text';
  text: string;
  warning?: boolean;
}
