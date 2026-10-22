import { dateTimeFromISO, formatDate } from '@shelkovo/format';
import { extractFirstMarkdownText } from '@shelkovo/markdown';

import { formatContactPhone, normalizeContactPhone } from './phone';
import type { ContactCategory } from './schema';
import type { Contact, ContactContacts, ContactLocation, ContactReview } from './types';

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
  services: 'Услуги'
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
  services: '💼'
};

const CONTACT_REVIEW_SENTIMENT_LABELS: Record<ContactReview['sentiment'], string> = {
  positive: 'Плюс',
  neutral: 'Нейтральный',
  negative: 'Минус'
};

const MANY_POSITIVE_CONTACT_REVIEWS_THRESHOLD = 5;

export const CONTACTS_PROSE = 'ui-prose ui-prose-narrow';

export const CONTACTS_CHAT_LABEL = 'чате жителей Шелково';
export const CONTACTS_CHAT_URL = 'https://t.me/shelkovoecoclub';

export const CONTACTS_INTRO_PREFIX = 'Сарафан собирается из отзывов и самопрезентаций соседей в ';
export const CONTACTS_INTRO_SUFFIX =
  '. Здесь можно найти исполнителей по опыту жителей и познакомиться с услугами самих соседей.';
export const CONTACTS_NEIGHBOR_TABLE_PREFIX = ' Также есть ';
export const CONTACTS_NEIGHBOR_TABLE_LABEL = 'табличка из соседнего чата Гринвуда';
export const CONTACTS_NEIGHBOR_TABLE_URL =
  'https://docs.google.com/spreadsheets/d/1ckmDY1B54Mx9UB1chbybwdbPTF87R--uv2li7VhCfg8/edit?usp=drivesdk';
export const CONTACTS_NEIGHBOR_TABLE_SUFFIX = '.';

export const CONTACTS_EMPTY_MESSAGE =
  'Пока здесь ничего нет. Добавим контакты, когда появится живой опыт соседей.';

const phoneHref = (phone: string): string | undefined => {
  const normalized = normalizeContactPhone(phone);

  return normalized ? `tel:${normalized}` : undefined;
};

const method = (
  type: keyof ContactContacts,
  label: string,
  value: string | undefined,
  href?: string
): ContactMethod | undefined =>
  value
    ? {
        type,
        label,
        value,
        href
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

export const formatContactReviewSentiment = (sentiment: ContactReview['sentiment']): string =>
  CONTACT_REVIEW_SENTIMENT_LABELS[sentiment];

export const formatContactReviewDate = (review: ContactReview): string =>
  formatDate(review.publishedIso);

export const hasManyPositiveContactReviews = (
  reviews: readonly Pick<ContactReview, 'sentiment' | 'publishedIso'>[],
  now: Date = new Date()
): boolean => {
  const today = dateTimeFromISO(now.toISOString()).startOf('day');
  const windowStart = today.minus({ months: 12 }).toMillis();
  const windowEnd = today.toMillis();
  const recentReviews = reviews
    .map(({ sentiment, publishedIso }) => ({
      sentiment,
      publishedAt: dateTimeFromISO(publishedIso).toMillis()
    }))
    .filter(({ publishedAt }) => publishedAt >= windowStart && publishedAt <= windowEnd);
  const lastNegative = recentReviews.reduce(
    (latest, { sentiment, publishedAt }) =>
      sentiment === 'negative' ? Math.max(latest, publishedAt) : latest,
    Number.NEGATIVE_INFINITY
  );

  return (
    recentReviews.filter(
      ({ sentiment, publishedAt }) => sentiment === 'positive' && publishedAt > lastNegative
    ).length >= MANY_POSITIVE_CONTACT_REVIEWS_THRESHOLD
  );
};

export const contactExcerpt = (contact: Pick<Contact, 'body' | 'summary'>): string =>
  contact.summary || (extractFirstMarkdownText(contact.body) ?? '');

export const contactMethods = (contacts: ContactContacts): readonly ContactMethod[] => {
  const phone = contacts.phone ? formatContactPhone(contacts.phone) : undefined;

  return [
    method('phone', 'Телефон', phone, contacts.phone ? phoneHref(contacts.phone) : undefined),
    method('telegram', 'Telegram', telegramValue(contacts.telegram), contacts.telegram),
    method('whatsapp', 'WhatsApp', contacts.whatsapp, contacts.whatsapp),
    method(
      'email',
      'Email',
      contacts.email,
      contacts.email ? `mailto:${contacts.email}` : undefined
    ),
    method('website', 'Сайт', contacts.website, contacts.website)
  ].filter((item): item is ContactMethod => Boolean(item));
};

export const contactPlace = (location?: ContactLocation): ContactPlace | undefined =>
  location
    ? {
        label: 'Адрес',
        title: location.title,
        href: location.url,
        address: location.address
      }
    : undefined;
