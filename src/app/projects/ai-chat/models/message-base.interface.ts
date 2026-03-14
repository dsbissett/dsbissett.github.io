import { MessageRole } from './message-role.type';

export interface MessageBase {
  id: number;
  role: MessageRole;
  timestamp: string;
}
