import {
  createMarkdownDocument,
  md,
  parseMarkdownFragment,
  serializeMarkdownDocument,
} from '@shelkovo/markdown';

import { absoluteUrl } from '@/lib/site';

import {
  DISCOMFORT_LEAD,
  DISCOMFORT_PAGE_TITLE,
  DISCOMFORT_QUOTE,
  DISCOMFORT_QUOTE_TIMESTAMP_URL,
} from './config';
import type { DiscomfortDataset, DiscomfortEvent } from './types';
import { formatDiscomfortDate } from './view';

export const DISCOMFORT_MARKDOWN_HEADERS = {
  'Content-Type': 'text/markdown; charset=utf-8',
  'X-Robots-Tag': 'noindex, follow',
} as const;

type MarkdownListItem = ReturnType<typeof md.listItem>;
type MarkdownListBlocks = Exclude<Parameters<typeof md.listItem>[0], string>;

const abs = (path: string): string => absoluteUrl(path);

const eventListItem = (event: DiscomfortEvent): MarkdownListItem =>
  md.listItem(
    [
      md.paragraph(`${formatDiscomfortDate(event.dateIso)} — ${event.title}.`),
      ...(parseMarkdownFragment(event.body) as MarkdownListBlocks),
    ],
    { spread: true },
  );

export const buildDiscomfortMarkdown = (data: DiscomfortDataset): string =>
  serializeMarkdownDocument(
    createMarkdownDocument({
      children: [
        md.heading(1, DISCOMFORT_PAGE_TITLE),
        md.blockquote([md.paragraph(DISCOMFORT_QUOTE)]),
        md.paragraph([
          md.link(
            abs(data.quoteAuthor.htmlUrl),
            data.quoteAuthor.label,
            data.quoteAuthor.linkTitle,
          ),
          md.text(' '),
          md.link(abs(DISCOMFORT_QUOTE_TIMESTAMP_URL), 'на встрече'),
          md.text(' по новому тарифу.'),
        ]),
        md.paragraph(DISCOMFORT_LEAD),
        ...(data.latestEvent
          ? [
              md.paragraph(
                `Последнее событие — ${formatDiscomfortDate(data.latestEvent.dateIso)}.`,
              ),
            ]
          : []),
        md.heading(2, 'Хронология'),
        md.list(data.events.map(eventListItem), {
          ordered: true,
          spread: true,
        }),
      ],
    }),
  );
