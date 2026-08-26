import type { SearchSection } from './types';

export const SEARCH_SECTIONS = {
  news: {
    id: 'news',
    label: 'Новости',
  },
  status: {
    id: 'status',
    label: 'Статус',
  },
  places: {
    id: 'places',
    label: 'Карта',
  },
  knowledgeBase: {
    id: 'knowledge-base',
    label: 'База знаний',
  },
  meetings: {
    id: 'meetings',
    label: 'Встречи',
  },
  people: {
    id: 'people',
    label: 'Люди',
  },
  reviews: {
    id: 'reviews',
    label: 'Отзывы',
  },
  sarafan: {
    id: 'sarafan',
    label: 'Сарафан',
  },
  compare: {
    id: 'compare',
    label: 'Сравнение поселков',
  },
  regulation: {
    id: 'regulation',
    label: 'Регламент',
  },
  discomfort: {
    id: 'discomfort',
    label: 'ОК Дискомфорт',
  },
} as const satisfies Readonly<Record<string, SearchSection>>;
