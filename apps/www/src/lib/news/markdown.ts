import { count } from '@shelkovo/format';
import {
  createMarkdownDocument,
  md,
  parseMarkdownFragment,
  serializeMarkdownDocument,
} from '@shelkovo/markdown';

import { absoluteUrl } from '../site';
import { NEWS_LATEST_LIMIT } from './config';
import type {
  NewsArticle,
  NewsAttachment,
  NewsDataset,
  NewsListArticle,
  NewsMonthArchive,
  NewsPhoto,
  NewsTagPage,
  NewsYearArchive,
} from './types';
import { newsArchiveMarkdownUrl } from './routes';
import {
  formatNewsArea,
  formatNewsAuthor,
  formatNewsDate,
  formatNewsMonth,
} from './view';

export const NEWS_MARKDOWN_HEADERS = {
  'Content-Type': 'text/markdown; charset=utf-8',
  'X-Robots-Tag': 'noindex, follow',
} as const;

const abs = (value: string): string => absoluteUrl(value);

type MarkdownNode = ReturnType<typeof parseMarkdownFragment>[number];
type MarkdownListItem = ReturnType<typeof md.listItem>;

const serialize = (children: readonly MarkdownNode[]): string =>
  serializeMarkdownDocument(createMarkdownDocument({ children }));

const pick = <T>(items: readonly (T | undefined)[]): readonly T[] =>
  items.filter((item): item is T => item !== undefined);

const section = (
  title: string,
  rows: readonly MarkdownListItem[],
): readonly MarkdownNode[] => [
  md.heading(2, title),
  md.list(rows.length > 0 ? rows : [md.listItem('Нет данных.')]),
];

const inline = (value: string): string => value.replace(/\s+/g, ' ').trim();

function areaLabels(
  item: Pick<NewsArticle, 'appliesToAllAreas' | 'areas'>,
): readonly string[] {
  if (item.appliesToAllAreas) {
    return [];
  }

  return item.areas.map((area) => formatNewsArea(area));
}

function tagLabels(
  items:
    Pick<NewsListArticle, 'tags'>['tags'] | Pick<NewsArticle, 'tags'>['tags'],
): readonly string[] {
  return items.map((item) => item.label);
}

const when = (iso: string, time?: string): string =>
  time ? `${formatNewsDate(iso)}, ${time}` : formatNewsDate(iso);

const machineDate = (iso: string, time?: string): string =>
  time ? iso : iso.slice(0, 10);

const photoLine = (label: string, photo: NewsPhoto): MarkdownListItem =>
  md.listItem(
    `${label}: ${pick([
      abs(photo.url),
      `alt: ${inline(photo.alt)}`,
      photo.caption ? `подпись: ${inline(photo.caption)}` : undefined,
    ]).join(' — ')}`,
  );

function photoSection(article: NewsArticle): readonly MarkdownNode[] {
  const rows = pick<MarkdownListItem>([
    article.cover
      ? md.listItem(
          `Обложка: ${pick([
            abs(article.cover.url),
            `alt: ${inline(article.cover.alt)}`,
          ]).join(' — ')}`,
        )
      : undefined,
    ...article.photos.map((photo, index) =>
      photoLine(`Фото ${index + 1}`, photo),
    ),
  ]);

  return rows.length > 0 ? section('Фото', rows) : [];
}

const attachmentLine = (item: NewsAttachment): MarkdownListItem =>
  md.listItem(
    `${item.title}: ${pick([abs(item.url), item.type, item.size]).join(' — ')}`,
  );

function attachmentSection(
  items: readonly NewsAttachment[],
): readonly MarkdownNode[] {
  return items.length > 0 ? section('Вложения', items.map(attachmentLine)) : [];
}

function articleLine(article: NewsListArticle): MarkdownListItem {
  const meta = pick<string>([when(article.publishedIso, article.time)]);
  const summary = inline(article.summary);
  const titleLine = [
    md.link(abs(article.markdownUrl), article.title),
    ...(meta.length > 0 ? [md.text(` — ${meta.join('; ')}`)] : []),
  ];

  return md.listItem([
    md.paragraph(titleLine),
    ...(summary ? [md.paragraph(summary)] : []),
  ]);
}

function articleBlock(input: {
  readonly items: readonly NewsListArticle[];
  readonly empty: string;
  readonly title?: string;
  readonly intro?: string;
  readonly headingLevel?: 2 | 3;
}): readonly MarkdownNode[] {
  const { items, empty, title, intro, headingLevel = 2 } = input;

  return [
    ...(title ? [md.heading(headingLevel, title)] : []),
    ...(intro ? [md.paragraph(intro)] : []),
    md.list(items.length > 0 ? items.map(articleLine) : [md.listItem(empty)]),
  ];
}

