import { extractFirstContentText } from '@/lib/markdown/content-emphasis';
import { createEntityMentionSourceRefs, type EntityMentionSourceRef } from '@/lib/mentions';

import { kbDetailMarkdownUrl, kbMarkdownUrl } from './routes';
import type { KbPage } from './types';

export const createKbPageMentionRefs = (page: KbPage): readonly EntityMentionSourceRef[] =>
  createEntityMentionSourceRefs(
    page.mentions.filter((mention) => mention.type === 'place'),
    {
      source: { section: 'kb', kind: 'guide', id: page.url },
      title: page.title,
      htmlUrl: page.url,
      markdownUrl: page.routeSlug ? kbDetailMarkdownUrl(page.routeSlug) : kbMarkdownUrl(),
      excerpt: extractFirstContentText(page.body)
    }
  );
