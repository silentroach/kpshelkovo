import { preprocessSiteMarkdownContent } from '../markdown/render';
import type { SiteMentionRegistry } from '../mentions';
import type { RawPersonContact, RawPersonProfile } from './raw-schema';
import { personCanonical, personMarkdownUrl, personUrl } from './routes';
import { EMPTY_PERSON_BACKLINKS } from './types';
import type { PersonContact, PersonContactType, PersonProfile } from './types';

interface RawPersonProfileInput {
  readonly id: string;
  readonly data: RawPersonProfile;
  readonly body?: string;
}

const TELEGRAM_HANDLE = /^@?([A-Za-z0-9_]+)$/u;

const phoneHref = (value: string, context: string): string => {
  const display = value.trim();
  const digits = display.replace(/\D/gu, '');

  if (!digits) {
    throw new Error(`${context} phone must contain digits`);
  }

  return display.startsWith('+') ? `tel:+${digits}` : `tel:${digits}`;
};

const telegramParts = (
  value: string,
  context: string,
): {
  readonly display: string;
  readonly href: string;
} => {
  const match = value.trim().match(TELEGRAM_HANDLE);

  if (!match) {
    throw new Error(
      `${context} telegram must use a handle like @username or username`,
    );
  }

  const handle = match[1];

  return {
    display: `@${handle}`,
    href: `https://t.me/${handle}`,
  };
};

export const mapRawPersonContactType = (
  value: RawPersonContact['type'],
): PersonContactType => {
  switch (value) {
    case 'phone':
      return 'phone';
    case 'telegram':
      return 'telegram';
  }
};

export const mapRawPersonContact = (
  input: RawPersonContact,
  context: string,
): PersonContact => {
  const value = input.value.trim();
  const type = mapRawPersonContactType(input.type);

  if (!value) {
    throw new Error(`${context} value is required`);
  }

  if (type === 'phone') {
    return {
      type,
      value,
      display: value,
      href: phoneHref(value, context),
    };
  }

  const telegram = telegramParts(value, context);

  return {
    type,
    value,
    display: telegram.display,
    href: telegram.href,
  };
};

export const mapRawPersonProfile = (
  entry: RawPersonProfileInput,
  registry: SiteMentionRegistry,
): PersonProfile => {
  const body = preprocessSiteMarkdownContent(
    entry.body ?? '',
    `people profile "${entry.id}" body`,
    registry,
    { type: 'person', slug: entry.id },
  );

  return {
    id: entry.id,
    slug: entry.id,
    name: entry.data.name,
    seo: entry.data.seo,
    nameCases: entry.data.name_cases,
    company: entry.data.company,
    position: entry.data.position,
    url: personUrl(entry.id),
    markdownUrl: personMarkdownUrl(entry.id),
    canonical: personCanonical(entry.id),
    contacts: entry.data.contacts.map((contact, index) =>
      mapRawPersonContact(
        contact,
        `people profile "${entry.id}" contact #${index + 1}`,
      ),
    ),
    body: body.markdown,
    mentions: body.mentions,
    backlinks: EMPTY_PERSON_BACKLINKS,
  };
};
