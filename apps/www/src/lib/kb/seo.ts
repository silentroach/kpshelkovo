import { extractFirstMarkdownText } from '@shelkovo/markdown';
import type { SchemaDoc } from '@shelkovo/seo';

import type { BreadcrumbItem } from '@/lib/breadcrumbs';
import { collectionPageSchema } from '@/lib/json-ld';
import type { BreadcrumbLink } from '@/lib/json-ld-types';
import { techArticleSchema } from '@/lib/news/seo';

import type { KbPage } from './types';

const KB_DESCRIPTION =
  'База знаний Шелково: справочные материалы о сервисах, транспорте, документах и повседневных вопросах поселка.';
const MAX_DESCRIPTION_LENGTH = 170;
const MIN_EXTRACTED_DESCRIPTION_LENGTH = 40;
const SPACE = /\s+/gu;

const fallbackArticleDescription = (page: KbPage): string =>
  `Справочная статья базы знаний Шелково: ${page.title}.`;

const normalizeDescription = (value: string): string => {
  const text = value.replace(SPACE, ' ').trim();

  if (text.length <= MAX_DESCRIPTION_LENGTH) {
    return text;
  }

  const sentence = text.match(/^(.{80,170}?[.!?])(?:\s|$)/u)?.[1];

  if (sentence) {
    return sentence;
  }

  return `${text.slice(0, MAX_DESCRIPTION_LENGTH - 3).trimEnd()}...`;
};

export const kbPageDescription = (page: KbPage): string => {
  if (page.seo?.description) {
    return page.seo.description;
  }

  if (!page.routeSlug) {
    return KB_DESCRIPTION;
  }

  const text = extractFirstMarkdownText(page.body);

  if (!text || text.length < MIN_EXTRACTED_DESCRIPTION_LENGTH) {
    return fallbackArticleDescription(page);
  }

  return normalizeDescription(text);
};

const breadcrumbLinks = (
  items: readonly BreadcrumbItem[],
  currentUrl: string,
): readonly BreadcrumbLink[] =>
  items.map((item) => ({
    name: item.label,
    url: item.href ?? currentUrl,
  }));

export const kbPageSchema = (input: {
  readonly page: KbPage;
  readonly breadcrumbs: readonly BreadcrumbItem[];
  readonly description: string;
}): readonly SchemaDoc[] => {
  const breadcrumbs = breadcrumbLinks(input.breadcrumbs, input.page.url);

  if (!input.page.routeSlug) {
    return collectionPageSchema({
      name: input.page.title,
      description: input.description,
      url: input.page.url,
      breadcrumbs,
    });
  }

  return techArticleSchema({
    name: input.page.title,
    description: input.description,
    url: input.page.url,
    breadcrumbs,
  });
};
