import type { EntityMentionTarget } from '../mentions';
import type { PersonNameCaseForms } from './name-cases';
import type { RawPersonProfile } from './raw-schema';
import { personMarkdownUrl, personUrl } from './routes';

export interface PersonMentionTarget extends EntityMentionTarget {
  readonly type: 'person';
  readonly name: string;
  readonly nameCases?: PersonNameCaseForms;
  readonly company?: string;
  readonly position?: string;
}

export type PeopleMentionRegistry = ReadonlyMap<string, PersonMentionTarget>;

const mentionTitle = (
  company: string | undefined,
  position: string | undefined,
): string | undefined => {
  const parts = [position, company].filter(
    (item): item is string => item !== undefined,
  );

  return parts.length > 0 ? parts.join(', ') : undefined;
};

export const createPersonMentionTarget = (
  slug: string,
  name: string,
  nameCases?: PersonNameCaseForms,
  company?: string,
  position?: string,
): PersonMentionTarget => {
  const linkTitle = mentionTitle(company, position);

  return {
    type: 'person',
    slug,
    label: name,
    name,
    labelCases: nameCases,
    nameCases,
    company,
    position,
    linkTitle,
    htmlUrl: personUrl(slug),
    markdownUrl: personMarkdownUrl(slug),
  };
};

export const mapRawPersonMentionTarget = (entry: {
  readonly id: string;
  readonly data: RawPersonProfile;
}): PersonMentionTarget =>
  createPersonMentionTarget(
    entry.id,
    entry.data.name,
    entry.data.name_cases,
    entry.data.company,
    entry.data.position,
  );
