import type { PreprocessedSiteMarkdownBody } from '@/lib/markdown/render';
import type { EntityMentionTarget } from '@/lib/mentions';
import type { KB_PAGE_FLAGS } from './page-flags';

export type KbPageFlag = (typeof KB_PAGE_FLAGS)[number];

export interface KbPage {
  readonly title: string;
  readonly seo?: {
    readonly description?: string;
  };
  readonly flags: readonly KbPageFlag[];
  readonly robots?: string;
  readonly url: string;
  readonly canonical: string;
  readonly routeSlug?: string;
  readonly isSection: boolean;
  readonly body: PreprocessedSiteMarkdownBody;
  readonly mentions: readonly EntityMentionTarget[];
}
