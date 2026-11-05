import type { PreprocessedSiteMarkdownBody } from '../markdown/render';
import type { EntityMentionTarget, SiteMentionRef } from '../mentions';
import type { PeopleMentionRegistry } from './mentions';
import type { PersonNameCaseForms } from './name-cases';
import type { PERSON_BACKLINK_KINDS, PERSON_MENTION_SECTIONS } from './schema';

export type PersonContactType = 'phone' | 'telegram';

export interface PersonContact {
  readonly type: PersonContactType;
  readonly value: string;
  readonly display: string;
  readonly href: string;
}

export type PersonMentionSection = (typeof PERSON_MENTION_SECTIONS)[number];
export type PersonBacklinkKind = (typeof PERSON_BACKLINK_KINDS)[number];
export interface PersonMentionRef extends Omit<SiteMentionRef, 'section' | 'kind'> {
  readonly section: PersonMentionSection;
  readonly kind: PersonBacklinkKind;
}
export type PersonBacklinks = Readonly<Record<PersonMentionSection, readonly PersonMentionRef[]>>;

export interface PersonPhoto {
  readonly src: string;
  /** Фактические размеры опубликованного файла, не CSS-размер портрета. */
  readonly width: number;
  readonly height: number;
  readonly source?: {
    readonly label: string;
    readonly url: string;
  };
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
  readonly photo?: PersonPhoto;
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
  events: [],
  status: [],
  reviews: [],
  places: [],
  people: [],
  contacts: []
};
