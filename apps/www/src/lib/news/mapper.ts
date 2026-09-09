import type { RawNewsAuthor } from './raw-schema';
import type { NewsAuthor } from './types';

const NEWS_AUTHOR_KIND_BY_RAW = {
  official: 'official',
  community: 'community',
  editorial: 'editorial',
  other: 'other'
} as const satisfies Record<RawNewsAuthor['kind'], NewsAuthor['kind']>;

export const mapRawNewsAuthor = (id: string, raw: RawNewsAuthor): NewsAuthor => ({
  id,
  name: raw.name,
  kind: NEWS_AUTHOR_KIND_BY_RAW[raw.kind],
  shortName: raw.short_name,
  url: raw.url,
  role: raw.role
});
