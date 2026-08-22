import { absoluteUrl } from '../site';
import type { EntityMentionTarget } from '../mentions';
import type { PersonNameCaseForms } from './name-cases';
import type {
  PersonBacklinks,
  PersonContact,
  PersonMentionRef,
  PersonProfile,
} from './types';
import { PERSON_MENTION_SECTIONS } from './schema';

export interface PeoplePublicContactDto {
  readonly type: PersonContact['type'];
  readonly value: string;
  readonly display: string;
  readonly href: string;
}

export interface PeoplePublicMentionDto {
  readonly type: EntityMentionTarget['type'];
  readonly slug: string;
  readonly name: string;
  readonly company?: string;
  readonly position?: string;
  readonly html_url: string;
  readonly markdown_url: string;
}

export interface PeoplePublicBacklinkDto {
  readonly section: PersonMentionRef['section'];
  readonly kind: PersonMentionRef['kind'];
  readonly source_id: string;
  readonly title: string;
  readonly html_url: string;
  readonly markdown_url: string;
  readonly excerpt?: string;
  readonly mentioned_at?: string;
}

export interface PeoplePublicBacklinksDto {
  readonly news: readonly PeoplePublicBacklinkDto[];
  readonly status: readonly PeoplePublicBacklinkDto[];
  readonly reviews: readonly PeoplePublicBacklinkDto[];
  readonly places: readonly PeoplePublicBacklinkDto[];
  readonly people: readonly PeoplePublicBacklinkDto[];
  readonly contacts: readonly PeoplePublicBacklinkDto[];
  readonly discomfort: readonly PeoplePublicBacklinkDto[];
}

export interface PeoplePublicProfileDto {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly name_cases?: PersonNameCaseForms;
  readonly company?: string;
  readonly position?: string;
  readonly html_url: string;
  readonly markdown_url: string;
  readonly contacts: readonly PeoplePublicContactDto[];
  readonly body_markdown: string;
  readonly mentions: readonly PeoplePublicMentionDto[];
  readonly mention_count: number;
  readonly backlinks: PeoplePublicBacklinksDto;
  readonly backlink_count: number;
}

export interface PeoplePublicPayloadDto {
  readonly stats: {
    readonly profile_count: number;
    readonly mention_count: number;
    readonly backlink_count: number;
  };
  readonly profiles: readonly PeoplePublicProfileDto[];
}

const fullUrl = (value: string): string => absoluteUrl(value);

const backlinksCount = (backlinks: PersonBacklinks): number =>
  PERSON_MENTION_SECTIONS.reduce(
    (total, section) => total + backlinks[section].length,
    0,
  );

const contactDto = (item: PersonContact): PeoplePublicContactDto => ({
  type: item.type,
  value: item.value,
  display: item.display,
  href: item.href,
});

const mentionDto = (item: EntityMentionTarget): PeoplePublicMentionDto => {
  const company = 'company' in item ? item.company : undefined;
  const position = 'position' in item ? item.position : undefined;

  return {
    type: item.type,
    slug: item.slug,
    name: item.label,
    ...(typeof company === 'string' ? { company } : {}),
    ...(typeof position === 'string' ? { position } : {}),
    html_url: fullUrl(item.htmlUrl),
    markdown_url: fullUrl(item.markdownUrl),
  };
};

const backlinkDto = (item: PersonMentionRef): PeoplePublicBacklinkDto => ({
  section: item.section,
  kind: item.kind,
  source_id: item.sourceId,
  title: item.title,
  html_url: fullUrl(item.htmlUrl),
  markdown_url: fullUrl(item.markdownUrl),
  ...(item.excerpt ? { excerpt: item.excerpt } : {}),
  ...(item.mentionedAt ? { mentioned_at: item.mentionedAt } : {}),
});

const backlinksDto = (value: PersonBacklinks): PeoplePublicBacklinksDto => ({
  news: value.news.map(backlinkDto),
  status: value.status.map(backlinkDto),
  reviews: value.reviews.map(backlinkDto),
  places: value.places.map(backlinkDto),
  people: value.people.map(backlinkDto),
  contacts: value.contacts.map(backlinkDto),
  discomfort: value.discomfort.map(backlinkDto),
});

const profileDto = (item: PersonProfile): PeoplePublicProfileDto => ({
  id: item.id,
  slug: item.slug,
  name: item.name,
  ...(item.nameCases ? { name_cases: item.nameCases } : {}),
  ...(item.company ? { company: item.company } : {}),
  ...(item.position ? { position: item.position } : {}),
  html_url: item.canonical,
  markdown_url: fullUrl(item.markdownUrl),
  contacts: item.contacts.map(contactDto),
  body_markdown: item.body,
  mentions: item.mentions.map(mentionDto),
  mention_count: item.mentions.length,
  backlinks: backlinksDto(item.backlinks),
  backlink_count: backlinksCount(item.backlinks),
});

export const buildPeoplePublicPayload = (data: {
  readonly profiles: readonly PersonProfile[];
}): PeoplePublicPayloadDto => {
  const profiles = data.profiles.map(profileDto);

  return {
    stats: {
      profile_count: profiles.length,
      mention_count: profiles.reduce(
        (total, item) => total + item.mention_count,
        0,
      ),
      backlink_count: profiles.reduce(
        (total, item) => total + item.backlink_count,
        0,
      ),
    },
    profiles,
  };
};
