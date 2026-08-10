import {
  extractFirstMarkdownText,
  extractMarkdownText,
} from '@shelkovo/markdown';
import type { SchemaDoc } from '@shelkovo/seo';

import { absoluteUrl } from '@/lib/site';

import { reviewsRulesUrl, reviewsUrl } from './routes';
import { REVIEW_AUTHOR_FALLBACK } from './schema';
import type { Review } from './types';
import {
  formatReviewArea,
  formatReviewAspectType,
  formatReviewTitle,
} from './view';

const CONTEXT = 'https://schema.org';
const LANG = 'ru-RU';
const SITE_NAME = 'Шелково Онлайн';

interface ReviewsCollectionPageInput {
  readonly name: string;
  readonly description: string;
  readonly url: string;
  readonly items: readonly Review[];
  readonly breadcrumbs?: readonly BreadcrumbLink[];
}

interface BreadcrumbLink {
  readonly name: string;
  readonly url: string;
}

interface ReviewPageInput {
  readonly review: Review;
  readonly description: string;
  readonly breadcrumbs?: readonly BreadcrumbLink[];
}

const organizationSchema = (): SchemaDoc => ({
  '@type': 'Organization',
  '@id': `${absoluteUrl('/')}#organization`,
  name: SITE_NAME,
  url: absoluteUrl('/'),
});

const websiteSchema = (): SchemaDoc => ({
  '@type': 'WebSite',
  '@id': `${absoluteUrl('/')}#website`,
  name: SITE_NAME,
  url: absoluteUrl('/'),
  inLanguage: LANG,
});

const placeId = (): string =>
  `${absoluteUrl('/815/compare/settlements/shelkovo/')}#place`;

const shelkovoPlaceSchema = (): SchemaDoc => ({
  '@type': 'Place',
  '@id': placeId(),
  name: 'КП Шелково',
  alternateName: ['Шелково', 'Шелково Эко Клаб'],
  url: 'https://kpshelkovo.ru/',
  address: 'Московская область, городской округ Ступино',
});

const reviewLocationSchema = (review: Review): SchemaDoc => ({
  '@type': 'Place',
  name: formatReviewArea(review.area),
  containedInPlace: { '@id': placeId() },
});

const breadcrumbSchema = (
  url: string,
  items: readonly BreadcrumbLink[],
): SchemaDoc => ({
  '@context': CONTEXT,
  '@type': 'BreadcrumbList',
  '@id': `${url}#breadcrumb`,
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: absoluteUrl(item.url),
  })),
});

const reviewRatings = (review: Review): readonly SchemaDoc[] =>
  review.aspects.flatMap((aspect) =>
    aspect.rating
      ? [
          {
            '@type': 'Rating',
            ratingValue: aspect.rating,
            bestRating: 5,
            worstRating: 1,
            reviewAspect: formatReviewAspectType(aspect.type),
          },
        ]
      : [],
  );

const reviewAuthorSchema = (review: Review): SchemaDoc => ({
  '@type': 'Person',
  name: review.author ?? REVIEW_AUTHOR_FALLBACK,
});

const reviewMentionsSchema = (review: Review): readonly SchemaDoc[] =>
  review.mentions.map((mention) => ({
    '@type': 'Person',
    name: mention.label,
    url: absoluteUrl(mention.htmlUrl),
  }));

const countWords = (text: string): number => text.split(/\s+/u).length;

const reviewEntitySchema = (
  review: Review,
  options?: {
    readonly description?: string;
    readonly reviewBody?: string;
  },
): SchemaDoc => {
  const url = absoluteUrl(review.url);
  const reviewBody = options?.reviewBody;
  const summary = options?.description ?? extractFirstMarkdownText(review.body);
  const ratings = reviewRatings(review);
  const mentions = reviewMentionsSchema(review);

  return {
    '@type': 'Review',
    '@id': `${url}#review`,
    identifier: review.id,
    name: formatReviewTitle(review),
    description: summary,
    author: reviewAuthorSchema(review),
    publisher: organizationSchema(),
    datePublished: review.publishedIso,
    url,
    mainEntityOfPage: { '@id': `${url}#webpage` },
    isPartOf: { '@id': `${absoluteUrl(reviewsUrl())}#webpage` },
    inLanguage: LANG,
    isAccessibleForFree: true,
    publishingPrinciples: absoluteUrl(reviewsRulesUrl()),
    itemReviewed: shelkovoPlaceSchema(),
    contentLocation: reviewLocationSchema(review),
    ...(reviewBody ? { reviewBody, wordCount: countWords(reviewBody) } : {}),
    ...(ratings.length > 0 ? { reviewRating: ratings } : {}),
    ...(mentions.length > 0 ? { mentions } : {}),
  };
};

