import {
  createMarkdownDocument,
  md,
  parseMarkdownFragment,
  serializeMarkdownDocument,
} from '@shelkovo/markdown';

import { absoluteUrl } from '@/lib/site';

import { reviewsRulesMarkdownPath } from './routes';
import { REVIEW_RULES } from './rules';
import type { Review, ReviewAspect, ReviewsDataset } from './types';
import {
  formatReviewArea,
  formatReviewAspectType,
  formatReviewAuthor,
  formatReviewDate,
  formatReviewTitle,
  sortReviewAspects,
} from './view';

type MarkdownNode = ReturnType<typeof parseMarkdownFragment>[number];
type MarkdownListItem = ReturnType<typeof md.listItem>;

const serialize = (children: readonly MarkdownNode[]): string =>
  serializeMarkdownDocument(createMarkdownDocument({ children }));

const abs = (path: string): string => absoluteUrl(path);

const reviewLine = (review: Review): MarkdownListItem =>
  md.listItem([
    md.paragraph([
      md.link(abs(review.markdownUrl), formatReviewTitle(review)),
      md.text(
        ` — ${formatReviewDate(review)}; ${formatReviewAuthor(review)}; ${formatReviewArea(review.area)}.`,
      ),
    ]),
  ]);

const aspectNodes = (aspect: ReviewAspect): readonly MarkdownNode[] => [
  md.heading(3, formatReviewAspectType(aspect.type)),
  ...(aspect.body ? parseMarkdownFragment(aspect.body.trim()) : []),
];

const reviewRatings = (review: Review): Readonly<Record<string, number>> =>
  Object.fromEntries(
    sortReviewAspects(review.aspects).flatMap((aspect) =>
      aspect.rating ? [[aspect.type, aspect.rating] as const] : [],
    ),
  );

const reviewFrontmatter = (
  review: Review,
): Readonly<Record<string, unknown>> => ({
  title: formatReviewTitle(review),
  published_at: review.publishedIso,
  author: formatReviewAuthor(review),
  area: formatReviewArea(review.area),
  ratings: reviewRatings(review),
});

export const buildReviewsHomeMarkdown = (data: ReviewsDataset): string =>
  serialize([
    md.heading(1, 'Отзывы собственников Шелково'),
    md.paragraph(
      'Независимые отзывы текущих собственников Шелково. Тексты публикуются без редакторских правок, а авторы проходят ручную проверку перед публикацией.',
    ),
    md.paragraph([
      md.link(abs(reviewsRulesMarkdownPath()), 'Правила публикации отзывов'),
      md.text('.'),
    ]),
    md.heading(2, 'Отзывы'),
    data.reviews.length > 0
      ? md.list(data.reviews.map(reviewLine))
      : md.paragraph([
          md.text('Если вы собственник участка или дома в Шелково, '),
          md.link(
            abs(reviewsRulesMarkdownPath()),
            'посмотрите, как оставить свой отзыв',
          ),
          md.text('.'),
        ]),
  ]);

export const buildReviewsRulesMarkdown = (): string =>
  serialize([
    md.heading(1, REVIEW_RULES.title),
    md.paragraph(
      'Раздел собирает авторские отзывы текущих собственников о жизни в Шелково.',
    ),
    md.heading(2, REVIEW_RULES.eligibility.heading),
    md.paragraph(REVIEW_RULES.eligibility.text),
    md.heading(2, REVIEW_RULES.submission.heading),
    md.paragraph([
      md.text('Напишите владельцу сайта в Telegram: '),
      md.link(
        REVIEW_RULES.submission.telegram.href,
        REVIEW_RULES.submission.telegram.label,
      ),
      md.text(`. ${REVIEW_RULES.submission.ownershipVerification}`),
    ]),
    md.paragraph(REVIEW_RULES.submission.dataHandling),
    md.heading(2, REVIEW_RULES.editing.heading),
    md.paragraph(REVIEW_RULES.editing.text),
    md.heading(2, REVIEW_RULES.rejection.heading),
    md.list(REVIEW_RULES.rejection.reasons.map((item) => md.listItem(item))),
    md.heading(2, REVIEW_RULES.disclaimer.heading),
    md.paragraph(REVIEW_RULES.disclaimer.text),
    md.heading(2, REVIEW_RULES.rightsViolation.heading),
    md.paragraph(REVIEW_RULES.rightsViolation.text),
  ]);

export const buildReviewMarkdown = (review: Review): string =>
  serializeMarkdownDocument(
    createMarkdownDocument({
      frontmatter: reviewFrontmatter(review),
      children: [
        md.heading(1, formatReviewTitle(review)),
        md.paragraph(
          `${formatReviewDate(review)}; ${formatReviewAuthor(review)}; ${formatReviewArea(review.area)}.`,
        ),
        ...parseMarkdownFragment(review.body.trim()),
        ...(review.aspects.some((aspect) => aspect.body)
          ? [
              md.heading(2, 'Комментарии по темам'),
              ...sortReviewAspects(review.aspects)
                .filter((aspect) => aspect.body)
                .flatMap(aspectNodes),
            ]
          : []),
        md.heading(2, REVIEW_RULES.disclaimer.heading),
        md.paragraph(REVIEW_RULES.disclaimer.text),
      ],
    }),
  );
