import { ThreadId } from './thread-id.type';

export interface ChatSubmission {
  hasImage: boolean;
  messageText: string;
  requiresImageFlow: boolean;
  threadId: ThreadId;
}
