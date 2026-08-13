import {
  createMarkdownDocument,
  md,
  parseMarkdownFragment,
  serializeMarkdownDocument,
} from '@shelkovo/markdown';

import { absoluteUrl } from '@/lib/site';

import { reviewsRulesMarkdownPath } from './routes';
import type { Review, ReviewAspect, ReviewsDataset } from './types';
import {
  formatReviewArea,
  formatReviewAspectType,
  formatReviewAuthor,
  formatReviewDate,
  formatReviewTitle,
  sortReviewAspects,
} from './view';

export const REVIEWS_MARKDOWN_HEADERS = {
  'Content-Type': 'text/markdown; charset=utf-8',
  'X-Robots-Tag': 'noindex, follow',
} as const;

type MarkdownNode = ReturnType<typeof parseMarkdownFragment>[number];
type MarkdownListItem = ReturnType<typeof md.listItem>;

const serialize = (children: readonly MarkdownNode[]): string =>
  serializeMarkdownDocument(createMarkdownDocument({ children }));

const abs = (path: string): string => absoluteUrl(path);

const inline = (value: string): string => value.replace(/\s+/gu, ' ').trim();

const reviewDisclaimer =
  'Отзывы — это авторские тексты собственников. Мнение автора может не совпадать с позицией владельца сайта. Ответственность за сведения, оценки и формулировки в отзыве несет автор в пределах закона. Владелец сайта не является автором отзыва, не редактирует текст и не подтверждает каждое фактическое утверждение, а только проверяет, что автор является текущим собственником участка или дома в Шелково.';

const reviewReactionChannel =
  'Если вы считаете, что отзыв нарушает ваши права, содержит чужие персональные данные, угрозы или недостоверные сведения, напишите владельцу сайта со ссылкой на страницу и описанием проблемы. Мы рассмотрим обращение и при необходимости скроем или удалим материал.';

const reviewRejectionReasons = [
  'не подтверждено владение;',
  'спам;',
  'угрозы;',
  'незаконный контент;',
  'чужие персональные данные;',
  'серьезные обвинения вроде преступлений или мошенничества без фактов.',
] as const;

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
    md.heading(1, 'Правила публикации отзывов'),
    md.paragraph(
      'Раздел собирает авторские отзывы текущих собственников о жизни в Шелково.',
    ),
    md.heading(2, 'Кто может оставить отзыв'),
    md.paragraph(
      'Отзыв могут оставить текущие собственники участков или домов в Шелково.',
    ),
    md.heading(2, 'Как отправить отзыв'),
    md.paragraph([
      md.text('Напишите владельцу сайта в Telegram: '),
      md.link('https://t.me/silentroach', 't.me/silentroach'),
      md.text(
        '. Для проверки владения могут понадобиться выписка из ЕГРН и скриншот из приложения Домиленд.',
      ),
    ]),
    md.paragraph(
      'Сайт не хранит документы проверки, контакты, черновики и внутренние заметки. Публикация отзыва означает, что автор прошел ручную проверку до публикации.',
    ),
    md.heading(2, 'Редактура'),
    md.paragraph(
      'Текст отзыва публикуется без редакторских правок. Если в тексте есть проблема, отзыв не публикуется до новой версии от автора.',
    ),
    md.heading(2, 'Почему отзыв могут не принять'),
    md.list(reviewRejectionReasons.map((item) => md.listItem(item))),
    md.heading(2, 'Отказ от ответственности'),
    md.paragraph(reviewDisclaimer),
    md.heading(2, 'Если отзыв нарушает права'),
    md.paragraph(reviewReactionChannel),
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
        md.heading(2, 'Отказ от ответственности'),
        md.paragraph(inline(reviewDisclaimer)),
      ],
    }),
  );
