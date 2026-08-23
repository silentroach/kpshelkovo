import type { PreprocessedSiteMarkdownBody } from '../markdown/render';
import type {
  EntityMentionTarget,
  SiteBacklinkKind,
  SiteBacklinks,
  SiteMentionRef,
  SiteMentionSection,
} from '../mentions';
import type { PersonNameCaseForms } from './name-cases';
import type { PeopleMentionRegistry } from './mentions';

export type PersonContactType = 'phone' | 'telegram';

export interface PersonContact {
  readonly type: PersonContactType;
  readonly value: string;
  readonly display: string;
  readonly href: string;
}

export type PersonMentionSection = SiteMentionSection;
export type PersonBacklinkKind = SiteBacklinkKind;
export type PersonMentionRef = SiteMentionRef;
export type PersonBacklinks = SiteBacklinks;

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