function articleFrontmatter(
  article: NewsArticle,
): Readonly<Record<string, unknown>> {
  const areas = areaLabels(article);
  const tags = tagLabels(article.tags);

  return {
    title: article.title,
    summary: article.summary,
    published_at: machineDate(article.publishedIso, article.time),
    author: {
      id: article.author.id,
      name: formatNewsAuthor(article.author, { short: false }),
      kind: article.author.kind,
    },
    ...(areas.length > 0 ? { areas } : {}),
    ...(tags.length > 0 ? { tags } : {}),
    ...(article.sourceUrl ? { source_url: abs(article.sourceUrl) } : {}),
  };
}

const monthLine = (item: NewsMonthArchive): MarkdownListItem =>
  md.listItem([
    md.paragraph([
      md.link(
        abs(item.markdownUrl),
        formatNewsMonth(item.year, item.month, { capitalize: true }),
      ),
      md.text(
        ` — ${count(item.count, ['публикация', 'публикации', 'публикаций'])}`,
      ),
    ]),
  ]);

const yearLine = (item: NewsYearArchive): MarkdownListItem =>
  md.listItem([
    md.paragraph([
      md.link(abs(item.markdownUrl), `Новости за ${item.year} год`),
    ]),
  ]);

const tagLine = (item: NewsTagPage): MarkdownListItem =>
  md.listItem([
    md.paragraph([
      md.link(abs(item.markdownUrl), item.label),
      md.text(
        ` — ${count(item.count, ['публикация', 'публикации', 'публикаций'])}`,
      ),
    ]),
  ]);

export function buildNewsHomeMarkdown(data: NewsDataset): string {
  const latest = [...data.home.pinned, ...data.home.latest];
  const normalCount = data.articles.length - data.home.pinned.length;

  return serialize([
    md.heading(1, 'Новости Шелково'),
    md.paragraph(
      'Свежие новости поселков Шелково и сервисов ОК Комфорт в текстовом формате.',
    ),
    ...articleBlock({
      title: 'Новости',
      items: latest,
      empty: 'Первые публикации для раздела готовятся.',
      intro:
        normalCount > data.home.latest.length
          ? `Закрепленные публикации показаны первыми. Для обычных новостей на главной Markdown-странице показываем не больше ${NEWS_LATEST_LIMIT}; более ранние публикации сгруппированы по годам и месяцам.`
          : undefined,
    }),
    ...(data.archives.years.length > 0
      ? [
          md.paragraph([
            md.link(abs(newsArchiveMarkdownUrl()), 'Архив новостей'),
          ]),
        ]
      : []),
  ]);
}

export const buildNewsArchiveMarkdown = (
  years: readonly NewsYearArchive[],
): string =>
  serialize([
    md.heading(1, 'Архив новостей Шелково'),
    md.list(
      years.length > 0
        ? years.map(yearLine)
        : [md.listItem('Публикаций пока нет.')],
    ),
  ]);

export function buildNewsYearMarkdown(input: {
  readonly archive: NewsYearArchive;
}): string {
  const { archive } = input;
  const months = [...archive.months].sort((a, b) => a.month - b.month);

  return serialize([
    md.heading(1, `Новости Шелково за ${archive.year} год`),
    md.list(
      months.length > 0
        ? months.map(monthLine)
        : [md.listItem('В этом году пока нет публикаций.')],
    ),
  ]);
}

export function buildNewsMonthMarkdown(input: {
  readonly archive: NewsMonthArchive;
}): string {
  const { archive } = input;
  const monthLabel = formatNewsMonth(archive.year, archive.month);

  return serialize([
    md.heading(1, `Новости Шелково за ${monthLabel}`),
    ...articleBlock({
      items: archive.articles,
      empty: 'В этом месяце пока нет публикаций.',
    }),
  ]);
}

export function buildNewsArticleMarkdown(article: NewsArticle): string {
  return serializeMarkdownDocument(
    createMarkdownDocument({
      frontmatter: articleFrontmatter(article),
      children: [
        md.heading(1, article.title),
        ...(article.body ? parseMarkdownFragment(article.body.trim()) : []),
        ...photoSection(article),
        ...attachmentSection(article.attachments),
      ],
    }),
  );
}

export function buildNewsTagsMarkdown(
  tagsPage: readonly NewsTagPage[],
): string {
  return serialize([
    md.heading(1, 'Теги новостей Шелково'),
    ...section(
      'Теги',
      tagsPage.length > 0
        ? tagsPage.map(tagLine)
        : [
            md.listItem(
              'Индекс появится автоматически после первых новостей с тегами.',
            ),
          ],
    ),
  ]);
}

export function buildNewsTagMarkdown(tag: NewsTagPage): string {
  const latestPublicationsLabel = count(NEWS_LATEST_LIMIT, [
    'публикация',
    'публикации',
    'публикаций',
  ]);

  return serialize([
    md.heading(1, `Тег ${tag.label}`),
    ...articleBlock({
      title: 'Последние новости по тегу',
      items: tag.latest,
      empty: 'По этому тегу пока нет публикаций.',
      intro:
        tag.count > tag.latest.length
          ? `На странице показаны последние ${latestPublicationsLabel} по тегу; более ранние материалы доступны через месячные и годовые архивы.`
          : undefined,
    }),
  ]);
}
