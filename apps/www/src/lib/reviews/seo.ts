import { extractMarkdownText } from '@shelkovo/markdown';
import type { SchemaDoc } from '@shelkovo/seo';

import { absoluteUrl } from '@/lib/site';

import { reviewsRulesUrl, reviewsUrl } from './routes';
import {
  REVIEW_ASPECT_ORGANIZATIONS,
  REVIEW_AUTHOR_FALLBACK,
  type ReviewOrganizationAspectType,
} from './schema';
import type { Review } from './types';
import {
  formatReviewArea,
  formatReviewAspectLabel,
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

const reviewedOrganizationSchema = (
  type: ReviewOrganizationAspectType,
): SchemaDoc => ({
  '@type': 'Organization',
  name: REVIEW_ASPECT_ORGANIZATIONS[type].name,
});

const reviewEntitySchemas = (review: Review): readonly SchemaDoc[] => {
  const url = absoluteUrl(review.url);
  return review.aspects.flatMap((aspect) => {
    if (aspect.type === 'place' || !aspect.rating) return [];

    const reviewBody = aspect.body
      ? extractMarkdownText(aspect.body)
      : undefined;

    return [
      {
        '@type': 'Review',
        '@id': `${url}#review-${aspect.type}`,
        identifier: `${review.id}-${aspect.type}`,
        name: `${formatReviewTitle(review)}. ${formatReviewAspectLabel(aspect.type)}`,
        author: reviewAuthorSchema(review),
        publisher: organizationSchema(),
        datePublished: review.publishedIso,
        url,
        mainEntityOfPage: { '@id': `${url}#webpage` },
        isPartOf: { '@id': `${absoluteUrl(reviewsUrl())}#webpage` },
        inLanguage: LANG,
        isAccessibleForFree: true,
        publishingPrinciples: absoluteUrl(reviewsRulesUrl()),
        itemReviewed: reviewedOrganizationSchema(aspect.type),
        contentLocation: reviewLocationSchema(review),
        reviewAspect: formatReviewAspectType(aspect.type),
        reviewBody,
        wordCount: reviewBody ? countWords(reviewBody) : undefined,
        reviewRating: {
          '@type': 'Rating',
          ratingValue: aspect.rating,
          bestRating: 5,
          worstRating: 1,
        },
      },
    ];
  });
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
    item: {
      '@type': 'ItemPage',
      '@id': `${absoluteUrl(review.url)}#webpage`,
      name: formatReviewTitle(review),
      url: absoluteUrl(review.url),
    },
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
              '@id': `${absoluteUrl(review.url)}#webpage`,
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
  const reviewEntities = reviewEntitySchemas(review);
  const reviewBody = extractMarkdownText(review.body);
  const mentions = reviewMentionsSchema(review);
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
      identifier: review.id,
      datePublished: review.publishedIso,
      author: reviewAuthorSchema(review),
      inLanguage: LANG,
      isAccessibleForFree: true,
      isPartOf: websiteSchema(),
      publisher: organizationSchema(),
      about: shelkovoPlaceSchema(),
      contentLocation: reviewLocationSchema(review),
      text: reviewBody,
      wordCount: reviewBody ? countWords(reviewBody) : undefined,
      mainEntity: reviewEntities.length
        ? reviewEntities.map((entity) => ({ '@id': entity['@id'] }))
        : undefined,
      mentions: mentions.length ? mentions : undefined,
      relatedLink: absoluteUrl(reviewsRulesUrl()),
      ...(breadcrumb ? { breadcrumb: { '@id': breadcrumb['@id'] } } : {}),
    },
    ...reviewEntities.map((entity) => ({
      '@context': CONTEXT,
      ...entity,
    })),
  ];

  if (breadcrumb) docs.push(breadcrumb);

  return docs;
};
