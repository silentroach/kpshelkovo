import { extractFirstMarkdownText } from '@shelkovo/markdown';

import { createEntityMentionSourceRefs } from '../mentions';
import type { EntityMentionSourceRef } from '../mentions';
import type { PersonProfile } from './types';

type PersonProfileMentionRefSource = Pick<
  PersonProfile,
  'id' | 'slug' | 'name' | 'url' | 'markdownUrl' | 'body' | 'mentions'
>;

const SPACE = /\s+/gu;

const excerpt = (markdown: string): string | undefined => {
  const first = extractFirstMarkdownText(markdown);

  return first ? first.replace(SPACE, ' ').trim() : undefined;
};

export const createPersonProfileMentionRefs = (
  profile: PersonProfileMentionRefSource,
): readonly EntityMentionSourceRef[] => {
  if (!profile.mentions.length) {
    return [];
  }

  const summary = excerpt(profile.body);

  return createEntityMentionSourceRefs(profile.mentions, {
    source: {
      section: 'people',
      kind: 'person',
      id: profile.id,
    },
    sourceEntity: { type: 'person', slug: profile.slug },
    title: profile.name,
    htmlUrl: profile.url,
    markdownUrl: profile.markdownUrl,
    excerpt: summary,
  });
};
