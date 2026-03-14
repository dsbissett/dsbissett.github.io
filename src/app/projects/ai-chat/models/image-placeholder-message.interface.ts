import { MessageBase } from './message-base.interface';

export interface ImagePlaceholderMessage extends MessageBase {
  kind: 'image-placeholder';
  status: string;
}
