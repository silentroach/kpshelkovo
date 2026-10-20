import { formatDate } from '@shelkovo/format';
import { extractFirstMarkdownText } from '@shelkovo/markdown';

import type { ContactCategory } from './schema';
import type { Contact, ContactLocation, ContactReview } from './types';

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
  travel: 'Путешествия',
  insurance: 'Страхование'
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
  travel: '✈️',
  insurance: '🛡️'
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

export const formatContactCategory = (category: ContactCategory): string =>
  CONTACT_CATEGORY_LABELS[category];

export const formatContactCategoryEmoji = (category: ContactCategory): string =>
  CONTACT_CATEGORY_EMOJI[category];

export const formatContactReviewSentiment = (sentiment: ContactReview['sentiment']): string =>
  CONTACT_REVIEW_SENTIMENT_LABELS[sentiment];

export const formatContactReviewDate = (review: ContactReview): string =>
  formatDate(review.publishedIso);

export const hasManyPositiveContactReviews = (
  reviews: readonly Pick<ContactReview, 'sentiment'>[]
): boolean =>
  !reviews.some(({ sentiment }) => sentiment === 'negative') &&
  reviews.filter(({ sentiment }) => sentiment === 'positive').length >=
    MANY_POSITIVE_CONTACT_REVIEWS_THRESHOLD;

export const contactExcerpt = (contact: Pick<Contact, 'body' | 'summary'>): string =>
  contact.summary || (extractFirstMarkdownText(contact.body) ?? '');

export const contactPlace = (location?: ContactLocation): ContactPlace | undefined =>
  location
    ? {
        label: 'Адрес',
        title: location.title,
        href: location.url,
        address: location.address
      }
    : undefined;
