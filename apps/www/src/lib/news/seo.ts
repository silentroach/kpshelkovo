import type { SchemaDoc } from '@shelkovo/seo';

import { buildEventJsonLd } from '@/lib/events/seo';
import { breadcrumbListSchema } from '@/lib/json-ld';
import type { BreadcrumbLink } from '@/lib/json-ld-types';

import { absoluteUrl } from '../site';
import type { NewsEvent } from './types';

const CONTEXT = 'https://schema.org';
const LANG = 'ru-RU';

interface BasePageInput {
  readonly name: string;
  readonly description: string;
  readonly url: string;
  readonly breadcrumbs?: readonly BreadcrumbLink[];
}

type AuthorInput = SchemaDoc | readonly SchemaDoc[] | undefined;

interface ArticleInput extends BasePageInput {
  readonly type: 'NewsArticle' | 'TechArticle';
  readonly datePublished?: string;
  readonly dateModified?: string;
  readonly image?: string | readonly string[];
  readonly author?: AuthorInput;
}

export interface NewsArticleInput extends Omit<ArticleInput, 'type'> {
  readonly events?: readonly NewsEvent[];
}

export interface TechArticleInput extends Omit<ArticleInput, 'type'> {}

const imageValue = (
  image: string | readonly string[] | undefined
): string | readonly string[] | undefined => {
  if (!image) return undefined;
  if (typeof image !== 'string') {
    return image.map((item) => absoluteUrl(item));
  }

  return absoluteUrl(image);
};

const articleSchema = (input: ArticleInput): readonly SchemaDoc[] => {
  const url = absoluteUrl(input.url);
  const image = imageValue(input.image);
  const docs: SchemaDoc[] = [
    {
      '@context': CONTEXT,
      '@type': input.type,
      headline: input.name,
      name: input.name,
      description: input.description,
      url,
      mainEntityOfPage: url,
      inLanguage: LANG,
      ...(input.datePublished ? { datePublished: input.datePublished } : {}),
      ...(input.dateModified ? { dateModified: input.dateModified } : {}),
      ...(image ? { image } : {}),
      ...(input.author ? { author: input.author } : {})
    }
  ];

  if (input.breadcrumbs?.length) {
    docs.push(breadcrumbListSchema(input.breadcrumbs));
  }

  return docs;
};

export const newsArticleSchema = (input: NewsArticleInput): readonly SchemaDoc[] => {
  const events = (input.events ?? []).map((event) => buildEventJsonLd(event, absoluteUrl('/')));

  return [...articleSchema({ ...input, type: 'NewsArticle' }), ...events];
};

export const techArticleSchema = (input: TechArticleInput): readonly SchemaDoc[] =>
  articleSchema({ ...input, type: 'TechArticle' });