const itemListSchema = (
  url: string,
  reviews: readonly Review[],
): SchemaDoc => ({
  '@context': CONTEXT,
  '@type': 'ItemList',
  '@id': `${url}#items`,
  url,
  numberOfItems: reviews.length,
  itemListOrder: 'https://schema.org/ItemListOrderDescending',
  itemListElement: reviews.map((review, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: formatReviewTitle(review),
    url: absoluteUrl(review.url),
    item: reviewEntitySchema(review),
  })),
});

export const reviewsCollectionPageSchema = (
  input: ReviewsCollectionPageInput,
): readonly SchemaDoc[] => {
  const url = absoluteUrl(input.url);
  const pageId = `${url}#webpage`;
  const list = input.items.length
    ? itemListSchema(url, input.items)
    : undefined;
  const breadcrumb = input.breadcrumbs?.length
    ? breadcrumbSchema(url, input.breadcrumbs)
    : undefined;
  const rulesUrl = absoluteUrl(reviewsRulesUrl());
  const docs: SchemaDoc[] = [
    {
      '@context': CONTEXT,
      '@type': 'CollectionPage',
      '@id': pageId,
      name: input.name,
      description: input.description,
      url,
      inLanguage: LANG,
      isAccessibleForFree: true,
      isPartOf: websiteSchema(),
      publisher: organizationSchema(),
      about: shelkovoPlaceSchema(),
      publishingPrinciples: rulesUrl,
      ...(url !== rulesUrl ? { significantLink: rulesUrl } : {}),
      ...(input.items[0] ? { dateModified: input.items[0].publishedIso } : {}),
      ...(list
        ? {
            mainEntity: { '@id': list['@id'] },
            hasPart: input.items.map((review) => ({
              '@id': `${absoluteUrl(review.url)}#review`,
            })),
          }
        : {}),
      ...(breadcrumb ? { breadcrumb: { '@id': breadcrumb['@id'] } } : {}),
    },
  ];

  if (list) docs.push(list);
  if (breadcrumb) docs.push(breadcrumb);

  return docs;
};

export const reviewPageSchema = (
  input: ReviewPageInput,
): readonly SchemaDoc[] => {
  const { review } = input;
  const url = absoluteUrl(review.url);
  const pageId = `${url}#webpage`;
  const reviewEntity = reviewEntitySchema(review, {
    description: input.description,
    reviewBody: extractMarkdownText(review.body),
  });
  const breadcrumb = input.breadcrumbs?.length
    ? breadcrumbSchema(url, input.breadcrumbs)
    : undefined;
  const docs: SchemaDoc[] = [
    {
      '@context': CONTEXT,
      '@type': 'ItemPage',
      '@id': pageId,
      name: formatReviewTitle(review),
      description: input.description,
      url,
      datePublished: review.publishedIso,
      inLanguage: LANG,
      isAccessibleForFree: true,
      isPartOf: websiteSchema(),
      publisher: organizationSchema(),
      about: shelkovoPlaceSchema(),
      mainEntity: { '@id': reviewEntity['@id'] },
      relatedLink: absoluteUrl(reviewsRulesUrl()),
      ...(breadcrumb ? { breadcrumb: { '@id': breadcrumb['@id'] } } : {}),
    },
    {
      '@context': CONTEXT,
      ...reviewEntity,
    },
  ];

  if (breadcrumb) docs.push(breadcrumb);

  return docs;
};
