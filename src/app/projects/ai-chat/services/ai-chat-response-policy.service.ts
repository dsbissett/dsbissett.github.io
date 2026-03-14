import { Injectable } from '@angular/core';

import { ThreadId } from '../models/thread-id.type';

@Injectable({
  providedIn: 'root',
})
export class AiChatResponsePolicyService {
  private readonly warningMessages = [
    'This content may violate our content policies.',
    'This content may include suggestive or racy material.',
    'This content may violate our guardrails around nudity, sexuality, or erotic content.',
    'We currently do not support uploads of images containing photorealistic people.',
    "This request appears to violate the AI's terms of service.",
  ];

  private readonly policyViolationMessages = [
    "Sorry, I can't help with that. It violates our content policy.",
    "I can't assist with that request due to content policy restrictions.",
    "That request goes against our content policy, so I can't comply.",
  ];

  readonly imageFailureMessage =
    'This request violates our content policies, so the image cannot be generated.';

  createReply(threadId: ThreadId): string {
    const messages =
      threadId === 'device-pairing'
        ? this.policyViolationMessages
        : this.warningMessages;

    return this.pickRandom(messages);
  }

  getImageFailureDelay(): number {
    return 5000 + Math.floor(Math.random() * 2500);
  }

  getPlaceholderDelay(): number {
    return 450 + Math.floor(Math.random() * 400);
  }

  getWarningDelay(): number {
    const usesFastDelay = Math.random() < 0.45;
    if (usesFastDelay) {
      return 450 + Math.floor(Math.random() * 350);
    }

    return 1800 + Math.floor(Math.random() * 2200);
  }

  isImageRequest(text: string): boolean {
    return /\b(image|photo|picture|photograph|pic|snapshot)\b/i.test(text);
  }

  private pickRandom(values: readonly string[]): string {
    return values[Math.floor(Math.random() * values.length)];
  }
}
