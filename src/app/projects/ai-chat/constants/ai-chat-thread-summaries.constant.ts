import { ThreadSummary } from '../models/thread-summary.interface';

export const AI_CHAT_THREAD_SUMMARIES: readonly ThreadSummary[] = [
  {
    id: 'new-chat',
    title: 'New chat',
    subtitle: 'Live triage session',
  },
  {
    id: 'device-pairing',
    title: 'Device pairing issue',
    subtitle: 'Last active 2h ago',
  },
  {
    id: 'travel-concierge',
    title: 'Travel concierge',
    subtitle: 'Archived',
  },
];
