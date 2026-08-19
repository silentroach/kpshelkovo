import {
  createMarkdownDocument,
  extractFirstMarkdownText,
  md,
  parseMarkdownFragment,
  serializeMarkdownDocument,
  type MarkdownPhrasingInput,
} from '@shelkovo/markdown';

import { MARKDOWN_ROBOTS } from '../news/seo';
import { formatNewsDate, NEWS_PROSE } from '../news/view';
import { formatReviewDate } from '../reviews/view';
import { absoluteUrl } from '../site';
import { formatStatusDate } from '../status/view';
import { PERSON_MENTION_SECTIONS } from './schema';
import type {
  PersonBacklinks,
  PersonBacklinkKind,
  PersonContact,
  PersonContactType,
  PersonMentionRef,
  PersonMentionSection,
  PersonProfile,
} from './types';

const CONTACT_LABELS: Record<PersonContactType, string> = {
  phone: 'Телефон',
  telegram: 'Telegram',
};

const BACKLINK_SECTION_LABELS: Record<PersonMentionSection, string> = {
  news: 'Новости',
  status: 'Статус',
  reviews: 'Отзывы',
  places: 'Карта',
  people: 'Люди',
  contacts: 'Сарафан',
};

const BACKLINK_KIND_LABELS: Record<PersonBacklinkKind, string> = {
  article: 'Новость',
  incident: 'Инцидент',
  review: 'Отзыв',
  place: 'Место',
  person: 'Профиль',
  contact: 'Контакт',
};

export const PEOPLE_PROSE = NEWS_PROSE;

export const PEOPLE_MARKDOWN_HEADERS = {
  'Content-Type': 'text/markdown; charset=utf-8',
  'X-Robots-Tag': MARKDOWN_ROBOTS,
} as const;

type MarkdownNode = ReturnType<typeof parseMarkdownFragment>[number];
type MarkdownListItem = ReturnType<typeof md.listItem>;
type MarkdownPhrasingNodes = Exclude<MarkdownPhrasingInput, string>;
type MarkdownPhrasingNode = MarkdownPhrasingNodes[number];

const serialize = (children: readonly MarkdownNode[]): string =>
  serializeMarkdownDocument(createMarkdownDocument({ children }));

const inline = (value: string): string => value.replace(/\s+/gu, ' ').trim();

const section = (
  title: string,
  rows: readonly MarkdownListItem[],
): readonly MarkdownNode[] => [
  md.heading(2, title),
  md.list(rows.length > 0 ? rows : [md.listItem('Нет данных.')]),
];

const contactLine = (contact: PersonContact): MarkdownListItem =>
  md.listItem([
    md.paragraph([
      md.text(`${formatPersonContactType(contact.type)}: `),
      md.link(contact.href, contact.display),
    ]),
  ]);

const backlinkDate = (backlink: PersonMentionRef): string | undefined => {
  if (!backlink.mentionedAt) {
    return undefined;
  }

  if (backlink.section === 'status') {
    return formatStatusDate(backlink.mentionedAt);
  }

  if (backlink.section === 'reviews') {
    return formatReviewDate({ publishedIso: backlink.mentionedAt });
  }

  return formatNewsDate(backlink.mentionedAt);
};

const backlinkLine = (backlink: PersonMentionRef): MarkdownListItem => {
  const meta = [
    formatPersonBacklinkKind(backlink.kind),
    backlinkDate(backlink),
  ].filter(Boolean);
  const details = meta.length > 0 ? ` — ${meta.join('; ')}` : '';
  const summary = backlink.excerpt ? inline(backlink.excerpt) : undefined;
  const titleLine: MarkdownPhrasingNode[] = [
    md.link(absoluteUrl(backlink.markdownUrl), backlink.title),
    ...(details ? [md.text(details)] : []),
  ];

  return md.listItem([
    md.paragraph(titleLine),
    ...(summary ? [md.paragraph(summary)] : []),
  ]);
};

const backlinksSection = (
  backlinks: PersonBacklinks,
): readonly MarkdownNode[] => {
  const groups = personBacklinkGroups(backlinks);

  if (groups.length === 0) {
    return [
      md.heading(2, 'Где упоминается'),
      md.list([md.listItem('Пока публичных упоминаний не найдено.')]),
    ];
  }

  return [
    md.heading(2, 'Где упоминается'),
    ...groups.flatMap((group) => [
      md.heading(3, group.label),
      md.list(group.items.map(backlinkLine)),
    ]),
  ];
};

export const formatPersonContactType = (type: PersonContactType): string =>
  CONTACT_LABELS[type];

export const formatPersonContactCompactDisplay = (
  contact: Pick<PersonContact, 'type' | 'display'>,
): string =>
  contact.type === 'telegram'
    ? contact.display.replace(/^@/u, '')
    : contact.display;

export const formatPersonHeadline = (
  profile: Pick<PersonProfile, 'company' | 'position'>,
): string | undefined => {
  const parts = [profile.position, profile.company].filter(
    (value): value is string => Boolean(value),
  );

  return parts.length > 0 ? parts.join(', ') : undefined;
};

export const formatPersonBacklinkSection = (
  section: PersonMentionSection,
): string => BACKLINK_SECTION_LABELS[section];

export const formatPersonBacklinkKind = (kind: PersonBacklinkKind): string =>
  BACKLINK_KIND_LABELS[kind];

export const personBacklinkGroups = (
  backlinks: PersonBacklinks,
): readonly {
  readonly section: PersonMentionSection;
  readonly label: string;
  readonly items: readonly PersonMentionRef[];
}[] =>
  PERSON_MENTION_SECTIONS.map((section) => ({
    section,
    label: formatPersonBacklinkSection(section),
    items: backlinks[section],
  })).filter((group) => group.items.length > 0);

export const formatPersonBacklinkDate = (
  backlink: PersonMentionRef,
): string | undefined => backlinkDate(backlink);

export const describePersonProfile = (
  profile: Pick<PersonProfile, 'body' | 'company' | 'name' | 'position'>,
): string => {
  const first = extractFirstMarkdownText(profile.body);
  const headline = formatPersonHeadline(profile);

  return (
    first ??
    (headline ? `${profile.name} — ${headline}.` : undefined) ??
    `${profile.name} — публичный профиль человека из раздела профилей на сайте Шелково Онлайн.`
  );
};

export const buildPersonMarkdown = (profile: PersonProfile): string => {
  const headline = formatPersonHeadline(profile);

  return serialize([
    md.heading(1, profile.name),
    ...(headline ? [md.paragraph(headline)] : []),
    ...section(
      'Контакты',
      profile.contacts.length > 0
        ? profile.contacts.map(contactLine)
        : [md.listItem('Контакты пока не опубликованы.')],
    ),
    ...(profile.body
      ? [
          md.heading(2, 'Профиль'),
          ...parseMarkdownFragment(profile.body.trim()),
        ]
      : []),
    ...backlinksSection(profile.backlinks),
  ]);
};
