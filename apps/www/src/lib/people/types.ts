import type { PreprocessedSiteMarkdownBody } from '../markdown/render';
import type { EntityMentionTarget } from '../mentions';
import type { PersonNameCaseForms } from './name-cases';
import type { PeopleMentionRegistry } from './mentions';

export type PersonContactType = 'phone' | 'telegram';

export interface PersonContact {
  readonly type: PersonContactType;
  readonly value: string;
  readonly display: string;
  readonly href: string;
}

export type PersonMentionSection =
  'news' | 'status' | 'reviews' | 'places' | 'people' | 'contacts';
export type PersonBacklinkKind =
  'article' | 'incident' | 'review' | 'place' | 'person' | 'contact';

export interface PersonMentionRef {
  readonly section: PersonMentionSection;
  readonly kind: PersonBacklinkKind;
  readonly sourceId: string;
  readonly title: string;
  readonly htmlUrl: string;
  readonly markdownUrl: string;
  readonly excerpt?: string;
  readonly mentionedAt?: string;
  readonly sortKey?: number;
}

export interface PersonBacklinks {
  readonly news: readonly PersonMentionRef[];
  readonly status: readonly PersonMentionRef[];
  readonly reviews: readonly PersonMentionRef[];
  readonly places: readonly PersonMentionRef[];
  readonly people: readonly PersonMentionRef[];
  readonly contacts: readonly PersonMentionRef[];
}

export interface PersonProfile {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly seo?: {
    readonly description?: string;
  };
  readonly nameCases?: PersonNameCaseForms;
  readonly company?: string;
  readonly position?: string;
  readonly url: string;
  readonly markdownUrl: string;
  readonly canonical: string;
  readonly contacts: readonly PersonContact[];
  readonly body: PreprocessedSiteMarkdownBody;
  readonly mentions: readonly EntityMentionTarget[];
  readonly backlinks: PersonBacklinks;
}

export interface PeopleDataset {
  readonly profiles: readonly PersonProfile[];
  readonly bySlug: ReadonlyMap<string, PersonProfile>;
  readonly mentionRegistry: PeopleMentionRegistry;
}

export const EMPTY_PERSON_BACKLINKS: PersonBacklinks = {
  news: [],
  status: [],
  reviews: [],
  places: [],
  people: [],
  contacts: [],
};
