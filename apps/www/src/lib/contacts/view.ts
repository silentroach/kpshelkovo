import { extractFirstMarkdownText } from '@shelkovo/markdown';
import { formatDate } from '@shelkovo/format';

import type { ContactCategory } from './schema';
import type {
  Contact,
  ContactContacts,
  ContactLocation,
  ContactReview,
} from './types';

export interface ContactMethod {
  readonly type: keyof ContactContacts;
  readonly label: string;
  readonly value: string;
  readonly href?: string;
}

export interface ContactPlace {
  readonly label: string;
  readonly title: string;
  readonly href: string;
  readonly address?: string;
}

const CONTACT_CATEGORY_LABELS: Record<ContactCategory, string> = {
  fence: 'Забор',
  construction: 'Строительство и ремонт',
  furniture: 'Мебель',
  'waste-removal': 'Вывоз мусора',
  garden: 'Сад и участок',
  food: 'Еда и продукты',
  electricity: 'Электричество',
  education: 'Дети и обучение',
};

const CONTACT_CATEGORY_EMOJI: Record<ContactCategory, string> = {
  fence: '🚧',
  construction: '🛠️',
  furniture: '🪑',
  'waste-removal': '🚛',
  garden: '🌿',
  food: '🍕',
  electricity: '⚡',
  education: '📚',
};

const CONTACT_REVIEW_SENTIMENT_LABELS: Record<
  ContactReview['sentiment'],
  string
> = {
  positive: 'Плюс',
  negative: 'Минус',
};

const MANY_POSITIVE_CONTACT_REVIEWS_THRESHOLD = 5;

export const CONTACTS_PROSE = 'ui-prose ui-prose-narrow';

export const CONTACTS_CHAT_LABEL = 'чате жителей Шелково';
export const CONTACTS_CHAT_URL = 'https://t.me/shelkovoecoclub';

export const CONTACTS_INTRO_PREFIX = 'Сарафан собирается из опыта соседей в ';
export const CONTACTS_INTRO_SUFFIX =
  ': кого позвали, как прошла работа, к кому готовы обратиться снова. Лучше меньше контактов, зато с понятным живым контекстом.';
export const CONTACTS_NEIGHBOR_TABLE_PREFIX = ' Также есть ';
export const CONTACTS_NEIGHBOR_TABLE_LABEL =
  'табличка из соседнего чата Гринвуда';
export const CONTACTS_NEIGHBOR_TABLE_URL =
  'https://docs.google.com/spreadsheets/d/1ckmDY1B54Mx9UB1chbybwdbPTF87R--uv2li7VhCfg8/edit?usp=drivesdk';
export const CONTACTS_NEIGHBOR_TABLE_SUFFIX = '.';

export const CONTACTS_EMPTY_MESSAGE =
  'Пока здесь ничего нет. Добавим контакты, когда появится живой опыт соседей.';

const phoneHref = (phone: string): string =>
  `tel:${phone.replace(/[^+\d]/gu, '')}`;

const method = (
  type: keyof ContactContacts,
  label: string,
  value: string | undefined,
  href?: string,
): ContactMethod | undefined =>
  value
    ? {
        type,
        label,
        value,
        href,
      }
    : undefined;

const telegramValue = (url: string | undefined): string | undefined => {
  if (!url) {
    return;
  }

  try {
    const username = new URL(url).pathname.split('/').find(Boolean);

    return username ? `@${username}` : url;
  } catch {
    return url;
  }
};

export const formatContactCategory = (category: ContactCategory): string =>
  CONTACT_CATEGORY_LABELS[category];

export const formatContactCategoryEmoji = (category: ContactCategory): string =>
  CONTACT_CATEGORY_EMOJI[category];

export const formatContactReviewSentiment = (
  sentiment: ContactReview['sentiment'],
): string => CONTACT_REVIEW_SENTIMENT_LABELS[sentiment];

export const formatContactReviewDate = (review: ContactReview): string =>
  formatDate(review.publishedIso);

export const hasManyPositiveContactReviews = (
  reviews: readonly Pick<ContactReview, 'sentiment'>[],
): boolean =>
  !reviews.some(({ sentiment }) => sentiment === 'negative') &&
  reviews.filter(({ sentiment }) => sentiment === 'positive').length >=
    MANY_POSITIVE_CONTACT_REVIEWS_THRESHOLD;

export const contactExcerpt = (
  contact: Pick<Contact, 'body' | 'summary'>,
): string => {
  if (contact.summary) {
    return contact.summary;
  }

  if (!contact.body.trim()) {
    return '';
  }

  const text = (extractFirstMarkdownText(contact.body) ?? '')
    .replace(/\s+/gu, ' ')
    .trim();

  return text;
};

export const contactMethods = (
  contacts: ContactContacts,
): readonly ContactMethod[] =>
  [
    method(
      'phone',
      'Телефон',
      contacts.phone,
      contacts.phone ? phoneHref(contacts.phone) : undefined,
    ),
    method(
      'telegram',
      'Telegram',
      telegramValue(contacts.telegram),
      contacts.telegram,
    ),
    method('whatsapp', 'WhatsApp', contacts.whatsapp, contacts.whatsapp),
    method(
      'email',
      'Email',
      contacts.email,
      contacts.email ? `mailto:${contacts.email}` : undefined,
    ),
    method('website', 'Сайт', contacts.website, contacts.website),
  ].filter((item): item is ContactMethod => Boolean(item));

export const contactPlace = (
  location?: ContactLocation,
): ContactPlace | undefined =>
  location
    ? {
        label: 'Адрес',
        title: location.title,
        href: location.url,
        address: location.address,
      }
    : undefined;
