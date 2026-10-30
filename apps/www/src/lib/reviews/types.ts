import type { Area } from '@/lib/areas';
import type { PreprocessedSiteMarkdownBody } from '@/lib/markdown/render';
import type { EntityMentionTarget } from '@/lib/mentions';

import type { ReviewAspectType } from './schema';

export interface ReviewAspect {
  readonly type: ReviewAspectType;
  readonly rating?: number;
  readonly body?: PreprocessedSiteMarkdownBody;
}

export interface Review {
  readonly id: string;
  readonly slug: string;
  readonly title?: string;
  /** Editor-selected plain-text passage from the readable main body. */
  readonly excerpt?: string;
  readonly seo?: {
    readonly description?: string;
  };
  readonly author?: string;
  readonly area: Area;
  readonly publishedAt: Date;
  readonly publishedIso: string;
  readonly url: string;
  readonly markdownUrl: string;
  readonly canonical: string;
  readonly body: PreprocessedSiteMarkdownBody;
  readonly aspects: readonly ReviewAspect[];
  readonly mentions: readonly EntityMentionTarget[];
}

export interface ReviewsDataset {
  readonly reviews: readonly Review[];
  readonly byId: ReadonlyMap<string, Review>;
}
