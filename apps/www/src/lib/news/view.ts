import { formatDate, formatMonth } from '@shelkovo/format';

import { formatArea } from '../areas';
import type { NewsArea } from './schema';
import type { NewsAuthor } from './types';

export const NEWS_PROSE = 'ui-prose';

const capitalize = (value: string): string => {
  if (!value) {
    return value;
  }

  return value[0].toUpperCase() + value.slice(1);
};

export const formatNewsDate = (value: string): string => formatDate(value);

export const formatNewsMonth = (
  year: number,
  month: number,
  opts?: {
    readonly capitalize?: boolean;
    readonly includeYear?: boolean;
  }
): string => {
  const label = formatMonth(year, month, {
    includeYear: opts?.includeYear
  });

  return opts?.capitalize ? capitalize(label) : label;
};

export const formatNewsArea = (area: NewsArea): string => formatArea(area);

export const formatNewsAuthor = (
  author: Pick<NewsAuthor, 'name' | 'shortName'>,
  opts?: {
    readonly short?: boolean;
  }
): string => (opts?.short === false ? author.name : (author.shortName ?? author.name));
