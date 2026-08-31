import { absoluteUrl } from '../site';
import type { EntityMentionTarget } from '../mentions';
import type {
  PersonBacklinks,
  PersonContact,
  PersonMentionRef,
  PersonProfile,
} from './types';
import { PERSON_MENTION_SECTIONS } from './schema';
import {
  peoplePublicPayloadSchema,
  type PeoplePublicBacklinkDto,
  type PeoplePublicBacklinksDto,
  type PeoplePublicContactDto,
  type PeoplePublicMentionDto,
  type PeoplePublicPayloadDto,
  type PeoplePublicProfileDto,
} from './public-schema';

export type {
  PeoplePublicBacklinkDto,
  PeoplePublicBacklinksDto,
  PeoplePublicContactDto,
  PeoplePublicMentionDto,
  PeoplePublicPayloadDto,
  PeoplePublicProfileDto,
} from './public-schema';

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

  return peoplePublicPayloadSchema.parse({
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
  });
};
