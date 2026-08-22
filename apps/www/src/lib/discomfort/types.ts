import type { PreprocessedSiteMarkdownBody } from '@/lib/markdown/render';
import type { EntityMentionTarget } from '@/lib/mentions';

export interface DiscomfortEvent {
  readonly slug: string;
  readonly dateIso: string;
  readonly title: string;
  readonly url: string;
  readonly body: PreprocessedSiteMarkdownBody;
  readonly mentions: readonly EntityMentionTarget[];
}

export interface DiscomfortDataset {
  readonly events: readonly DiscomfortEvent[];
  readonly latestEvent?: DiscomfortEvent;
  readonly quoteAuthor: EntityMentionTarget;
}
