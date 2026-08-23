import { formatNewsDate } from '@/lib/news/view';
import { formatReviewDate } from '@/lib/reviews/view';
import { formatStatusDate } from '@/lib/status/view';

import { PLACE_MENTION_SECTIONS } from './schema';
import type { PlaceCategory, PlaceStatus } from './schema';
import type {
  PlaceBacklinkKind,
  PlaceBacklinks,
  PlaceMentionRef,
  PlaceMentionSection,
} from './types';

const PLACE_CATEGORY_LABELS = {
  entrance: 'Въезды',
  children: 'Для детей',
  sport: 'Спорт',
  walking: 'Прогулки',
  food: 'Еда',
  services: 'Услуги',
  nature: 'Природа',
  water: 'Вода',
  infrastructure: 'Инфраструктура',
} as const satisfies Readonly<Record<PlaceCategory, string>>;

export const formatPlaceCategory = (category: PlaceCategory): string =>
  PLACE_CATEGORY_LABELS[category];

const PLACE_STATUS_LABELS = {
  existing: 'Существует',
  planned: 'Планируется',
  underConstruction: 'Строится',
} as const satisfies Readonly<Record<PlaceStatus, string>>;

export const formatPlaceStatus = (status: PlaceStatus): string =>
  PLACE_STATUS_LABELS[status];

const PLACE_BACKLINK_SECTION_LABELS = {
  news: 'Новости',
  status: 'Статус',
  reviews: 'Отзывы',
  places: 'Карта',
  people: 'Люди',
  contacts: 'Сарафан',
} as const satisfies Readonly<Record<PlaceMentionSection, string>>;

const PLACE_BACKLINK_KIND_LABELS = {
  article: 'Новость',
  incident: 'Инцидент',
  review: 'Отзыв',
  place: 'Место',
  person: 'Профиль',
  contact: 'Контакт',
} as const satisfies Readonly<Record<PlaceBacklinkKind, string>>;

export const formatPlaceBacklinkSection = (
  section: PlaceMentionSection,
): string => PLACE_BACKLINK_SECTION_LABELS[section];

export const formatPlaceBacklinkKind = (kind: PlaceBacklinkKind): string =>
  PLACE_BACKLINK_KIND_LABELS[kind];

export const formatPlaceBacklinkDate = (
  backlink: PlaceMentionRef,
): string | undefined => {
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

export const placeBacklinkGroups = (
  backlinks: PlaceBacklinks,
): readonly {
  readonly section: PlaceMentionSection;
  readonly label: string;
  readonly items: readonly PlaceMentionRef[];
}[] =>
  PLACE_MENTION_SECTIONS.map((section) => ({
    section,
    label: formatPlaceBacklinkSection(section),
    items: backlinks[section],
  })).filter((group) => group.items.length > 0);
